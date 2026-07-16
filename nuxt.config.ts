// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // Nuxt 4: srcDir = app/ по умолчанию (см. паспорт §4)
  future: { compatibilityVersion: 4 },
  devtools: { enabled: process.env.NODE_ENV === 'development' },

  // Дизайн светлый (кремовая палитра, §2.2) — фиксируем светлую тему Nuxt UI,
  // иначе при тёмной системной теме компоненты (поля, меню) рендерятся тёмными
  // поверх нашего светлого фона. Тёмный контекст задаём точечно классами (ink-black).
  colorMode: {
    preference: 'light',
    fallback: 'light',
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxt/fonts',
    '@nuxtjs/supabase',
    '@nuxt/image',
    '@nuxtjs/i18n',
    '@vueuse/motion/nuxt',
    '@formkit/auto-animate/nuxt',
  ],

  // ESLint: используем стилевые правила из @nuxt/eslint, форматирование отдаём
  // Prettier (eslint-config-prettier гасит конфликтующие правила в eslint.config.mjs).
  eslint: {
    config: { stylistic: false },
  },

  css: ['~/assets/css/main.css'],

  // i18n: двуязычие RU/KK. Русский — по умолчанию и без префикса в URL
  // (strategy: 'no_prefix'), казахский — переключателем в шапке, выбор хранится
  // в cookie. Строки разбиты по зонам (namespace-файлы) — см. i18n/locales/{ru,kk}/*.
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'ru',
    locales: [
      {
        code: 'ru',
        language: 'ru-RU',
        name: 'Русский',
        files: [
          'ru/common.json',
          'ru/domain.json',
          'ru/auth.json',
          'ru/landing.json',
          'ru/business.json',
          'ru/shop.json',
          'ru/shopadmin.json',
          'ru/catalog.json',
          'ru/product.json',
          'ru/customize.json',
          'ru/cart.json',
          'ru/account.json',
          'ru/legal.json',
          'ru/admin.json',
          'ru/admincat.json',
          'ru/studio.json',
        ],
      },
      {
        code: 'kk',
        language: 'kk-KZ',
        name: 'Қазақша',
        files: [
          'kk/common.json',
          'kk/domain.json',
          'kk/auth.json',
          'kk/landing.json',
          'kk/business.json',
          'kk/shop.json',
          'kk/shopadmin.json',
          'kk/catalog.json',
          'kk/product.json',
          'kk/customize.json',
          'kk/cart.json',
          'kk/account.json',
          'kk/legal.json',
          'kk/admin.json',
          'kk/admincat.json',
          'kk/studio.json',
        ],
      },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'inkmade_lang',
      // strategy 'no_prefix': по документации i18n redirectOn 'root' действует только
      // для стратегий С префиксом. Для no_prefix корректное значение — 'all', а
      // alwaysRedirect гарантирует, что выбранная и сохранённая в cookie локаль
      // применяется на КАЖДОМ запросе/маршруте (а не только при первом заходе на /).
      redirectOn: 'all',
      alwaysRedirect: true,
      fallbackLocale: 'ru',
    },
  },

  // @nuxt/image (§3.3): оптимизация WebP/lazy/responsive. Фото товаров лежат в
  // Supabase Storage — разрешаем домен для внешней оптимизации.
  image: {
    domains: ['jpxiuyinqhokzzcqbggf.supabase.co'],
    format: ['webp'],
  },

  // Supabase (§3.2). redirect:false — гостевой поток без принудительного логина (§9.1).
  // Доступ к кабинетам закрываем собственными middleware (F0-13), а не глобальным редиректом.
  supabase: {
    url: process.env.NUXT_PUBLIC_SUPABASE_URL,
    key: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    redirect: false,
  },

  // §3.8: публичные ключи — в браузер; секреты (service role, платёжные) — только сервер.
  runtimeConfig: {
    // приватные — доступны ТОЛЬКО в серверном слое (Nitro / Edge)
    paymentMerchantId: process.env.PAYMENT_MERCHANT_ID,
    paymentSecretKey: process.env.PAYMENT_SECRET_KEY,
    paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
    // AI-генерация принтов (§AI). Ключ провайдера — только сервер. Провайдер сменяемый
    // (fal/Ideogram по умолчанию; Recraft/Flux — сменой AI_IMAGE_PROVIDER/AI_IMAGE_MODEL).
    aiImageApiKey: process.env.FAL_KEY,
    aiImageProvider: process.env.AI_IMAGE_PROVIDER || 'fal-ideogram',
    aiImageModel: process.env.AI_IMAGE_MODEL || 'fal-ai/ideogram/v3',
    aiImageTier: process.env.AI_IMAGE_TIER || 'BALANCED',
    aiMonthlyQuota: Number(process.env.AI_MONTHLY_QUOTA) || 5,
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL,
      metaPixelId: process.env.NUXT_PUBLIC_META_PIXEL_ID,
      tiktokPixelId: process.env.NUXT_PUBLIC_TIKTOK_PIXEL_ID,
      analyticsId: process.env.NUXT_PUBLIC_ANALYTICS_ID,
    },
  },

  // Фирменные шрифты — спека §4.1 (production default).
  // Логотип шрифтом НЕ набирается — это векторная надпись (public/logo-*.svg,
  // режется npm run logo), поэтому смена гарнитуры его не затрагивает.
  fonts: {
    // только каркас UI/бренда. ~200 шрифтов принта грузятся по требованию
    // (app/composables/useFontLoader.ts) — предзагрузка всех убила бы страницу.
    defaults: { subsets: ['latin', 'cyrillic'] },
    families: [
      // Дисплейный: Inter Tight — плотный гротеск под трекинг -0.045em и вес 900
      // (спека §4.2). Заменил Unbounded: у того широкая геометрическая проводка,
      // она не даёт «сжатый» редакционный заголовок из макета.
      { name: 'Inter Tight', provider: 'google', weights: [700, 800, 900] },
      // UI/body — спека §4.1. Полная кириллица + казахские знаки.
      { name: 'Inter', provider: 'google', weights: [400, 500, 600, 700] },
      // Технические лейблы INK SYSTEM: Design ID, координаты, placement (§36.2).
      { name: 'Space Mono', provider: 'google' },
    ],
  },

  app: {
    // Переходы между страницами (§4.5 ТЗ): fade + лёгкий slide-up. Ощущение единого
    // приложения, не перезагрузки. Под prefers-reduced-motion CSS гасит transform/opacity.
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      // lang выставляется динамически от локали i18n (см. app/app.vue)
      title: 'INKMADE — Merch Studio',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        // Тон системного UI мобильных браузеров — бренд-бордо верхней инфо-полосы
        // (спека §3.1, §8). Обновлён на канонический #7E1F2D.
        { name: 'theme-color', content: '#7E1F2D' },
      ],
      link: [
        // Бренд-знак — круглый «INK» (§0.1 медиа-брифа). Вектор идёт первым: браузер с
        // поддержкой SVG отрисует его чётко на любом размере и не будет мылить 16px.
        // .ico — запасной для Safari и старых браузеров, там же кадры 16/32/48.
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        // PWA-манифест: устанавливаемость + имя/тема на Android
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
    },
  },

  // Заголовки безопасности (P2.12). CSP подобрана так, чтобы не ломать:
  // Supabase REST/Realtime (wss), Google Fonts, Konva (canvas), пиксели Meta/TikTok/GA.
  // Nuxt-гидрация требует 'unsafe-inline' в script-src (inline payload).
  nitro: {
    routeRules: {
      '/**': {
        headers: {
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          'Content-Security-Policy': [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data: https://fonts.gstatic.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "script-src 'self' 'unsafe-inline' https://connect.facebook.net https://analytics.tiktok.com https://www.googletagmanager.com https://www.google-analytics.com",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.facebook.com https://analytics.tiktok.com https://www.google-analytics.com",
            "frame-src 'self'",
          ].join('; '),
        },
      },
    },
  },
})
