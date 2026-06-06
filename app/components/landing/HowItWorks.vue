<script setup lang="ts">
// «Как это работает» (§6): выбери → загрузи/выбери принт → размести → оплати → получи.
const steps = [
  { n: 1, icon: 'i-lucide-shirt', title: 'Выбери изделие', text: 'Футболка, худи, свитшот или головной убор.' },
  { n: 2, icon: 'i-lucide-image-plus', title: 'Добавь принт', text: 'Загрузи свой файл, выбери из библиотеки или набери текст.' },
  { n: 3, icon: 'i-lucide-move', title: 'Размести и оцени', text: 'Двигай, масштабируй — цена считается сразу.' },
  { n: 4, icon: 'i-lucide-package-check', title: 'Оплати и получи', text: 'Онлайн-оплата и доставка по Казахстану.' },
]
</script>

<template>
  <section class="py-20">
    <UiSectionLabel accent>Просто</UiSectionLabel>
    <h2 class="ink-display text-h2 mt-2 mb-10">Как это работает</h2>
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="s in steps" :key="s.n" class="relative border border-ink-gray-200 rounded-lg p-6">
        <span class="ink-display text-5xl text-ink-cream-dark absolute top-3 right-4 select-none">{{ s.n }}</span>
        <UIcon :name="s.icon" class="size-8 text-ink-burgundy" />
        <h3 class="font-bold text-h3 mt-3">{{ s.title }}</h3>
        <p class="text-ink-gray-600 mt-1">{{ s.text }}</p>
      </div>
    </div>
  </section>
</template>
