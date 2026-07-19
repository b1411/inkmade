// ─────────────────────────────────────────────────────────────────────────────
// Манифест медиа-слотов INKMADE (placeholder-first).
//
// Каждый слот описывает ОДНУ позицию под фото/видео на сайте. Пока реального
// файла нет — компонент UiMediaSlot рисует фирменную заглушку (градиент бренда +
// grain + силуэт), поэтому сайт остаётся цельным на любом этапе.
//
// Как подключить реальный медиа-файл:
//   1) Положите файл в public/<src> с именем из поля `src` (см. ниже).
//   2) Уберите `pending: true` у этого слота (или поставьте false).
//   3) Готово — слот сам подхватит файл, заглушка исчезнет.
//
// Соотношения: '4/5' карточки/вертикаль, '16/9' hero/видео, '1/1' макро/квадрат,
// '9/16' вертикальные баннеры (auth). Тон fallback: 'dark' (бордо) / 'light' (крем).
// ─────────────────────────────────────────────────────────────────────────────

export type MediaKind = 'image' | 'video'

export interface MediaAsset {
  /** Тип ассета. */
  kind: MediaKind
  /** Путь в /public, например '/media/hero/hero-home-desktop-v01.webp'. */
  src: string
  /** Постер-кадр для видео (показывается до/вместо проигрывания). */
  poster?: string
  /** Соотношение сторон CSS aspect-ratio, например '4/5'. */
  ratio?: string
  /** Тон фирменной заглушки. */
  tone?: 'dark' | 'light'
  /** Иконка Lucide в заглушке. */
  icon?: string
  /** Вписывание медиа. */
  fit?: 'cover' | 'contain'
  /** Короткий alt/описание (по умолчанию берётся generic). */
  alt?: string
  /**
   * Файл ещё не подготовлен → сразу рисуем заглушку, без сетевого запроса.
   * Снимите флаг, когда положите реальный файл в /public.
   */
  pending?: boolean
}

/**
 * Реестр всех медиа-слотов. Ключи сгруппированы по зонам сайта.
 * UiMediaSlot принимает ключ через prop `name`.
 */
export const MEDIA = {
  // ── Hero лендинга: одно главное медиа в рамке ──────────────────────────────
  'hero.main': { kind: 'image', src: '/media/hero/hero-home-desktop-v01.webp', ratio: '16/9', tone: 'dark', icon: 'i-lucide-shirt', fit: 'cover' },
  'hero.loop': { kind: 'image', src: '/media/products/blank/oversize-v01.webp', ratio: '4/5', tone: 'light', icon: 'i-lucide-shirt', fit: 'contain' },

  // ── Конструктор: видео-демо работы в браузере (главный дифференциатор) ──────
  // ratio 4/3 — секция рендерит горизонтально (десктоп-скринкаст), см. Constructor.vue.
  'constructor.demo': { kind: 'image', src: '/media/campaigns/audience-creators-v03.webp', ratio: '4/3', tone: 'dark', icon: 'i-lucide-wand-2', fit: 'cover' },

  // ── Категории: предметные фото изделий ─────────────────────────────────────
  'category.tshirt': { kind: 'image', src: '/media/products/blank/classic-black-v01.webp', ratio: '4/5', tone: 'light', icon: 'i-lucide-shirt', fit: 'cover' },
  'category.hoodie': { kind: 'image', src: '/media/products/blank/hoodie-v01.webp', ratio: '4/5', tone: 'light', icon: 'i-lucide-shirt', fit: 'cover' },
  'category.sweatshirt': { kind: 'image', src: '/media/products/blank/sweatshirt-v01.webp', ratio: '4/5', tone: 'light', icon: 'i-lucide-shirt', fit: 'cover' },
  'category.cap': { kind: 'image', src: '/media/products/blank/cap-v01.webp', ratio: '4/5', tone: 'light', icon: 'i-lucide-shopping-bag', fit: 'cover' },
  'category.bag': { kind: 'image', src: '/media/products/blank/tote-v01.webp', ratio: '4/5', tone: 'light', icon: 'i-lucide-shopping-bag', fit: 'contain' },

  // ── Методы печати: макро-фото результата (секция рендерит 4/3, см. Methods.vue) ──
  'method.dtg': { kind: 'image', src: '/media/products/detail/print-texture-v01.webp', ratio: '16/9', tone: 'dark', icon: 'i-lucide-printer', fit: 'cover' },
  'method.dtf': { kind: 'image', src: '/media/products/detail/print-texture-v01.webp', ratio: '1/1', tone: 'dark', icon: 'i-lucide-layers', fit: 'cover' },
  'method.sublimation': { kind: 'image', src: '/media/products/detail/print-texture-v01.webp', ratio: '4/3', tone: 'dark', icon: 'i-lucide-shirt', fit: 'cover' },

  // ── Блок дизайнеров: коллаж принтов ────────────────────────────────────────
  'designers.print-1': { kind: 'image', src: '/media/campaigns/audience-events-v03.webp', ratio: '4/5', tone: 'dark', icon: 'i-lucide-palette', fit: 'cover' },
  'designers.print-2': { kind: 'image', src: '/media/campaigns/audience-campus-v03.webp', ratio: '4/5', tone: 'dark', icon: 'i-lucide-palette', fit: 'cover' },
  'designers.print-3': { kind: 'image', src: '/media/campaigns/audience-sport-v03.webp', ratio: '4/5', tone: 'dark', icon: 'i-lucide-palette', fit: 'cover' },

  // ── Предметная матрица основ. Настоящие UGC добавляются только после съёмки. ──
  'ugc.1': { kind: 'image', src: '/media/products/blank/classic-v01.webp', ratio: '4/5', tone: 'light', icon: 'i-lucide-shirt', fit: 'contain' },
  'ugc.2': { kind: 'image', src: '/media/products/blank/oversize-v01.webp', ratio: '4/5', tone: 'light', icon: 'i-lucide-shirt', fit: 'contain' },
  'ugc.3': { kind: 'image', src: '/media/products/blank/polo-v01.webp', ratio: '4/5', tone: 'light', icon: 'i-lucide-shirt', fit: 'contain' },
  'ugc.4': { kind: 'image', src: '/media/products/blank/sweatshirt-v01.webp', ratio: '4/5', tone: 'light', icon: 'i-lucide-shirt', fit: 'contain' },
  'ugc.5': { kind: 'image', src: '/media/products/blank/hoodie-v01.webp', ratio: '4/5', tone: 'light', icon: 'i-lucide-shirt', fit: 'contain' },
  'ugc.6': { kind: 'image', src: '/media/products/blank/cap-v01.webp', ratio: '4/5', tone: 'light', icon: 'i-lucide-shirt', fit: 'contain' },

  // ── Auth: атмосферный вертикальный визуал левой панели ─────────────────────
  'auth.visual': { kind: 'image', src: '/media/auth/auth-visual-v01.webp', ratio: '9/16', tone: 'dark', icon: 'i-lucide-image', fit: 'cover' },
} as const satisfies Record<string, MediaAsset>

export type MediaName = keyof typeof MEDIA

export function getMedia(name: MediaName): MediaAsset {
  return MEDIA[name]
}
