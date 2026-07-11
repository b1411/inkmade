<script setup lang="ts">
// Размерная сетка (общая, для одежды). Открывается модалкой у селектора размера.
// Значения — ориентировочные (точные мерки зависят от модели), с честной оговоркой.
const open = ref(false)

const SIZES = [
  { size: 'S', chest: '92–96', length: 68 },
  { size: 'M', chest: '96–102', length: 70 },
  { size: 'L', chest: '102–108', length: 72 },
  { size: 'XL', chest: '108–116', length: 74 },
  { size: 'XXL', chest: '116–124', length: 76 },
]
</script>

<template>
  <button
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
          <thead class="ink-label text-ink-gray-500">
            <tr class="border-b border-ink-gray-200">
              <th class="text-left py-2">{{ $t('product.sizeGuide.size') }}</th>
              <th class="text-right">{{ $t('product.sizeGuide.chest') }}</th>
              <th class="text-right">{{ $t('product.sizeGuide.length') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in SIZES" :key="r.size" class="border-b border-ink-gray-200/60">
              <td class="py-2 font-semibold">{{ r.size }}</td>
              <td class="text-right tabular-nums">{{ r.chest }}</td>
              <td class="text-right tabular-nums">{{ r.length }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-caption text-ink-gray-500 mt-3">{{ $t('product.sizeGuide.note') }}</p>
    </template>
  </UModal>
</template>
