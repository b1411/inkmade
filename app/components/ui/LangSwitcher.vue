<script setup lang="ts">
// Переключатель локали RU/KK. В стратегии no_prefix setLocale пишет выбор в cookie
// (inkmade_lang) и меняет язык без смены URL. Наследует currentColor от шапки,
// поэтому корректно смотрится и над тёмным hero, и на светлом фоне.
const { locale, setLocale } = useI18n()

const options = [
  { code: 'ru', short: 'RU' },
  { code: 'kk', short: 'KK' },
] as const

function choose(code: 'ru' | 'kk') {
  if (locale.value !== code) setLocale(code)
}
</script>

<template>
  <div
    class="inline-flex items-center rounded-full border border-current/20 p-0.5 text-current"
    role="group"
    :aria-label="$t('lang.label')"
  >
    <button
      v-for="o in options"
      :key="o.code"
      type="button"
      class="lang-pill ink-label px-2 py-0.5 rounded-full transition-all duration-200"
      :class="locale === o.code
        ? 'bg-current/15 font-bold opacity-100'
        : 'opacity-55 hover:opacity-90'"
      :aria-pressed="locale === o.code"
      @click="choose(o.code)"
    >
      {{ o.short }}
    </button>
  </div>
</template>

<style scoped>
.lang-pill {
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  line-height: 1;
}
</style>
