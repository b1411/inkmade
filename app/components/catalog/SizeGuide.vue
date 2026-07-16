<script setup lang="ts">
import type { SizeChartRow } from '~~/shared/config/zones'

// Размерная сетка у селектора размера.
//
// ЧТО БЫЛО НЕ ТАК. Таблица была захардкожена и показывалась ЛЮБОМУ товару:
//  • кепке (единственный размер OS) она сообщала «обхват груди 92–96, длина 68»;
//  • оверсайзу предлагала XXL, которого нет в продаже;
//  • классике и оверсайзу давала одинаковые замеры — при том что §42.2 требует
//    их СРАВНИВАТЬ, потому что они различаются.
// Покупатель выбирает размер по этим числам, поэтому враньё тут стоит возврата.
//
// ЧТО СЕЙЧАС. Показываем только те строки, размеры которых реально продаются, и
// прячем гайд целиком там, где сравнивать нечего (один размер). Числа остаются
// ориентировочными — это ЧЕСТНЫЙ ФОЛБЭК, а не решение: §42.1 требует точных
// замеров изделия, а их в данных пока нет ни одного. Появятся (products.size_chart) —
// компонент возьмёт их и снимет оговорку.
const props = defineProps<{
  /** Размеры, которые реально есть у товара. Гайд не должен предлагать то, чего нет. */
  sizes?: string[]
  /** Точные замеры товара (products.size_chart, §42.1). Есть — показываем их. */
  chart?: SizeChartRow[] | null
}>()

const open = ref(false)

// Ориентировочная сетка для одежды. Фолбэк, пока у товара нет своих замеров.
const GENERIC = [
  { size: 'S', chest: '92–96', length: 68 },
  { size: 'M', chest: '96–102', length: 70 },
  { size: 'L', chest: '102–108', length: 72 },
  { size: 'XL', chest: '108–116', length: 74 },
  { size: 'XXL', chest: '116–124', length: 76 },
]

// Точные замеры бьют ориентировочные. Обратите внимание: у своей сетки НЕ фильтруем
// по проданным размерам — её завёл человек под этот товар, и лишних строк там быть
// не должно; если они есть, это ошибка данных, и прятать её от админа вредно.
const exact = computed(() => (props.chart?.length ? props.chart : null))

const rows = computed(() => {
  if (exact.value) {
    return exact.value.map(r => ({
      size: r.size,
      chest: r.chestCm != null ? String(r.chestCm) : '—',
      length: r.lengthCm != null ? String(r.lengthCm) : '—',
    }))
  }
  const sold = props.sizes
  if (!sold?.length) return GENERIC
  const set = new Set(sold.map(s => s.toUpperCase()))
  return GENERIC.filter(r => set.has(r.size))
})

// Прячем гайд, если строк не осталось (кепка с OS) или сравнивать нечего.
// Кнопка «размерная сетка», открывающая таблицу не про этот товар, — хуже её отсутствия.
const visible = computed(() => rows.value.length > 1)
</script>

<template>
  <button
    v-if="visible"
    type="button"
    class="text-caption text-ink-burgundy hover:underline inline-flex items-center gap-1"
    @click="open = true"
  >
    <UIcon name="i-lucide-ruler" class="size-3.5" /> {{ $t('product.sizeGuide.trigger') }}
  </button>

  <UModal v-model:open="open" :title="$t('product.sizeGuide.title')">
    <template #body>
      <div class="overflow-x-auto">
        <table class="w-full text-caption">
          <thead class="ink-label text-ink-text-dark-soft">
            <tr class="border-b border-[var(--ink-line-dark)]">
              <th class="text-left py-2">{{ $t('product.sizeGuide.size') }}</th>
              <th class="text-right">{{ $t('product.sizeGuide.chest') }}</th>
              <th class="text-right">{{ $t('product.sizeGuide.length') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.size" class="border-b border-[var(--ink-line-dark)]">
              <td class="py-2 font-semibold">{{ r.size }}</td>
              <td class="text-right tabular-nums">{{ r.chest }}</td>
              <td class="text-right tabular-nums">{{ r.length }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Оговорка «значения ориентировочные» — только для фолбэка. У точных
           замеров товара она была бы враньём наоборот: обесценивала бы реальные числа. -->
      <p v-if="!exact" class="text-caption text-ink-text-dark-soft mt-3">{{ $t('product.sizeGuide.note') }}</p>
    </template>
  </UModal>
</template>

