<script setup lang="ts">
// Категории каталога (§6) — управление без кода. Только admin.
definePageMeta({ layout: 'admin', middleware: 'admin-role' })
useHead({ title: 'Категории — INKMADE' })

const { listAll, create, update, remove } = useCategories()
const toast = useToast()

const { data: cats, refresh, pending } = await useAsyncData('admin-categories', () => listAll())

// транслитерация для slug из русского названия
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}
function slugify(s: string): string {
  return s.toLowerCase().split('').map(ch => TRANSLIT[ch] ?? ch).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const blank = () => ({ id: '', title: '', slug: '', icon: 'i-lucide-shirt', sort_order: 0, is_active: true })
const form = reactive(blank())
const editing = computed(() => !!form.id)
const saving = ref(false)
const slugTouched = ref(false)

watch(() => form.title, (v) => { if (!editing.value && !slugTouched.value) form.slug = slugify(v) })

function startEdit(c: NonNullable<typeof cats.value>[number]) {
  Object.assign(form, { id: c.id, title: c.title, slug: c.slug, icon: c.icon ?? '', sort_order: c.sort_order, is_active: c.is_active })
  slugTouched.value = true
}
function reset() { Object.assign(form, blank()); slugTouched.value = false }

async function onSubmit() {
  if (!form.title.trim() || !form.slug.trim()) { toast.add({ title: 'Название и slug обязательны', color: 'warning' }); return }
  saving.value = true
  try {
    const payload = { title: form.title.trim(), slug: form.slug.trim(), icon: form.icon || null, sort_order: form.sort_order, is_active: form.is_active }
    if (editing.value) await update(form.id, payload)
    else await create(payload)
    toast.add({ title: editing.value ? 'Категория обновлена' : 'Категория добавлена', color: 'success' })
    reset()
    refresh()
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function toggleActive(c: NonNullable<typeof cats.value>[number]) {
  try { await update(c.id, { is_active: !c.is_active }); refresh() }
  catch (e) { toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' }) }
}

async function onDelete(id: string, title: string) {
  if (!confirm(`Удалить категорию «${title}»?`)) return
  try { await remove(id); toast.add({ title: 'Удалена', color: 'success' }); refresh() }
  catch {
    toast.add({ title: 'Нельзя удалить', description: 'В категории есть товары — перенесите или удалите их сначала.', color: 'error' })
  }
}
</script>

<template>
  <div>
    <div class="mb-6">
      <UiSectionLabel accent>Каталог</UiSectionLabel>
      <h1 class="ink-display text-2xl mt-2">Категории</h1>
    </div>

    <div class="grid lg:grid-cols-[1fr_320px] gap-8">
      <div>
        <div v-if="pending" class="py-10 text-center text-ink-gray-600">Загрузка…</div>
        <div v-else-if="!cats?.length" class="py-10 text-center text-ink-gray-600">Категорий нет.</div>
        <table v-else class="w-full text-left border-collapse">
          <thead>
            <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
              <th class="py-2 pr-4">Название</th>
              <th class="py-2 pr-4">Slug</th>
              <th class="py-2 pr-4">Порядок</th>
              <th class="py-2 pr-4">Статус</th>
              <th class="py-2" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in cats" :key="c.id" class="border-b border-ink-gray-200">
              <td class="py-3 pr-4 font-semibold">
                <UIcon v-if="c.icon" :name="c.icon" class="size-4 text-ink-burgundy mr-1 align-middle" />{{ c.title }}
              </td>
              <td class="py-3 pr-4 ink-label text-ink-gray-400">{{ c.slug }}</td>
              <td class="py-3 pr-4">{{ c.sort_order }}</td>
              <td class="py-3 pr-4">
                <UBadge :color="c.is_active ? 'success' : 'neutral'" variant="subtle">{{ c.is_active ? 'Активна' : 'Скрыта' }}</UBadge>
              </td>
              <td class="py-3 text-right whitespace-nowrap">
                <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-pencil" @click="startEdit(c)" />
                <UButton size="sm" color="neutral" variant="ghost" :icon="c.is_active ? 'i-lucide-eye-off' : 'i-lucide-eye'" @click="toggleActive(c)" />
                <UButton size="sm" color="error" variant="ghost" icon="i-lucide-trash-2" @click="onDelete(c.id, c.title)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <aside class="border border-ink-gray-200 rounded-lg p-5 h-fit space-y-4">
        <div class="flex items-center justify-between">
          <UiSectionLabel accent>{{ editing ? 'Редактировать' : 'Новая категория' }}</UiSectionLabel>
          <UButton v-if="editing" size="xs" color="neutral" variant="ghost" @click="reset">Новая</UButton>
        </div>
        <UFormField label="Название" required>
          <UInput v-model="form.title" placeholder="Текстиль" class="w-full" />
        </UFormField>
        <UFormField label="Slug (в URL)" required>
          <UInput v-model="form.slug" placeholder="textile" class="w-full" @input="slugTouched = true" />
        </UFormField>
        <UFormField label="Иконка (lucide)">
          <UInput v-model="form.icon" placeholder="i-lucide-shirt" class="w-full" />
        </UFormField>
        <UFormField label="Порядок сортировки">
          <UInput v-model.number="form.sort_order" type="number" class="w-full" />
        </UFormField>
        <UCheckbox v-model="form.is_active" label="Активна (видна на сайте)" />
        <UButton color="primary" block :loading="saving" @click="onSubmit">{{ editing ? 'Сохранить' : 'Добавить' }}</UButton>
        <p class="text-caption text-ink-gray-400">Иконки: lucide.dev. Категорию с товарами удалить нельзя.</p>
      </aside>
    </div>
  </div>
</template>
