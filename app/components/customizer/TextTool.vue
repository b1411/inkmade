<script setup lang="ts">
// Текстовый инструмент (§7.1) — полноценный модуль под бренд (граффити-шрифт).
import { PRINT_FONTS, isCyrillicFont } from '~~/shared/config/print-fonts'

const { t } = useI18n()
const { addText, atPlacementLimit } = useDesign()
const { load: loadFont } = useFontLoader()
const toast = useToast()

// ~200 шрифтов; грузим выбранный по требованию (useFontLoader), не предзагружаем все.
const fontItems = PRINT_FONTS.map(f => f.name)

const form = reactive({
  text: '',
  fontFamily: 'Inter',
  fill: '#111111',
})

const adding = ref(false)

// подгружаем шрифт сразу при выборе — чтобы превью/добавление было готово
watch(() => form.fontFamily, (f) => { if (f) loadFont(f) })

async function onAdd() {
  const value = form.text.trim()
  if (!value) { toast.add({ title: t('customize.text.enterText'), color: 'warning' }); return }
  if (atPlacementLimit.value) { toast.add({ title: t('customize.tools.limitReached'), color: 'warning' }); return }
  // кириллица шрифтом без кириллических глифов нечитаема (§2.3) — подсказка
  if (!isCyrillicFont(form.fontFamily) && /[а-яё]/i.test(value)) {
    toast.add({ title: t('customize.text.noCyrillic'), description: t('customize.text.noCyrillicHint', { font: form.fontFamily }), color: 'warning' })
  }
  adding.value = true
  try {
    // Konva рисует на canvas — шрифт должен быть загружен ДО отрисовки, иначе fallback.
    await loadFont(form.fontFamily)
    addText(value, form.fontFamily, form.fill)
    form.text = ''
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <div class="space-y-3">
    <UiSectionLabel>{{ $t('customize.text.label') }}</UiSectionLabel>
    <UInput v-model="form.text" :placeholder="$t('customize.text.placeholder')" class="w-full" @keydown.enter.prevent="onAdd" />
    <div class="flex gap-2">
      <USelectMenu
        v-model="form.fontFamily"
        :items="fontItems"
        :search-input="{ placeholder: $t('customize.text.fontSearch') }"
        class="flex-1"
      />
      <UInput v-model="form.fill" type="color" class="w-12 p-1" />
    </div>
    <p class="text-caption text-ink-gray-400" :style="{ fontFamily: `'${form.fontFamily}', sans-serif` }">
      {{ $t('customize.text.previewLabel', { value: form.text || $t('customize.text.previewPlaceholder') }) }}
    </p>
    <UButton color="neutral" variant="subtle" icon="i-lucide-type" block :loading="adding" @click="onAdd">{{ $t('customize.text.add') }}</UButton>
  </div>
</template>
