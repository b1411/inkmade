<script setup lang="ts">
// Контент и маркетинг (CRM §6.10): тексты лендинга + промо + пиксели.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t } = useI18n()
const { get, set } = useSettings()
const toast = useToast()

const { data: initial } = await useAsyncData('admin-content', async () => {
  return {
    hero_title: (await get<string>('landing.hero_title')) ?? 'ТВОЙ ПРИНТ. ТВОЯ ВЕЩЬ.',
    hero_subtitle: (await get<string>('landing.hero_subtitle')) ?? '',
    promo: (await get<string>('landing.promo')) ?? '',
  }
})
const form = reactive({ hero_title: '', hero_subtitle: '', promo: '' })
watchEffect(() => { if (initial.value) Object.assign(form, initial.value) })

const saving = ref(false)
async function save() {
  saving.value = true
  try {
    await Promise.all([
      set('landing.hero_title', form.hero_title),
      set('landing.hero_subtitle', form.hero_subtitle),
      set('landing.promo', form.promo),
    ])
    toast.add({ title: t('admin.content.saved'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('admin.content.error'), description: (e as Error).message, color: 'error' })
  } finally { saving.value = false }
}
const { public: pub } = useRuntimeConfig()
</script>

<template>
  <div class="max-w-2xl">
    <UiPageHeader :label="$t('admin.content.label')" :title="$t('admin.content.title')" />

    <div class="space-y-6">
      <UiPanel :title="$t('admin.content.landingTextsTitle')">
        <div class="space-y-4">
          <UFormField :label="$t('admin.content.fieldHeroTitle')"><UInput v-model="form.hero_title" class="w-full" /></UFormField>
          <UFormField :label="$t('admin.content.fieldHeroSubtitle')"><UTextarea v-model="form.hero_subtitle" :rows="2" class="w-full" /></UFormField>
          <UFormField :label="$t('admin.content.fieldPromo')"><UInput v-model="form.promo" class="w-full" :placeholder="$t('admin.content.promoPlaceholder')" /></UFormField>
          <UButton color="primary" :loading="saving" @click="save">{{ $t('actions.save') }}</UButton>
          <p class="text-caption text-ink-gray-500">{{ $t('admin.content.settingsHint') }}</p>
        </div>
      </UiPanel>

      <UiPanel :title="$t('admin.content.pixelsTitle')">
        <div class="text-caption text-ink-gray-600 space-y-1">
          <p>Meta Pixel: <span class="font-mono">{{ pub.metaPixelId || $t('admin.content.pixelNotSet') }}</span></p>
          <p>TikTok Pixel: <span class="font-mono">{{ pub.tiktokPixelId || $t('admin.content.pixelNotSet') }}</span></p>
          <p>Google Analytics: <span class="font-mono">{{ pub.analyticsId || $t('admin.content.pixelNotSet') }}</span></p>
          <p class="text-ink-gray-400">{{ $t('admin.content.pixelsHint') }}</p>
        </div>
      </UiPanel>
    </div>
  </div>
</template>
