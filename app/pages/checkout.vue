<script setup lang="ts">
// Checkout (§9.1): логин требуется здесь, перед оплатой. Гость собирал корзину локально.
definePageMeta({ middleware: 'auth' })
const { t } = useI18n()
useHead({ title: () => `${t('cart.checkout.headTitle')} — INKMADE` })

const cart = useCart()
const { createFromCart } = useOrder()
const user = useSupabaseUser()
const toast = useToast()

const form = reactive({ full_name: '', email: '', phone: '', city: 'Алматы', address: '' })
const paying = ref(false)

const { list: listAddresses } = useAddresses()
onMounted(async () => {
  cart.load()
  if (!cart.items.value.length) return navigateTo('/cart')
  // предзаполняем email из аккаунта (можно изменить)
  if (user.value?.email) form.email = user.value.email
  // подставляем дефолтный адрес доставки (CRM §3.1)
  try {
    const addrs = await listAddresses()
    const def = addrs?.find(a => a.is_default) ?? addrs?.[0]
    if (def) {
      form.full_name = def.full_name ?? form.full_name
      form.phone = def.phone ?? form.phone
      form.city = def.city ?? form.city
      form.address = def.address ?? form.address
    }
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
      body: { code: promo.code.trim(), subtotal: cart.total.value },
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

async function onPay() {
  if (!formValid.value) {
    toast.add({ title: t('cart.checkout.validation.title'), description: t('cart.checkout.validation.description'), color: 'warning' })
    return
  }
  paying.value = true
  try {
    useAnalytics().initiateCheckout(cart.total.value)
    const giftPayload = gift.on ? { recipient: gift.recipient.trim(), message: gift.message.trim(), hidePrice: gift.hidePrice } : undefined
    const { orderId } = await createFromCart(cart.items.value, { ...form }, promo.applied || undefined, giftPayload)
    const res = await $fetch<{ payUrl: string; free?: boolean }>('/api/payment/create', {
      method: 'POST',
      body: { orderId },
    })
    // бесплатный заказ подтверждается сервером минуя демо-оплату — чистим корзину здесь
    // (в обычном потоке это делает страница оплаты после mock-confirm)
    if (res.free) {
      useAnalytics().purchase(0, orderId)
      cart.clear()
    }
    await navigateTo(res.payUrl)
  } catch (e) {
    toast.add({ title: t('cart.checkout.error.title'), description: (e as Error).message, color: 'error' })
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <section class="grid md:grid-cols-[1fr_320px] gap-8 max-w-4xl">
    <div class="space-y-5">
      <h1 class="ink-display text-h2">{{ $t('cart.checkout.title') }}</h1>
      <UFormField :label="$t('cart.checkout.fields.fullName')" required>
        <UInput v-model="form.full_name" autocomplete="name" class="w-full" />
      </UFormField>
      <UFormField :label="$t('cart.checkout.fields.email')" required :help="$t('cart.checkout.fields.emailHelp')">
        <UInput
          v-model="form.email" type="email" autocomplete="email" :placeholder="$t('cart.checkout.fields.emailPlaceholder')"
          :color="form.email && !emailValid ? 'error' : undefined" class="w-full"
        />
      </UFormField>
      <UFormField :label="$t('cart.checkout.fields.phone')" required>
        <UInput
          v-model="form.phone" type="tel" autocomplete="tel" :placeholder="$t('cart.checkout.fields.phonePlaceholder')"
          :color="form.phone && phoneDigits.length < 10 ? 'error' : undefined" class="w-full"
        />
      </UFormField>
      <div class="grid grid-cols-2 gap-4">
        <UFormField :label="$t('cart.checkout.fields.city')" required>
          <UInput v-model="form.city" class="w-full" />
        </UFormField>
        <UFormField :label="$t('cart.checkout.fields.address')" required>
          <UInput v-model="form.address" class="w-full" />
        </UFormField>
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

    <aside class="h-fit md:sticky md:top-8">
      <UiPanel :title="$t('cart.checkout.summary.title')" icon="i-lucide-shopping-bag">
        <div class="space-y-3">
      <div v-for="i in cart.items.value" :key="i.id" class="flex justify-between text-caption">
        <span>{{ $t('cart.checkout.summary.item', { title: i.title, size: i.size, qty: i.quantity }) }}</span>
        <span>{{ formatPrice(i.unitPrice * i.quantity) }}</span>
      </div>
      <!-- промокод -->
      <div class="border-t border-ink-gray-200 pt-3 space-y-2">
        <div class="flex gap-2">
          <UInput v-model="promo.code" :placeholder="$t('cart.checkout.summary.promoPlaceholder')" size="sm" class="flex-1" :disabled="!!promo.applied" />
          <UButton
            v-if="!promo.applied" size="sm" color="neutral" variant="subtle"
            :loading="promo.checking" @click="applyPromo"
          >{{ $t('cart.checkout.summary.applyPromo') }}</UButton>
          <UButton
            v-else size="sm" color="neutral" variant="ghost" icon="i-lucide-x"
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
      <UButton color="primary" size="lg" block icon="i-lucide-credit-card" :loading="paying" :disabled="!formValid" @click="onPay">
        {{ $t('cart.checkout.summary.pay') }}
      </UButton>
      <p class="text-caption text-ink-gray-400 flex items-center gap-1.5">
        <UIcon name="i-lucide-shield-check" class="shrink-0" />
        {{ $t('cart.checkout.summary.secureNote') }}
      </p>
        </div>
      </UiPanel>
    </aside>
  </section>
</template>
