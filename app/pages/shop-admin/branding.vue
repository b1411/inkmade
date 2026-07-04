<script setup lang="ts">
// Конструктор витрины B2B-магазина v2 (модули A/B/C/D). Лого/цвета/шрифт/скругление,
// готовые пресеты темы, hero (раскладка/затемнение/CTA), секции (объявление/«О магазине»),
// карточки, соцсети — с живым превью. Сохраняет «мягкие» jsonb-поля shops
// (RLS shops_owner_update; guard пускает их владельцу). См. shared/config/shop-theme.ts.
import { safeCssUrl } from '~/utils/safeUrl'
import {
  THEME_PRESETS, SHOP_FONT_KEYS, SHOP_RADIUS_KEYS, HERO_LAYOUTS,
  fontStack, radiusValue, cardRatio, type ThemePreset,
} from '~~/shared/config/shop-theme'

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
  theme: { primary: '#6b1e2e', accent: '#6b1e2e', bg: '#faf7f2', font: 'modern', radius: 'soft' },
  hero: { title: '', subtitle: '', banner_url: '', layout: 'left', overlay: 45, cta_text: '' },
  contacts: { instagram: '', phone: '', whatsapp: '', telegram: '', tiktok: '' },
  layout: {
    showHero: true,
    announcement: { on: false, text: '' },
    about: { on: false, title: '', text: '' },
    cards: { ratio: 'portrait', showPrice: true, showDesc: true },
  },
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
  form.theme.font = th.font || 'modern'
  form.theme.radius = th.radius || 'soft'
  const h = (s.hero ?? {}) as Record<string, unknown>
  form.hero.title = (h.title as string) || ''
  form.hero.subtitle = (h.subtitle as string) || ''
  form.hero.banner_url = (h.banner_url as string) || ''
  form.hero.layout = (h.layout as string) || 'left'
  form.hero.overlay = typeof h.overlay === 'number' ? h.overlay : 45
  form.hero.cta_text = (h.cta_text as string) || ''
  const c = (s.contacts ?? {}) as Record<string, string>
  form.contacts.instagram = c.instagram || ''
  form.contacts.phone = c.phone || ''
  form.contacts.whatsapp = c.whatsapp || ''
  form.contacts.telegram = c.telegram || ''
  form.contacts.tiktok = c.tiktok || ''
  const l = (s.layout ?? {}) as Record<string, unknown>
  form.layout.showHero = l.showHero !== false
  const an = (l.announcement ?? {}) as Record<string, unknown>
  form.layout.announcement.on = !!an.on
  form.layout.announcement.text = (an.text as string) || ''
  const ab = (l.about ?? {}) as Record<string, unknown>
  form.layout.about.on = !!ab.on
  form.layout.about.title = (ab.title as string) || ''
  form.layout.about.text = (ab.text as string) || ''
  const cd = (l.cards ?? {}) as Record<string, unknown>
  form.layout.cards.ratio = (cd.ratio as string) || 'portrait'
  form.layout.cards.showPrice = cd.showPrice !== false
  form.layout.cards.showDesc = cd.showDesc !== false
})

// опции селектов (лейблы из i18n)
const fontOptions = computed(() => SHOP_FONT_KEYS.map(k => ({ label: t(`shopAdmin.branding.fontOpt.${k}`), value: k as string })))
const radiusOptions = computed(() => SHOP_RADIUS_KEYS.map(k => ({ label: t(`shopAdmin.branding.radiusOpt.${k}`), value: k as string })))
const heroLayoutOptions = computed(() => HERO_LAYOUTS.map(k => ({ label: t(`shopAdmin.branding.heroLayoutOpt.${k}`), value: k as string })))
const ratioOptions = computed(() => ['portrait', 'square'].map(k => ({ label: t(`shopAdmin.branding.ratioOpt.${k}`), value: k })))

function applyPreset(p: ThemePreset) {
  form.theme.primary = p.primary
  form.theme.accent = p.accent
  form.theme.bg = p.bg
  form.theme.font = p.font
  form.theme.radius = p.radius
  toast.add({ title: t('shopAdmin.branding.presetApplied', { name: t(`shopAdmin.branding.presetName.${p.key}`) }), color: 'success' })
}

// живое превью — CSS-переменные из формы
const previewBanner = computed(() => safeCssUrl(form.hero.banner_url))
const hasPreviewBanner = computed(() => !!previewBanner.value)
const previewVars = computed(() => ({
  '--p-primary': form.theme.primary,
  '--p-bg': form.theme.bg,
  '--p-radius': radiusValue(form.theme.radius),
  fontFamily: fontStack(form.theme.font),
  background: form.theme.bg,
}))

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
      hero: {
        title: form.hero.title.trim(), subtitle: form.hero.subtitle.trim(), banner_url: form.hero.banner_url.trim(),
        layout: form.hero.layout, overlay: Number(form.hero.overlay) || 0, cta_text: form.hero.cta_text.trim(),
      },
      contacts: {
        instagram: form.contacts.instagram.trim(), phone: form.contacts.phone.trim(),
        whatsapp: form.contacts.whatsapp.trim(), telegram: form.contacts.telegram.trim(), tiktok: form.contacts.tiktok.trim(),
      },
      layout: {
        showHero: form.layout.showHero,
        announcement: { on: form.layout.announcement.on, text: form.layout.announcement.text.trim() },
        about: { on: form.layout.about.on, title: form.layout.about.title.trim(), text: form.layout.about.text.trim() },
        cards: { ratio: form.layout.cards.ratio, showPrice: form.layout.cards.showPrice, showDesc: form.layout.cards.showDesc },
      },
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
        <!-- идентичность -->
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

        <!-- тема: пресеты + цвета + шрифт + скругление -->
        <UiPanel :title="$t('shopAdmin.branding.theme')" icon="i-lucide-palette">
          <div class="space-y-4">
            <div>
              <p class="text-caption text-ink-gray-500 mb-2">{{ $t('shopAdmin.branding.presets') }}</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="p in THEME_PRESETS"
                  :key="p.key"
                  type="button"
                  class="flex items-center gap-2 rounded-lg border border-ink-gray-200 px-3 py-1.5 text-sm hover:border-ink-gray-400 transition-colors"
                  @click="applyPreset(p)"
                >
                  <span class="flex -space-x-1">
                    <span class="size-4 rounded-full border border-white" :style="{ background: p.primary }" />
                    <span class="size-4 rounded-full border border-white" :style="{ background: p.accent }" />
                    <span class="size-4 rounded-full border border-white" :style="{ background: p.bg }" />
                  </span>
                  {{ $t(`shopAdmin.branding.presetName.${p.key}`) }}
                </button>
              </div>
            </div>

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

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="$t('shopAdmin.branding.font')">
                <USelect v-model="form.theme.font" :items="fontOptions" class="w-full" />
              </UFormField>
              <UFormField :label="$t('shopAdmin.branding.radius')">
                <USelect v-model="form.theme.radius" :items="radiusOptions" class="w-full" />
              </UFormField>
            </div>
          </div>
        </UiPanel>

        <!-- hero -->
        <UiPanel :title="$t('shopAdmin.branding.hero')" icon="i-lucide-image">
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="font-medium">{{ $t('shopAdmin.branding.showHero') }}</p>
                <p class="text-caption text-ink-gray-500">{{ $t('shopAdmin.branding.showHeroHint') }}</p>
              </div>
              <USwitch v-model="form.layout.showHero" />
            </div>
            <template v-if="form.layout.showHero">
              <UFormField :label="$t('shopAdmin.branding.heroTitle')">
                <UInput v-model="form.hero.title" :placeholder="form.name" class="w-full" />
              </UFormField>
              <UFormField :label="$t('shopAdmin.branding.heroSubtitle')">
                <UInput v-model="form.hero.subtitle" class="w-full" />
              </UFormField>
              <div class="grid grid-cols-2 gap-4">
                <UFormField :label="$t('shopAdmin.branding.heroLayout')">
                  <USelect v-model="form.hero.layout" :items="heroLayoutOptions" class="w-full" />
                </UFormField>
                <UFormField :label="$t('shopAdmin.branding.heroCta')" :help="$t('shopAdmin.branding.heroCtaHelp')">
                  <UInput v-model="form.hero.cta_text" :placeholder="$t('shopAdmin.branding.heroCtaPlaceholder')" class="w-full" />
                </UFormField>
              </div>
              <UFormField :label="$t('shopAdmin.branding.heroBanner')" :help="$t('shopAdmin.branding.heroBannerHelp')">
                <UInput v-model="form.hero.banner_url" placeholder="https://…" class="w-full" />
              </UFormField>
              <UFormField v-if="hasPreviewBanner" :label="$t('shopAdmin.branding.heroOverlay')">
                <div class="flex items-center gap-3">
                  <input v-model.number="form.hero.overlay" type="range" min="0" max="70" class="flex-1 accent-ink-burgundy">
                  <span class="text-caption text-ink-gray-500 w-10 text-right">{{ form.hero.overlay }}%</span>
                </div>
              </UFormField>
            </template>
          </div>
        </UiPanel>

        <!-- секции контента -->
        <UiPanel :title="$t('shopAdmin.branding.sections')" icon="i-lucide-layout-template">
          <div class="space-y-5">
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-4">
                <p class="font-medium">{{ $t('shopAdmin.branding.announcement') }}</p>
                <USwitch v-model="form.layout.announcement.on" />
              </div>
              <UInput v-if="form.layout.announcement.on" v-model="form.layout.announcement.text" :placeholder="$t('shopAdmin.branding.announcementPlaceholder')" class="w-full" />
            </div>
            <div class="space-y-2 border-t border-ink-gray-100 pt-4">
              <div class="flex items-center justify-between gap-4">
                <p class="font-medium">{{ $t('shopAdmin.branding.about') }}</p>
                <USwitch v-model="form.layout.about.on" />
              </div>
              <template v-if="form.layout.about.on">
                <UInput v-model="form.layout.about.title" :placeholder="$t('shopAdmin.branding.aboutTitlePlaceholder')" class="w-full" />
                <UTextarea v-model="form.layout.about.text" :rows="3" :placeholder="$t('shopAdmin.branding.aboutTextPlaceholder')" class="w-full" />
              </template>
            </div>
          </div>
        </UiPanel>

        <!-- карточки товара -->
        <UiPanel :title="$t('shopAdmin.branding.cards')" icon="i-lucide-layout-grid">
          <div class="space-y-4">
            <UFormField :label="$t('shopAdmin.branding.cardRatio')">
              <USelect v-model="form.layout.cards.ratio" :items="ratioOptions" class="w-full sm:w-56" />
            </UFormField>
            <div class="flex flex-wrap gap-x-8 gap-y-3">
              <UCheckbox v-model="form.layout.cards.showPrice" :label="$t('shopAdmin.branding.showPrice')" />
              <UCheckbox v-model="form.layout.cards.showDesc" :label="$t('shopAdmin.branding.showDesc')" />
            </div>
          </div>
        </UiPanel>

        <!-- контакты -->
        <UiPanel :title="$t('shopAdmin.branding.contacts')" icon="i-lucide-contact">
          <div class="grid sm:grid-cols-2 gap-4">
            <UFormField :label="$t('shopAdmin.branding.instagram')">
              <UInput v-model="form.contacts.instagram" placeholder="@team" class="w-full" />
            </UFormField>
            <UFormField :label="$t('shopAdmin.branding.phone')">
              <UInput v-model="form.contacts.phone" placeholder="+7 700 000-00-00" class="w-full" />
            </UFormField>
            <UFormField :label="$t('shopAdmin.branding.whatsapp')">
              <UInput v-model="form.contacts.whatsapp" placeholder="+7 700 000-00-00" class="w-full" />
            </UFormField>
            <UFormField :label="$t('shopAdmin.branding.telegram')">
              <UInput v-model="form.contacts.telegram" placeholder="@team" class="w-full" />
            </UFormField>
            <UFormField :label="$t('shopAdmin.branding.tiktok')">
              <UInput v-model="form.contacts.tiktok" placeholder="@team" class="w-full" />
            </UFormField>
          </div>
        </UiPanel>

        <UButton color="primary" size="lg" :loading="saving" icon="i-lucide-check" @click="save">{{ $t('shopAdmin.branding.save') }}</UButton>
      </div>

      <!-- живое превью 2.0 -->
      <div class="lg:sticky lg:top-8">
        <UiSectionLabel accent>{{ $t('shopAdmin.branding.preview') }}</UiSectionLabel>
        <div class="mt-3 rounded-2xl overflow-hidden border border-ink-gray-200 shadow-sm" :style="previewVars">
          <!-- объявление -->
          <div v-if="form.layout.announcement.on && form.layout.announcement.text" class="text-center text-xs font-medium px-3 py-1.5 text-white" :style="{ background: form.theme.primary }">
            {{ form.layout.announcement.text }}
          </div>
          <!-- шапка -->
          <div class="h-12 flex items-center px-4 gap-2 border-b border-black/5">
            <img v-if="form.logo_url" :src="form.logo_url" alt="" class="h-6 w-auto object-contain">
            <span class="font-bold text-sm" :style="{ color: form.theme.primary }">{{ form.name || '—' }}</span>
          </div>
          <!-- hero -->
          <div
            v-if="form.layout.showHero"
            class="relative px-5 py-10"
            :style="hasPreviewBanner ? `background-image:url('${previewBanner}');background-size:cover;background-position:center` : ''"
          >
            <div v-if="hasPreviewBanner" class="absolute inset-0" :style="{ background: `rgba(0,0,0,${form.hero.overlay / 100})` }" />
            <div class="relative" :class="form.hero.layout === 'center' ? 'text-center' : ''">
              <h3 class="text-xl font-bold" :style="{ color: hasPreviewBanner ? '#fff' : form.theme.primary }">
                {{ form.hero.title || form.name || '—' }}
              </h3>
              <p class="text-xs mt-2" :class="hasPreviewBanner ? 'text-white/85' : 'text-ink-gray-600'">
                {{ form.hero.subtitle || $t('shopAdmin.branding.previewSubtitle') }}
              </p>
              <span v-if="form.hero.cta_text" class="inline-block mt-3 px-3 py-1.5 text-xs font-semibold text-white" :style="{ background: form.theme.primary, borderRadius: 'var(--p-radius)' }">
                {{ form.hero.cta_text }}
              </span>
            </div>
          </div>
          <!-- карточки -->
          <div class="p-4 grid grid-cols-2 gap-3">
            <div v-for="n in 2" :key="n" class="overflow-hidden bg-white border border-black/5" :style="{ borderRadius: 'var(--p-radius)' }">
              <div class="bg-black/5 flex items-center justify-center" :style="{ aspectRatio: cardRatio(form.layout.cards.ratio) }">
                <UIcon name="i-lucide-shirt" class="size-8 text-black/15" />
              </div>
              <div class="p-2 space-y-1.5">
                <div v-if="form.layout.cards.showDesc" class="h-1.5 w-2/3 rounded bg-black/10" />
                <div v-if="form.layout.cards.showPrice" class="h-3 w-1/3 rounded" :style="{ background: form.theme.primary, opacity: 0.8 }" />
              </div>
            </div>
          </div>
          <!-- о магазине -->
          <div v-if="form.layout.about.on && (form.layout.about.title || form.layout.about.text)" class="px-5 py-4 border-t border-black/5 text-center">
            <p v-if="form.layout.about.title" class="text-sm font-bold" :style="{ color: form.theme.primary }">{{ form.layout.about.title }}</p>
            <p v-if="form.layout.about.text" class="text-xs text-ink-gray-600 mt-1 line-clamp-3 whitespace-pre-line">{{ form.layout.about.text }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
