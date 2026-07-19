<script setup lang="ts">
// Публичная страница расшаренного дизайна (P4.22). Без авторизации — точка входа
// вирального охвата: гость видит превью и ведётся в конструктор «создать свой».
interface SharedDesign {
  preview: string | null
  product: { title: string; slug: string; alias: string } | null
}

const { t } = useI18n()
const route = useRoute()
const token = route.params.token as string

const { data, error } = await useAsyncData(`shared-${token}`, () =>
  $fetch<SharedDesign>(`/api/designs/shared/${token}`),
)
if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: t('customize.designPage.notFound') })
}

const productTitle = computed(() => data.value?.product?.title ?? 'INKMADE')
const customizeTo = computed(() =>
  data.value?.product?.alias ? `/customize/${data.value.product.alias}` : '/catalog',
)

useSeoMeta({
  title: () => t('customize.designPage.seoTitle', { title: productTitle.value }),
  description: () => t('customize.designPage.seoDescription'),
  ogTitle: () => t('customize.designPage.seoTitle', { title: productTitle.value }),
  ogDescription: () => t('customize.designPage.ogDescription'),
  ogImage: () => data.value?.preview ?? undefined,
})
</script>

<template>
  <section v-if="data" class="grid overflow-hidden border border-white/10 bg-ink-black text-white lg:grid-cols-[1.05fr_.95fr]">
    <div class="flex min-h-[560px] flex-col justify-between p-6 sm:p-10 lg:p-14">
      <div class="flex items-center justify-between gap-4">
        <UiSectionLabel accent>{{ $t('customize.designPage.label') }}</UiSectionLabel>
        <span class="ink-label text-white/40">SHARED / DESIGN</span>
      </div>
      <div>
        <h1 class="ink-display max-w-xl text-[clamp(3.5rem,8vw,7.5rem)] leading-[.82] tracking-[-.055em]">{{ productTitle }}</h1>
        <p class="mt-6 max-w-md text-lg text-white/60">{{ $t('customize.designPage.cta') }}</p>
        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <UiAppButton :to="customizeTo" variant="primary" size="lg" icon="i-lucide-wand-2">{{ $t('customize.designPage.createOwn') }}</UiAppButton>
          <UiAppButton to="/catalog" variant="ghost" size="lg">{{ $t('customize.designPage.viewCatalog') }}</UiAppButton>
        </div>
      </div>
    </div>
    <div class="relative flex min-h-[480px] items-center justify-center overflow-hidden bg-[#d9d5ce] p-6 sm:p-10 lg:min-h-[720px]">
      <NuxtImg src="/media/campaigns/audience-events-v03.webp" alt="" class="absolute inset-0 size-full object-cover opacity-25" sizes="(max-width: 1023px) 100vw, 560px" loading="eager" />
      <div class="absolute inset-0 bg-white/20 backdrop-blur-[2px]" />
      <div class="relative aspect-square w-full max-w-lg overflow-hidden border border-black/10 bg-white/90 p-5 shadow-2xl sm:p-8">
        <img v-if="data.preview" :src="data.preview" :alt="$t('customize.designPage.previewAlt', { title: productTitle })" class="size-full object-contain">
        <div v-else class="grid size-full place-items-center bg-ink-paper">
          <UIcon name="i-lucide-shapes" class="size-16 text-ink-gray-400" />
        </div>
      </div>
    </div>
  </section>
</template>
