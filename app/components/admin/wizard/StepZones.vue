<script setup lang="ts">
import type { ProductWithRelations } from '~/types/models'
import type { Json } from '~/types/database.types'
import type { PrintMode } from '~~/shared/config/print-methods'
import { DPI_MIN } from '~~/shared/config/zones'
import { zonePresetsForMode, type BoundsMm } from '~~/shared/config/zones'
import { garmentKindForSlug } from '~~/shared/config/garment'

// Шаг 4 — Зоны печати (§8.2.1). Зона валидна только для своего режима (§5.2.1).
const props = defineProps<{ product: ProductWithRelations }>()
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const { addZone, updateZone, deleteZone, uploadCatalogImage } = useAdmin()
const toast = useToast()

// инлайн-редактирование зоны (H10): границы, DPI, подсказка
const editingId = ref<string | null>(null)
const editForm = reactive({ max_width_mm: 0, max_height_mm: 0, min_dpi: DPI_MIN, placement_hint: '' })
function startEdit(z: ProductWithRelations['print_zones'][number]) {
  editingId.value = z.id
  editForm.max_width_mm = Number(z.max_width_mm) || 0
  editForm.max_height_mm = Number(z.max_height_mm) || 0
  editForm.min_dpi = z.min_dpi
  editForm.placement_hint = z.placement_hint ?? ''
}
async function saveEdit(id: string) {
  if (editForm.max_width_mm <= 0 || editForm.max_height_mm <= 0) {
    toast.add({ title: t('admin.wizard.zones.validationSize'), color: 'warning' })
    return
  }
  try {
    await updateZone(id, {
      max_width_mm: editForm.max_width_mm,
      max_height_mm: editForm.max_height_mm,
      min_dpi: editForm.min_dpi,
      placement_hint: editForm.placement_hint || null,
    })
    editingId.value = null
    emit('changed')
  } catch (e) {
    toast.add({ title: t('admin.wizard.zones.error'), description: getFetchMessage(e), color: 'error' })
  }
}

// режимы, реально присутствующие у товара (из материалов)
const availableModes = computed<PrintMode[]>(() => {
  const set = new Set(props.product.materials.map(m => m.print_mode as PrintMode))
  return [...set]
})

const presets = computed(() =>
  availableModes.value.flatMap(mode => zonePresetsForMode(mode)),
)

const saving = ref(false)
async function addFromPreset(presetName: string) {
  const preset = presets.value.find(p => p.name === presetName)
  if (!preset) return
  saving.value = true
  try {
    await addZone(props.product.id, {
      print_mode: preset.mode,
      name: preset.name,
      title: preset.title,
      bounds_mm: preset.bounds_mm as unknown as Json,
      max_width_mm: preset.max_width_mm,
      max_height_mm: preset.max_height_mm,
      min_dpi: DPI_MIN,
      placement_hint: preset.placement_hint ?? null,
    })
    emit('changed')
  } catch (e) {
    toast.add({ title: t('admin.wizard.zones.error'), description: getFetchMessage(e), color: 'error' })
  } finally {
    saving.value = false
  }
}

const { confirm } = useConfirm()
async function onDelete(id: string) {
  const ok = await confirm({ title: t('admin.wizard.zones.deleteConfirm'), confirmLabel: t('actions.delete'), tone: 'danger' })
  if (!ok) return
  try { await deleteZone(id); emit('changed') } catch (e) {
    toast.add({ title: t('admin.wizard.zones.error'), description: getFetchMessage(e), color: 'error' })
  }
}

// визуальный редактор зоны (§8.2.1)
const garmentKind = computed(() => garmentKindForSlug(props.product.slug ?? props.product.alias))
const garmentColor = computed(() => props.product.variants?.[0]?.color_hex ?? '#cccccc')
const visual = reactive({ open: false, zoneId: '', title: '', bounds: null as BoundsMm | null, maxW: 0, maxH: 0 })
function openVisual(z: ProductWithRelations['print_zones'][number]) {
  visual.zoneId = z.id
  visual.title = z.title
  visual.bounds = (z.bounds_mm ?? null) as BoundsMm | null
  visual.maxW = Number(z.max_width_mm) || 0
  visual.maxH = Number(z.max_height_mm) || 0
  visual.open = true
}
async function onVisualSave(payload: { bounds_mm: BoundsMm; max_width_mm: number; max_height_mm: number }) {
  if (payload.max_width_mm <= 0 || payload.max_height_mm <= 0) {
    toast.add({ title: t('admin.wizard.zones.zoneTooSmall'), color: 'warning' }); return
  }
  try {
    await updateZone(visual.zoneId, {
      bounds_mm: payload.bounds_mm as unknown as Json,
      max_width_mm: payload.max_width_mm,
      max_height_mm: payload.max_height_mm,
    })
    visual.open = false
    emit('changed')
    toast.add({ title: t('admin.wizard.zones.zoneSaved'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('admin.wizard.zones.error'), description: getFetchMessage(e), color: 'error' })
  }
}

const uploadingFor = ref<string | null>(null)
async function onMockup(zoneId: string, e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingFor.value = zoneId
  try {
    const url = await uploadCatalogImage(props.product.id, file)
    await updateZone(zoneId, { mockup_url: url })
    emit('changed')
  } catch (err) {
    toast.add({ title: t('admin.wizard.zones.mockupUploadError'), description: getFetchMessage(err), color: 'error' })
  } finally {
    uploadingFor.value = null
  }
}
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <UAlert
      v-if="!product.materials.length"
      color="warning"
      :title="$t('admin.wizard.zones.noMaterialsTitle')"
      :description="$t('admin.wizard.zones.noMaterialsText')"
    />

    <template v-else>
      <div v-if="product.print_zones.length" class="space-y-2">
        <UiSectionLabel>{{ $t('admin.wizard.zones.zonesTitle') }}</UiSectionLabel>
        <div
          v-for="z in product.print_zones"
          :key="z.id"
          class="border border-ink-gray-200 rounded-md px-4 py-3"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold">{{ z.title }} <span class="ink-label text-ink-gray-400">{{ z.print_mode }}</span></p>
              <p class="text-caption text-ink-gray-600">
                {{ $t('admin.wizard.zones.sizeDpi', { w: z.max_width_mm, h: z.max_height_mm, dpi: z.min_dpi }) }}
                <span v-if="z.mockup_url">{{ $t('admin.wizard.zones.mockupMark') }}</span>
              </p>
              <p v-if="z.placement_hint" class="text-caption text-ink-gray-400 mt-1">{{ z.placement_hint }}</p>
            </div>
            <div class="flex items-center gap-2">
              <UButton color="neutral" variant="ghost" icon="i-lucide-frame" :title="$t('admin.wizard.zones.visualEditor')" @click="openVisual(z)" />
              <UButton color="neutral" variant="ghost" icon="i-lucide-pencil" @click="editingId === z.id ? (editingId = null) : startEdit(z)" />
              <label class="cursor-pointer inline-flex items-center gap-1 px-2 py-1 rounded-md text-caption bg-ink-gray-200 hover:bg-ink-cream-dark transition-colors">
                <UIcon :name="uploadingFor === z.id ? 'i-lucide-loader' : 'i-lucide-image-plus'" class="size-4" :class="uploadingFor === z.id && 'animate-spin'" />
                {{ $t('admin.wizard.zones.mockup') }}
                <input type="file" accept="image/*" class="hidden" @change="(e) => onMockup(z.id, e)">
              </label>
              <UButton color="error" variant="ghost" icon="i-lucide-trash-2" @click="onDelete(z.id)" />
            </div>
          </div>

          <div v-if="editingId === z.id" class="mt-3 pt-3 border-t border-ink-gray-200 grid grid-cols-2 gap-3">
            <UFormField :label="$t('admin.wizard.zones.fieldZoneWidth')">
              <UInput v-model.number="editForm.max_width_mm" type="number" min="1" class="w-full" />
            </UFormField>
            <UFormField :label="$t('admin.wizard.zones.fieldZoneHeight')">
              <UInput v-model.number="editForm.max_height_mm" type="number" min="1" class="w-full" />
            </UFormField>
            <UFormField :label="$t('admin.wizard.zones.fieldMinDpi')">
              <UInput v-model.number="editForm.min_dpi" type="number" min="72" class="w-full" />
            </UFormField>
            <UFormField :label="$t('admin.wizard.zones.fieldPlacementHint')" class="col-span-2">
              <UInput v-model="editForm.placement_hint" class="w-full" />
            </UFormField>
            <div class="col-span-2 flex gap-2">
              <UButton color="primary" icon="i-lucide-check" @click="saveEdit(z.id)">{{ $t('actions.save') }}</UButton>
              <UButton color="neutral" variant="ghost" @click="editingId = null">{{ $t('actions.cancel') }}</UButton>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="text-ink-gray-600">{{ $t('admin.wizard.zones.empty') }}</p>

      <div class="border-t border-ink-gray-200 pt-5 space-y-3">
        <UiSectionLabel accent>{{ $t('admin.wizard.zones.addPresetTitle') }}</UiSectionLabel>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="p in presets"
            :key="p.name"
            color="neutral"
            variant="subtle"
            icon="i-lucide-plus"
            :loading="saving"
            @click="addFromPreset(p.name)"
          >
            {{ p.title }}
          </UButton>
        </div>
        <p class="text-caption text-ink-gray-400">
          {{ $t('admin.wizard.zones.presetHint') }}
        </p>
      </div>
    </template>

    <!-- визуальный редактор зоны -->
    <UModal v-model:open="visual.open" :title="$t('admin.wizard.zones.zonePlacementTitle', { title: visual.title })" :ui="{ content: 'max-w-2xl' }">
      <template #body>
        <AdminWizardZoneEditor
          :kind="garmentKind"
          :color-hex="garmentColor"
          :bounds="visual.bounds"
          :max-w="visual.maxW"
          :max-h="visual.maxH"
          @save="onVisualSave"
        />
      </template>
    </UModal>
  </div>
</template>
