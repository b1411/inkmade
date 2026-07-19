<script setup lang="ts">
const { t, locale } = useI18n()
useHead({ title: () => `${t('cart.cart.headTitle')} — INKMADE` })
const cart = useCart()
onMounted(() => cart.load())
const emptyVisualCopy = computed(() => locale.value === 'kk'
  ? { alt: 'INKMADE фирмалық графикасы', line: 'Бір заттан. Сенің есігіңе дейін.' }
  : { alt: 'Фирменная графика INKMADE', line: 'От одной вещи. До твоей двери.' })

function previewUrl(spec: unknown): string | null {
  const url = (spec as { composition_url?: string | null } | null)?.composition_url
  return typeof url === 'string' && url ? url : null
}

function printZones(spec: unknown): string[] {
  const placements = (spec as { placements?: Array<{ zone?: string; hidden?: boolean }> } | null)?.placements ?? []
  return [...new Set(placements.filter(item => !item.hidden && item.zone).map(item => item.zone!))]
}

function decrement(id: string, qty: number) {
  if (qty > 1) cart.updateQty(id, qty - 1)
  else cart.remove(id)
}

const { confirm } = useConfirm()
async function clearCart() {
  const ok = await confirm({ title: t('cart.cart.clearConfirm'), confirmLabel: t('cart.cart.clear'), tone: 'danger' })
  if (ok) cart.clear()
}
</script>

<template>
  <section class="pb-10">
    <UiPageHeader :label="$t('cart.cart.label')" :title="$t('cart.cart.title')" :description="$t('cart.cart.description')">
      <template #actions>
        <button v-if="cart.items.value.length" class="text-xs text-ink-gray-500 underline-offset-4 transition-colors hover:text-ink-error hover:underline" @click="clearCart">
          {{ $t('cart.cart.clear') }}
        </button>
      </template>
    </UiPageHeader>

    <div v-if="!cart.items.value.length" class="grid overflow-hidden border border-ink-gray-200 bg-ink-white lg:grid-cols-2">
      <div class="flex min-h-[380px] flex-col justify-center p-7 sm:p-12">
        <span class="grid size-12 place-items-center bg-ink-burgundy text-white"><UIcon name="i-lucide-shopping-cart" class="size-6" /></span>
        <h2 class="ink-display mt-6 text-h2">{{ $t('cart.cart.empty.title') }}</h2>
        <p class="mt-3 max-w-md text-ink-gray-600">{{ $t('cart.cart.empty.text') }}</p>
        <div class="mt-7">
          <UiAppButton to="/catalog" variant="primary" size="lg" trailing-icon="i-lucide-arrow-right">{{ $t('cart.cart.empty.toCatalog') }}</UiAppButton>
        </div>
      </div>
      <div class="relative min-h-[360px] bg-ink-black lg:min-h-[520px]">
        <NuxtImg src="/media/prints/steppe-frequency-v01.webp" :alt="emptyVisualCopy.alt" class="absolute inset-0 size-full object-cover" sizes="(max-width: 1023px) 100vw, 720px" loading="eager" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />
        <div class="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
          <p class="font-mono text-[10px] uppercase tracking-[.14em] text-white/50">INKMADE / ORIGINAL GRAPHICS</p>
          <p class="ink-display mt-2 max-w-md text-4xl">{{ emptyVisualCopy.line }}</p>
        </div>
      </div>
    </div>

    <div v-else class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-10">
      <div v-auto-animate class="space-y-4">
        <article
          v-for="i in cart.items.value"
          :key="i.id"
          class="grid overflow-hidden border border-ink-gray-200 bg-ink-white shadow-sm sm:grid-cols-[180px_minmax(0,1fr)]"
        >
          <NuxtLink
            :to="i.alias ? `/customize/${i.alias}?cart=${i.id}` : `/product/${i.slug}`"
            class="group/thumb relative grid aspect-square min-h-44 place-items-center overflow-hidden border-b border-ink-gray-200 bg-ink-card sm:aspect-auto sm:border-b-0 sm:border-r"
            :aria-label="t('cart.cart.viewItem', { title: i.title })"
          >
            <img v-if="previewUrl(i.spec)" :src="previewUrl(i.spec)!" :alt="i.title" class="size-full object-contain p-1 transition-transform duration-500 group-hover/thumb:scale-[1.03]">
            <UIcon v-else name="i-lucide-shirt" class="size-12 text-ink-gray-400" />
            <span class="absolute left-3 top-3 ink-label border border-black/10 bg-ink-paper/90 px-2 py-1 text-[9px] text-ink-black backdrop-blur">Proof preview</span>
          </NuxtLink>

          <div class="flex min-w-0 flex-col p-4 sm:p-5">
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <NuxtLink :to="i.alias ? `/customize/${i.alias}?cart=${i.id}` : `/product/${i.slug}`" class="ink-display text-xl transition-colors hover:text-ink-burgundy">
                  {{ i.title }}
                </NuxtLink>
                <p class="mt-2 flex items-center gap-2 text-sm text-ink-gray-600">
                  <span class="size-3 rounded-full border border-black/15" :style="{ backgroundColor: i.colorHex }" />
                  {{ i.colorName }} · {{ i.size }}
                </p>
              </div>
              <UButton color="error" variant="ghost" icon="i-lucide-trash-2" :aria-label="t('cart.cart.removeItem', { title: i.title })" @click="cart.remove(i.id)" />
            </div>

            <div class="mt-4 flex flex-wrap gap-1.5">
              <span v-for="zone in printZones(i.spec)" :key="zone" class="ink-label border border-ink-gray-200 px-2 py-1 text-[9px] text-ink-gray-600">{{ zone }}</span>
              <span v-if="!printZones(i.spec).length" class="text-xs text-ink-gray-400">{{ $t('cart.cart.noZones') }}</span>
            </div>

            <div class="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
              <div>
                <p class="ink-label mb-2 text-[9px] text-ink-gray-400">{{ $t('cart.cart.quantity') }}</p>
                <div class="inline-flex h-11 items-center border border-ink-gray-200 bg-ink-paper">
                  <button class="grid h-full min-w-11 place-items-center transition-colors hover:bg-ink-gray-50" :aria-label="t('cart.cart.decrease')" @click="decrement(i.id, i.quantity)">
                    <UIcon name="i-lucide-minus" class="size-4" />
                  </button>
                  <span class="min-w-10 text-center text-sm font-semibold tabular-nums">{{ i.quantity }}</span>
                  <button class="grid h-full min-w-11 place-items-center transition-colors hover:bg-ink-gray-50" :aria-label="$t('cart.cart.increase')" @click="cart.updateQty(i.id, i.quantity + 1)">
                    <UIcon name="i-lucide-plus" class="size-4" />
                  </button>
                </div>
              </div>
              <div class="text-right">
                <p class="text-xs text-ink-gray-500">{{ formatPrice(i.unitPrice) }} × {{ i.quantity }}</p>
                <p class="mt-1 text-xl font-bold tabular-nums">{{ formatPrice(i.unitPrice * i.quantity) }}</p>
              </div>
            </div>

            <NuxtLink v-if="i.alias" :to="`/customize/${i.alias}?cart=${i.id}`" class="mt-4 inline-flex items-center gap-2 border-t border-ink-gray-200 pt-4 text-xs font-semibold text-ink-burgundy hover:underline">
              <UIcon name="i-lucide-pen-tool" class="size-4" />
              {{ $t('cart.cart.editDesign') }}
            </NuxtLink>
          </div>
        </article>
      </div>

      <aside class="border border-ink-gray-200 bg-ink-white p-5 shadow-sm lg:sticky lg:top-24">
        <div class="flex items-center justify-between border-b border-ink-gray-200 pb-4">
          <h2 class="ink-display text-2xl">{{ $t('cart.cart.summary') }}</h2>
          <span class="ink-label text-[9px] text-ink-gray-400">{{ cart.items.value.length }} items</span>
        </div>
        <dl class="space-y-3 py-5 text-sm">
          <div class="flex justify-between gap-4"><dt class="text-ink-gray-600">{{ $t('cart.cart.subtotal') }}</dt><dd class="font-semibold">{{ formatPrice(cart.total.value) }}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-ink-gray-600">{{ $t('cart.cart.delivery') }}</dt><dd class="text-right text-ink-gray-500">{{ $t('cart.cart.deliveryAtCheckout') }}</dd></div>
        </dl>
        <div class="flex items-end justify-between border-y border-ink-gray-200 py-4">
          <span class="font-semibold">{{ $t('cart.cart.total') }}</span>
          <span class="text-2xl font-bold text-ink-burgundy tabular-nums">{{ formatPrice(cart.total.value) }}</span>
        </div>
        <UiAppButton to="/checkout" variant="primary" size="xl" block trailing-icon="i-lucide-arrow-right" class="mt-5">
          {{ $t('cart.cart.checkout') }}
        </UiAppButton>
        <div class="mt-4 grid grid-cols-3 divide-x divide-ink-gray-200 text-center">
          <div v-for="item in [
            { icon: 'i-lucide-shield-check', key: 'secure' },
            { icon: 'i-lucide-refresh-cw', key: 'editable' },
            { icon: 'i-lucide-truck', key: 'tracking' },
          ]" :key="item.key" class="px-2">
            <UIcon :name="item.icon" class="mx-auto size-4 text-ink-burgundy" />
            <p class="mt-1 text-[10px] leading-tight text-ink-gray-500">{{ $t(`cart.cart.trust.${item.key}`) }}</p>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
