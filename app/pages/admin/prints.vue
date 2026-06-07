<script setup lang="ts">
// Библиотека принтов (§8.2.2, §11.1) — управление курируемыми принтами без кода.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
useHead({ title: 'Библиотека принтов — INKMADE' })

const { listAll, uploadFile, create, update, remove } = usePrintLibrary()
const toast = useToast()

const { data: prints, refresh, pending } = await useAsyncData('admin-prints', () => listAll())

const blank = () => ({ id: '', title: '', author: '', tags: '', royalty_pct: 0, is_active: true })
const form = reactive(blank())
const file = ref<File | null>(null)
const thumb = ref<File | null>(null)
const saving = ref(false)
const editing = computed(() => !!form.id)

function startEdit(p: NonNullable<typeof prints.value>[number]) {
  Object.assign(form, {
    id: p.id, title: p.title, author: p.author ?? '',
    tags: (p.tags ?? []).join(', '), royalty_pct: p.royalty_pct, is_active: p.is_active,
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
  if (!form.title.trim()) { toast.add({ title: 'Укажите название', color: 'warning' }); return }
  if (!editing.value && !file.value) { toast.add({ title: 'Загрузите файл принта', color: 'warning' }); return }
  saving.value = true
  try {
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
    const fileUrl = file.value ? await uploadFile(file.value) : undefined
    const thumbUrl = thumb.value ? await uploadFile(thumb.value) : undefined
    if (editing.value) {
      await update(form.id, {
        title: form.title, author: form.author || null, tags,
        royalty_pct: form.royalty_pct, is_active: form.is_active,
        ...(fileUrl ? { file_url: fileUrl } : {}),
        ...(thumbUrl ? { thumbnail_url: thumbUrl } : {}),
      })
      toast.add({ title: 'Принт обновлён', color: 'success' })
    } else {
      await create({
        title: form.title, author: form.author || null, tags,
        royalty_pct: form.royalty_pct, is_active: form.is_active,
        file_url: fileUrl!, thumbnail_url: thumbUrl ?? fileUrl!,
      })
      toast.add({ title: 'Принт добавлен', color: 'success' })
    }
    resetForm()
    refresh()
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function toggleActive(p: NonNullable<typeof prints.value>[number]) {
  try { await update(p.id, { is_active: !p.is_active }); refresh() }
  catch (e) { toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' }) }
}

async function onDelete(id: string, title: string) {
  if (!confirm(`Удалить принт «${title}»?`)) return
  try { await remove(id); toast.add({ title: 'Удалён', color: 'success' }); refresh() }
  catch (e) { toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' }) }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <UiSectionLabel accent>Принты</UiSectionLabel>
        <h1 class="ink-display text-2xl mt-2">Библиотека принтов</h1>
      </div>
    </div>

    <div class="grid lg:grid-cols-[1fr_340px] gap-8">
      <!-- список -->
      <div>
        <div v-if="pending" class="py-10 text-center text-ink-gray-600">Загрузка…</div>
        <div v-else-if="!prints?.length" class="py-10 text-center text-ink-gray-600">
          Принтов пока нет. Добавьте первый справа.
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div v-for="p in prints" :key="p.id" class="border border-ink-gray-200 rounded-lg overflow-hidden">
            <div class="aspect-square bg-ink-gray-200">
              <img :src="p.thumbnail_url ?? p.file_url" :alt="p.title" class="w-full h-full object-cover">
            </div>
            <div class="p-3 space-y-1">
              <div class="flex items-center justify-between gap-2">
                <p class="font-semibold truncate">{{ p.title }}</p>
                <UBadge :color="p.is_active ? 'success' : 'neutral'" variant="subtle" size="sm">
                  {{ p.is_active ? 'Активен' : 'Скрыт' }}
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
      <aside class="border border-ink-gray-200 rounded-lg p-5 h-fit space-y-4">
        <div class="flex items-center justify-between">
          <UiSectionLabel accent>{{ editing ? 'Редактировать' : 'Добавить принт' }}</UiSectionLabel>
          <UButton v-if="editing" size="xs" color="neutral" variant="ghost" @click="resetForm">Новый</UButton>
        </div>
        <UFormField label="Название" required>
          <UInput v-model="form.title" class="w-full" />
        </UFormField>
        <UFormField label="Автор">
          <UInput v-model="form.author" placeholder="Бренд или художник" class="w-full" />
        </UFormField>
        <UFormField :label="editing ? 'Файл принта (заменить)' : 'Файл принта'" :required="!editing">
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" class="block w-full text-caption" @change="(e:any) => file = e.target.files?.[0] ?? null">
        </UFormField>
        <UFormField label="Миниатюра (необязательно)">
          <input type="file" accept="image/png,image/jpeg" class="block w-full text-caption" @change="(e:any) => thumb = e.target.files?.[0] ?? null">
        </UFormField>
        <UFormField label="Теги (через запятую)">
          <UInput v-model="form.tags" placeholder="граффити, череп, минимал" class="w-full" />
        </UFormField>
        <UFormField label="Роялти, %">
          <UInput v-model.number="form.royalty_pct" type="number" min="0" max="100" class="w-full" />
        </UFormField>
        <UCheckbox v-model="form.is_active" label="Опубликован" />
        <UButton color="primary" block :loading="saving" @click="onSubmit">
          {{ editing ? 'Сохранить' : 'Добавить' }}
        </UButton>
      </aside>
    </div>
  </div>
</template>
