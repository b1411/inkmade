<script setup lang="ts">
import type { ProductWithRelations } from '~/types/models'

// Шаг 6 — Публикация (§8.2.1, §8.4). Контроль: без зон/мокапа/вариантов товар не публикуется.
const props = defineProps<{ product: ProductWithRelations }>()
const emit = defineEmits<{ changed: [] }>()

const { setPublished } = useAdmin()
const toast = useToast()

const checks = computed(() => {
  const zonesWithMockup = props.product.print_zones.filter(z => z.mockup_url)
  return [
    { ok: props.product.materials.length > 0, label: 'Есть хотя бы один материал' },
    { ok: props.product.variants.length > 0, label: 'Есть варианты (цвет × размер)' },
    { ok: props.product.print_zones.length > 0, label: 'Есть зоны печати' },
    { ok: zonesWithMockup.length > 0, label: 'Хотя бы одна зона с мокапом (для превью конструктора)' },
    { ok: props.product.product_images.length > 0, label: 'Загружено фото товара' },
    { ok: !!props.product.max_print_mm, label: 'Указан размер печати на макс. размере (DPI)' },
  ]
})

const canPublish = computed(() => checks.value.every(c => c.ok))

const busy = ref(false)
async function togglePublish() {
  busy.value = true
  try {
    await setPublished(props.product.id, !props.product.is_active)
    toast.add({ title: props.product.is_active ? 'Снято с публикации' : 'Опубликовано', color: 'success' })
    emit('changed')
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-xl">
    <div class="flex items-center gap-3">
      <UBadge :color="product.is_active ? 'success' : 'neutral'" variant="subtle">
        {{ product.is_active ? 'Опубликован' : 'Черновик' }}
      </UBadge>
      <UButton
        v-if="product.alias"
        :to="`/customize/${product.alias}`"
        target="_blank"
        color="neutral"
        variant="subtle"
        icon="i-lucide-external-link"
      >
        Предпросмотр конструктора
      </UButton>
    </div>

    <ul class="space-y-2">
      <li v-for="(c, i) in checks" :key="i" class="flex items-center gap-2">
        <UIcon :name="c.ok ? 'i-lucide-check-circle-2' : 'i-lucide-circle'" :class="c.ok ? 'text-ink-success' : 'text-ink-gray-400'" class="size-5" />
        <span :class="c.ok ? '' : 'text-ink-gray-600'">{{ c.label }}</span>
      </li>
    </ul>

    <UAlert
      v-if="!canPublish && !product.is_active"
      color="warning"
      title="Не готово к публикации"
      description="Выполните все пункты выше — иначе конструктор не покажет товар корректно."
    />

    <UButton
      :color="product.is_active ? 'error' : 'primary'"
      size="lg"
      :disabled="!product.is_active && !canPublish"
      :loading="busy"
      @click="togglePublish"
    >
      {{ product.is_active ? 'Снять с публикации' : 'Опубликовать' }}
    </UButton>
  </div>
</template>
