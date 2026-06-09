<script setup lang="ts">
// Единая карточка бренда (§4.3): радиус-lg, мягкая тень, подъём -8px при hover,
// zoom внутреннего медиа (обернуть в .app-card-media). Каскадное появление в сетке
// задаёт родитель через v-motion (stagger 60–80ms). Рендерит ссылку при `to`.
interface Props {
  to?: string
  hover?: boolean
}
withDefaults(defineProps<Props>(), { hover: true })
</script>

<template>
  <NuxtLink v-if="to" :to="to" class="app-card block" :class="hover ? 'app-card--hover' : ''">
    <slot />
  </NuxtLink>
  <div v-else class="app-card block" :class="hover ? 'app-card--hover' : ''">
    <slot />
  </div>
</template>
