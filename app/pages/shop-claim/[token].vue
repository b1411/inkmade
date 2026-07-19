<script setup lang="ts">
// Активация владения B2B-магазином по claim-ссылке (Фаза B3, фикс F1). Ссылку выдаёт
// админ при одобрении заявки, если владелец ещё не был зарегистрирован. Требует входа
// (auth-middleware уводит на /login с возвратом), активируется только аккаунтом с тем же
// email, что в заявке (claim_shop проверяет). После успеха ведём в кабинет /shop-admin.
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const token = route.params.token as string
const { claimShop } = useShops()
const { t } = useI18n()
useHead({ title: t('shopClaim.headTitle') })

const state = ref<'loading' | 'ok' | 'used' | 'error'>('loading')
const message = ref('')

onMounted(async () => {
  try {
    const res = await claimShop(token)
    if (res?.ok) {
      state.value = 'ok'
      message.value = t('shopClaim.okMessage')
    } else {
      state.value = 'used'
      message.value = t('shopClaim.used')
    }
  } catch (e) {
    state.value = 'error'
    message.value = getFetchMessage(e)
  }
})
</script>

<template>
  <section class="mx-auto grid max-w-5xl overflow-hidden border border-ink-gray-200 bg-ink-white shadow-sm lg:grid-cols-[.95fr_1.05fr]">
    <div class="relative min-h-80 overflow-hidden bg-[#d9d5ce] lg:min-h-[580px]">
      <NuxtImg src="/media/products/blank/tote-v01.webp" alt="" class="absolute inset-0 size-full object-contain p-8 sm:p-12" sizes="(max-width: 1023px) 100vw, 480px" loading="eager" />
      <div class="absolute inset-0 bg-linear-to-t from-ink-black via-transparent to-transparent" />
      <div class="absolute inset-x-0 bottom-0 p-7 text-white sm:p-9">
        <p class="ink-label text-white/55">INKMADE / STOREFRONT ACCESS</p>
        <p class="ink-display mt-2 text-4xl">{{ $t('shopClaim.label') }}</p>
      </div>
    </div>
    <div class="flex min-h-[420px] flex-col justify-center p-7 text-center sm:p-12">
      <UiSectionLabel accent>{{ $t('shopClaim.label') }}</UiSectionLabel>
      <div v-if="state === 'loading'" class="flex flex-col items-center gap-4 py-10 text-ink-gray-600" role="status" aria-live="polite">
        <span class="grid size-16 place-items-center rounded-full border border-ink-burgundy/20 bg-ink-burgundy/5">
          <UIcon name="i-lucide-loader-circle" class="size-7 animate-spin text-ink-burgundy" />
        </span>
        {{ $t('shopClaim.loading') }}
      </div>
      <template v-else-if="state === 'ok'">
        <UIcon name="i-lucide-store" class="mx-auto mt-7 size-12 text-ink-burgundy" />
        <h1 class="ink-display mt-4 text-h2">{{ $t('shopClaim.okTitle') }}</h1>
        <p class="mx-auto mt-3 max-w-md text-ink-gray-600">{{ message }}</p>
        <UButton to="/shop-admin" color="primary" size="lg" icon="i-lucide-layout-dashboard" class="mx-auto mt-7">{{ $t('shopClaim.toCabinet') }}</UButton>
      </template>
      <template v-else-if="state === 'used'">
        <UIcon name="i-lucide-circle-check" class="mx-auto mt-7 size-12 text-ink-gray-400" />
        <h1 class="ink-display mt-4 text-h2">{{ $t('shopClaim.usedTitle') }}</h1>
        <p class="mx-auto mt-3 max-w-md text-ink-gray-600">{{ message }}</p>
        <UButton to="/shop-admin" color="neutral" variant="subtle" class="mx-auto mt-7">{{ $t('shopClaim.toCabinet') }}</UButton>
      </template>
      <template v-else>
        <UIcon name="i-lucide-link-2-off" class="mx-auto mt-7 size-12 text-ink-gray-400" />
        <h1 class="ink-display mt-4 text-h2">{{ $t('shopClaim.errorTitle') }}</h1>
        <p class="mx-auto mt-3 max-w-md text-ink-gray-600">{{ message }}</p>
        <UButton to="/" color="neutral" variant="subtle" class="mx-auto mt-7">{{ $t('shopClaim.toHome') }}</UButton>
      </template>
    </div>
  </section>
</template>
