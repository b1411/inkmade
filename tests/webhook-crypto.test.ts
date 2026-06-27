import { describe, it, expect } from 'vitest'
import { signWebhook, verifyWebhookSignature } from '../server/utils/webhook-crypto'

// Денежный путь (§10 инвариант 2): webhook — единственный триггер paid, подпись
// обязательна. Тесты фиксируют поведение accept/reject проверки HMAC-подписи.

const SECRET = 'test-secret-key-32-bytes-long-xx'
const RAW = JSON.stringify({ orderId: 'ord_123', providerTxn: 'tx_456', status: 'paid' })

describe('verifyWebhookSignature', () => {
  it('принимает корректную подпись, посчитанную тем же секретом', () => {
    const sig = signWebhook(RAW, SECRET)
    expect(verifyWebhookSignature(RAW, sig, SECRET)).toBe(true)
  })

  it('отклоняет подпись, посчитанную другим секретом', () => {
    const sig = signWebhook(RAW, 'другой-секрет')
    expect(verifyWebhookSignature(RAW, sig, SECRET)).toBe(false)
  })

  it('отклоняет, если тело изменено после подписи (tamper)', () => {
    const sig = signWebhook(RAW, SECRET)
    const tampered = JSON.stringify({ orderId: 'ord_123', providerTxn: 'tx_456', status: 'paid', total: 1 })
    expect(verifyWebhookSignature(tampered, sig, SECRET)).toBe(false)
  })

  it('отклоняет пустую подпись', () => {
    expect(verifyWebhookSignature(RAW, '', SECRET)).toBe(false)
  })

  it('отклоняет при пустом секрете', () => {
    const sig = signWebhook(RAW, SECRET)
    expect(verifyWebhookSignature(RAW, sig, '')).toBe(false)
  })

  it('отклоняет подпись неверной длины (не падает в timingSafeEqual)', () => {
    expect(verifyWebhookSignature(RAW, 'deadbeef', SECRET)).toBe(false)
  })

  it('подпись детерминирована для одного входа', () => {
    expect(signWebhook(RAW, SECRET)).toBe(signWebhook(RAW, SECRET))
  })

  it('разные тела дают разные подписи', () => {
    expect(signWebhook('a', SECRET)).not.toBe(signWebhook('b', SECRET))
  })
})
