<script setup lang="ts">
// Корзина (§9). Гостю доступна без логина (§9.1).
const { t } = useI18n()
useHead({ title: () => `${t('cart.cart.headTitle')} — INKMADE` })
const cart = useCart()
onMounted(() => cart.load())

// превью позиции — скриншот композиции (футболка + размещённый принт), сохранённый
// в spec.composition_url при добавлении в корзину. Нет (старая позиция / аплоад упал) → иконка-фолбэк.
function previewUrl(spec: unknown): string | null {
  const url = (spec as { composition_url?: string | null } | null)?.composition_url
  return typeof url === 'string' && url ? url : null
}

// «минус» при количестве 1 — удаляет позицию (иначе кнопка выглядела «мёртвой»).
function decrement(id: string, qty: number) {
  if (qty > 1) cart.updateQty(id, qty - 1)
  else cart.remove(id)
}
const { confirm } = useConfirm()
async function clearCart() {
  const ok = await confirm({
    title: t('cart.cart.clearConfirm'),
    confirmLabel: t('cart.cart.clear'),
    tone: 'danger',
  })
  if (ok) cart.clear()
}
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
          <NuxtLink
            :to="i.alias ? `/customize/${i.alias}?cart=${i.id}` : `/product/${i.slug}`"
            class="group/thumb relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-ink-gray-200 bg-ink-gray-50"
            :aria-label="t('cart.cart.viewItem', { title: i.title })"
          >
            <img
              v-if="previewUrl(i.spec)"
              :src="previewUrl(i.spec)!"
              :alt="i.title"
              class="size-full object-cover transition-transform duration-300 group-hover/thumb:scale-110"
            >
            <UIcon v-else name="i-lucide-shirt" class="size-7 text-ink-gray-400 transition-transform duration-300 group-hover/thumb:scale-110" />
            <span class="absolute bottom-1 right-1 size-3.5 rounded-full border border-white shadow-sm" :style="{ backgroundColor: i.colorHex }" />
          </NuxtLink>
          <div class="flex-1 min-w-0">
            <NuxtLink
              :to="i.alias ? `/customize/${i.alias}?cart=${i.id}` : `/product/${i.slug}`"
              class="font-semibold transition-colors hover:text-ink-burgundy"
            >{{ i.title }}</NuxtLink>
            <p class="text-caption text-ink-gray-600">{{ i.colorName }} / {{ i.size }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UButton size="xs" color="neutral" variant="subtle" icon="i-lucide-minus" :aria-label="t('cart.cart.decrease')" @click="decrement(i.id, i.quantity)" />
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

      <div class="text-center">
        <button class="text-caption text-ink-gray-400 hover:text-ink-error transition-colors" @click="clearCart">
          {{ $t('cart.cart.clear') }}
        </button>
      </div>
    </template>
  </section>
</template>
