<script setup lang="ts">
import type { Database } from '~/types/database.types'

// Mock-страница оплаты (§9, шаг 3). Имитирует платёжную страницу провайдера.
definePageMeta({ middleware: 'auth' })
const { t } = useI18n()
useHead({ title: () => `${t('cart.pay.headTitle')} — INKMADE` })

const route = useRoute()
const orderId = route.params.id as string
const supabase = useSupabaseClient<Database>()
const cart = useCart()
const toast = useToast()
const runtimeConfig = useRuntimeConfig()
const isMock = computed(() => runtimeConfig.public.paymentProvider === 'mock')
const isEpay = computed(() => runtimeConfig.public.paymentProvider === 'epay')

const { data: order, error: orderLoadError, refresh } = await useAsyncData(`pay-${orderId}`, async () => {
  const { data, error } = await supabase.from('orders').select('id, total, status').eq('id', orderId).single()
  if (error) throw error
  return data
})

// Guard статуса: оплачивать можно только created/pending. Уже оплаченный/отменённый
// заказ webhook всё равно отвергнет (apply_paid), но кнопку «Оплатить» показывать нельзя —
// иначе пользователь жмёт в тупик. Сервер остаётся источником истины, это слой UX.
const PAYABLE = new Set(['created', 'pending'])
const state = computed<'error' | 'missing' | 'payable' | 'done' | 'closed'>(() => {
  if (orderLoadError.value && !isNotFoundError(orderLoadError.value)) return 'error'
  if (!order.value) return 'missing'
  const s = order.value.status
  if (PAYABLE.has(s)) return 'payable'
  if (s === 'cancelled' || s === 'refunded') return 'closed'
  return 'done' // paid и любой производственный статус
})

const paying = ref(false)
const checking = ref(false)
const paymentError = ref('')
const retryingOrder = ref(false)
async function retryOrder() {
  retryingOrder.value = true
  try { await refresh() } finally { retryingOrder.value = false }
}

async function checkPayment() {
  if (!isEpay.value || checking.value || state.value !== 'payable') return
  checking.value = true
  try {
    const result = await $fetch<{ paid: boolean; status: string }>('/api/payment/status', {
      method: 'POST',
      body: { orderId },
    })
    if (result.paid) {
      useAnalytics().purchase(Number(order.value?.total ?? 0), orderId)
      cart.clear()
      await refresh()
      toast.add({ title: t('cart.pay.success'), color: 'success' })
    }
  } catch (error) {
    toast.add({ title: t('cart.pay.checkFailed'), description: getFetchMessage(error), color: 'warning' })
  } finally {
    checking.value = false
  }
}

onMounted(() => {
  if (route.query.cancelled === '1') useAnalytics().track('payment_cancel', { order_id: orderId })
  if (route.query.returned === '1') void checkPayment()
  // Нулевой итог подтверждается тем же серверным endpoint даже без внешнего
  // провайдера; обычный mock оставляем ручным, чтобы демо не списывалось само.
  if (route.query.start === '1' && state.value === 'payable' && (isEpay.value || Number(order.value?.total) === 0)) void startPayment()
})

async function startPayment() {
  if (state.value !== 'payable') return
  paying.value = true
  paymentError.value = ''
  try {
    if (isMock.value) {
      // имитация провайдера → подписанный webhook ставит paid (§10)
      await $fetch('/api/payment/mock-confirm', { method: 'POST', body: { orderId } })
      useAnalytics().purchase(Number(order.value?.total ?? 0), orderId)
      cart.clear()
      toast.add({ title: t('cart.pay.success'), color: 'success' })
      await navigateTo(`/order/${orderId}`)
      return
    }

    const result = await $fetch<{ payUrl: string; free?: boolean }>('/api/payment/create', {
      method: 'POST',
      body: { orderId },
    })
    if (result.free) useAnalytics().purchase(0, orderId)
    await navigateTo(result.payUrl, { external: /^https?:\/\//i.test(result.payUrl) })
  } catch (e) {
    paymentError.value = getFetchMessage(e)
    useAnalytics().track('payment_failure', { order_id: orderId, provider: isEpay.value ? 'epay' : 'mock' })
    toast.add({ title: t('cart.pay.error'), description: paymentError.value, color: 'error' })
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <section class="mx-auto grid max-w-6xl overflow-hidden border border-ink-gray-200 bg-ink-white shadow-sm lg:grid-cols-[.9fr_1.1fr]">
    <div class="relative min-h-80 overflow-hidden bg-ink-black text-white lg:min-h-[680px]">
      <NuxtImg src="/media/products/detail/cotton-collar-v01.webp" alt="" class="absolute inset-0 size-full object-cover opacity-75" sizes="(max-width: 1023px) 100vw, 520px" loading="eager" />
      <div class="absolute inset-0 bg-linear-to-t from-ink-black via-ink-black/35 to-transparent" />
      <div class="absolute inset-x-0 bottom-0 p-7 sm:p-10">
        <p class="ink-label text-white/60">INKMADE / SECURE CHECKOUT</p>
        <p class="ink-display mt-3 max-w-md text-4xl leading-none sm:text-5xl">{{ $t('cart.pay.note') }}</p>
        <div class="mt-7 flex flex-wrap gap-2 text-xs text-white/70">
          <span class="border border-white/20 px-3 py-2"><UIcon name="i-lucide-shield-check" class="mr-1 inline size-3.5" />{{ $t('cart.pay.methods') }}</span>
          <span class="border border-white/20 px-3 py-2"><UIcon name="i-lucide-package-check" class="mr-1 inline size-3.5" />INKMADE CARE</span>
        </div>
      </div>
    </div>

    <div class="flex min-h-[560px] flex-col justify-center p-6 text-center sm:p-10 lg:p-14">
      <UiSectionLabel accent>{{ $t('cart.pay.label') }}</UiSectionLabel>

      <!-- Платёжный экран — только для оплачиваемого заказа -->
      <template v-if="state === 'payable'">
        <h1 class="ink-display mt-3 text-h2">{{ $t('cart.pay.title') }}</h1>
        <div class="my-7 border-y border-ink-gray-200 py-7">
        <p class="ink-label text-ink-gray-600">{{ $t('cart.pay.amountLabel') }}</p>
        <p class="text-h1 ink-display text-ink-burgundy mt-1">{{ order?.total }} {{ $t('units.currency') }}</p>
        </div>
      <!-- DEV: демо-провайдер для сквозного теста потока (в проде /api/payment/mock-confirm отдаёт 404) -->
      <template v-if="isMock">
        <UButton color="primary" size="xl" block icon="i-lucide-check" :loading="paying" @click="startPayment">
          {{ $t('cart.pay.submit') }}
        </UButton>
        <UButton :to="`/order/${orderId}`" color="neutral" variant="ghost" block>{{ $t('cart.pay.cancel') }}</UButton>
        <p class="text-caption text-ink-gray-400 flex items-center justify-center gap-1.5">
          <UIcon name="i-lucide-shield-check" class="shrink-0" />
          {{ $t('cart.pay.note') }}
        </p>
      </template>

      <!-- ПРОД: реальный платёжный провайдер ещё не подключён — вместо нерабочей кнопки показываем статус -->
      <template v-else-if="isEpay">
        <UAlert
          v-if="paymentError" color="error" variant="subtle" icon="i-lucide-circle-alert"
          :title="$t('cart.pay.startFailedTitle')" :description="$t('cart.pay.startFailedText')"
          role="alert"
        />
        <div v-else class="border border-ink-gray-200 rounded-lg bg-ink-gray-50 p-6 text-left space-y-2" role="status" aria-live="polite">
          <p class="ink-label text-ink-gray-700 flex items-center gap-1.5">
            <UIcon :name="paying || checking ? 'i-lucide-loader-circle' : 'i-lucide-shield-check'" :class="['shrink-0', (paying || checking) && 'animate-spin']" />
            {{ route.query.cancelled === '1' ? $t('cart.pay.cancelledTitle') : $t('cart.pay.readyTitle') }}
          </p>
          <p class="text-caption text-ink-gray-600">{{ route.query.cancelled === '1' ? $t('cart.pay.cancelledText') : $t('cart.pay.readyText') }}</p>
        </div>
        <UButton color="primary" size="xl" block icon="i-lucide-credit-card" :loading="paying" @click="startPayment">
          {{ paymentError ? $t('cart.pay.retry') : $t('cart.pay.start') }}
        </UButton>
        <UButton v-if="route.query.returned === '1' || route.query.cancelled === '1'" color="neutral" variant="subtle" block icon="i-lucide-refresh-cw" :loading="checking" @click="checkPayment">{{ $t('cart.pay.checkStatus') }}</UButton>
        <UButton :to="`/order/${orderId}`" color="neutral" variant="ghost" block>{{ $t('cart.pay.viewOrder') }}</UButton>
      </template>

      <template v-else>
        <div class="border border-ink-gray-200 rounded-lg bg-ink-gray-50 p-6 text-left space-y-2">
          <p class="ink-label text-ink-gray-700 flex items-center gap-1.5">
            <UIcon name="i-lucide-clock" class="shrink-0" /> {{ $t('cart.pay.pendingTitle') }}
          </p>
          <p class="text-caption text-ink-gray-600">{{ $t('cart.pay.pendingText') }}</p>
        </div>
        <UButton :to="`/order/${orderId}`" color="primary" size="xl" block icon="i-lucide-package">
          {{ $t('cart.pay.viewOrder') }}
        </UButton>
        <p class="text-caption text-ink-gray-400 flex items-center justify-center gap-1.5">
          <UIcon name="i-lucide-shield-check" class="shrink-0" />
          {{ $t('cart.pay.methods') }}
        </p>
      </template>
      </template>

    <!-- Заказ уже оплачен / в производстве -->
      <template v-else-if="state === 'done'">
      <UIcon name="i-lucide-circle-check" class="size-12 mx-auto text-success" />
      <h1 class="ink-display mt-4 text-h2">{{ $t('cart.pay.doneTitle') }}</h1>
      <p class="text-ink-gray-600">{{ $t('cart.pay.doneText') }}</p>
      <UButton :to="`/order/${orderId}`" color="primary" size="xl" block icon="i-lucide-package">
        {{ $t('cart.pay.viewOrder') }}
      </UButton>
      </template>

    <!-- Заказ отменён / закрыт для оплаты -->
      <template v-else-if="state === 'closed'">
      <UIcon name="i-lucide-circle-x" class="size-12 mx-auto text-ink-gray-400" />
      <h1 class="ink-display text-h2">{{ $t('cart.pay.closedTitle') }}</h1>
      <p class="text-ink-gray-600">{{ $t('cart.pay.closedText') }}</p>
      <UButton to="/account/orders" color="neutral" size="xl" block icon="i-lucide-list">
        {{ $t('cart.pay.toOrders') }}
      </UButton>
      </template>

    <!-- Временная ошибка загрузки заказа -->
      <template v-else-if="state === 'error'">
      <UIcon name="i-lucide-wifi-off" class="size-12 mx-auto text-ink-gray-400" />
      <h1 class="ink-display text-h2">{{ $t('errorPage.genericTitle') }}</h1>
      <p class="text-ink-gray-600">{{ $t('errorPage.genericText') }}</p>
      <UButton color="primary" size="xl" block icon="i-lucide-refresh-cw" :loading="retryingOrder" @click="retryOrder">{{ $t('states.retry') }}</UButton>
      </template>

    <!-- Заказ не найден -->
      <template v-else>
      <UIcon name="i-lucide-search-x" class="size-12 mx-auto text-ink-gray-400" />
      <h1 class="ink-display text-h2">{{ $t('cart.pay.notFoundTitle') }}</h1>
      <p class="text-ink-gray-600">{{ $t('cart.pay.notFoundText') }}</p>
      <UButton to="/account/orders" color="neutral" size="xl" block icon="i-lucide-list">
        {{ $t('cart.pay.toOrders') }}
      </UButton>
      </template>
    </div>
  </section>
</template>
