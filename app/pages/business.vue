<script setup lang="ts">
// Посадочная B2B «INKMADE для команд» (Фаза B1). Расширенная подача + FAQ + форма
// заявки на открытие магазина мерча. Публичная; гейт роута — feature-flags middleware
// (404 при выключенном b2bShops). Заявка уходит в shop_applications через server-API.
import { isValidKzPhone } from '~~/shared/config/phone'

// email-валидация на клиенте — лёгкий регэксп (server-утилиту не тянем в браузерный бандл)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const { t, locale } = useI18n()
const { apply } = useBusiness()
const toast = useToast()
const { public: { siteUrl } } = useRuntimeConfig()
const site = (siteUrl as string) || 'https://inkmade-pi.vercel.app'

useSeoMeta({
  title: t('business.seo.title'),
  description: t('business.seo.description'),
  ogTitle: t('business.seo.title'),
  ogDescription: t('business.seo.description'),
  ogType: 'website',
  ogUrl: `${site}/business`,
})

const steps = computed(() => [0, 1, 2].map(i => ({
  icon: ['i-lucide-send', 'i-lucide-store', 'i-lucide-truck'][i],
  title: t(`business.cta.steps[${i}].title`),
  text: t(`business.cta.steps[${i}].text`),
})))

const benefits = computed(() => [0, 1, 2, 3, 4, 5].map(i => ({
  icon: ['i-lucide-wallet', 'i-lucide-package-open', 'i-lucide-palette', 'i-lucide-percent', 'i-lucide-shield-check', 'i-lucide-bar-chart-3'][i],
  title: t(`business.benefits[${i}].title`),
  text: t(`business.benefits[${i}].text`),
})))

const faq = computed(() => [0, 1, 2, 3, 4].map(i => ({
  q: t(`business.faq.items[${i}].q`),
  a: t(`business.faq.items[${i}].a`),
})))

// ── Форма заявки ──────────────────────────────────────────────────────────
const form = reactive({ orgName: '', contactName: '', phone: '', email: '', desiredSlug: '', audience: '', comment: '' })
const sending = ref(false)
const done = ref(false)

function validate(): string | null {
  if (!form.orgName.trim()) return t('business.form.errOrg')
  if (!form.contactName.trim()) return t('business.form.errContact')
  if (!isValidKzPhone(form.phone)) return t('business.form.errPhone')
  if (!EMAIL_RE.test(form.email.trim())) return t('business.form.errEmail')
  return null
}

async function onSubmit() {
  const err = validate()
  if (err) { toast.add({ title: err, color: 'warning' }); return }
  sending.value = true
  try {
    await apply({ ...form })
    done.value = true
    toast.add({ title: t('business.form.successToast'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('business.form.errSend'), description: (e as Error).message, color: 'error' })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="ink-grain w-screen ml-[calc(50%-50vw)] bg-ink-black text-ink-cream relative overflow-hidden">
      <div class="absolute inset-0 m-auto size-[36rem] rounded-full bg-ink-burgundy/25 blur-3xl ink-ambient-a" />
      <div class="relative mx-auto max-w-(--container-max) px-4 text-center" style="padding-block: var(--section-pad)">
        <UiReveal>
          <span class="ink-label text-ink-burgundy-light">{{ $t('business.hero.label') }}</span>
          <h1 :key="locale" class="ink-hero text-hero mt-3">{{ $t('business.hero.title') }}</h1>
          <p class="text-lead mt-5 text-ink-cream/80 max-w-2xl mx-auto">{{ $t('business.hero.subtitle') }}</p>
          <div class="mt-8 flex flex-wrap justify-center gap-4">
            <UiAppButton to="#apply" variant="primary" size="xl" on-dark magnetic>{{ $t('business.hero.cta') }}</UiAppButton>
          </div>
        </UiReveal>
      </div>
    </section>

    <!-- Как это работает -->
    <section style="padding-block: var(--section-pad)">
      <UiSectionLabel accent>{{ $t('business.how.label') }}</UiSectionLabel>
      <h2 class="ink-display text-h2 mt-2 mb-10">{{ $t('business.how.title') }}</h2>
      <div class="grid gap-8 md:grid-cols-3">
        <UiReveal v-for="(s, i) in steps" :key="i" :delay="i * 90">
          <div class="flex h-full flex-col gap-3">
            <div class="flex items-center gap-3">
              <span class="flex size-12 items-center justify-center rounded-full bg-ink-burgundy text-ink-cream shrink-0">
                <UIcon :name="s.icon" class="size-6" />
              </span>
              <span class="font-mono text-body text-ink-gray-400">0{{ i + 1 }}</span>
            </div>
            <h3 class="font-bold text-h3">{{ s.title }}</h3>
            <p class="text-ink-gray-600">{{ s.text }}</p>
          </div>
        </UiReveal>
      </div>
    </section>

    <!-- Преимущества -->
    <section style="padding-block: var(--section-pad)">
      <UiSectionLabel accent>{{ $t('business.benefitsLabel') }}</UiSectionLabel>
      <h2 class="ink-display text-h2 mt-2 mb-10">{{ $t('business.benefitsTitle') }}</h2>
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <UiReveal v-for="(b, i) in benefits" :key="i" :delay="i * 70">
          <div class="group h-full rounded-2xl border border-ink-cream-dark bg-ink-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-ink-burgundy/40 hover:shadow-md">
            <span class="flex size-11 items-center justify-center rounded-full bg-ink-burgundy/10 text-ink-burgundy transition-colors group-hover:bg-ink-burgundy group-hover:text-ink-cream">
              <UIcon :name="b.icon" class="size-5" />
            </span>
            <h3 class="font-bold text-h3 mt-4">{{ b.title }}</h3>
            <p class="text-ink-gray-600 mt-2">{{ b.text }}</p>
          </div>
        </UiReveal>
      </div>
    </section>

    <!-- Форма заявки -->
    <section id="apply" class="w-screen ml-[calc(50%-50vw)] bg-ink-cream/40" style="scroll-margin-top: 80px">
      <div class="mx-auto max-w-(--container-max) px-4 grid gap-12 lg:grid-cols-2 items-start" style="padding-block: var(--section-pad)">
        <UiReveal>
          <div>
            <UiSectionLabel accent>{{ $t('business.form.label') }}</UiSectionLabel>
            <h2 class="ink-display text-h2 mt-2">{{ $t('business.form.title') }}</h2>
            <p class="text-lead text-ink-gray-600 mt-4">{{ $t('business.form.subtitle') }}</p>

            <!-- FAQ рядом с формой -->
            <div class="mt-10 space-y-3">
              <details v-for="(f, i) in faq" :key="i" class="group rounded-xl border border-ink-cream-dark bg-ink-white px-5 py-4">
                <summary class="flex cursor-pointer items-center justify-between gap-3 font-semibold list-none">
                  {{ f.q }}
                  <UIcon name="i-lucide-plus" class="size-4 shrink-0 text-ink-gray-400 transition-transform group-open:rotate-45" />
                </summary>
                <p class="text-ink-gray-600 mt-3">{{ f.a }}</p>
              </details>
            </div>
          </div>
        </UiReveal>

        <UiReveal :delay="80">
          <div class="rounded-2xl border border-ink-cream-dark bg-ink-white p-6 sm:p-8">
            <!-- success -->
            <div v-if="done" class="text-center py-8">
              <span class="mx-auto flex size-16 items-center justify-center rounded-full bg-ink-success/10 text-ink-success">
                <UIcon name="i-lucide-check" class="size-8" />
              </span>
              <h3 class="ink-display text-h2 mt-5">{{ $t('business.form.successTitle') }}</h3>
              <p class="text-ink-gray-600 mt-3">{{ $t('business.form.successText') }}</p>
              <UiAppButton to="/" variant="ghost" class="mt-6">{{ $t('business.form.backHome') }}</UiAppButton>
            </div>

            <form v-else class="space-y-4" @submit.prevent="onSubmit">
              <div class="grid gap-4 sm:grid-cols-2">
                <UFormField :label="$t('business.form.org')" required>
                  <UInput v-model="form.orgName" :placeholder="$t('business.form.orgPh')" class="w-full" />
                </UFormField>
                <UFormField :label="$t('business.form.contact')" required>
                  <UInput v-model="form.contactName" :placeholder="$t('business.form.contactPh')" class="w-full" />
                </UFormField>
                <UFormField :label="$t('business.form.phone')" required>
                  <UInput v-model="form.phone" type="tel" placeholder="+7 (700) 000-00-00" class="w-full" />
                </UFormField>
                <UFormField :label="$t('business.form.email')" required>
                  <UInput v-model="form.email" type="email" placeholder="team@company.kz" class="w-full" />
                </UFormField>
              </div>
              <UFormField :label="$t('business.form.slug')" :help="$t('business.form.slugHelp')">
                <UInput v-model="form.desiredSlug" placeholder="uib" class="w-full">
                  <template #trailing>
                    <span class="text-caption text-ink-gray-400">.inkmade.kz</span>
                  </template>
                </UInput>
              </UFormField>
              <UFormField :label="$t('business.form.audience')">
                <UInput v-model="form.audience" :placeholder="$t('business.form.audiencePh')" class="w-full" />
              </UFormField>
              <UFormField :label="$t('business.form.comment')">
                <UTextarea v-model="form.comment" :rows="3" :placeholder="$t('business.form.commentPh')" class="w-full" />
              </UFormField>
              <UiAppButton type="submit" variant="primary" size="lg" block :loading="sending">
                {{ $t('business.form.submit') }}
              </UiAppButton>
              <p class="text-caption text-ink-gray-400 text-center">{{ $t('business.form.privacy') }}</p>
            </form>
          </div>
        </UiReveal>
      </div>
    </section>
  </div>
</template>
