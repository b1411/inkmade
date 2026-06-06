<script setup lang="ts">
// Текстовый инструмент (§7.1) — полноценный модуль под бренд (граффити-шрифт).
const { addText } = useDesign()
const toast = useToast()

const FONTS = [
  { label: 'Permanent Marker (граффити, латиница)', value: 'Permanent Marker' },
  { label: 'Manrope (кириллица)', value: 'Manrope' },
  { label: 'Space Mono', value: 'Space Mono' },
]

const form = reactive({
  text: '',
  fontFamily: 'Permanent Marker',
  fill: '#111111',
})

function onAdd() {
  const t = form.text.trim()
  if (!t) { toast.add({ title: 'Введите текст', color: 'warning' }); return }
  // кириллица граффити-шрифтом нечитаема (§2.3) — подсказка
  if (form.fontFamily === 'Permanent Marker' && /[а-яё]/i.test(t)) {
    toast.add({ title: 'Кириллица + граффити-шрифт', description: 'Permanent Marker — для латиницы. Для кириллицы выберите Manrope.', color: 'warning' })
  }
  addText(t, form.fontFamily, form.fill)
  form.text = ''
}
</script>

<template>
  <div class="space-y-3">
    <UiSectionLabel>Текст</UiSectionLabel>
    <UInput v-model="form.text" placeholder="Имя или надпись" class="w-full" @keydown.enter.prevent="onAdd" />
    <div class="flex gap-2">
      <USelect v-model="form.fontFamily" :items="FONTS" value-key="value" class="flex-1" />
      <UInput v-model="form.fill" type="color" class="w-12 p-1" />
    </div>
    <UButton color="neutral" variant="subtle" icon="i-lucide-type" block @click="onAdd">Добавить текст</UButton>
  </div>
</template>
