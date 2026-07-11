<script setup lang="ts">
import type { ProductWithRelations } from '~/types/models'

// Мастер создания/редактирования товара (§8.2.1). Черновик сохраняется на каждом шаге.
const props = defineProps<{ initialId?: string }>()

const { t } = useI18n()
const { getProduct } = useAdmin()
const toast = useToast()

const STEPS = computed(() => [
  { n: 1, title: t('admin.wizard.stepBasics') },
  { n: 2, title: t('admin.wizard.stepMaterials') },
  { n: 3, title: t('admin.wizard.stepVariants') },
  { n: 4, title: t('admin.wizard.stepZones') },
  { n: 5, title: t('admin.wizard.stepImages') },
  { n: 6, title: t('admin.wizard.stepPublish') },
])

const step = ref(1)
const productId = ref<string | null>(props.initialId ?? null)
const product = ref<ProductWithRelations | null>(null)
// в режиме редактирования стартуем в loading, чтобы не мигнуть формой «создать» до reload
const loading = ref(!!props.initialId)
const isEdit = computed(() => !!props.initialId)

async function reload() {
  if (!productId.value) return
  loading.value = true
  try {
    product.value = (await getProduct(productId.value)) as ProductWithRelations
  } catch (e) {
    toast.add({ title: t('admin.wizard.loadError'), description: getFetchMessage(e), color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(() => { if (productId.value) reload() })

function onBasicsSaved(id: string) {
  productId.value = id
  reload()
  step.value = 2
}

// шаги 2..6 доступны только после создания черновика
const canStep = (n: number) => n === 1 || !!productId.value
</script>

<template>
  <div class="space-y-8">
    <!-- степпер -->
    <nav class="flex flex-wrap gap-2">
      <button
        v-for="s in STEPS"
        :key="s.n"
        :disabled="!canStep(s.n)"
        class="flex items-center gap-2 px-3 py-2 rounded-md text-caption transition-colors disabled:opacity-40"
        :class="step === s.n
          ? 'bg-ink-burgundy text-ink-cream'
          : 'bg-ink-gray-200 hover:bg-ink-cream-dark'"
        @click="canStep(s.n) && (step = s.n)"
      >
        <span class="ink-label">{{ s.n }}</span>{{ s.title }}
      </button>
    </nav>

    <div v-if="loading" class="py-10 text-center text-ink-gray-600">{{ $t('states.loading') }}</div>

    <!-- редактирование: товар не загрузился → НЕ показываем форму «создать» (иначе выглядит как новый товар) -->
    <UiEmptyState
      v-else-if="isEdit && !product"
      icon="i-lucide-package-x"
      :title="$t('admin.wizard.notFound')"
      :text="$t('admin.wizard.notFoundText')"
    >
      <UButton to="/admin/products" color="neutral" variant="subtle" icon="i-lucide-arrow-left">{{ $t('admin.wizard.backToList') }}</UButton>
    </UiEmptyState>

    <template v-else>
      <AdminWizardStepBasics v-if="step === 1" :product="product" @saved="onBasicsSaved" />

      <template v-else-if="product">
        <AdminWizardStepMaterials v-if="step === 2" :product="product" @changed="reload" />
        <AdminWizardStepVariants v-else-if="step === 3" :product="product" @changed="reload" />
        <AdminWizardStepZones v-else-if="step === 4" :product="product" @changed="reload" />
        <AdminWizardStepImages v-else-if="step === 5" :product="product" @changed="reload" />
        <AdminWizardStepPublish v-else-if="step === 6" :product="product" @changed="reload" />
      </template>
    </template>
  </div>
</template>
