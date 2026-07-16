<script setup lang="ts">
const props = defineProps<{
  to: string
  title: string
  price: string
  blankSrc?: string
  printedSrc: string
}>()

const showPrinted = ref(false)
</script>

<template>
  <article class="group relative min-w-0 overflow-hidden rounded-[4px] border border-black/8 bg-ink-card text-ink-text-dark shadow-sm">
    <NuxtLink :to="props.to" class="block" :aria-label="props.title">
      <div class="relative aspect-[4/3] overflow-hidden bg-[#e7e3dc]">
        <NuxtImg
          v-if="props.blankSrc"
          :src="props.blankSrc"
          :alt="`${props.title} без принта`"
          format="webp"
          sizes="(max-width: 767px) 78vw, (max-width: 1199px) 44vw, 280px"
          class="absolute inset-0 size-full object-contain p-3 transition-all duration-500 ease-out group-hover:scale-[1.02]"
          :class="showPrinted ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'"
        />
        <div v-else class="absolute inset-0 grid place-items-center text-black/18">
          <UIcon name="i-lucide-shirt" class="size-12" />
        </div>

        <NuxtImg
          :src="props.printedSrc"
          :alt="`${props.title} с принтом на модели`"
          format="webp"
          sizes="(max-width: 767px) 78vw, (max-width: 1199px) 44vw, 280px"
          class="absolute inset-0 size-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.03]"
          :class="showPrinted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
        />

        <div class="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/55 to-transparent px-3 pb-3 pt-10 text-[10px] font-mono uppercase tracking-[0.12em] text-white">
          <span>{{ showPrinted ? 'ON BODY' : 'BLANK' }}</span>
          <span>INK / 01</span>
        </div>
      </div>

      <div class="flex items-end justify-between gap-3 px-4 py-3.5">
        <div class="min-w-0">
          <h3 class="truncate font-semibold">{{ props.title }}</h3>
          <p class="mt-1 text-caption text-ink-text-dark-soft">{{ props.price }}</p>
        </div>
        <UIcon name="i-lucide-arrow-up-right" class="size-4 shrink-0 text-ink-burgundy" />
      </div>
    </NuxtLink>

    <button
      type="button"
      class="absolute right-2 top-2 z-10 grid size-9 place-items-center border border-white/30 bg-black/55 text-white backdrop-blur-sm transition hover:bg-ink-burgundy focus-visible:outline focus-visible:outline-2"
      :aria-pressed="showPrinted"
      :aria-label="showPrinted ? 'Показать изделие без принта' : 'Показать изделие на модели'"
      @click="showPrinted = !showPrinted"
    >
      <UIcon :name="showPrinted ? 'i-lucide-shirt' : 'i-lucide-user-round'" class="size-4" />
    </button>
  </article>
</template>
