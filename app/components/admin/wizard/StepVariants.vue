<script setup lang="ts">
import type { ProductWithRelations } from '~/types/models'

// Шаг 3 — Варианты (§8.2.1): матрица цвет × размер → генерация вариантов + SKU.
const props = defineProps<{ product: ProductWithRelations }>()
const emit = defineEmits<{ changed: [] }>()

const { generateVariants, deleteVariant } = useAdmin()
const toast = useToast()

const materialItems = computed(() =>
  props.product.materials.map(m => ({ label: m.name, value: m.id })),
)

const form = reactive({
  materialId: props.product.materials[0]?.id ?? '',
  colors: [] as { name: string; hex: string }[],
  sizes: [] as string[],
  initialStock: 0,
})

const newColor = reactive({ name: '', hex: '#111111' })
const newSize = ref('')

function addColor() {
  if (!newColor.name) return
  form.colors.push({ name: newColor.name, hex: newColor.hex })
  newColor.name = ''
  newColor.hex = '#111111'
}
function removeColor(i: number) { form.colors.splice(i, 1) }

function addSize() {
  const s = newSize.value.trim().toUpperCase()
  if (s && !form.sizes.includes(s)) form.sizes.push(s)
  newSize.value = ''
}
function removeSize(i: number) { form.sizes.splice(i, 1) }

const generating = ref(false)
async function onGenerate() {
  if (!form.materialId) { toast.add({ title: 'Сначала добавьте материал (шаг 2)', color: 'warning' }); return }
  if (!form.colors.length || !form.sizes.length) {
    toast.add({ title: 'Добавьте хотя бы один цвет и размер', color: 'warning' }); return
  }
  generating.value = true
  try {
    await generateVariants(props.product.id, props.product.slug, form.materialId, form.colors, form.sizes, form.initialStock)
    toast.add({ title: `Создано вариантов: ${form.colors.length * form.sizes.length}`, color: 'success' })
    form.colors = []
    form.sizes = []
    emit('changed')
  } catch (e) {
    toast.add({ title: 'Ошибка генерации', description: (e as Error).message, color: 'error' })
  } finally {
    generating.value = false
  }
}

async function onDelete(id: string) {
  try { await deleteVariant(id); emit('changed') } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <UAlert
      v-if="!product.materials.length"
      color="warning"
      title="Нет материалов"
      description="Добавьте материал на шаге 2 — вариант привязывается к материалу."
    />

    <template v-else>
      <div v-if="product.variants.length" class="space-y-1">
        <UiSectionLabel>Существующие варианты ({{ product.variants.length }})</UiSectionLabel>
        <div class="flex flex-wrap gap-2 mt-2">
          <span
            v-for="v in product.variants"
            :key="v.id"
            class="inline-flex items-center gap-2 border border-ink-gray-200 rounded-full pl-2 pr-1 py-1 text-caption"
          >
            <span class="size-3 rounded-full border" :style="{ backgroundColor: v.color_hex }" />
            {{ v.color_name }} / {{ v.size }}
            <UButton color="error" variant="ghost" size="xs" icon="i-lucide-x" @click="onDelete(v.id)" />
          </span>
        </div>
      </div>

      <div class="border-t border-ink-gray-200 pt-5 space-y-4">
        <UiSectionLabel accent>Сгенерировать матрицу</UiSectionLabel>

        <UFormField label="Материал">
          <USelect v-model="form.materialId" :items="materialItems" value-key="value" class="w-full max-w-sm" />
        </UFormField>

        <div class="grid md:grid-cols-2 gap-6">
          <div>
            <UiSectionLabel>Цвета</UiSectionLabel>
            <div class="flex flex-wrap gap-2 my-2">
              <span v-for="(c, i) in form.colors" :key="i" class="inline-flex items-center gap-1 border rounded-full px-2 py-1 text-caption">
                <span class="size-3 rounded-full border" :style="{ backgroundColor: c.hex }" />{{ c.name }}
                <UButton color="error" variant="ghost" size="xs" icon="i-lucide-x" @click="removeColor(i)" />
              </span>
            </div>
            <div class="flex gap-2 items-end">
              <UFormField label="Название"><UInput v-model="newColor.name" placeholder="Чёрный" /></UFormField>
              <UFormField label="HEX"><UInput v-model="newColor.hex" type="color" class="w-16 p-1" /></UFormField>
              <UButton color="neutral" variant="subtle" icon="i-lucide-plus" @click="addColor" />
            </div>
          </div>

          <div>
            <UiSectionLabel>Размеры</UiSectionLabel>
            <div class="flex flex-wrap gap-2 my-2">
              <span v-for="(s, i) in form.sizes" :key="i" class="inline-flex items-center gap-1 border rounded-full px-2 py-1 text-caption">
                {{ s }}
                <UButton color="error" variant="ghost" size="xs" icon="i-lucide-x" @click="removeSize(i)" />
              </span>
            </div>
            <div class="flex gap-2 items-end">
              <UFormField label="Размер"><UInput v-model="newSize" placeholder="M" @keydown.enter.prevent="addSize" /></UFormField>
              <UButton color="neutral" variant="subtle" icon="i-lucide-plus" @click="addSize" />
            </div>
          </div>
        </div>

        <UFormField label="Начальный остаток на вариант">
          <UInput v-model.number="form.initialStock" type="number" min="0" class="w-32" />
        </UFormField>

        <UButton color="primary" :loading="generating" @click="onGenerate">
          Сгенерировать {{ form.colors.length * form.sizes.length || '' }} вариантов
        </UButton>
      </div>
    </template>
  </div>
</template>
