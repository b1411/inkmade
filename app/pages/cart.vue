<script setup lang="ts">
// Корзина (§9). Гостю доступна без логина (§9.1).
const { t } = useI18n()
useHead({ title: () => `${t('cart.cart.headTitle')} — INKMADE` })
const cart = useCart()
onMounted(() => cart.load())
</script>

<template>
  <section class="space-y-6 max-w-3xl">
    <h1 class="ink-display text-h2">{{ $t('cart.cart.title') }}</h1>

    <UiEmptyState
      v-if="!cart.items.value.length"
      icon="i-lucide-shopping-cart"
      :title="$t('cart.cart.empty.title')"
      :text="$t('cart.cart.empty.text')"
    >
      <UiAppButton to="/catalog" variant="primary" size="md">{{ $t('cart.cart.empty.toCatalog') }}</UiAppButton>
    </UiEmptyState>

    <template v-else>
      <div v-auto-animate class="space-y-3">
        <div
          v-for="i in cart.items.value"
          :key="i.id"
          class="flex items-center gap-4 border border-ink-gray-200 rounded-lg p-4 bg-ink-white"
        >
          <span class="size-10 rounded-full border shrink-0" :style="{ backgroundColor: i.colorHex }" />
          <div class="flex-1 min-w-0">
            <p class="font-semibold">{{ i.title }}</p>
            <p class="text-caption text-ink-gray-600">{{ i.colorName }} / {{ i.size }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UButton size="xs" color="neutral" variant="subtle" icon="i-lucide-minus" @click="cart.updateQty(i.id, i.quantity - 1)" />
            <span class="w-6 text-center">{{ i.quantity }}</span>
            <UButton size="xs" color="neutral" variant="subtle" icon="i-lucide-plus" @click="cart.updateQty(i.id, i.quantity + 1)" />
          </div>
          <div class="w-24 text-right font-semibold">{{ formatPrice(i.unitPrice * i.quantity) }}</div>
          <UButton color="error" variant="ghost" icon="i-lucide-trash-2" :aria-label="t('cart.cart.removeItem', { title: i.title })" @click="cart.remove(i.id)" />
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-ink-gray-200 pt-4">
        <span class="text-ink-gray-600">{{ $t('cart.cart.total') }}</span>
        <span class="text-h3 font-bold text-ink-burgundy">{{ formatPrice(cart.total.value) }}</span>
      </div>

      <UiAppButton to="/checkout" variant="primary" size="xl" block trailing-icon="i-lucide-arrow-right">
        {{ $t('cart.cart.checkout') }}
      </UiAppButton>
    </template>
  </section>
</template>
