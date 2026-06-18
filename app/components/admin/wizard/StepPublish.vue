<script setup lang="ts">
import type { ProductWithRelations } from '~/types/models'

// Шаг 6 — Публикация (§8.2.1, §8.4). Контроль: без зон/мокапа/вариантов товар не публикуется.
const props = defineProps<{ product: ProductWithRelations }>()
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const { setPublished } = useAdmin()
const toast = useToast()

const checks = computed(() => {
  const zonesWithMockup = props.product.print_zones.filter(z => z.mockup_url)
  return [
    { ok: props.product.materials.length > 0, label: t('admin.wizard.publish.checkMaterial') },
    { ok: props.product.variants.length > 0, label: t('admin.wizard.publish.checkVariants') },
    { ok: props.product.print_zones.length > 0, label: t('admin.wizard.publish.checkZones') },
    { ok: zonesWithMockup.length > 0, label: t('admin.wizard.publish.checkMockup') },
    { ok: props.product.product_images.length > 0, label: t('admin.wizard.publish.checkPhoto') },
    { ok: !!props.product.max_print_mm, label: t('admin.wizard.publish.checkDpi') },
  ]
})

const canPublish = computed(() => checks.value.every(c => c.ok))

const busy = ref(false)
async function togglePublish() {
  busy.value = true
  try {
    await setPublished(props.product.id, !props.product.is_active)
    toast.add({ title: props.product.is_active ? t('admin.wizard.publish.unpublished') : t('admin.wizard.publish.published'), color: 'success' })
    emit('changed')
  } catch (e) {
    toast.add({ title: t('admin.wizard.publish.error'), description: (e as Error).message, color: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-xl">
    <div class="flex items-center gap-3">
      <UBadge :color="product.is_active ? 'success' : 'neutral'" variant="subtle">
        {{ product.is_active ? $t('admin.wizard.publish.statusPublished') : $t('admin.wizard.publish.statusDraft') }}
      </UBadge>
      <UButton
        v-if="product.alias"
        :to="`/customize/${product.alias}`"
        target="_blank"
        color="neutral"
        variant="subtle"
        icon="i-lucide-external-link"
      >
        {{ $t('admin.wizard.publish.previewConstructor') }}
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
      :title="$t('admin.wizard.publish.notReadyTitle')"
      :description="$t('admin.wizard.publish.notReadyText')"
    />

    <UButton
      :color="product.is_active ? 'error' : 'primary'"
      size="lg"
      :disabled="!product.is_active && !canPublish"
      :loading="busy"
      @click="togglePublish"
    >
      {{ product.is_active ? $t('admin.wizard.publish.unpublish') : $t('admin.wizard.publish.publish') }}
    </UButton>
  </div>
</template>
