<script setup lang="ts">
import { PRINT_METHOD_LABELS, type PrintMethod } from '~~/shared/config/print-methods'

// Библиотека принтов (§8.2.2, §11.1) — управление курируемыми принтами без кода.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
const { t } = useI18n()
useHead({ title: t('admin.prints.headTitle') })

const { listAll, uploadFile, create, update, remove } = usePrintLibrary()
const toast = useToast()

const { data: prints, refresh, pending } = await useAsyncData('admin-prints', () => listAll())

const blank = () => ({ id: '', title: '', author: '', tags: '', royalty_pct: 0, is_active: true, compatible_methods: [] as PrintMethod[] })
const form = reactive(blank())
const METHODS = Object.entries(PRINT_METHOD_LABELS) as [PrintMethod, string][]
function toggleMethod(m: PrintMethod) {
  form.compatible_methods = form.compatible_methods.includes(m)
    ? form.compatible_methods.filter(x => x !== m)
    : [...form.compatible_methods, m]
}
const file = ref<File | null>(null)
const thumb = ref<File | null>(null)
const saving = ref(false)
const editing = computed(() => !!form.id)

function startEdit(p: NonNullable<typeof prints.value>[number]) {
  Object.assign(form, {
    id: p.id, title: p.title, author: p.author ?? '',
    tags: (p.tags ?? []).join(', '), royalty_pct: p.royalty_pct, is_active: p.is_active,
    compatible_methods: (p.compatible_methods ?? []) as PrintMethod[],
  })
  file.value = null
  thumb.value = null
}
function resetForm() {
  Object.assign(form, blank())
  file.value = null
  thumb.value = null
}

async function onSubmit() {
  if (!form.title.trim()) { toast.add({ title: t('admin.prints.validationName'), color: 'warning' }); return }
  if (!editing.value && !file.value) { toast.add({ title: t('admin.prints.validationFile'), color: 'warning' }); return }
  saving.value = true
  try {
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const fileUrl = file.value ? await uploadFile(file.value) : undefined
    const thumbUrl = thumb.value ? await uploadFile(thumb.value) : undefined
    if (editing.value) {
      await update(form.id, {
        title: form.title, author: form.author || null, tags,
        royalty_pct: form.royalty_pct, is_active: form.is_active,
        compatible_methods: form.compatible_methods,
        ...(fileUrl ? { file_url: fileUrl } : {}),
        ...(thumbUrl ? { thumbnail_url: thumbUrl } : {}),
      })
      toast.add({ title: t('admin.prints.updated'), color: 'success' })
    } else {
      await create({
        title: form.title, author: form.author || null, tags,
        royalty_pct: form.royalty_pct, is_active: form.is_active,
        compatible_methods: form.compatible_methods,
        file_url: fileUrl!, thumbnail_url: thumbUrl ?? fileUrl!,
      })
      toast.add({ title: t('admin.prints.added'), color: 'success' })
    }
    resetForm()
    refresh()
  } catch (e) {
    toast.add({ title: t('admin.prints.error'), description: getFetchMessage(e), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function toggleActive(p: NonNullable<typeof prints.value>[number]) {
  try { await update(p.id, { is_active: !p.is_active }); refresh() }
  catch (e) { toast.add({ title: t('admin.prints.error'), description: getFetchMessage(e), color: 'error' }) }
}

const { confirm } = useConfirm()
async function onDelete(id: string, title: string) {
  const ok = await confirm({ title: t('admin.prints.deleteConfirm', { title }), confirmLabel: t('actions.delete'), tone: 'danger' })
  if (!ok) return
  try { await remove(id); toast.add({ title: t('admin.prints.deleted'), color: 'success' }); refresh() }
  catch (e) { toast.add({ title: t('admin.prints.error'), description: getFetchMessage(e), color: 'error' }) }
}
</script>

<template>
  <div>
    <UiPageHeader :label="$t('admin.prints.label')" :title="$t('admin.prints.title')" :description="$t('admin.prints.description')" />

    <div class="grid lg:grid-cols-[1fr_340px] gap-8">
      <!-- список -->
      <div>
        <div v-if="pending" class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <UiSkeleton v-for="n in 6" :key="n" rounded="rounded-lg" class="aspect-square" />
        </div>
        <UiEmptyState
          v-else-if="!prints?.length"
          icon="i-lucide-image"
          :title="$t('admin.prints.emptyTitle')"
          :text="$t('admin.prints.emptyText')"
        />
        <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div v-for="p in prints" :key="p.id" class="border border-ink-gray-200 rounded-lg overflow-hidden">
            <div class="aspect-square bg-ink-gray-200">
              <img :src="p.thumbnail_url ?? p.file_url" :alt="p.title" class="w-full h-full object-cover">
            </div>
            <div class="p-3 space-y-1">
              <div class="flex items-center justify-between gap-2">
                <p class="font-semibold truncate">{{ p.title }}</p>
                <UBadge :color="p.is_active ? 'success' : 'neutral'" variant="subtle" size="sm">
                  {{ p.is_active ? $t('admin.prints.statusActive') : $t('admin.prints.statusHidden') }}
                </UBadge>
              </div>
              <p v-if="p.author" class="text-caption text-ink-gray-600 truncate">{{ p.author }}</p>
              <p v-if="p.tags?.length" class="text-caption text-ink-gray-400 truncate">{{ p.tags.join(', ') }}</p>
              <div class="flex items-center gap-1 pt-1">
                <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-pencil" @click="startEdit(p)" />
                <UButton size="xs" color="neutral" variant="ghost" :icon="p.is_active ? 'i-lucide-eye-off' : 'i-lucide-eye'" @click="toggleActive(p)" />
                <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="onDelete(p.id, p.title)" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- форма добавления/редактирования -->
      <UiPanel :title="editing ? $t('admin.prints.formEdit') : $t('admin.prints.formAdd')" class="h-fit">
        <template v-if="editing" #actions>
          <UButton size="xs" color="neutral" variant="ghost" @click="resetForm">{{ $t('admin.prints.newButton') }}</UButton>
        </template>
        <div class="space-y-4">
          <UFormField :label="$t('admin.prints.fieldName')" required>
            <UInput v-model="form.title" class="w-full" />
          </UFormField>
          <UFormField :label="$t('admin.prints.fieldAuthor')">
            <UInput v-model="form.author" :placeholder="$t('admin.prints.authorPlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="editing ? $t('admin.prints.fieldFileReplace') : $t('admin.prints.fieldFile')" :required="!editing">
            <input type="file" accept="image/png,image/jpeg,image/svg+xml" class="block w-full text-caption" @change="(e:any) => file = e.target.files?.[0] ?? null">
          </UFormField>
          <UFormField :label="$t('admin.prints.fieldThumb')">
            <input type="file" accept="image/png,image/jpeg" class="block w-full text-caption" @change="(e:any) => thumb = e.target.files?.[0] ?? null">
          </UFormField>
          <UFormField :label="$t('admin.prints.fieldTags')">
            <UInput v-model="form.tags" :placeholder="$t('admin.prints.tagsPlaceholder')" class="w-full" />
          </UFormField>
          <UFormField :label="$t('admin.prints.fieldMethods')" :help="$t('admin.prints.methodsHint')">
            <div class="flex flex-wrap gap-1.5">
              <UButton
                v-for="[m, label] in METHODS" :key="m"
                size="xs"
                :color="form.compatible_methods.includes(m) ? 'primary' : 'neutral'"
                :variant="form.compatible_methods.includes(m) ? 'solid' : 'subtle'"
                @click="toggleMethod(m)"
              >{{ label }}</UButton>
            </div>
          </UFormField>
          <UFormField :label="$t('admin.prints.fieldRoyalty')">
            <UInput v-model.number="form.royalty_pct" type="number" min="0" max="100" class="w-full" />
          </UFormField>
          <UCheckbox v-model="form.is_active" :label="$t('admin.prints.publishedLabel')" />
          <UButton color="primary" block :loading="saving" @click="onSubmit">
            {{ editing ? $t('actions.save') : $t('actions.add') }}
          </UButton>
        </div>
      </UiPanel>
    </div>
  </div>
</template>
