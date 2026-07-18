<script setup lang="ts">
// Панель параметров изделия (§7): материал → цвет → размер → количество.
// Состояние материала/цвета/colorCount живёт в useDesign (useState, глобально
// шарится), поэтому компонент можно безопасно отрисовать дважды — в правой
// колонке desktop и в мобильном slideover: оба экземпляра синхронны.
// Размер/количество прокидываются через v-model (локальны для страницы заказа).

interface MaterialItem { label: string; value: string }
interface SizeVariant { id: string; size: string }

defineProps<{
  materialItems: MaterialItem[]
  sizeVariants: SizeVariant[]
}>()

const size = defineModel<string>('size', { required: true })
const quantity = defineModel<number>('quantity', { required: true })

const { material, materialId, colorCount } = useDesign()

function setQty(n: number) {
  quantity.value = Math.max(1, Math.min(999, n))
}
</script>

<template>
  <div class="space-y-4">
    <UiSectionLabel>{{ $t('customize.page.setup') }}</UiSectionLabel>

    <div v-if="materialItems.length">
      <span class="text-caption text-ink-gray-600">{{ $t('customize.page.material') }}</span>
      <USelect v-model="materialId" :items="materialItems" value-key="value" class="w-full mt-1" />
      <p v-if="material" class="text-caption text-ink-gray-500 mt-1.5">
        {{ $t(`domain.printMethod.${material.print_method}`) }} · {{ $t(`domain.printMode.${material.print_mode}`) }}
      </p>
      <div v-if="material?.print_method === 'silkscreen'" class="mt-3">
        <span class="text-caption text-ink-gray-600">{{ $t('customize.page.colorCount') }}</span>
        <div class="flex items-center gap-2 mt-1">
          <UButton color="neutral" variant="subtle" size="xs" icon="i-lucide-minus" :disabled="colorCount <= 1" @click="colorCount = Math.max(1, colorCount - 1)" />
          <span class="min-w-8 text-center font-semibold tabular-nums">{{ colorCount }}</span>
          <UButton color="neutral" variant="subtle" size="xs" icon="i-lucide-plus" :disabled="colorCount >= 8" @click="colorCount = Math.min(8, colorCount + 1)" />
        </div>
      </div>
    </div>

    <CustomizerProductColorPicker />

    <div v-if="sizeVariants.length">
      <span class="text-caption text-ink-gray-600">{{ $t('customize.page.size') }}</span>
      <div class="flex flex-wrap gap-2 mt-1">
        <button
          v-for="v in sizeVariants" :key="v.id"
          type="button"
          class="min-w-11 px-3 py-2 rounded-md border text-center transition-colors"
          :class="v.size === size ? 'border-ink-burgundy bg-ink-burgundy/5' : 'border-ink-gray-200'"
          @click="size = v.size"
        >{{ v.size }}</button>
      </div>
    </div>

    <div>
      <span class="text-caption text-ink-gray-600">{{ $t('customize.page.quantity') }}</span>
      <div class="flex items-center gap-2 mt-1">
        <UButton color="neutral" variant="subtle" size="sm" icon="i-lucide-minus" :disabled="quantity <= 1" @click="setQty(quantity - 1)" />
        <span class="min-w-12 text-center text-h4 font-semibold tabular-nums">{{ quantity }}</span>
        <UButton color="neutral" variant="subtle" size="sm" icon="i-lucide-plus" @click="setQty(quantity + 1)" />
      </div>
    </div>
  </div>
</template>
