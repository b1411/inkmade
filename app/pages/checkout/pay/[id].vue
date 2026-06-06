<script setup lang="ts">
import type { Database } from '~/types/database.types'

// Mock-страница оплаты (§9, шаг 3). Имитирует платёжную страницу провайдера.
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Оплата — INKMADE' })

const route = useRoute()
const orderId = route.params.id as string
const supabase = useSupabaseClient<Database>()
const cart = useCart()
const toast = useToast()

const { data: order } = await useAsyncData(`pay-${orderId}`, async () => {
  const { data } = await supabase.from('orders').select('id, total, status').eq('id', orderId).single()
  return data
})

const paying = ref(false)

async function pay() {
  paying.value = true
  try {
    // имитация провайдера → подписанный webhook ставит paid (§10)
    await $fetch('/api/payment/mock-confirm', { method: 'POST', body: { orderId } })
    // событие покупки с суммой — для оптимизации рекламы (§3.5.1)
    useAnalytics().purchase(Number(order.value?.total ?? 0), orderId)
    cart.clear()
    toast.add({ title: 'Оплата прошла', color: 'success' })
    await navigateTo(`/order/${orderId}`)
  } catch (e) {
    toast.add({ title: 'Ошибка оплаты', description: (e as Error).message, color: 'error' })
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <section class="max-w-md mx-auto py-10 text-center space-y-6">
    <UiSectionLabel accent>Демо-оплата</UiSectionLabel>
    <h1 class="ink-display text-h2">Оплата заказа</h1>
    <div class="border border-ink-gray-200 rounded-lg p-6">
      <p class="text-ink-gray-600">К оплате</p>
      <p class="text-h1 ink-display text-ink-burgundy">{{ order?.total }} ₸</p>
    </div>
    <UButton color="primary" size="xl" block icon="i-lucide-check" :loading="paying" @click="pay">
      Оплатить (демо)
    </UButton>
    <UButton to="/cart" color="neutral" variant="ghost" block>Отмена</UButton>
    <p class="text-caption text-ink-gray-400">
      Это заглушка. Реальная карта/Kaspi подключаются через ту же серверную абстракцию.
    </p>
  </section>
</template>
