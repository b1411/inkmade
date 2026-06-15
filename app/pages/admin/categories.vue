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
    <UiPageHeader label="Каталог" title="Категории" description="Управление категориями каталога — порядок, видимость и иконки." />

    <div class="grid lg:grid-cols-[1fr_320px] gap-8">
      <div>
        <div v-if="pending" class="space-y-3">
          <UiSkeleton v-for="n in 5" :key="n" rounded="rounded-lg" class="h-14" />
        </div>

        <UiEmptyState
          v-else-if="!cats?.length"
          icon="i-lucide-folder-tree"
          title="Категорий нет"
          text="Добавьте первую категорию через форму справа."
        />

        <UiPanel v-else :padded="false">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="ink-label text-ink-gray-600 border-b border-ink-gray-200">
                  <th class="px-6 py-3">Название</th>
                  <th class="px-6 py-3">Slug</th>
                  <th class="px-6 py-3">Порядок</th>
                  <th class="px-6 py-3">Статус</th>
                  <th class="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in cats" :key="c.id" class="border-b border-ink-gray-200 last:border-0">
                  <td class="px-6 py-3 font-semibold">
                    <UIcon v-if="c.icon" :name="c.icon" class="size-4 text-ink-burgundy mr-1 align-middle" />{{ c.title }}
                  </td>
                  <td class="px-6 py-3 ink-label text-ink-gray-400">{{ c.slug }}</td>
                  <td class="px-6 py-3">{{ c.sort_order }}</td>
                  <td class="px-6 py-3">
                    <UBadge :color="c.is_active ? 'success' : 'neutral'" variant="subtle">{{ c.is_active ? 'Активна' : 'Скрыта' }}</UBadge>
                  </td>
                  <td class="px-6 py-3 text-right whitespace-nowrap">
                    <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-pencil" @click="startEdit(c)" />
                    <UButton size="sm" color="neutral" variant="ghost" :icon="c.is_active ? 'i-lucide-eye-off' : 'i-lucide-eye'" @click="toggleActive(c)" />
                    <UButton size="sm" color="error" variant="ghost" icon="i-lucide-trash-2" @click="onDelete(c.id, c.title)" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UiPanel>
      </div>

      <UiPanel class="h-fit" :title="editing ? 'Редактировать' : 'Новая категория'" icon="i-lucide-folder-plus">
        <template #actions>
          <UButton v-if="editing" size="xs" color="neutral" variant="ghost" @click="reset">Новая</UButton>
        </template>
        <div class="space-y-4">
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
        </div>
      </UiPanel>
    </div>
  </div>
</template>
