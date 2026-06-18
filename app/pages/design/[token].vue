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
  <section v-if="data" class="max-w-xl mx-auto py-10 text-center space-y-6">
    <UiSectionLabel accent>{{ $t('customize.designPage.label') }}</UiSectionLabel>
    <h1 class="ink-display text-h2">{{ productTitle }}</h1>

    <div class="border border-ink-gray-200 rounded-lg shadow-sm overflow-hidden bg-ink-white aspect-square max-w-md mx-auto flex items-center justify-center">
      <img v-if="data.preview" :src="data.preview" :alt="$t('customize.designPage.previewAlt', { title: productTitle })" class="w-full h-full object-contain">
      <UIcon v-else name="i-lucide-shapes" class="size-12 text-ink-gray-400" />
    </div>

    <p class="text-ink-gray-600">{{ $t('customize.designPage.cta') }}</p>

    <div class="flex flex-col sm:flex-row gap-3 justify-center">
      <UButton :to="customizeTo" color="primary" size="lg" icon="i-lucide-wand-2">{{ $t('customize.designPage.createOwn') }}</UButton>
      <UButton to="/catalog" color="neutral" variant="ghost" size="lg">{{ $t('customize.designPage.viewCatalog') }}</UButton>
    </div>
  </section>
</template>
