<script setup lang="ts">
import { formatPrice } from '~/utils/format'

// Ручной заказ администратором (§8.2.3): выбрать клиента, собрать позиции, создать.
// Заказ создаётся в статусе «Создан» и далее ведётся по обычному автомату статусов.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t } = useI18n()
useHead({ title: t('admin.orders.new.title') })

const { listProducts, getProductVariants, createManualOrder } = useAdmin()
const { listUsers } = useUsers()
const toast = useToast()

const { data: users } = await useAsyncData('manual-order-users', () => listUsers())
const { data: products } = await useAsyncData('manual-order-products', () => listProducts())

const customerItems = computed(() =>
  (users.value ?? []).map(u => ({ label: u.full_name ? `${u.full_name} · ${u.email}` : u.email, value: u.id })))
const productItems = computed(() =>
  (products.value ?? []).map(p => ({ label: p.title, value: p.id })))

const customerId = ref<string>()

// ── Черновик позиции ─────────────────────────────────────────────
type Variant = { id: string; color_name: string; color_hex: string; size: string; sku: string; stock: number }
const draft = reactive({ productId: '' as string, variantId: '' as string, quantity: 1, unitPrice: 0 })
const variants = ref<Variant[]>([])
const loadingVariants = ref(false)

const variantItems = computed(() =>
  variants.value.map(v => ({
    label: `${v.color_name} · ${v.size} — ${t('admin.orders.new.stock')}: ${v.stock}`,
    value: v.id,
  })))

watch(() => draft.productId, async (pid) => {
  draft.variantId = ''
  variants.value = []
  if (!pid) return
  loadingVariants.value = true
  try {
    variants.value = (await getProductVariants(pid)) as Variant[]
    const p = products.value?.find(x => x.id === pid)
    draft.unitPrice = Number(p?.base_price) || 0
  } finally {
    loadingVariants.value = false
  }
})

// ── Позиции заказа ───────────────────────────────────────────────
interface Line { productId: string; productTitle: string; variantId: string; variantLabel: string; quantity: number; unitPrice: number }
const lines = ref<Line[]>([])
const total = computed(() => lines.value.reduce((s, l) => s + l.unitPrice * l.quantity, 0))

function addLine() {
  if (!draft.productId || !draft.variantId) return
  if (draft.quantity < 1 || draft.unitPrice < 0) return
  const v = variants.value.find(x => x.id === draft.variantId)
  const p = products.value?.find(x => x.id === draft.productId)
  lines.value.push({
    productId: draft.productId,
    productTitle: p?.title ?? '—',
    variantId: draft.variantId,
    variantLabel: v ? `${v.color_name} · ${v.size}` : '—',
    quantity: draft.quantity,
    unitPrice: draft.unitPrice,
  })
  // оставляем выбранный товар, сбрасываем вариант и количество
  draft.variantId = ''
  draft.quantity = 1
}
function removeLine(i: number) {
  lines.value.splice(i, 1)
}

const creating = ref(false)
async function create() {
  if (!customerId.value) { toast.add({ title: t('admin.orders.new.noCustomer'), color: 'warning' }); return }
  if (!lines.value.length) { toast.add({ title: t('admin.orders.new.noLinesError'), color: 'warning' }); return }
  creating.value = true
  try {
    const res = await createManualOrder({
      userId: customerId.value,
      items: lines.value.map(l => ({ variantId: l.variantId, quantity: l.quantity, unitPrice: l.unitPrice })),
    })
    toast.add({ title: t('admin.orders.new.created'), color: 'success' })
    await navigateTo(`/admin/orders/${res.orderId}`)
  } catch (e) {
    toast.add({ title: t('admin.orders.new.error'), description: getFetchMessage(e), color: 'error' })
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div>
    <UiPageHeader :label="$t('admin.orders.new.label')" :title="$t('admin.orders.new.title')" :description="$t('admin.orders.new.description')">
      <template #actions>
        <UButton to="/admin/orders" color="neutral" variant="ghost" icon="i-lucide-arrow-left">{{ $t('admin.orders.title') }}</UButton>
      </template>
    </UiPageHeader>

    <div class="space-y-6 max-w-3xl">
      <!-- Клиент -->
      <UiPanel :title="$t('admin.orders.new.customer')" icon="i-lucide-user">
        <USelectMenu
          v-model="customerId"
          :items="customerItems"
          value-key="value"
          :placeholder="$t('admin.orders.new.customerPlaceholder')"
          :search-input="{ placeholder: $t('admin.orders.new.customerPlaceholder') }"
          class="w-full"
        />
      </UiPanel>

      <!-- Добавление позиции -->
      <UiPanel :title="$t('admin.orders.new.addLine')" icon="i-lucide-plus">
        <div class="grid sm:grid-cols-2 gap-4">
          <UFormField :label="$t('admin.orders.new.product')">
            <USelectMenu v-model="draft.productId" :items="productItems" value-key="value" :placeholder="$t('admin.orders.new.productPlaceholder')" :search-input="{ placeholder: $t('admin.orders.new.productPlaceholder') }" class="w-full" />
          </UFormField>
          <UFormField :label="$t('admin.orders.new.variant')">
            <USelect v-model="draft.variantId" :items="variantItems" value-key="value" :placeholder="$t('admin.orders.new.variantPlaceholder')" :loading="loadingVariants" :disabled="!draft.productId || loadingVariants" class="w-full" />
          </UFormField>
          <UFormField :label="$t('admin.orders.new.quantity')">
            <UInput v-model.number="draft.quantity" type="number" min="1" class="w-full" />
          </UFormField>
          <UFormField :label="$t('admin.orders.new.unitPrice')">
            <UInput v-model.number="draft.unitPrice" type="number" min="0" class="w-full" />
          </UFormField>
        </div>
        <div class="mt-4">
          <UButton color="primary" variant="subtle" icon="i-lucide-plus" :disabled="!draft.productId || !draft.variantId || draft.quantity < 1" @click="addLine">{{ $t('admin.orders.new.add') }}</UButton>
        </div>
      </UiPanel>

      <!-- Позиции -->
      <UiPanel :title="$t('admin.orders.new.linesTitle')" icon="i-lucide-list" :padded="false">
        <UiEmptyState v-if="!lines.length" icon="i-lucide-package" :title="$t('admin.orders.new.noLines')" />
        <div v-else>
          <table class="w-full text-left border-collapse">
            <tbody>
              <tr v-for="(l, i) in lines" :key="i" class="border-b border-ink-gray-200 last:border-0">
                <td class="px-6 py-3">
                  <div class="font-semibold">{{ l.productTitle }}</div>
                  <div class="text-caption text-ink-gray-500">{{ l.variantLabel }}</div>
                </td>
                <td class="px-6 py-3 text-caption">{{ l.quantity }} × {{ formatPrice(l.unitPrice) }}</td>
                <td class="px-6 py-3 text-right font-semibold">{{ formatPrice(l.unitPrice * l.quantity) }}</td>
                <td class="px-6 py-3 text-right">
                  <UButton color="error" variant="ghost" size="sm" icon="i-lucide-trash-2" :aria-label="$t('admin.orders.new.remove')" @click="removeLine(i)" />
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t border-ink-gray-300">
                <td class="px-6 py-3 ink-label" colspan="2">{{ $t('admin.orders.new.total') }}</td>
                <td class="px-6 py-3 text-right text-lg font-bold text-ink-burgundy">{{ formatPrice(total) }}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </UiPanel>

      <div class="flex justify-end">
        <UButton color="primary" size="lg" icon="i-lucide-check" :loading="creating" :disabled="!customerId || !lines.length" @click="create">{{ $t('admin.orders.new.create') }}</UButton>
      </div>
    </div>
  </div>
</template>
