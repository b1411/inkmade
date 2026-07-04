<script setup lang="ts">
// Брендинг магазина (Фаза B3): лого, цвета, hero, контакты — с живым превью.
// Сохраняет «мягкие» поля shops (RLS shops_owner_update; guard пускает их владельцу).
import { safeCssUrl } from '~/utils/safeUrl'

definePageMeta({ layout: 'shop-admin', middleware: 'shop-owner' })
const { t } = useI18n()
useHead({ title: t('shopAdmin.branding.headTitle') })

const { getMine, update, uploadLogo } = useMyShop()
const toast = useToast()

const { data: shop } = await useAsyncData('my-shop', () => getMine())

// локальная форма (nested jsonb → плоские реактивные объекты)
const form = reactive({
  name: '',
  logo_url: null as string | null,
  theme: { primary: '#6b1e2e', accent: '#6b1e2e', bg: '#faf7f2' },
  hero: { title: '', subtitle: '', banner_url: '' },
  contacts: { instagram: '', phone: '', whatsapp: '' },
})

watchEffect(() => {
  const s = shop.value
  if (!s) return
  form.name = s.name
  form.logo_url = s.logo_url
  const th = (s.theme ?? {}) as Record<string, string>
  form.theme.primary = th.primary || '#6b1e2e'
  form.theme.accent = th.accent || th.primary || '#6b1e2e'
  form.theme.bg = th.bg || '#faf7f2'
  const h = (s.hero ?? {}) as Record<string, string>
  form.hero.title = h.title || ''
  form.hero.subtitle = h.subtitle || ''
  form.hero.banner_url = h.banner_url || ''
  const c = (s.contacts ?? {}) as Record<string, string>
  form.contacts.instagram = c.instagram || ''
  form.contacts.phone = c.phone || ''
  form.contacts.whatsapp = c.whatsapp || ''
})

// баннер превью — только безопасный http(s) URL (анти CSS-инъекция, F6)
const previewBanner = computed(() => safeCssUrl(form.hero.banner_url))
const hasPreviewBanner = computed(() => !!previewBanner.value)

const saving = ref(false)
const uploading = ref(false)

async function onLogoPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file || !shop.value) return
  uploading.value = true
  try {
    form.logo_url = await uploadLogo(shop.value.id, file)
    toast.add({ title: t('shopAdmin.branding.logoUploaded'), color: 'success' })
  } catch (err) {
    toast.add({ title: t('shopAdmin.branding.error'), description: (err as Error).message, color: 'error' })
  } finally {
    uploading.value = false
  }
}

async function save() {
  if (!shop.value) return
  if (!form.name.trim()) { toast.add({ title: t('shopAdmin.branding.nameRequired'), color: 'warning' }); return }
  saving.value = true
  try {
    await update(shop.value.id, {
      name: form.name.trim(),
      logo_url: form.logo_url,
      theme: { ...form.theme },
      hero: { title: form.hero.title.trim(), subtitle: form.hero.subtitle.trim(), banner_url: form.hero.banner_url.trim() },
      contacts: { instagram: form.contacts.instagram.trim(), phone: form.contacts.phone.trim(), whatsapp: form.contacts.whatsapp.trim() },
    })
    toast.add({ title: t('shopAdmin.branding.saved'), color: 'success' })
  } catch (err) {
    toast.add({ title: t('shopAdmin.branding.error'), description: (err as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="shop">
    <UiPageHeader :label="$t('shopAdmin.branding.label')" :title="$t('shopAdmin.branding.title')" />

    <div class="grid lg:grid-cols-[1fr_420px] gap-8 items-start">
      <!-- форма -->
      <div class="space-y-6">
        <UiPanel :title="$t('shopAdmin.branding.identity')" icon="i-lucide-badge">
          <div class="space-y-4">
            <UFormField :label="$t('shopAdmin.branding.name')" required>
              <UInput v-model="form.name" class="w-full" />
            </UFormField>
            <UFormField :label="$t('shopAdmin.branding.logo')">
              <div class="flex items-center gap-3">
                <div class="size-14 rounded-lg border border-ink-gray-200 bg-ink-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                  <img v-if="form.logo_url" :src="form.logo_url" alt="logo" class="w-full h-full object-contain">
                  <UIcon v-else name="i-lucide-image" class="size-6 text-ink-gray-300" />
                </div>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="block text-caption" :disabled="uploading" @change="onLogoPick">
              </div>
            </UFormField>
          </div>
        </UiPanel>

        <UiPanel :title="$t('shopAdmin.branding.colors')" icon="i-lucide-palette">
          <div class="grid grid-cols-3 gap-4">
            <UFormField :label="$t('shopAdmin.branding.primary')">
              <input v-model="form.theme.primary" type="color" class="h-10 w-full rounded-md border border-ink-gray-200 bg-white">
            </UFormField>
            <UFormField :label="$t('shopAdmin.branding.accent')">
              <input v-model="form.theme.accent" type="color" class="h-10 w-full rounded-md border border-ink-gray-200 bg-white">
            </UFormField>
            <UFormField :label="$t('shopAdmin.branding.bg')">
              <input v-model="form.theme.bg" type="color" class="h-10 w-full rounded-md border border-ink-gray-200 bg-white">
            </UFormField>
          </div>
        </UiPanel>

        <UiPanel :title="$t('shopAdmin.branding.hero')" icon="i-lucide-image">
          <div class="space-y-4">
            <UFormField :label="$t('shopAdmin.branding.heroTitle')">
              <UInput v-model="form.hero.title" :placeholder="form.name" class="w-full" />
            </UFormField>
            <UFormField :label="$t('shopAdmin.branding.heroSubtitle')">
              <UInput v-model="form.hero.subtitle" class="w-full" />
            </UFormField>
            <UFormField :label="$t('shopAdmin.branding.heroBanner')" :help="$t('shopAdmin.branding.heroBannerHelp')">
              <UInput v-model="form.hero.banner_url" placeholder="https://…" class="w-full" />
            </UFormField>
          </div>
        </UiPanel>

        <UiPanel :title="$t('shopAdmin.branding.contacts')" icon="i-lucide-contact">
          <div class="space-y-4">
            <UFormField :label="$t('shopAdmin.branding.instagram')">
              <UInput v-model="form.contacts.instagram" placeholder="@team" class="w-full" />
            </UFormField>
            <UFormField :label="$t('shopAdmin.branding.phone')">
              <UInput v-model="form.contacts.phone" placeholder="+7 700 000-00-00" class="w-full" />
            </UFormField>
          </div>
        </UiPanel>

        <UButton color="primary" size="lg" :loading="saving" icon="i-lucide-check" @click="save">{{ $t('shopAdmin.branding.save') }}</UButton>
      </div>

      <!-- живое превью -->
      <div class="lg:sticky lg:top-8">
        <UiSectionLabel accent>{{ $t('shopAdmin.branding.preview') }}</UiSectionLabel>
        <div class="mt-3 rounded-2xl overflow-hidden border border-ink-gray-200 shadow-sm" :style="{ background: form.theme.bg }">
          <div class="h-12 flex items-center px-4 gap-2 border-b border-black/5">
            <img v-if="form.logo_url" :src="form.logo_url" alt="" class="h-6 w-auto object-contain">
            <span class="font-bold text-sm" :style="{ color: form.theme.primary }">{{ form.name || '—' }}</span>
          </div>
          <div
            class="px-5 py-10"
            :style="hasPreviewBanner ? `background-image:url('${previewBanner}');background-size:cover;background-position:center` : ''"
          >
            <div :style="hasPreviewBanner ? 'background:rgba(0,0,0,.4);margin:-2.5rem -1.25rem;padding:2.5rem 1.25rem' : ''">
              <h3 class="text-2xl font-bold" :style="{ color: hasPreviewBanner ? '#fff' : form.theme.primary }">
                {{ form.hero.title || form.name || '—' }}
              </h3>
              <p class="text-sm mt-2" :class="hasPreviewBanner ? 'text-white/85' : 'text-ink-gray-600'">
                {{ form.hero.subtitle || $t('shopAdmin.branding.previewSubtitle') }}
              </p>
            </div>
          </div>
          <div class="p-4 grid grid-cols-2 gap-3">
            <div v-for="n in 2" :key="n" class="rounded-lg overflow-hidden bg-white border border-black/5">
              <div class="aspect-[3/4] bg-black/5 flex items-center justify-center">
                <UIcon name="i-lucide-shirt" class="size-8 text-black/15" />
              </div>
              <div class="p-2">
                <div class="h-2 w-2/3 rounded bg-black/10" />
                <div class="h-3 w-1/3 rounded mt-2" :style="{ background: form.theme.primary, opacity: 0.8 }" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
