import { describe, it, expect } from 'vitest'
import { resolveShopPromo } from '../server/utils/shop-promo'

// Промокоды B2B-магазина (server/utils/shop-promo.ts). Скидка — расход ВЛАДЕЛЬЦА,
// поэтому она ограничена его gross (markup*qty + round(base*qty*rate/100)) по позициям
// магазина и распределяется по позициям пропорционально gross (остаток — крупнейшей).
// Логика денежная — покрываем cap, распределение, детерминизм выбора магазина, отсев.
//
// Supabase-клиент подменяем лёгким фейком: .from().select().in() отдаёт items/shops,
// .rpc('shop_promo_validate') — заданный вердикт. Реальной БД тест не касается.

interface FakeItem { id: string; shop_id: string; price: number; markup: number; is_active: boolean }
interface FakeShop { id: string; revenue_share_pct: number }
type Verdict = { valid?: boolean; code?: string; discount?: number } | null
type Validate = (shopId: string, code: string, subtotal: number) => Verdict

function makeSvc(items: FakeItem[], shops: FakeShop[], validate: Validate) {
  const rpcCalls: { shopId: string; code: string; subtotal: number }[] = []
  const svc = {
    from(table: string) {
      return {
        select() {
          return {
            in() {
              if (table === 'shop_items') return Promise.resolve({ data: items, error: null })
              if (table === 'shops') return Promise.resolve({ data: shops, error: null })
              return Promise.resolve({ data: [], error: null })
            },
          }
        },
      }
    },
    rpc(name: string, params: { p_shop_id: string; p_code: string; p_subtotal: number }) {
      if (name === 'shop_promo_validate') {
        rpcCalls.push({ shopId: params.p_shop_id, code: params.p_code, subtotal: params.p_subtotal })
        return Promise.resolve({ data: validate(params.p_shop_id, params.p_code, params.p_subtotal), error: null })
      }
      return Promise.resolve({ data: null, error: null })
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { svc: svc as any, rpcCalls }
}

const item = (over: Partial<FakeItem> = {}): FakeItem => ({
  id: 'i1', shop_id: 's1', price: 1000, markup: 500, is_active: true, ...over,
})

describe('resolveShopPromo — ранний выход без обращения к БД', () => {
  it('пустой код → null', async () => {
    const { svc, rpcCalls } = makeSvc([], [], () => ({ valid: true, discount: 100 }))
    expect(await resolveShopPromo(svc, '', [{ shopItemId: 'i1', quantity: 1 }])).toBeNull()
    expect(await resolveShopPromo(svc, '   ', [{ shopItemId: 'i1', quantity: 1 }])).toBeNull()
    expect(rpcCalls).toHaveLength(0)
  })
  it('нет позиций → null', async () => {
    const { svc } = makeSvc([], [], () => ({ valid: true, discount: 100 }))
    expect(await resolveShopPromo(svc, 'TEAM', [])).toBeNull()
  })
  it('позиции не найдены в БД → null', async () => {
    const { svc } = makeSvc([], [{ id: 's1', revenue_share_pct: 10 }], () => ({ valid: true, discount: 100 }))
    expect(await resolveShopPromo(svc, 'TEAM', [{ shopItemId: 'i1', quantity: 1 }])).toBeNull()
  })
})

describe('resolveShopPromo — расчёт и cap скидки', () => {
  it('скидка в пределах gross применяется как есть', async () => {
    const { svc, rpcCalls } = makeSvc(
      [item({ id: 'i1', price: 1000, markup: 500 })],
      [{ id: 's1', revenue_share_pct: 15 }],
      () => ({ valid: true, code: 'TEAM', discount: 500 }),
    )
    const r = await resolveShopPromo(svc, 'team', [{ shopItemId: 'i1', quantity: 2 }])
    expect(r).not.toBeNull()
    expect(r!.shopId).toBe('s1')
    expect(r!.code).toBe('TEAM')
    expect(r!.discount).toBe(500)
    expect(r!.byItem).toEqual({ i1: 500 })
    // в RPC уходит subtotal = (price+markup)*qty
    expect(rpcCalls[0]!.subtotal).toBe(3000)
  })

  it('скидка больше gross владельца обрезается до gross', async () => {
    // gross = markup*qty + round(base*qty*rate/100) = 500*2 + round(1000*2*15/100=300) = 1300
    const { svc } = makeSvc(
      [item({ id: 'i1', price: 1000, markup: 500 })],
      [{ id: 's1', revenue_share_pct: 15 }],
      () => ({ valid: true, code: 'BIG', discount: 99999 }),
    )
    const r = await resolveShopPromo(svc, 'BIG', [{ shopItemId: 'i1', quantity: 2 }])
    expect(r!.discount).toBe(1300)
    expect(r!.byItem.i1).toBe(1300)
  })

  it('распределение по позициям пропорционально gross, остаток — крупнейшей', async () => {
    // rate 10%. i1: gross = 300 + round(1000*10/100=100) = 400
    //          i2: gross = 700 + round(2000*10/100=200) = 900 ; grossTotal = 1300
    const { svc } = makeSvc(
      [
        item({ id: 'i1', price: 1000, markup: 300 }),
        item({ id: 'i2', price: 2000, markup: 700 }),
      ],
      [{ id: 's1', revenue_share_pct: 10 }],
      () => ({ valid: true, code: 'SPLIT', discount: 300 }),
    )
    const r = await resolveShopPromo(svc, 'SPLIT', [
      { shopItemId: 'i1', quantity: 1 },
      { shopItemId: 'i2', quantity: 1 },
    ])
    // 300 * 900/1300 = 207.69 крупнейшей (i2), остаток 92.31 — i1
    expect(r!.byItem.i2).toBe(207.69)
    expect(r!.byItem.i1).toBe(92.31)
    const sum = Object.values(r!.byItem).reduce((s, n) => s + n, 0)
    expect(Number(sum.toFixed(2))).toBe(300)
  })

  it('частичная скидка: каждая line_discount ≤ своего gross и сумма = discount покупателя', async () => {
    // rate 10%. i1 gross = 300 + round(1000*10/100)=400 ; i2 gross = 700 + round(2000*10/100)=900
    // grossTotal = 1300, скидка 1000 (< grossTotal → без cap до gross магазина).
    const { svc } = makeSvc(
      [
        item({ id: 'i1', price: 1000, markup: 300 }),
        item({ id: 'i2', price: 2000, markup: 700 }),
      ],
      [{ id: 's1', revenue_share_pct: 10 }],
      () => ({ valid: true, code: 'PART', discount: 1000 }),
    )
    const r = await resolveShopPromo(svc, 'PART', [
      { shopItemId: 'i1', quantity: 1 },
      { shopItemId: 'i2', quantity: 1 },
    ])
    // ни одна позиция не получает скидку больше своего gross (иначе apply_paid обнулит
    // строку и остаток съест базу платформы), а фактически распределённое = discount,
    // чтобы уменьшение total покупателя точно совпало с уменьшением доли владельца.
    expect(r!.byItem.i1).toBeLessThanOrEqual(400)
    expect(r!.byItem.i2).toBeLessThanOrEqual(900)
    const sum = Object.values(r!.byItem).reduce((s, n) => s + n, 0)
    expect(Number(sum.toFixed(2))).toBe(r!.discount)
  })

  it('неактивные позиции не участвуют в gross и распределении', async () => {
    const { svc } = makeSvc(
      [
        item({ id: 'i1', price: 1000, markup: 500, is_active: true }),
        item({ id: 'i2', price: 0, markup: 9999, is_active: false }),
      ],
      [{ id: 's1', revenue_share_pct: 0 }],
      () => ({ valid: true, code: 'ACT', discount: 10000 }),
    )
    const r = await resolveShopPromo(svc, 'ACT', [
      { shopItemId: 'i1', quantity: 1 },
      { shopItemId: 'i2', quantity: 1 },
    ])
    // gross только по активной i1 = 500 → cap 500; i2 отсутствует в распределении
    expect(r!.discount).toBe(500)
    expect(r!.byItem).toEqual({ i1: 500 })
    expect(r!.byItem.i2).toBeUndefined()
  })
})

describe('resolveShopPromo — выбор магазина и отсев', () => {
  it('детерминированно выбирает магазин с наименьшим shop_id и не идёт дальше', async () => {
    const { svc, rpcCalls } = makeSvc(
      [
        item({ id: 'iA', shop_id: 's-aaa', price: 0, markup: 200 }),
        item({ id: 'iB', shop_id: 's-bbb', price: 0, markup: 200 }),
      ],
      [
        { id: 's-aaa', revenue_share_pct: 0 },
        { id: 's-bbb', revenue_share_pct: 0 },
      ],
      () => ({ valid: true, code: 'X', discount: 50 }), // валиден для ОБОИХ
    )
    // порядок позиций — B раньше A, но выбор идёт по возрастанию shop_id
    const r = await resolveShopPromo(svc, 'X', [
      { shopItemId: 'iB', quantity: 1 },
      { shopItemId: 'iA', quantity: 1 },
    ])
    expect(r!.shopId).toBe('s-aaa')
    expect(rpcCalls).toHaveLength(1) // остановился на первом подошедшем
    expect(rpcCalls[0]!.shopId).toBe('s-aaa')
  })

  it('код не подходит ни одному магазину → null', async () => {
    const { svc, rpcCalls } = makeSvc(
      [item({ id: 'i1' })],
      [{ id: 's1', revenue_share_pct: 10 }],
      () => ({ valid: false }),
    )
    expect(await resolveShopPromo(svc, 'NOPE', [{ shopItemId: 'i1', quantity: 1 }])).toBeNull()
    expect(rpcCalls).toHaveLength(1)
  })

  it('валиден, но нулевая скидка → отбрасывается (null)', async () => {
    const { svc } = makeSvc(
      [item({ id: 'i1' })],
      [{ id: 's1', revenue_share_pct: 10 }],
      () => ({ valid: true, code: 'ZERO', discount: 0 }),
    )
    expect(await resolveShopPromo(svc, 'ZERO', [{ shopItemId: 'i1', quantity: 1 }])).toBeNull()
  })
})
