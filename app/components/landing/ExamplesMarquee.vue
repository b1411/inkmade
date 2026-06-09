<script setup lang="ts">
// Лента примеров (§5.3): «Что создают на INKMADE». Бесконечная плавная прокрутка
// (CSS-marquee, без JS), пауза по hover, лёгкий zoom фото. Карточки дублируются
// для бесшовного цикла. Под reduced-motion лента статична (первый набор виден).
interface ProductImage {
  url: string
  is_primary: boolean
}
interface Example {
  id: string
  slug: string
  title: string
  product_images?: ProductImage[]
}
const props = defineProps<{ items: Example[] }>()

function image(p: Example) {
  const imgs = p.product_images ?? []
  return imgs.find(i => i.is_primary)?.url ?? imgs[0]?.url
}
// Дублируем набор для бесшовной петли (translateX -50%).
const loop = computed(() => [...props.items, ...props.items])
</script>

<template>
  <section v-if="items.length" aria-labelledby="examples-heading">
    <UiSectionLabel accent>Галерея</UiSectionLabel>
    <h2 id="examples-heading" class="ink-display text-h2 mt-2">Что создают на INKMADE</h2>
    <p class="text-lead text-ink-gray-600 mt-3 mb-8">
      Реальные вещи реальных людей. Собери свою — добавим сюда.
    </p>

    <div class="marquee w-screen ml-[calc(50%-50vw)] px-4">
      <div class="marquee__track" :style="{ '--count': items.length }">
        <NuxtLink
          v-for="(p, i) in loop"
          :key="`${p.id}-${i}`"
          :to="`/product/${p.slug}`"
          class="marquee__item group"
          :aria-hidden="i >= items.length ? 'true' : undefined"
          :tabindex="i >= items.length ? -1 : undefined"
        >
          <div class="app-card-media aspect-4/5 rounded-lg overflow-hidden bg-ink-gray-200">
            <NuxtImg
              v-if="image(p)"
              :src="image(p)"
              :alt="p.title"
              class="w-full h-full object-cover"
              sizes="280px"
              loading="lazy"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-ink-gray-400">
              <UIcon name="i-lucide-image" class="size-8" />
            </div>
          </div>
          <p class="mt-2 text-caption font-semibold group-hover:text-ink-burgundy transition-colors">
            {{ p.title }}
          </p>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.marquee {
  overflow: hidden;
}
.marquee__track {
  display: flex;
  gap: 1rem;
  width: max-content;
  animation: marquee 45s linear infinite;
}
.marquee:hover .marquee__track {
  animation-play-state: paused;
}
.marquee__item {
  flex: 0 0 auto;
  width: 240px;
}
/* На карточке-ссылке оставляем zoom медиа через .app-card-media (общий механизм). */
.marquee__item:hover :where(img) {
  transform: scale(1.04);
}
@keyframes marquee {
  to {
    transform: translateX(-50%);
  }
}
</style>
