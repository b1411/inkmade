// Nuxt UI v4 — семантические цвета бренда (§2).
// primary = бордо (CTA/акценты), neutral = тёплый серый (stone) под кремовую палитру.
//
// Поля ввода: на кремовом холсте белая заливка читается как отдельная «карточка»
// поля, тёплая тонкая рамка (ring-default) вместо жёсткого серого ринга, фокус —
// бордо (через primary compoundVariant). Убирает «топорность» и слияние с фоном (§4).
const fieldOutline = 'text-highlighted bg-white ring ring-inset ring-(--ui-border)'

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'burgundy',
      neutral: 'stone',
    },
    input: {
      variants: { variant: { outline: fieldOutline } },
    },
    textarea: {
      variants: { variant: { outline: fieldOutline } },
    },
    select: {
      variants: { variant: { outline: fieldOutline } },
    },
    selectMenu: {
      variants: { variant: { outline: fieldOutline } },
    },
    inputNumber: {
      variants: { variant: { outline: fieldOutline } },
    },
  },
})
