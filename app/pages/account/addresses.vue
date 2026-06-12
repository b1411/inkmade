<script setup lang="ts">
// Адреса доставки (CRM §3.1). Дефолтный подставляется в checkout.
definePageMeta({ layout: 'account', middleware: 'auth' })
const { list, create, update, remove, setDefault } = useAddresses()
const toast = useToast()

const { data: addresses, refresh, pending } = await useAsyncData('account-addresses', () => list())

const form = reactive({ full_name: '', phone: '', city: 'Алматы', address: '' })
const editingId = ref<string | null>(null)
const adding = ref(false)

function resetForm() {
  Object.assign(form, { full_name: '', phone: '', city: 'Алматы', address: '' })
  editingId.value = null
}
function startEdit(a: { id: string; full_name: string | null; phone: string | null; city: string; address: string }) {
  editingId.value = a.id
  Object.assign(form, { full_name: a.full_name ?? '', phone: a.phone ?? '', city: a.city, address: a.address })
  if (import.meta.client) window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}

async function onSubmit() {
  if (!form.full_name || !form.phone || !form.address) {
    toast.add({ title: 'Заполните имя, телефон и адрес', color: 'warning' }); return
  }
  adding.value = true
  try {
    if (editingId.value) {
      await update(editingId.value, { ...form })
      toast.add({ title: 'Адрес обновлён', color: 'success' })
    } else {
      await create({ ...form, is_default: !(addresses.value?.length) })
      toast.add({ title: 'Адрес добавлен', color: 'success' })
    }
    resetForm()
    await refresh()
  } catch (e) {
    toast.add({ title: 'Ошибка', description: (e as Error).message, color: 'error' })
  } finally { adding.value = false }
}
async function onRemove(id: string) {
  if (!confirm('Удалить этот адрес?')) return
  await remove(id)
  if (editingId.value === id) resetForm()
  await refresh()
}
async function onDefault(id: string) { await setDefault(id); await refresh() }
</script>

<template>
  <div class="max-w-2xl">
    <UiSectionLabel accent>Доставка</UiSectionLabel>
    <h1 class="ink-display text-3xl mt-2 mb-6">Адреса</h1>

    <div v-if="pending" class="py-6 text-ink-gray-600">Загрузка…</div>
    <div v-else class="space-y-3 mb-8">
      <div v-if="!addresses?.length" class="text-ink-gray-600">Адресов пока нет.</div>
      <div v-for="a in addresses" :key="a.id" class="flex items-start justify-between border border-ink-gray-200 rounded-lg p-4">
        <div>
          <p class="font-semibold">
            {{ a.full_name }}
            <UBadge v-if="a.is_default" color="primary" variant="subtle" size="xs" class="ml-1">по умолчанию</UBadge>
          </p>
          <p class="text-caption text-ink-gray-600">{{ a.phone }} · {{ a.city }}, {{ a.address }}</p>
        </div>
        <div class="flex gap-1 shrink-0">
          <UButton v-if="!a.is_default" size="xs" color="neutral" variant="ghost" icon="i-lucide-star" @click="onDefault(a.id)" />
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-pencil" @click="startEdit(a)" />
          <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="onRemove(a.id)" />
        </div>
      </div>
    </div>

    <div class="border-t border-ink-gray-200 pt-5 space-y-3">
      <UiSectionLabel>{{ editingId ? 'Редактировать адрес' : 'Новый адрес' }}</UiSectionLabel>
      <div class="grid sm:grid-cols-2 gap-3">
        <UInput v-model="form.full_name" placeholder="Имя и фамилия" />
        <UInput v-model="form.phone" type="tel" placeholder="+7 700 000 00 00" />
        <UInput v-model="form.city" placeholder="Город" />
        <UInput v-model="form.address" placeholder="Улица, дом, кв." />
      </div>
      <div class="flex gap-2">
        <UButton color="primary" :icon="editingId ? 'i-lucide-check' : 'i-lucide-plus'" :loading="adding" @click="onSubmit">
          {{ editingId ? 'Сохранить' : 'Добавить адрес' }}
        </UButton>
        <UButton v-if="editingId" color="neutral" variant="ghost" @click="resetForm">Отмена</UButton>
      </div>
    </div>
  </div>
</template>
