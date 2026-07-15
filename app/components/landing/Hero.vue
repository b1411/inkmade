<script setup lang="ts">
// Hero — спека §10. Среда Ink Black, высота артборда 480 (§10.1) вместо прежней
// «на сколько хватит контента». Бордо осталось ТОЛЬКО в primary CTA (§10.3):
// заливка бордо во весь экран нарушала главное правило §3.3 (акцент ≤8–12%).
//
// ФОТО. Кадры сняты по §10.4 и режутся из мастеров скриптом `npm run hero`
// (scripts/gen-hero.mjs): мастера в design/ вне репозитория, отдаются AVIF+WebP
// из public/media/hero. Мастер desktop — 1672×941 против 2560×1440 по §10.4, то
// есть на retina-экране кадр будет мягковат; исправляется только перегенерацией
// мастера в большем размере, код тут ни при чём.
//
// Desktop и mobile — РАЗНЫЕ файлы, а не один кадр с разным object-position: этого
// прямо требует §27, и композиции у них правда разные (§10.4). Отсюда нативный
// <picture> с media-условиями: браузер грузит ровно один кадр, что и просит §29.
//
// Кадр занимает правые ~72%, а не всю ширину: по §10.2 фото живёт в колонках 5–12.
// Левым краем он уходит под непрозрачную часть --ink-overlay-hero, а так как в самой
// фотографии левая треть тёмная (§10.4), стык с Ink Black не виден.
//
// GSAP timeline входа (§8): лейбл → заголовок по строкам → подзаголовок → кнопки
// (overshoot) → координаты. Под гейтом reduced-motion; начальное скрытие — .hero-anim.
import { FEATURES } from '~~/shared/config/features'

const { t, locale } = useI18n()
const { number: fmtNum } = useFormat()
const supabase = useSupabaseClient()
const { get } = useSettings()

const [{ data: featured }, { data: content }, { data: minPrice }] = await Promise.all([
  useAsyncData('hero-featured', async () => {
    const { data } = await supabase
      .from('products')
      .select('alias')
      .eq('is_active', true)
      .not('alias', 'is', null)
      .order('is_featured', { ascending: false }) // витринный товар для ссылки CTA (миграция 0050)
      .limit(1)
      .maybeSingle()
    return data
  }),
  // CMS-оверрайд заголовка/подзаголовка применяем ТОЛЬКО при включённом контент-
  // редакторе (advancedAdmin). Значение в settings — единая строка без локализации,
  // иначе RU-текст перекрывал бы корректный перевод и на KK. См. shared/config/features.
  useAsyncData('hero-content', async () => {
    if (!FEATURES.advancedAdmin) return { title: null, subtitle: null }
    return {
      title: (await get<string>('landing.hero_title')) ?? null,
      subtitle: (await get<string>('landing.hero_subtitle')) ?? null,
    }
  }),
  // Ценовой якорь «от N ₸»: минимальная базовая цена среди активных товаров.
  // Берём из БД, чтобы цифра всегда была честной и не требовала ручной правки.
  useAsyncData('hero-min-price', async () => {
    const { data } = await supabase
      .from('products')
      .select('base_price')
      .eq('is_active', true)
      .gt('base_price', 0)
      .order('base_price', { ascending: true })
      .limit(1)
      .maybeSingle()
    return data?.base_price ?? null
  }),
])

// CMS-оверрайд заголовка/подзаголовка — ОДНА строка без локализации, поэтому применяем
// его ТОЛЬКО для локали по умолчанию (ru). Иначе RU-текст перекрывает корректный перевод
// на KK (заголовок «застывал» по-русски). `||` (а не `??`) — пустой оверрайд («») тоже
// откатывается на i18n, иначе подзаголовок рендерился пустым.
const heroTitle = computed(() => (locale.value === 'ru' && content.value?.title) || t('landing.hero.title'))
const heroSubtitle = computed(() => (locale.value === 'ru' && content.value?.subtitle) || t('landing.hero.subtitle'))
const createTo = computed(() => (featured.value?.alias ? `/customize/${featured.value.alias}` : '/catalog'))
// «от N ₸» — пусто, если в БД ещё нет цен (тогда note показывает только логистику).
const priceFrom = computed(() =>
  minPrice.value
    ? t('landing.hero.priceFrom', { price: fmtNum(minPrice.value) })
    : '',
)

const root = ref<HTMLElement | null>(null)
const animate = ref(false)
const prefersReduced = useReducedMotion()
let ctx: { revert: () => void } | null = null

onMounted(() => {
  if (prefersReduced.value) return

  // Гейт по времени гидрации. SSR отдаёт hero уже видимым (класса .hero-anim на
  // сервере нет), а вход прячет контент в opacity 0 и проявляет заново. Если
  // гидрация пришла поздно — на медленной сети или слабом устройстве — пользователь
  // успел увидеть заголовок и CTA, и вход выглядит как моргание готовой страницы
  // в пустоту. §21 запрещает вход, отделяющий пользователя от CTA, поэтому после
  // порога просто не анимируем: контент остаётся на месте. Порог с запасом к
  // типичной гидрации (~300–800 мс от старта навигации).
  if (performance.now() > 1200) return

  const gsap = useNuxtApp().$gsap as typeof import('gsap').gsap | undefined
  // template-ref выводится vue-tsc структурно (конфликт CSSOM) — приводим к HTMLElement.
  const el = root.value as HTMLElement | null
  if (!gsap || !el) return

  animate.value = true // включаем .hero-anim (начальное скрытие) синхронно перед таймлайном

  ctx = gsap.context(() => {
    const q = (s: string) => Array.from(el.querySelectorAll(s)) as HTMLElement[]
    gsap.set(q('[data-hero-y]'), { y: 24 })

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.to(q('[data-hero="label"]'), { opacity: 1, y: 0, duration: 0.5 })
      .to(q('[data-hero="line"]'), { opacity: 1, y: 0, duration: 0.7, stagger: 0.08 }, '-=0.2')
      .to(q('[data-hero="sub"]'), { opacity: 1, y: 0, duration: 0.5 }, '-=0.35')
      .to(q('[data-hero="cta"]'), { opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.6)' }, '-=0.25')
      .to(q('[data-hero="note"]'), { opacity: 1, duration: 0.4 }, '-=0.2')
    // Параллакс снят вместе с фото — двигать было нечего. Вернуть вместе со слоем кадра.
  }, el)
})
onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <section
    ref="root"
    class="hero-artboard ink-grain w-screen ml-[calc(50%-50vw)] bg-ink-black text-ink-text relative overflow-hidden flex items-end lg:items-center"
    :class="{ 'hero-anim': animate }"
  >
    <!-- Кадр. На мобильном — во всю ширину (текст уходит вниз под вертикальный
         градиент), с lg — правые 72% под колонки 5–12 (§10.2). -->
    <div class="absolute inset-y-0 right-0 w-full lg:w-[72%] pointer-events-none select-none">
      <picture>
        <source
          media="(min-width: 1024px)"
          type="image/avif"
          srcset="/media/hero/hero-home-desktop-v01.avif"
        >
        <source
          media="(min-width: 1024px)"
          type="image/webp"
          srcset="/media/hero/hero-home-desktop-v01.webp"
        >
        <source type="image/avif" srcset="/media/hero/hero-home-mobile-v01.avif">
        <source type="image/webp" srcset="/media/hero/hero-home-mobile-v01.webp">
        <!-- object-position: на десктопе кадр 16:9 в полосе 3:1 режется по высоте
             сильно — держим верх, иначе отрезает лица. Кадр декоративный: смысл
             несёт H1 рядом, поэтому alt пустой + aria-hidden (§28: alt описывает
             изделие, а не маркетинговую картинку). -->
        <img
          src="/media/hero/hero-home-desktop-v01.webp"
          alt=""
          aria-hidden="true"
          fetchpriority="high"
          decoding="async"
          class="size-full object-cover object-[50%_18%] lg:object-[50%_14%]"
        >
      </picture>
    </div>

    <!-- Затемнение §10.4 -->
    <div class="hero-overlay absolute inset-0 pointer-events-none" />

    <!-- pt-16 на десктопе = высота фикс-шапки (64px, §9): она лежит ПОВЕРХ hero,
         и без компенсации flex-центрирование считает её площадь своей — лейбл и
         верх H1 уезжали под шапку. -->
    <!-- Мобильный: pb маленький, чтобы текстовый блок сел ниже и отдал верх кадру
         (§10.4 хочет модели в верхних 58–62%). Полностью норму этим не выбрать —
         упирается в длину копирайта, а не в отступы: у §10.2 hero куда короче. -->
    <div class="relative w-full mx-auto max-w-(--container-max) px-4 pt-10 pb-6 lg:pt-16 lg:pb-0">
      <!-- Текст — max-width 520px (§10.2). Жёсткой доли в 5 колонок нет намеренно:
           на 1024 она давала колонку 413px, H1 66px рвался на лишние строки и
           артборд разбухал до 574 вместо 420–470 (§10.1). max-width решает ту же
           задачу — держит текст вне правой зоны под будущее фото — но не сжимает
           колонку там, где ширины и так мало. -->
      <div class="max-w-[520px]">
        <p data-hero="label" data-hero-y class="ink-label text-ink-text-soft">
          {{ $t('landing.hero.label') }}
        </p>
        <h1 data-hero="line" data-hero-y class="ink-hero text-hero mt-4">
          {{ heroTitle }}
        </h1>
        <p data-hero="sub" data-hero-y class="text-lead mt-5 text-ink-text-soft">
          {{ heroSubtitle }}
        </p>
        <div data-hero="cta" data-hero-y class="flex flex-wrap gap-3 mt-7">
          <!-- primary БЕЗ on-dark: §10.3 требует здесь бордо. on-dark залил бы
               кнопку bone, и единственный акцент экрана исчез бы. -->
          <UiAppButton :to="createTo" variant="primary" size="lg" magnetic>
            {{ $t('landing.hero.createCta') }}
          </UiAppButton>
          <UiAppButton to="/catalog" variant="secondary" size="lg" on-dark>
            {{ $t('landing.hero.catalogCta') }}
          </UiAppButton>
        </div>
        <p data-hero="note" class="ink-label text-ink-text-muted mt-6">
          <span v-if="priceFrom" class="text-ink-text-soft">{{ priceFrom }} · </span>{{ $t('landing.hero.note') }}
        </p>
      </div>
    </div>

    <!-- Координаты — INK SYSTEM (§36.2). Один набор на экран (§36.3), Bone 58% (§10.3).
         text-right обязателен: текстовый блок при высоте 480 достаёт низом почти до
         края артборда, и по центру координаты печатались ровно поверх строки с ценой.
         Правый край свободен — фото там нет. Прячем на мобильном: 390px ширины на
         две микроподписи не хватает, они бы снова столкнулись. -->
    <p
      data-hero="note"
      class="ink-label hidden lg:block absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-(--container-max) px-4 text-right text-ink-bone/58 pointer-events-none"
    >
      43.2389° N, 76.8897° E · ALMATY, KAZAKHSTAN
    </p>
  </section>
</template>
