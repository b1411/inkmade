<script setup lang="ts">
// «Почему INKMADE» (§5.7): честные преимущества без выдуманных цифр/отзывов.
// Карточки AppCard с каскадным появлением и подъёмом по hover.
const points = [
  { icon: 'i-lucide-package', title: 'Тираж от одной штуки', text: 'Печатаем хоть одну вещь. Никаких минимальных партий и навязанных объёмов.' },
  { icon: 'i-lucide-pipette', title: 'Согласуем цвет', text: 'Перед печатью сверяем цвет, чтобы результат совпал с задумкой.' },
  { icon: 'i-lucide-shield-check', title: 'Контроль качества', text: 'Каждое изделие проверяем вручную перед отправкой.' },
  { icon: 'i-lucide-lock', title: 'Безопасная оплата', text: 'Заказ уходит в работу только после подтверждения платежа.' },
]
</script>

<template>
  <section aria-labelledby="trust-heading">
    <UiSectionLabel accent>Почему мы</UiSectionLabel>
    <h2 id="trust-heading" class="ink-display text-h2 mt-2 mb-8">Спокойно за каждый заказ</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <UiReveal v-for="(p, i) in points" :key="p.title" :delay="i * 70">
        <UiAppCard hover class="h-full">
          <div class="p-6 flex flex-col gap-3 h-full">
            <UIcon :name="p.icon" class="size-8 text-ink-burgundy" />
            <h3 class="text-h3 font-semibold">{{ p.title }}</h3>
            <p class="text-caption text-ink-gray-600">{{ p.text }}</p>
          </div>
        </UiAppCard>
      </UiReveal>
    </div>
  </section>
</template>
