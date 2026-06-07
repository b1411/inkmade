// INKMADE — версии юридических документов и согласий (master §17.1, §24).
// Версия привязывает запись в user_consents к конкретной редакции документа —
// без неё нельзя доказать, какую именно редакцию принял пользователь.

export const LEGAL = {
  tosVersion: 'v1.0',
  privacyVersion: 'v1.0',
  effectiveDate: '2026-06-07', // дата вступления редакции в силу
  jurisdiction: 'Республика Казахстан',
  supportEmail: 'support@inkmade.kz',
} as const

// Третьи лица, которым передаются обезличенные данные (для Privacy, §17.1 РК).
export const THIRD_PARTIES = [
  { name: 'Meta Platforms, Inc.', country: 'США', purpose: 'рекламный пиксель, измерение конверсий' },
  { name: 'TikTok Inc.', country: 'США / Сингапур', purpose: 'рекламный пиксель, измерение конверсий' },
  { name: 'Supabase Inc.', country: 'ЕС / США', purpose: 'хранение данных и аутентификация' },
  { name: 'Vercel Inc.', country: 'США', purpose: 'хостинг приложения' },
] as const

export type ConsentType = 'tos' | 'privacy' | 'copyright'
