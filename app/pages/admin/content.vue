<script setup lang="ts">
// Контент и маркетинг (CRM §6.10): тексты лендинга + промо + пиксели.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
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
    toast.add({ title: 'Контент сохранён', color: 'success' })
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  } finally { saving.value = false }
}
const { public: pub } = useRuntimeConfig()
</script>

<template>
  <div class="space-y-8 max-w-2xl">
    <div>
      <UiSectionLabel accent>Маркетинг</UiSectionLabel>
      <h1 class="ink-display text-h2 mt-1">Контент и промо</h1>
    </div>

    <div class="space-y-4">
      <UFormField label="Заголовок Hero (лендинг)"><UInput v-model="form.hero_title" class="w-full" /></UFormField>
      <UFormField label="Подзаголовок Hero"><UTextarea v-model="form.hero_subtitle" :rows="2" class="w-full" /></UFormField>
      <UFormField label="Промо-баннер (дроп/акция)"><UInput v-model="form.promo" class="w-full" placeholder="Напр.: −20% на первую вещь до 30 июня" /></UFormField>
      <UButton color="primary" :loading="saving" @click="save">Сохранить</UButton>
      <p class="text-caption text-ink-gray-500">Настройки хранятся в <code>platform_settings</code>. Тексты применяются на лендинге при чтении ключей.</p>
    </div>

    <section>
      <UiSectionLabel accent>Пиксели и аналитика</UiSectionLabel>
      <div class="mt-3 text-caption text-ink-gray-600 space-y-1">
        <p>Meta Pixel: <span class="font-mono">{{ pub.metaPixelId || 'не задан' }}</span></p>
        <p>TikTok Pixel: <span class="font-mono">{{ pub.tiktokPixelId || 'не задан' }}</span></p>
        <p>Google Analytics: <span class="font-mono">{{ pub.analyticsId || 'не задан' }}</span></p>
        <p class="text-ink-gray-400">ID задаются env-переменными на Vercel (NUXT_PUBLIC_*_PIXEL_ID) и применяются с 1-го дня.</p>
      </div>
    </section>
  </div>
</template>
