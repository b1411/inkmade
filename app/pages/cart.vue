<script setup lang="ts">
// Корзина (§9). Гостю доступна без логина (§9.1).
useHead({ title: 'Корзина — INKMADE' })
const cart = useCart()
onMounted(() => cart.load())
</script>

<template>
  <section class="space-y-6 max-w-3xl">
    <h1 class="ink-display text-h2">Корзина</h1>

    <div v-if="!cart.items.value.length" class="py-10 text-center text-ink-gray-600">
      Корзина пуста. <NuxtLink to="/catalog" class="text-ink-burgundy font-semibold">Перейти в каталог</NuxtLink>
    </div>

    <template v-else>
      <div
        v-for="i in cart.items.value"
        :key="i.id"
        class="flex items-center gap-4 border border-ink-gray-200 rounded-lg p-4"
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
        <div class="w-24 text-right font-semibold">{{ i.unitPrice * i.quantity }} ₸</div>
        <UButton color="error" variant="ghost" icon="i-lucide-trash-2" @click="cart.remove(i.id)" />
      </div>

      <div class="flex items-center justify-between border-t border-ink-gray-200 pt-4">
        <span class="text-ink-gray-600">Итого</span>
        <span class="text-h3 font-bold text-ink-burgundy">{{ cart.total.value }} ₸</span>
      </div>

      <UButton to="/checkout" color="primary" size="xl" block icon="i-lucide-arrow-right">
        Оформить заказ
      </UButton>
    </template>
  </section>
</template>
