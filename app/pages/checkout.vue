<script setup lang="ts">
// Checkout (§9.1): логин требуется здесь, перед оплатой. Гость собирал корзину локально.
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Оформление — INKMADE' })

const cart = useCart()
const { createFromCart } = useOrder()
const toast = useToast()

onMounted(() => {
  cart.load()
  if (!cart.items.value.length) navigateTo('/cart')
})

const form = reactive({ full_name: '', phone: '', city: 'Алматы', address: '' })
const paying = ref(false)

async function onPay() {
  if (!form.full_name || !form.phone || !form.address) {
    toast.add({ title: 'Заполните контакты и адрес', color: 'warning' })
    return
  }
  paying.value = true
  try {
    useAnalytics().initiateCheckout(cart.total.value)
    const { orderId } = await createFromCart(cart.items.value, { ...form })
    const { payUrl } = await $fetch<{ payUrl: string }>('/api/payment/create', {
      method: 'POST',
      body: { orderId },
    })
    await navigateTo(payUrl)
  } catch (e) {
    toast.add({ title: 'Ошибка оформления', description: (e as Error).message, color: 'error' })
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <section class="grid md:grid-cols-[1fr_320px] gap-8 max-w-4xl">
    <div class="space-y-5">
      <h1 class="ink-display text-h2">Оформление</h1>
      <UFormField label="Имя и фамилия" required>
        <UInput v-model="form.full_name" class="w-full" />
      </UFormField>
      <UFormField label="Телефон" required>
        <UInput v-model="form.phone" type="tel" placeholder="+7 700 000 00 00" class="w-full" />
      </UFormField>
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Город" required>
          <UInput v-model="form.city" class="w-full" />
        </UFormField>
        <UFormField label="Адрес доставки" required>
          <UInput v-model="form.address" class="w-full" />
        </UFormField>
      </div>
    </div>

    <aside class="border border-ink-gray-200 rounded-lg p-5 h-fit space-y-3">
      <UiSectionLabel accent>Заказ</UiSectionLabel>
      <div v-for="i in cart.items.value" :key="i.id" class="flex justify-between text-caption">
        <span>{{ i.title }} ({{ i.size }}) ×{{ i.quantity }}</span>
        <span>{{ i.unitPrice * i.quantity }} ₸</span>
      </div>
      <div class="flex justify-between border-t border-ink-gray-200 pt-3 font-semibold">
        <span>Итого</span><span class="text-ink-burgundy">{{ cart.total.value }} ₸</span>
      </div>
      <UButton color="primary" size="lg" block icon="i-lucide-credit-card" :loading="paying" @click="onPay">
        Перейти к оплате
      </UButton>
      <p class="text-caption text-ink-gray-400">Демо-оплата (mock). Реальный провайдер подключается позже.</p>
    </aside>
  </section>
</template>
