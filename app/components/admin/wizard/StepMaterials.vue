<script setup lang="ts">
import type { ProductWithRelations } from '~/types/models'
import type { FabricType, PrintMethod } from '~~/shared/config/print-methods'
import {
  FABRIC_RULES, PRINT_METHOD_LABELS, PRINT_MODE_LABELS,
  modeForFabric, defaultMethodForFabric,
} from '~~/shared/config/print-methods'

// Шаг 2 — Материалы (§8.2.1). Метод/режим выводятся из ткани (§5.2.1), не выбираются абстрактно.
const props = defineProps<{ product: ProductWithRelations }>()
const emit = defineEmits<{ changed: [] }>()

const { addMaterial, deleteMaterial } = useAdmin()
const toast = useToast()

const fabricItems = Object.values(FABRIC_RULES).map(r => ({ label: r.label, value: r.fabric }))

const form = reactive({
  name: '',
  fabric: 'cotton' as FabricType,
  method: 'dtg' as PrintMethod,
  surcharge: 0,
})

// допустимые методы и режим зависят от ткани (§5.2.1)
const methodItems = computed(() =>
  FABRIC_RULES[form.fabric].methods.map(m => ({ label: PRINT_METHOD_LABELS[m], value: m })),
)
const derivedMode = computed(() => PRINT_MODE_LABELS[modeForFabric(form.fabric)])

watch(() => form.fabric, (f) => { form.method = defaultMethodForFabric(f) })

const saving = ref(false)
async function onAdd() {
  if (!form.name) {
    toast.add({ title: 'Укажите название материала', color: 'warning' })
    return
  }
  saving.value = true
  try {
    await addMaterial(props.product.id, {
      name: form.name,
      fabric: form.fabric,
      method: form.method,
      surcharge: form.surcharge,
    })
    form.name = ''
    form.surcharge = 0
    emit('changed')
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function onDelete(id: string) {
  try {
    await deleteMaterial(id)
    emit('changed')
  } catch (e) {
    toast.add({ title: 'Ошибка удаления', description: (e as Error).message, color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <div v-if="product.materials.length" class="space-y-2">
      <div
        v-for="m in product.materials"
        :key="m.id"
        class="flex items-center justify-between border border-ink-gray-200 rounded-md px-4 py-3"
      >
        <div>
          <p class="font-semibold">{{ m.name }}</p>
          <p class="text-caption text-ink-gray-600">
            {{ PRINT_METHOD_LABELS[m.print_method as PrintMethod] }} · {{ PRINT_MODE_LABELS[m.print_mode as ('zonal' | 'fullprint')] }}
            <span v-if="m.surcharge"> · +{{ m.surcharge }} ₸</span>
          </p>
        </div>
        <UButton color="error" variant="ghost" icon="i-lucide-trash-2" @click="onDelete(m.id)" />
      </div>
    </div>
    <p v-else class="text-ink-gray-600">Материалы ещё не добавлены.</p>

    <div class="border-t border-ink-gray-200 pt-5 space-y-4">
      <UiSectionLabel accent>Добавить материал</UiSectionLabel>
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Название">
          <UInput v-model="form.name" class="w-full" placeholder="Хлопок 100%" />
        </UFormField>
        <UFormField label="Тип ткани">
          <USelect v-model="form.fabric" :items="fabricItems" value-key="value" class="w-full" />
        </UFormField>
        <UFormField label="Метод печати">
          <USelect v-model="form.method" :items="methodItems" value-key="value" class="w-full" />
        </UFormField>
        <UFormField label="Надбавка, ₸">
          <UInput v-model.number="form.surcharge" type="number" min="0" class="w-full" />
        </UFormField>
      </div>
      <p class="text-caption text-ink-gray-600">
        Режим печати: <strong>{{ derivedMode }}</strong> (определяется тканью автоматически).
      </p>
      <UButton color="primary" :loading="saving" @click="onAdd">Добавить материал</UButton>
    </div>
  </div>
</template>
