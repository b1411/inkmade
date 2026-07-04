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
    message.value = (e as { data?: { message?: string } }).data?.message ?? (e as Error).message
  }
})
</script>

<template>
  <div class="max-w-md mx-auto py-12 text-center space-y-4">
    <UiSectionLabel accent>{{ $t('shopClaim.label') }}</UiSectionLabel>

    <div v-if="state === 'loading'" class="flex flex-col items-center gap-3 text-ink-gray-600 py-6">
      <UIcon name="i-lucide-loader-circle" class="size-7 animate-spin text-ink-burgundy" />
      {{ $t('shopClaim.loading') }}
    </div>

    <template v-else-if="state === 'ok'">
      <h1 class="ink-display text-h2">{{ $t('shopClaim.okTitle') }}</h1>
      <p class="text-ink-gray-600">{{ message }}</p>
      <UButton to="/shop-admin" color="primary" size="lg" icon="i-lucide-store">{{ $t('shopClaim.toCabinet') }}</UButton>
    </template>

    <template v-else-if="state === 'used'">
      <h1 class="ink-display text-h2">{{ $t('shopClaim.usedTitle') }}</h1>
      <p class="text-ink-gray-600">{{ message }}</p>
      <UButton to="/shop-admin" color="neutral" variant="subtle">{{ $t('shopClaim.toCabinet') }}</UButton>
    </template>

    <template v-else>
      <h1 class="ink-display text-h2">{{ $t('shopClaim.errorTitle') }}</h1>
      <p class="text-ink-gray-600">{{ message }}</p>
      <UButton to="/" color="neutral" variant="subtle">{{ $t('shopClaim.toHome') }}</UButton>
    </template>
  </div>
</template>
