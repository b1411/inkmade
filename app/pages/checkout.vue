<script setup lang="ts">
// Checkout (§9.1): логин требуется здесь, перед оплатой. Гость собирал корзину локально.
definePageMeta({ middleware: 'auth' })
const { t, locale } = useI18n()
useHead({ title: () => `${t('cart.checkout.headTitle')} — INKMADE` })

const cart = useCart()
const { createFromCart } = useOrder()
const user = useSupabaseUser()
const toast = useToast()
const runtimeConfig = useRuntimeConfig()
const paymentMethodLabel = computed(() => runtimeConfig.public.paymentProvider === 'epay'
  ? t('cart.checkout.payment.epay')
  : t('cart.checkout.payment.online'))

const form = reactive({ full_name: '', email: '', phone: '', city: 'Алматы', address: '' })
const paying = ref(false)
const submitted = ref(false)

const { get: getSetting } = useSettings()
const { data: configuredDeliveryEta } = await useAsyncData('checkout-delivery-eta', () => getSetting<string>('delivery.eta'))
const deliveryEta = computed(() => configuredDeliveryEta.value || t('cart.checkout.delivery.defaultEta'))

const blankBySlug: Record<string, string> = {
  tshirt: '/media/products/blank/classic-black-v01.webp',
  tshirt_oversize: '/media/products/blank/oversize-v01.webp',
  polo: '/media/products/blank/polo-v01.webp',
  sweatshirt: '/media/products/blank/sweatshirt-v01.webp',
  hoodie: '/media/products/blank/hoodie-v01.webp',
  cap: '/media/products/blank/cap-v01.webp',
  tote: '/media/products/blank/tote-v01.webp',
}
function itemPreview(item: (typeof cart.items.value)[number]) {
  if (item.spec && typeof item.spec === 'object' && !Array.isArray(item.spec)) {
    const url = (item.spec as Record<string, unknown>).composition_url
    if (typeof url === 'string' && url) return url
  }
  return blankBySlug[item.slug] ?? '/media/products/blank/classic-black-v01.webp'
}

// идемпотентность оформления: стабильный ключ на сессию checkout — ретрай после сбоя
// сети вернёт уже созданный заказ, а не создаст второй. Генерим лениво на клиенте.
const idempotencyKey = ref<string | undefined>(undefined)
function ensureIdemKey(): string | undefined {
  if (!idempotencyKey.value && import.meta.client && typeof crypto !== 'undefined' && crypto.randomUUID) {
    idempotencyKey.value = crypto.randomUUID()
  }
  return idempotencyKey.value
}

const { list: listAddresses } = useAddresses()
type SavedAddress = Awaited<ReturnType<typeof listAddresses>>[number]
const savedAddresses = ref<SavedAddress[]>([])
const selectedAddressId = ref('manual')
const addressItems = computed(() => [
  ...savedAddresses.value.map(address => ({
    label: `${address.full_name} · ${address.city}, ${address.address}`,
    value: address.id,
  })),
  { label: t('cart.checkout.savedAddress.manual'), value: 'manual' },
])

function applySavedAddress(id: string) {
  selectedAddressId.value = id
  const address = savedAddresses.value.find(item => item.id === id)
  if (!address) return
  form.full_name = address.full_name ?? form.full_name
  form.phone = address.phone ?? form.phone
  form.city = address.city ?? form.city
  form.address = address.address ?? form.address
}

onMounted(async () => {
  cart.load()
  if (!cart.items.value.length) return navigateTo('/cart')
  // предзаполняем email из аккаунта (можно изменить)
  if (user.value?.email) form.email = user.value.email
  // подставляем дефолтный адрес доставки (CRM §3.1)
  try {
    savedAddresses.value = await listAddresses()
    const def = savedAddresses.value.find(a => a.is_default) ?? savedAddresses.value[0]
    if (def) applySavedAddress(def.id)
  } catch { /* адреса не критичны для оформления */ }
})

// промокод (§6.7): серверный предпросмотр скидки, авторитетный расчёт — при оформлении
const promo = reactive({ code: '', discount: 0, applied: '', checking: false, error: '' })
const finalTotal = computed(() => Math.max(0, cart.total.value - promo.discount))
async function applyPromo() {
  if (!promo.code.trim()) return
  promo.checking = true
  promo.error = ''
  try {
    const res = await $fetch<{ valid: boolean; discount?: number; code?: string }>('/api/promo/validate', {
      method: 'POST',
      body: {
        code: promo.code.trim(),
        subtotal: cart.total.value,
        // позиции магазина — чтобы предпросмотр распознал промокод конкретного магазина
        items: cart.items.value
          .filter(i => i.shopItemId)
          .map(i => ({ shopItemId: i.shopItemId, quantity: i.quantity })),
      },
    })
    if (res.valid && res.discount) {
      promo.discount = res.discount
      promo.applied = res.code ?? promo.code.trim()
      toast.add({ title: t('cart.checkout.promo.appliedToast', { amount: formatPrice(res.discount) }), color: 'success' })
    } else {
      promo.discount = 0
      promo.applied = ''
      promo.error = t('cart.checkout.promo.invalid')
    }
  } catch {
    promo.error = t('cart.checkout.promo.checkFailed')
  } finally {
    promo.checking = false
  }
}

// подарочный заказ (§3.1): получатель, открытка, скрыть цену в упаковке
const gift = reactive({ on: false, recipient: '', message: '', hidePrice: true })

// телефон: ≥10 цифр (KZ-формат +7 7xx ...); email: базовый паттерн
const phoneDigits = computed(() => form.phone.replace(/\D/g, ''))
const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
const formValid = computed(() =>
  !!form.full_name.trim() && emailValid.value && phoneDigits.value.length >= 10
  && !!form.city.trim() && !!form.address.trim(),
)
const fieldErrors = computed(() => ({
  fullName: form.full_name.trim() ? '' : t('cart.checkout.validation.required'),
  email: emailValid.value ? '' : t('cart.checkout.validation.email'),
  phone: phoneDigits.value.length >= 10 ? '' : t('cart.checkout.validation.phone'),
  city: form.city.trim() ? '' : t('cart.checkout.validation.required'),
  address: form.address.trim() ? '' : t('cart.checkout.validation.required'),
}))

async function onPay() {
  if (paying.value) return
  submitted.value = true
  if (!formValid.value) {
    toast.add({ title: t('cart.checkout.validation.title'), description: t('cart.checkout.validation.description'), color: 'warning' })
    await nextTick()
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return
  }
  paying.value = true
  try {
    useAnalytics().initiateCheckout(cart.total.value)
    const giftPayload = gift.on ? { recipient: gift.recipient.trim(), message: gift.message.trim(), hidePrice: gift.hidePrice } : undefined
    const { orderId } = await createFromCart(cart.items.value, { ...form }, promo.applied || undefined, giftPayload, ensureIdemKey())
    // Заказ создан (источник истины для оплаты — сама запись orders, не корзина).
    // Чистим корзину СРАЗУ: иначе «Назад» со страницы оплаты → повторный onPay →
    // второй заказ (анти-дубль). Оплата остаётся доступной из /account/orders.
    cart.clear()
    // Платёж запускается на внутренней странице сохранённого заказа. Если банк
    // временно недоступен, пользователь не теряет заказ и может повторить попытку.
    await navigateTo(`/checkout/pay/${orderId}?start=1`)
  } catch (e) {
    useAnalytics().track('payment_failure', { stage: 'order_create' })
    // дружелюбный текст сервера (напр. «Недостаточно товара — обновите корзину»)
    // лежит в e.data.statusMessage, а не в техническом e.message
    toast.add({ title: t('cart.checkout.error.title'), description: getFetchMessage(e), color: 'error' })
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <section class="pb-10">
    <div class="mb-8 grid overflow-hidden bg-ink-black text-ink-text lg:grid-cols-[minmax(0,1fr)_420px]">
      <div class="flex min-h-72 flex-col justify-between p-6 sm:p-8 lg:p-10">
        <div>
          <UiSectionLabel class="text-white/45">{{ $t('cart.checkout.label') }} / SECURE</UiSectionLabel>
          <h1 class="ink-display mt-3 max-w-2xl text-h1">{{ $t('cart.checkout.title') }}</h1>
          <p class="mt-4 max-w-xl text-ink-text-soft">{{ $t('cart.checkout.description') }}</p>
        </div>
        <div class="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/65">
          <span class="flex items-center gap-2"><UIcon name="i-lucide-shield-check" class="size-4 text-ink-burgundy-hover" />{{ locale === 'kk' ? 'Қауіпсіз төлем' : 'Защищённая оплата' }}</span>
          <span class="flex items-center gap-2"><UIcon name="i-lucide-package-check" class="size-4 text-ink-burgundy-hover" />{{ locale === 'kk' ? 'Сапаны қолмен тексеру' : 'Ручная проверка качества' }}</span>
          <span class="flex items-center gap-2"><UIcon name="i-lucide-map-pin" class="size-4 text-ink-burgundy-hover" />{{ locale === 'kk' ? 'Қазақстан бойынша' : 'Доставка по Казахстану' }}</span>
        </div>
      </div>
      <div class="relative hidden min-h-72 lg:block">
        <NuxtImg src="/media/products/blank/hoodie-v01.webp" alt="Чёрное худи INKMADE" class="absolute inset-0 size-full bg-[#d9d5ce] object-contain p-6" sizes="420px" loading="eager" />
        <div class="absolute inset-0 bg-gradient-to-r from-ink-black/40 to-transparent" />
      </div>
    </div>

    <ol class="mb-8 grid grid-cols-2 border border-ink-gray-200 bg-ink-white sm:grid-cols-4" :aria-label="$t('cart.checkout.progressLabel')">
      <li v-for="(step, index) in [
        { icon: 'i-lucide-user-round', key: 'contacts' },
        { icon: 'i-lucide-truck', key: 'delivery' },
        { icon: 'i-lucide-credit-card', key: 'payment' },
        { icon: 'i-lucide-shield-check', key: 'review' },
      ]" :key="step.key" class="flex min-h-16 items-center gap-3 border-ink-gray-200 px-3 sm:border-r sm:last:border-r-0">
        <span class="grid size-7 shrink-0 place-items-center border border-ink-burgundy font-mono text-[10px] text-ink-burgundy">0{{ index + 1 }}</span>
        <div class="min-w-0">
          <UIcon :name="step.icon" class="size-4 text-ink-gray-400" />
          <p class="truncate text-xs font-semibold">{{ $t(`cart.checkout.steps.${step.key}`) }}</p>
        </div>
      </li>
    </ol>

    <form class="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-12" novalidate @submit.prevent="onPay">
    <div class="space-y-5">
      <div class="border-b border-ink-gray-200 pb-3">
        <UiSectionLabel accent>01 / {{ $t('cart.checkout.steps.contacts') }}</UiSectionLabel>
        <h2 class="ink-display mt-2 text-2xl">{{ $t('cart.checkout.contactTitle') }}</h2>
      </div>
      <UFormField :label="$t('cart.checkout.fields.fullName')" required :error="submitted ? fieldErrors.fullName : undefined">
        <UInput v-model="form.full_name" autocomplete="name" class="w-full" />
      </UFormField>
      <UFormField :label="$t('cart.checkout.fields.email')" required :help="$t('cart.checkout.fields.emailHelp')" :error="submitted ? fieldErrors.email : undefined">
        <UInput
          v-model="form.email" type="email" autocomplete="email" :placeholder="$t('cart.checkout.fields.emailPlaceholder')"
          :color="form.email && !emailValid ? 'error' : undefined" class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('cart.checkout.fields.phone')" required :error="submitted ? fieldErrors.phone : undefined">
        <UInput
          v-model="form.phone" type="tel" autocomplete="tel" :placeholder="$t('cart.checkout.fields.phonePlaceholder')"
          :color="form.phone && phoneDigits.length < 10 ? 'error' : undefined" class="w-full"
        />
      </UFormField>
      <div class="border-b border-ink-gray-200 pb-3 pt-4">
        <UiSectionLabel accent>02 / {{ $t('cart.checkout.steps.delivery') }}</UiSectionLabel>
        <h2 class="ink-display mt-2 text-2xl">{{ $t('cart.checkout.deliveryTitle') }}</h2>
      </div>
      <UFormField v-if="savedAddresses.length" :label="$t('cart.checkout.savedAddress.label')">
        <USelect
          :model-value="selectedAddressId" :items="addressItems" value-key="value"
          class="w-full" @update:model-value="applySavedAddress"
        />
      </UFormField>
      <div class="grid grid-cols-2 gap-4">
        <UFormField :label="$t('cart.checkout.fields.city')" required :error="submitted ? fieldErrors.city : undefined">
          <UInput v-model="form.city" autocomplete="address-level2" class="w-full" />
        </UFormField>
        <UFormField :label="$t('cart.checkout.fields.address')" required :error="submitted ? fieldErrors.address : undefined">
          <UInput v-model="form.address" autocomplete="street-address" class="w-full" />
        </UFormField>
      </div>
      <div class="flex items-start gap-3 border border-ink-gray-200 bg-ink-gray-50 p-4 text-caption text-ink-gray-600">
        <UIcon name="i-lucide-truck" class="mt-0.5 size-4 shrink-0 text-ink-burgundy" />
        <div>
          <p class="font-semibold text-ink-black">{{ $t('cart.checkout.delivery.method') }}</p>
          <p>{{ deliveryEta }} · {{ $t('cart.checkout.delivery.cost') }}</p>
        </div>
      </div>

      <!-- подарочный заказ (§3.1) -->
      <UiPanel>
        <div class="space-y-3">
          <UCheckbox v-model="gift.on" :label="$t('cart.checkout.gift.toggle')" />
          <template v-if="gift.on">
            <UFormField :label="$t('cart.checkout.gift.recipient')" :help="$t('cart.checkout.gift.recipientHelp')">
              <UInput v-model="gift.recipient" :placeholder="$t('cart.checkout.gift.recipientPlaceholder')" class="w-full" />
            </UFormField>
            <UFormField :label="$t('cart.checkout.gift.message')">
              <UTextarea v-model="gift.message" :rows="2" :placeholder="$t('cart.checkout.gift.messagePlaceholder')" class="w-full" maxlength="200" />
            </UFormField>
            <UCheckbox v-model="gift.hidePrice" :label="$t('cart.checkout.gift.hidePrice')" />
          </template>
        </div>
      </UiPanel>
    </div>

    <aside class="h-fit lg:sticky lg:top-24">
      <UiPanel :title="$t('cart.checkout.summary.title')" icon="i-lucide-shopping-bag">
        <div class="space-y-3">
      <div v-for="i in cart.items.value" :key="i.id" class="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 border-b border-ink-gray-200 pb-3 text-caption last:border-0">
        <div class="size-14 overflow-hidden bg-ink-gray-100">
          <NuxtImg :src="itemPreview(i)" :alt="i.title" class="size-full object-contain p-1" width="112" height="112" />
        </div>
        <div class="min-w-0">
          <p class="truncate font-semibold text-ink-black">{{ i.title }}</p>
          <p class="mt-0.5 truncate text-ink-gray-500">{{ i.colorName }} · {{ i.size }} · ×{{ i.quantity }}</p>
        </div>
        <span class="font-semibold">{{ formatPrice(i.unitPrice * i.quantity) }}</span>
      </div>
      <!-- промокод -->
      <div class="border-t border-ink-gray-200 pt-3 space-y-2">
        <div class="flex gap-2">
          <UInput v-model="promo.code" :placeholder="$t('cart.checkout.summary.promoPlaceholder')" size="sm" class="flex-1" :disabled="!!promo.applied" />
          <UButton
            v-if="!promo.applied" size="sm" color="neutral" variant="subtle"
            type="button" :loading="promo.checking" @click="applyPromo"
          >{{ $t('cart.checkout.summary.applyPromo') }}</UButton>
          <UButton
            v-else size="sm" color="neutral" variant="ghost" icon="i-lucide-x"
            type="button"
            :aria-label="$t('cart.checkout.summary.clearPromo')"
            @click="promo.code = ''; promo.discount = 0; promo.applied = ''"
          />
        </div>
        <p v-if="promo.error" class="text-caption text-ink-error">{{ promo.error }}</p>
        <p v-if="promo.applied" class="text-caption text-ink-success">{{ $t('cart.checkout.summary.promoApplied', { code: promo.applied }) }}</p>
      </div>

      <div v-if="promo.discount" class="flex justify-between text-caption text-ink-success">
        <span>{{ $t('cart.checkout.summary.discount') }}</span><span>−{{ formatPrice(promo.discount) }}</span>
      </div>
      <div class="flex justify-between border-t border-ink-gray-200 pt-3 font-semibold">
        <span>{{ $t('cart.checkout.summary.total') }}</span><span class="text-ink-burgundy">{{ formatPrice(finalTotal) }}</span>
      </div>
      <UButton type="submit" color="primary" size="lg" block icon="i-lucide-credit-card" :loading="paying" :disabled="paying || !cart.items.value.length">
        {{ $t('cart.checkout.summary.pay') }}
      </UButton>
      <p class="flex items-center gap-1.5 text-caption text-ink-gray-400">
        <UIcon name="i-lucide-shield-check" class="shrink-0" />
        {{ $t('cart.checkout.summary.secureNote') }}
      </p>
      <div class="border-t border-ink-gray-200 pt-3">
        <p class="ink-label text-[9px] text-ink-gray-400">03 / {{ $t('cart.checkout.steps.payment') }}</p>
        <div class="mt-2 flex items-center gap-3 border border-ink-gray-200 bg-ink-gray-50 p-3">
          <span class="grid size-9 place-items-center bg-ink-black text-xs font-bold text-white">H</span>
          <div>
            <p class="text-sm font-semibold">{{ paymentMethodLabel }}</p>
            <p class="text-[11px] text-ink-gray-500">Visa · Mastercard · secure redirect</p>
          </div>
        </div>
      </div>
      <!-- Акцепт оферты = оплата (см. shared/legal/documents.ts, оферта §3) -->
      <p class="text-caption text-ink-gray-400 leading-relaxed">
        {{ $t('cart.checkout.summary.legalPrefix') }}
        <NuxtLink to="/legal/offer" target="_blank" class="text-ink-burgundy hover:underline">{{ $t('cart.checkout.summary.legalOffer') }}</NuxtLink>,
        <NuxtLink to="/legal/terms" target="_blank" class="text-ink-burgundy hover:underline">{{ $t('cart.checkout.summary.legalTerms') }}</NuxtLink>
        {{ $t('cart.checkout.summary.legalAnd') }}
        <NuxtLink to="/legal/privacy" target="_blank" class="text-ink-burgundy hover:underline">{{ $t('cart.checkout.summary.legalPrivacy') }}</NuxtLink>.
      </p>
        </div>
      </UiPanel>
    </aside>
    </form>
  </section>
</template>
