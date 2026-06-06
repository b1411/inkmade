<script setup lang="ts">
import type { ProductWithRelations } from '~/types/models'
import type { PrintMode } from '~~/shared/config/print-methods'
import { DPI_MIN } from '~~/shared/config/zones'
import { zonePresetsForMode } from '~~/shared/config/zones'

// Шаг 4 — Зоны печати (§8.2.1). Зона валидна только для своего режима (§5.2.1).
const props = defineProps<{ product: ProductWithRelations }>()
const emit = defineEmits<{ changed: [] }>()

const { addZone, deleteZone, uploadCatalogImage } = useAdmin()
const toast = useToast()

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
      bounds_mm: preset.bounds_mm,
      max_width_mm: preset.max_width_mm,
      max_height_mm: preset.max_height_mm,
      min_dpi: DPI_MIN,
      placement_hint: preset.placement_hint ?? null,
    })
    emit('changed')
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function onDelete(id: string) {
  try { await deleteZone(id); emit('changed') } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  }
}

const uploadingFor = ref<string | null>(null)
async function onMockup(zoneId: string, e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingFor.value = zoneId
  try {
    const url = await uploadCatalogImage(props.product.id, file)
    // обновим зону напрямую
    const { updateZoneMockup } = useZonePatch()
    await updateZoneMockup(zoneId, url)
    emit('changed')
  } catch (err) {
    toast.add({ title: 'Ошибка загрузки мокапа', description: (err as Error).message, color: 'error' })
  } finally {
    uploadingFor.value = null
  }
}

// маленький локальный хелпер для патча мокапа зоны
function useZonePatch() {
  const supabase = useSupabaseClient()
  return {
    async updateZoneMockup(zoneId: string, url: string) {
      const { error } = await supabase.from('print_zones').update({ mockup_url: url }).eq('id', zoneId)
      if (error) throw error
    },
  }
}
</script>

<template>
  <div class="space-y-6 max-w-2xl">
    <UAlert
      v-if="!product.materials.length"
      color="warning"
      title="Нет материалов"
      description="Режим зон определяется материалом — добавьте материал на шаге 2."
    />

    <template v-else>
      <div v-if="product.print_zones.length" class="space-y-2">
        <UiSectionLabel>Зоны товара</UiSectionLabel>
        <div
          v-for="z in product.print_zones"
          :key="z.id"
          class="border border-ink-gray-200 rounded-md px-4 py-3"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold">{{ z.title }} <span class="ink-label text-ink-gray-400">{{ z.print_mode }}</span></p>
              <p class="text-caption text-ink-gray-600">
                до {{ z.max_width_mm }}×{{ z.max_height_mm }} мм · min {{ z.min_dpi }} DPI
                <span v-if="z.mockup_url"> · мокап ✓</span>
              </p>
              <p v-if="z.placement_hint" class="text-caption text-ink-gray-400 mt-1">{{ z.placement_hint }}</p>
            </div>
            <div class="flex items-center gap-2">
              <label class="cursor-pointer inline-flex items-center gap-1 px-2 py-1 rounded-md text-caption bg-ink-gray-200 hover:bg-ink-cream-dark transition-colors">
                <UIcon :name="uploadingFor === z.id ? 'i-lucide-loader' : 'i-lucide-image-plus'" class="size-4" :class="uploadingFor === z.id && 'animate-spin'" />
                Мокап
                <input type="file" accept="image/*" class="hidden" @change="(e) => onMockup(z.id, e)">
              </label>
              <UButton color="error" variant="ghost" icon="i-lucide-trash-2" @click="onDelete(z.id)" />
            </div>
          </div>
        </div>
      </div>
      <p v-else class="text-ink-gray-600">Зоны ещё не добавлены.</p>

      <div class="border-t border-ink-gray-200 pt-5 space-y-3">
        <UiSectionLabel accent>Добавить зону из пресета</UiSectionLabel>
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
          Границы и DPI можно затем уточнить. Товар без мокапа/зон не публикуется (§8.4).
        </p>
      </div>
    </template>
  </div>
</template>
