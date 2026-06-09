<script setup lang="ts">
// «Как это работает» (§5.6): 4 шага. Соединительная draw-линия по ScrollTrigger —
// этап 3; здесь крупные display-номера, каскадное появление, якорь #how из навигации.
const steps = [
  { n: 1, icon: 'i-lucide-shirt', title: 'Выбери изделие', text: 'Футболка, худи, свитшот, кепка. Выбери цвет и размер.' },
  { n: 2, icon: 'i-lucide-image-plus', title: 'Добавь принт', text: 'Загрузи свой файл, выбери из каталога или набери текст.' },
  { n: 3, icon: 'i-lucide-move', title: 'Размести и оцени', text: 'Двигай, масштабируй, крути. Цена считается на лету.' },
  { n: 4, icon: 'i-lucide-package-check', title: 'Оплати и получи', text: 'Онлайн-оплата, печать, доставка по Казахстану.' },
]
</script>

<template>
  <section id="how" aria-labelledby="how-heading" style="scroll-margin-top: 96px">
    <UiSectionLabel accent>Просто</UiSectionLabel>
    <h2 id="how-heading" class="ink-display text-h2 mt-2 mb-10">От идеи до вещи — 4 шага</h2>
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <UiReveal v-for="(s, i) in steps" :key="s.n" :delay="i * 80">
        <div class="relative h-full rounded-lg border border-ink-gray-200 p-6 bg-ink-white">
          <span class="ink-display text-6xl text-ink-cream-dark absolute top-2 right-4 select-none leading-none">
            {{ s.n }}
          </span>
          <UIcon :name="s.icon" class="size-8 text-ink-burgundy relative" />
          <h3 class="font-bold text-h3 mt-4 relative">{{ s.title }}</h3>
          <p class="text-ink-gray-600 mt-2 relative">{{ s.text }}</p>
        </div>
      </UiReveal>
    </div>
  </section>
</template>
