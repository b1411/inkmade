<script setup lang="ts">
import type { ProductWithRelations } from '~/types/models'
import { TEXTILE_COLORS } from '~~/shared/config/product-types'

// Шаг 3 — Варианты (§8.2.1): матрица цвет × размер → генерация вариантов + SKU.
const props = defineProps<{ product: ProductWithRelations }>()
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const { generateVariants, deleteVariant } = useAdmin()
const toast = useToast()

// нормализация HEX: принимаем #abc / abc / #aabbcc → #aabbcc (как палитра по номеру в Canva)
function normalizeHex(v: string): string | null {
  let s = v.trim().toLowerCase()
  if (!s.startsWith('#')) s = '#' + s
  if (/^#[0-9a-f]{3}$/.test(s)) s = '#' + s.slice(1).split('').map(c => c + c).join('')
  return /^#[0-9a-f]{6}$/.test(s) ? s : null
}
function presetName(hex: string): string | undefined {
  return TEXTILE_COLORS.find(c => c.hex.toLowerCase() === hex.toLowerCase())?.name
}

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

// ручной ввод HEX («номер цвета через решётку») синхронит и пикер
function onHexInput(v: string) {
  const n = normalizeHex(v)
  if (n) {
    newColor.hex = n
    if (!newColor.name) newColor.name = presetName(n) ?? ''
  }
}

function addColor() {
  const hex = normalizeHex(newColor.hex)
  if (!hex) { toast.add({ title: t('admin.wizard.variants.invalidHex'), description: t('admin.wizard.variants.invalidHexHint'), color: 'warning' }); return }
  if (form.colors.some(c => c.hex.toLowerCase() === hex)) { toast.add({ title: t('admin.wizard.variants.colorExists'), color: 'warning' }); return }
  form.colors.push({ name: newColor.name.trim() || presetName(hex) || hex.toUpperCase(), hex })
  newColor.name = ''
  newColor.hex = '#111111'
}
function addPreset(c: { name: string; hex: string }) {
  if (form.colors.some(x => x.hex.toLowerCase() === c.hex.toLowerCase())) return
  form.colors.push({ name: c.name, hex: c.hex })
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
  if (!form.materialId) { toast.add({ title: t('admin.wizard.variants.selectMaterialFirst'), color: 'warning' }); return }
  if (!form.colors.length || !form.sizes.length) {
    toast.add({ title: t('admin.wizard.variants.selectColorSize'), color: 'warning' }); return
  }
  generating.value = true
  try {
    await generateVariants(props.product.id, props.product.slug, form.materialId, form.colors, form.sizes, form.initialStock)
    toast.add({ title: t('admin.wizard.variants.variantsCreated', { count: form.colors.length * form.sizes.length }), color: 'success' })
    form.colors = []
    form.sizes = []
    emit('changed')
  } catch (e) {
    toast.add({ title: t('admin.wizard.variants.generateError'), description: getFetchMessage(e), color: 'error' })
  } finally {
    generating.value = false
  }
}

async function onDelete(id: string) {
  try { await deleteVariant(id); emit('changed') } catch (e) {
    toast.add({ title: t('admin.wizard.variants.error'), description: getFetchMessage(e), color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <UAlert
      v-if="!product.materials.length"
      color="warning"
      :title="$t('admin.wizard.variants.noMaterialsTitle')"
      :description="$t('admin.wizard.variants.noMaterialsText')"
    />

    <template v-else>
      <div v-if="product.variants.length" class="space-y-1">
        <UiSectionLabel>{{ $t('admin.wizard.variants.existingTitle', { count: product.variants.length }) }}</UiSectionLabel>
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
        <UiSectionLabel accent>{{ $t('admin.wizard.variants.generateTitle') }}</UiSectionLabel>

        <UFormField :label="$t('admin.wizard.variants.fieldMaterial')">
          <USelect v-model="form.materialId" :items="materialItems" value-key="value" class="w-full max-w-sm" />
        </UFormField>

        <div class="grid md:grid-cols-2 gap-6">
          <div>
            <UiSectionLabel>{{ $t('admin.wizard.variants.colorsTitle') }}</UiSectionLabel>
            <div class="flex flex-wrap gap-2 my-2">
              <span v-for="(c, i) in form.colors" :key="i" class="inline-flex items-center gap-1 border rounded-full px-2 py-1 text-caption">
                <span class="size-3 rounded-full border" :style="{ backgroundColor: c.hex }" />{{ c.name }}
                <UButton color="error" variant="ghost" size="xs" icon="i-lucide-x" @click="removeColor(i)" />
              </span>
            </div>

            <!-- быстрая палитра: клик добавляет цвет -->
            <p class="text-label ink-label text-ink-gray-400 mt-1 mb-1">{{ $t('admin.wizard.variants.palette') }}</p>
            <div class="flex flex-wrap gap-1.5 mb-3">
              <button
                v-for="c in TEXTILE_COLORS"
                :key="c.hex"
                type="button"
                :title="`${c.name} · ${c.hex}`"
                class="size-6 rounded-full border-2 border-ink-gray-200 hover:scale-110 transition-transform"
                :style="{ backgroundColor: c.hex }"
                @click="addPreset(c)"
              />
            </div>

            <!-- ввод по номеру цвета (#RRGGBB), как в Canva -->
            <div class="flex gap-2 items-end">
              <UFormField :label="$t('admin.wizard.variants.fieldHex')">
                <UInput
                  :model-value="newColor.hex" placeholder="#1E2A44" class="w-28 font-mono"
                  @update:model-value="onHexInput"
                  @keydown.enter.prevent="addColor"
                />
              </UFormField>
              <UFormField :label="$t('admin.wizard.variants.fieldPicker')">
                <UInput v-model="newColor.hex" type="color" class="w-12 p-1" />
              </UFormField>
              <UFormField :label="$t('admin.wizard.variants.fieldColorName')">
                <UInput v-model="newColor.name" :placeholder="$t('admin.wizard.variants.colorNamePlaceholder')" />
              </UFormField>
              <UButton color="neutral" variant="subtle" icon="i-lucide-plus" @click="addColor" />
            </div>
          </div>

          <div>
            <UiSectionLabel>{{ $t('admin.wizard.variants.sizesTitle') }}</UiSectionLabel>
            <div class="flex flex-wrap gap-2 my-2">
              <span v-for="(s, i) in form.sizes" :key="i" class="inline-flex items-center gap-1 border rounded-full px-2 py-1 text-caption">
                {{ s }}
                <UButton color="error" variant="ghost" size="xs" icon="i-lucide-x" @click="removeSize(i)" />
              </span>
            </div>
            <div class="flex gap-2 items-end">
              <UFormField :label="$t('admin.wizard.variants.fieldSize')"><UInput v-model="newSize" placeholder="M" @keydown.enter.prevent="addSize" /></UFormField>
              <UButton color="neutral" variant="subtle" icon="i-lucide-plus" @click="addSize" />
            </div>
          </div>
        </div>

        <UFormField :label="$t('admin.wizard.variants.fieldInitialStock')">
          <UInput v-model.number="form.initialStock" type="number" min="0" class="w-32" />
        </UFormField>

        <UButton color="primary" :loading="generating" @click="onGenerate">
          {{ $t('admin.wizard.variants.generateButton', { count: form.colors.length * form.sizes.length || '' }) }}
        </UButton>
      </div>
    </template>
  </div>
</template>
