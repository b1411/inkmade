<script setup lang="ts">
const { t, locale } = useI18n()
const user = useSupabaseUser()
const { public: { siteUrl } } = useRuntimeConfig()
const site = (siteUrl as string) || 'https://inkmade.kz'

const startTo = computed(() => (user.value ? '/shop-new' : '/login?redirect=/shop-new'))
const { getMine } = useMyShop()
const { data: myShop } = await useAsyncData(
  'business-my-shop',
  () => (user.value ? getMine() : Promise.resolve(null)),
  { watch: [user] }
)

useSeoMeta({
  title: t('business.seo.title'),
  description: t('business.seo.description'),
  ogTitle: t('business.seo.title'),
  ogDescription: t('business.seo.description'),
  ogType: 'website',
  ogUrl: `${site}/business`
})

const steps = computed(() => [0, 1, 2].map(i => ({
  icon: ['i-lucide-send', 'i-lucide-store', 'i-lucide-truck'][i]!,
  title: t(`business.cta.steps[${i}].title`),
  text: t(`business.cta.steps[${i}].text`)
})))
const benefits = computed(() => [0, 1, 2, 3, 4, 5].map(i => ({
  icon: ['i-lucide-wallet', 'i-lucide-package-open', 'i-lucide-palette', 'i-lucide-percent', 'i-lucide-shield-check', 'i-lucide-bar-chart-3'][i]!,
  title: t(`business.benefits[${i}].title`),
  text: t(`business.benefits[${i}].text`)
})))
const faq = computed(() => [0, 1, 2, 3, 4].map(i => ({
  q: t(`business.faq.items[${i}].q`),
  a: t(`business.faq.items[${i}].a`)
})))
const startPoints = computed(() => [0, 1, 2].map(i => t(`business.start.points[${i}]`)))

const audiences = computed(() => {
  const ru = ['Университетам и школам', 'Компаниям и стартапам', 'Креаторам и блогерам', 'Спортивным командам', 'Ивентам и фестивалям', 'Crew и сообществам']
  const kk = ['Университеттер мен мектептерге', 'Компаниялар мен стартаптарға', 'Креаторлар мен блогерлерге', 'Спорт командаларына', 'Ивенттер мен фестивальдерге', 'Crew және қауымдастықтарға']
  const titles = locale.value === 'kk' ? kk : ru
  const images = ['campus', 'startup', 'creators', 'sport', 'events', 'community']
  const icons = ['i-lucide-landmark', 'i-lucide-building-2', 'i-lucide-podcast', 'i-lucide-trophy', 'i-lucide-party-popper', 'i-lucide-users-round']
  return titles.map((title, index) => ({ title, image: `/media/campaigns/audience-${images[index]}-v03.webp`, icon: icons[index] }))
})

const merch = computed(() => [
  { title: locale.value === 'kk' ? 'Oversize худи' : 'Худи Oversize', price: 19990, src: '/media/products/blank/hoodie-v01.webp' },
  { title: locale.value === 'kk' ? 'Oversize футболка' : 'Футболка Oversize', price: 9990, src: '/media/products/blank/oversize-v01.webp' },
  { title: locale.value === 'kk' ? 'INKMADE кепкасы' : 'Кепка INKMADE', price: 5990, src: '/media/products/blank/cap-v01.webp' },
  { title: locale.value === 'kk' ? 'Relaxed поло' : 'Поло Relaxed', price: 8990, src: '/media/products/blank/polo-v01.webp' }
])

const copy = computed(() => locale.value === 'kk'
  ? {
      heroTitle: 'Кигің келетін мерч-дүкен.',
      heroSecondary: 'Мысалдарды көру',
      proof: ['Премиум сапа', '1 данадан баспа', 'Артық қорсыз', 'ҚР бойынша жеткізу'],
      audiencesLabel: 'Кімге арналған',
      audiencesTitle: 'Адамдарды біріктіретін мерч.',
      economyLabel: 'Адал экономика',
      economyTitle: 'Көбірек сатасыз — көбірек табасыз.',
      cost: 'Oversize худидің өзіндік құны',
      markup: 'Сіздің үстемеңіз',
      client: 'Клиент бағасы',
      profit: '1 сатылымнан пайда',
      merchLabel: 'Кигің келетін мерч',
      faqLabel: 'Сұрақтар және іске қосу'
    }
  : {
      heroTitle: 'Мерч-магазин, который хотят носить.',
      heroSecondary: 'Смотреть примеры',
      proof: ['Премиальное качество', 'Печать от 1 вещи', 'Без перепродаж', 'Доставка по Казахстану'],
      audiencesLabel: 'Кому подойдёт',
      audiencesTitle: 'Создавайте мерч, который объединяет.',
      economyLabel: 'Честная экономика',
      economyTitle: 'Больше продаёте — больше зарабатываете.',
      cost: 'Себестоимость худи Oversize',
      markup: 'Ваша наценка',
      client: 'Цена для клиента',
      profit: 'Прибыль с 1 продажи',
      merchLabel: 'Мерч, который хотят носить',
      faqLabel: 'Вопросы и запуск'
    })
</script>

<template>
  <div class="w-screen ml-[calc(50%-50vw)] bg-ink-bone text-ink-text-dark">
    <section class="relative min-h-[640px] overflow-hidden bg-ink-black text-white lg:min-h-[720px]" aria-labelledby="business-title">
      <NuxtImg src="/media/campaigns/merch-system-v02.webp" alt="Чёрная мерч-капсула для команды" class="absolute inset-0 size-full object-cover object-center" sizes="100vw" loading="eager" fetchpriority="high" />
      <div class="absolute inset-0 bg-[linear-gradient(90deg,#080b0d_0%,rgba(8,11,13,.98)_30%,rgba(8,11,13,.72)_50%,rgba(8,11,13,.08)_82%)]" />
      <div class="relative mx-auto flex min-h-[640px] max-w-(--container-max) flex-col justify-end px-4 pb-14 pt-24 lg:min-h-[720px] lg:justify-center lg:pb-20">
        <div class="max-w-2xl">
          <UiSectionLabel class="text-white/55">{{ $t('business.hero.label') }} / B2B</UiSectionLabel>
          <h1 id="business-title" :key="locale" class="ink-display mt-4 text-[clamp(3.4rem,7vw,7.4rem)] leading-[.8] tracking-[-.055em]">{{ copy.heroTitle }}</h1>
          <p class="mt-6 max-w-xl text-base leading-relaxed text-white/72 sm:text-lg">{{ $t('business.hero.subtitle') }}</p>
          <div class="mt-8 flex flex-wrap gap-3">
            <UiAppButton to="#apply" variant="primary" size="xl" on-dark trailing-icon="i-lucide-arrow-right">{{ $t('business.hero.cta') }}</UiAppButton>
            <UiAppButton to="#examples" variant="secondary" size="xl" on-dark>{{ copy.heroSecondary }}</UiAppButton>
          </div>
        </div>
      </div>
      <div class="absolute inset-x-0 bottom-0 hidden border-t border-white/10 bg-black/45 backdrop-blur-sm lg:block">
        <div class="mx-auto grid max-w-(--container-max) grid-cols-4 px-4">
          <div v-for="(item, index) in copy.proof" :key="item" class="flex min-h-14 items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[.1em] text-white/60" :class="index ? 'border-l border-white/10' : ''">
            <UIcon :name="['i-lucide-badge-check','i-lucide-package-open','i-lucide-box','i-lucide-truck'][index]" class="size-4 text-ink-burgundy-hover" />
            {{ item }}
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-(--container-max) px-4 py-14 lg:py-20">
      <div class="grid gap-8 lg:grid-cols-12">
        <div class="lg:col-span-5">
          <UiSectionLabel accent>{{ $t('business.benefitsLabel') }}</UiSectionLabel>
          <h2 class="ink-display mt-3 text-h1">{{ $t('business.benefitsTitle') }}</h2>
          <div class="mt-8 grid gap-x-7 gap-y-6 sm:grid-cols-2">
            <article v-for="benefit in benefits" :key="benefit.title" class="border-t border-black/10 pt-4">
              <div class="flex items-center gap-3">
                <span class="grid size-9 place-items-center rounded-full bg-ink-burgundy text-white"><UIcon :name="benefit.icon" class="size-4" /></span>
                <h3 class="font-bold">{{ benefit.title }}</h3>
              </div>
              <p class="mt-3 text-sm leading-relaxed text-ink-text-dark-soft">{{ benefit.text }}</p>
            </article>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-[1.7fr_1fr] lg:col-span-7">
          <div class="relative min-h-[520px] overflow-hidden bg-[#d9d5ce]">
            <NuxtImg src="/media/products/blank/tote-v01.webp" alt="Шоппер для коллекции команды, предметный вид" class="absolute inset-0 size-full object-contain p-8 sm:p-12" sizes="760px" loading="lazy" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div class="absolute inset-x-0 bottom-0 p-6 text-white">
              <p class="font-mono text-[10px] uppercase tracking-[.14em] text-white/55">COLLECTION / PREVIEW 001</p>
              <p class="ink-display mt-2 max-w-sm text-4xl">Основа для цельной коллекции команды.</p>
            </div>
          </div>
          <div class="border border-black/10 bg-ink-raised p-3 text-white">
            <div class="flex items-center justify-between border-b border-white/10 px-2 pb-3">
              <p class="font-mono text-[10px] uppercase tracking-[.12em] text-white/55">Товары</p>
              <span class="size-2 rounded-full bg-ink-burgundy-hover" />
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-1">
              <div v-for="item in merch.slice(0, 3)" :key="item.title" class="bg-ink-card p-2 text-ink-black">
                <NuxtImg :src="item.src" :alt="item.title" class="aspect-square w-full object-cover" sizes="180px" />
                <p class="mt-2 text-xs font-bold">{{ item.title }}</p>
                <p class="font-mono text-[9px] text-black/55">{{ formatPrice(item.price) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="border-y border-black/10 bg-ink-card">
      <div class="mx-auto max-w-(--container-max) px-4 py-10">
        <UiSectionLabel accent>{{ $t('business.how.label') }}</UiSectionLabel>
        <div class="mt-5 grid gap-6 lg:grid-cols-[1fr_1fr_1fr_1.25fr]">
          <article v-for="(step, index) in steps" :key="step.title" class="relative border-t border-black/15 pt-4 lg:border-r lg:border-t-0 lg:pr-6">
            <span class="font-mono text-xs text-ink-burgundy">0{{ index + 1 }}</span>
            <h3 class="mt-2 font-display text-xl font-black uppercase">{{ step.title }}</h3>
            <p class="mt-2 text-sm text-ink-text-dark-soft">{{ step.text }}</p>
          </article>
          <div class="bg-ink-burgundy p-6 text-white">
            <p class="font-mono text-[10px] uppercase tracking-[.12em] text-white/70">START / 3 DAYS</p>
            <p class="font-display mt-2 text-2xl font-black uppercase">{{ $t('business.start.title') }}</p>
            <UiAppButton to="#apply" variant="secondary" size="md" on-dark class="mt-5" trailing-icon="i-lucide-arrow-right">{{ $t('business.hero.cta') }}</UiAppButton>
          </div>
        </div>
      </div>
    </section>

    <section id="examples" class="mx-auto max-w-(--container-max) px-4 py-14 lg:py-20">
      <UiSectionLabel accent>{{ copy.audiencesLabel }}</UiSectionLabel>
      <h2 class="ink-display mt-3 text-h1">{{ copy.audiencesTitle }}</h2>
      <div class="mt-7 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 lg:grid lg:grid-cols-6 lg:overflow-visible lg:pb-0">
        <article v-for="audience in audiences" :key="audience.title" class="group relative aspect-[.76] min-w-[68vw] snap-start overflow-hidden bg-ink-black sm:min-w-[36vw] lg:min-w-0">
          <NuxtImg :src="audience.image" :alt="`Команда INKMADE: ${audience.title}`" class="absolute inset-0 size-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]" sizes="(max-width: 1023px) 70vw, 240px" loading="lazy" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
          <div class="absolute inset-x-0 bottom-0 p-4 text-white">
            <UIcon :name="audience.icon" class="size-6 text-white/75" />
            <p class="mt-3 font-display text-xl font-black uppercase leading-[.92]">{{ audience.title }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="border-y border-black/10 bg-ink-card">
      <div class="mx-auto max-w-(--container-max) px-4 py-12">
        <UiSectionLabel accent>{{ copy.economyLabel }}</UiSectionLabel>
        <h2 class="ink-display mt-2 max-w-2xl text-h2">{{ copy.economyTitle }}</h2>
        <div class="mt-8 grid border border-black/10 sm:grid-cols-2 lg:grid-cols-4">
          <div class="p-5 lg:p-7">
            <p class="text-xs uppercase text-ink-text-dark-soft">{{ copy.cost }}</p>
            <p class="mt-3 font-display text-3xl font-black">11 990 ₸</p>
          </div>
          <div class="border-t border-black/10 p-5 sm:border-l sm:border-t-0 lg:p-7">
            <p class="text-xs uppercase text-ink-text-dark-soft">{{ copy.markup }}</p>
            <p class="mt-3 font-display text-3xl font-black">+ 8 000 ₸</p>
          </div>
          <div class="border-t border-black/10 p-5 lg:border-l lg:border-t-0 lg:p-7">
            <p class="text-xs uppercase text-ink-text-dark-soft">{{ copy.client }}</p>
            <p class="mt-3 font-display text-3xl font-black">19 990 ₸</p>
          </div>
          <div class="bg-ink-burgundy p-5 text-white sm:border-l sm:border-black/10 lg:p-7">
            <p class="text-xs uppercase text-white/65">{{ copy.profit }}</p>
            <p class="mt-3 font-display text-4xl font-black">8 000 ₸</p>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-(--container-max) px-4 py-14 lg:py-20">
      <UiSectionLabel accent>{{ copy.merchLabel }}</UiSectionLabel>
      <div class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article v-for="item in merch" :key="item.title" class="border border-black/10 bg-ink-card">
          <NuxtImg :src="item.src" :alt="`${item.title}, предметный вид`" class="aspect-[4/5] w-full bg-[#d9d5ce] object-contain p-4" sizes="(max-width: 1023px) 50vw, 350px" loading="lazy" />
          <div class="p-4">
            <p class="font-bold">{{ item.title }}</p>
            <p class="mt-1 font-mono text-[10px] text-ink-text-dark-soft">{{ formatPrice(item.price) }}</p>
          </div>
        </article>
      </div>
    </section>

    <section id="apply" class="bg-ink-black text-white" style="scroll-margin-top: 80px">
      <div class="mx-auto grid max-w-(--container-max) gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <UiSectionLabel class="text-white/45">{{ copy.faqLabel }}</UiSectionLabel>
          <h2 class="ink-display mt-3 text-h1">{{ $t('business.start.title') }}</h2>
          <p class="mt-4 max-w-xl text-ink-text-soft">{{ $t('business.start.subtitle') }}</p>
          <div class="mt-8 space-y-2">
            <details v-for="item in faq" :key="item.q" class="group border border-white/10 bg-ink-panel px-5 py-4">
              <summary class="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                {{ item.q }}
                <UIcon name="i-lucide-plus" class="size-4 text-white/45 transition-transform group-open:rotate-45" />
              </summary>
              <p class="mt-3 text-sm leading-relaxed text-ink-text-soft">{{ item.a }}</p>
            </details>
          </div>
        </div>

        <div class="self-start border border-white/10 bg-ink-panel p-6 sm:p-9">
          <div class="grid size-14 place-items-center bg-ink-burgundy"><UIcon name="i-lucide-store" class="size-7" /></div>
          <h3 class="ink-display mt-6 text-h2">{{ $t('business.cta.title') }}</h3>
          <ul class="mt-6 space-y-3">
            <li v-for="point in startPoints" :key="point" class="flex items-start gap-3 text-ink-text-soft">
              <UIcon name="i-lucide-check" class="mt-0.5 size-5 shrink-0 text-emerald-400" />{{ point }}
            </li>
          </ul>
          <template v-if="myShop">
            <p class="mt-7 text-ink-text-soft">{{ $t('business.start.hasShop') }}</p>
            <UiAppButton to="/shop-admin" variant="primary" size="xl" block class="mt-3">{{ $t('business.start.toCabinet') }}</UiAppButton>
          </template>
          <UiAppButton v-else :to="startTo" variant="primary" size="xl" block class="mt-8" trailing-icon="i-lucide-arrow-right">{{ $t('business.start.action') }}</UiAppButton>
          <p class="mt-4 text-center text-xs text-white/55">{{ $t('business.cta.note') }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
