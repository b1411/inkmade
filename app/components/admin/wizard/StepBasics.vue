<script setup lang="ts">
import type { ProductWithRelations } from '~/types/models'
import { PRODUCT_TYPE_TEMPLATES } from '~~/shared/config/product-types'

// Шаг 1 — Основное (§8.2.1). max_print_mm обязателен для DPI-валидации (§10).
// Быстрый старт: выбрать шаблон типа → создаётся черновик с материалом,
// вариантами и зонами; админу остаётся фото/остаток/публикация.
const props = defineProps<{ product: ProductWithRelations | null }>()
const emit = defineEmits<{ saved: [productId: string] }>()

const { createProduct, updateProduct, createFromTemplate } = useAdmin()
const { listAll: listCategories } = useCategories()
const toast = useToast()

const { data: categories } = await useAsyncData('wizard-categories', () => listCategories())
const categoryItems = computed(() => (categories.value ?? []).map(c => ({ value: c.slug, label: c.title })))

// шаблоны типов изделий (каркас, §6)
const templateItems = PRODUCT_TYPE_TEMPLATES.map(t => ({ value: t.key, label: t.title }))
const templateKey = ref(templateItems[0]?.value ?? '')
const templateTitle = ref('')
const creatingTpl = ref(false)

async function onCreateFromTemplate() {
  creatingTpl.value = true
  try {
    const id = await createFromTemplate(templateKey.value, templateTitle.value)
    toast.add({ title: 'Черновик создан из шаблона', description: 'Материал, варианты и зоны заполнены. Добавьте фото и опубликуйте.', color: 'success' })
    emit('saved', id)
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  } finally {
    creatingTpl.value = false
  }
}

const form = reactive({
  title: props.product?.title ?? '',
  alias: props.product?.alias ?? '',
  slug: props.product?.slug ?? '',
  category: props.product?.category ?? '',
  base_price: props.product?.base_price ?? 0,
  max_size_label: props.product?.max_size_label ?? '6XL',
  max_print_w: (props.product?.max_print_mm as { width?: number } | null)?.width ?? 0,
  max_print_h: (props.product?.max_print_mm as { height?: number } | null)?.height ?? 0,
  description: props.product?.description ?? '',
})

// дефолтная категория — первая доступная, если не задана
watchEffect(() => {
  if (!form.category && categoryItems.value.length) form.category = categoryItems.value[0]!.value
})

// slug по умолчанию повторяет alias (URL товара ↔ alias конструктора, §7.1.1)
watch(() => form.alias, (v) => {
  if (!props.product) form.slug = v
})

const saving = ref(false)

async function onSubmit() {
  if (!form.title || !form.alias || !form.slug) {
    toast.add({ title: 'Заполните название, alias и slug', color: 'warning' })
    return
  }
  if (!form.category) {
    toast.add({ title: 'Выберите категорию', color: 'warning' })
    return
  }
  if (form.max_print_w <= 0 || form.max_print_h <= 0) {
    toast.add({ title: 'Укажите размер печати на макс. размере', description: 'Нужен для DPI-валидации (§10).', color: 'warning' })
    return
  }
  saving.value = true
  try {
    const payload = {
      title: form.title,
      alias: form.alias,
      slug: form.slug,
      category: form.category,
      base_price: form.base_price,
      max_size_label: form.max_size_label,
      max_print_mm: { width: form.max_print_w, height: form.max_print_h },
      description: form.description,
    }
    const saved = props.product
      ? await updateProduct(props.product.id, payload)
      : await createProduct(payload)
    toast.add({ title: 'Сохранено', color: 'success' })
    emit('saved', saved.id)
  } catch (e) {
    toast.add({ title: 'Ошибка сохранения', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-8 max-w-2xl">
    <!-- быстрый старт по шаблону (только при создании) -->
    <div v-if="!props.product" class="border border-ink-burgundy/30 bg-ink-burgundy/5 rounded-lg p-5 space-y-3">
      <UiSectionLabel accent>Быстрый старт по шаблону</UiSectionLabel>
      <p class="text-caption text-ink-gray-600">
        Выберите тип изделия — черновик создастся с материалом, размерами, цветами и зонами печати. Останется добавить фото и опубликовать.
      </p>
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Тип изделия">
          <USelect v-model="templateKey" :items="templateItems" value-key="value" class="w-full" />
        </UFormField>
        <UFormField label="Название (необязательно)">
          <UInput v-model="templateTitle" placeholder="по умолчанию — как тип" class="w-full" />
        </UFormField>
      </div>
      <UButton color="primary" icon="i-lucide-wand-2" :loading="creatingTpl" @click="onCreateFromTemplate">
        Создать из шаблона
      </UButton>
    </div>

    <div v-if="!props.product" class="flex items-center gap-3 text-caption text-ink-gray-400">
      <span class="flex-1 border-t border-ink-gray-200" /> или вручную <span class="flex-1 border-t border-ink-gray-200" />
    </div>

    <form class="space-y-5" @submit.prevent="onSubmit">
      <UFormField label="Название" required>
        <UInput v-model="form.title" class="w-full" placeholder="Футболка оверсайз" />
      </UFormField>

      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Alias (URL конструктора)" required>
          <UInput v-model="form.alias" class="w-full" placeholder="oversize-tee" />
        </UFormField>
        <UFormField label="Slug (URL товара)" required>
          <UInput v-model="form.slug" class="w-full" placeholder="oversize-tee" />
        </UFormField>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Категория" required>
          <USelect v-model="form.category" :items="categoryItems" value-key="value" class="w-full" />
        </UFormField>
        <UFormField label="Базовая цена, ₸" required>
          <UInput v-model.number="form.base_price" type="number" min="0" class="w-full" />
        </UFormField>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <UFormField label="Макс. размер линейки">
          <UInput v-model="form.max_size_label" class="w-full" placeholder="6XL" />
        </UFormField>
        <UFormField label="Печать на макс., ширина мм" required>
          <UInput v-model.number="form.max_print_w" type="number" min="0" class="w-full" />
        </UFormField>
        <UFormField label="Печать на макс., высота мм" required>
          <UInput v-model.number="form.max_print_h" type="number" min="0" class="w-full" />
        </UFormField>
      </div>

      <UFormField label="Описание">
        <UTextarea v-model="form.description" :rows="4" class="w-full" />
      </UFormField>

      <UButton type="submit" color="primary" size="lg" :loading="saving">
        {{ props.product ? 'Сохранить' : 'Создать черновик и продолжить' }}
      </UButton>
    </form>
  </div>
</template>
