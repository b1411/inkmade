<script setup lang="ts">
// Checkout (§9.1): логин требуется здесь, перед оплатой. Гость собирал корзину локально.
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Оформление — INKMADE' })

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
      toast.add({ title: `Промокод применён: −${formatPrice(res.discount)}`, color: 'success' })
    } else {
      promo.discount = 0
      promo.applied = ''
      promo.error = 'Промокод недействителен или не подходит к заказу'
    }
  } catch {
    promo.error = 'Не удалось проверить промокод'
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
    toast.add({ title: 'Проверьте поля', description: 'Имя, корректный email, телефон (мин. 10 цифр), город и адрес обязательны', color: 'warning' })
    return
  }
  paying.value = true
  try {
    useAnalytics().initiateCheckout(cart.total.value)
    const giftPayload = gift.on ? { recipient: gift.recipient.trim(), message: gift.message.trim(), hidePrice: gift.hidePrice } : undefined
    const { orderId } = await createFromCart(cart.items.value, { ...form }, promo.applied || undefined, giftPayload)
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
        <UInput v-model="form.full_name" autocomplete="name" class="w-full" />
      </UFormField>
      <UFormField label="Email" required help="На него придёт подтверждение заказа">
        <UInput
          v-model="form.email" type="email" autocomplete="email" placeholder="example@mail.kz"
          :color="form.email && !emailValid ? 'error' : undefined" class="w-full"
        />
      </UFormField>
      <UFormField label="Телефон" required>
        <UInput
          v-model="form.phone" type="tel" autocomplete="tel" placeholder="+7 700 000 00 00"
          :color="form.phone && phoneDigits.length < 10 ? 'error' : undefined" class="w-full"
        />
      </UFormField>
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Город" required>
          <UInput v-model="form.city" class="w-full" />
        </UFormField>
        <UFormField label="Адрес доставки" required>
          <UInput v-model="form.address" class="w-full" />
        </UFormField>
      </div>

      <!-- подарочный заказ (§3.1) -->
      <div class="border border-ink-gray-200 rounded-lg p-4 space-y-3">
        <UCheckbox v-model="gift.on" label="Это подарок 🎁" />
        <template v-if="gift.on">
          <UFormField label="Имя получателя" help="Кому вручить — для открытки и упаковки">
            <UInput v-model="gift.recipient" placeholder="Имя получателя" class="w-full" />
          </UFormField>
          <UFormField label="Текст открытки">
            <UTextarea v-model="gift.message" :rows="2" placeholder="С днём рождения!" class="w-full" maxlength="200" />
          </UFormField>
          <UCheckbox v-model="gift.hidePrice" label="Не вкладывать чек с ценой в посылку" />
        </template>
      </div>
    </div>

    <aside class="border border-ink-gray-200 rounded-lg p-5 h-fit space-y-3">
      <UiSectionLabel accent>Заказ</UiSectionLabel>
      <div v-for="i in cart.items.value" :key="i.id" class="flex justify-between text-caption">
        <span>{{ i.title }} ({{ i.size }}) ×{{ i.quantity }}</span>
        <span>{{ formatPrice(i.unitPrice * i.quantity) }}</span>
      </div>
      <!-- промокод -->
      <div class="border-t border-ink-gray-200 pt-3 space-y-2">
        <div class="flex gap-2">
          <UInput v-model="promo.code" placeholder="Промокод" size="sm" class="flex-1" :disabled="!!promo.applied" />
          <UButton
            v-if="!promo.applied" size="sm" color="neutral" variant="subtle"
            :loading="promo.checking" @click="applyPromo"
          >Применить</UButton>
          <UButton
            v-else size="sm" color="neutral" variant="ghost" icon="i-lucide-x"
            @click="promo.code = ''; promo.discount = 0; promo.applied = ''"
          />
        </div>
        <p v-if="promo.error" class="text-caption text-ink-error">{{ promo.error }}</p>
        <p v-if="promo.applied" class="text-caption text-ink-success">Код «{{ promo.applied }}» применён</p>
      </div>

      <div v-if="promo.discount" class="flex justify-between text-caption text-ink-success">
        <span>Скидка</span><span>−{{ formatPrice(promo.discount) }}</span>
      </div>
      <div class="flex justify-between border-t border-ink-gray-200 pt-3 font-semibold">
        <span>Итого</span><span class="text-ink-burgundy">{{ formatPrice(finalTotal) }}</span>
      </div>
      <UButton color="primary" size="lg" block icon="i-lucide-credit-card" :loading="paying" :disabled="!formValid" @click="onPay">
        Перейти к оплате
      </UButton>
      <p class="text-caption text-ink-gray-400 flex items-center gap-1.5">
        <UIcon name="i-lucide-shield-check" class="shrink-0" />
        Безопасная оплата онлайн. Чек придёт на email.
      </p>
    </aside>
  </section>
</template>
