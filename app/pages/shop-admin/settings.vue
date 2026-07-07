<script setup lang="ts">
// Настройки магазина (Фаза B3): публичность витрины и закрытый режим по коду доступа.
// slug/статус/доля меняет только админ (guard-триггер) — здесь недоступны.
definePageMeta({ layout: 'shop-admin', middleware: 'shop-owner' })
const { t } = useI18n()
useHead({ title: t('shopAdmin.settings.headTitle') })

const { getMine, update } = useMyShop()
const toast = useToast()

const { data: shop } = await useAsyncData('my-shop', () => getMine())

const isPublic = ref(true)
const closed = ref(false)
const accessCode = ref('')

watchEffect(() => {
  const s = shop.value
  if (!s) return
  isPublic.value = s.is_public
  closed.value = !!s.access_code
  accessCode.value = s.access_code ?? ''
})

// Код доступа генерирует система (высокая энтропия против перебора закрытой витрины —
// см. миграцию 0078 + CHECK длины). Владелец копирует и передаёт участникам, не придумывает.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // без похожих символов (0/O, 1/I/L)
function genCode(len = 10): string {
  const a = new Uint32Array(len)
  crypto.getRandomValues(a)
  let s = ''
  for (let i = 0; i < len; i++) s += CODE_ALPHABET.charAt((a[i] ?? 0) % CODE_ALPHABET.length)
  return s
}
function regenerateCode() { accessCode.value = genCode() }
async function copyCode() {
  try {
    await navigator.clipboard.writeText(accessCode.value)
    toast.add({ title: t('shopAdmin.settings.copied'), color: 'success' })
  } catch { /* clipboard недоступен — код виден в поле */ }
}
// включение закрытого режима без кода → генерируем сразу
watch(closed, (v) => { if (v && !accessCode.value.trim()) accessCode.value = genCode() })

const saving = ref(false)
async function save() {
  if (!shop.value) return
  if (closed.value && !accessCode.value.trim()) { toast.add({ title: t('shopAdmin.settings.codeRequired'), color: 'warning' }); return }
  saving.value = true
  try {
    await update(shop.value.id, {
      is_public: isPublic.value,
      access_code: closed.value ? accessCode.value.trim() : null,
    })
    toast.add({ title: t('shopAdmin.settings.saved'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('shopAdmin.settings.error'), description: (e as Error).message, color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="shop">
    <UiPageHeader :label="$t('shopAdmin.settings.label')" :title="$t('shopAdmin.settings.title')" />

    <div class="max-w-xl space-y-6">
      <UiPanel :title="$t('shopAdmin.settings.visibility')" icon="i-lucide-eye">
        <div class="space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-medium">{{ $t('shopAdmin.settings.publicLabel') }}</p>
              <p class="text-caption text-ink-gray-500">{{ $t('shopAdmin.settings.publicHint') }}</p>
            </div>
            <USwitch v-model="isPublic" />
          </div>
        </div>
      </UiPanel>

      <UiPanel :title="$t('shopAdmin.settings.closedMode')" icon="i-lucide-lock">
        <div class="space-y-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-medium">{{ $t('shopAdmin.settings.closedLabel') }}</p>
              <p class="text-caption text-ink-gray-500">{{ $t('shopAdmin.settings.closedHint') }}</p>
            </div>
            <USwitch v-model="closed" />
          </div>
          <UFormField v-if="closed" :label="$t('shopAdmin.settings.code')" :help="$t('shopAdmin.settings.codeHint')">
            <div class="flex gap-2">
              <UInput v-model="accessCode" readonly class="w-full font-mono tracking-wider" />
              <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" :aria-label="$t('shopAdmin.settings.regenerate')" @click="regenerateCode" />
              <UButton icon="i-lucide-copy" color="neutral" variant="soft" :aria-label="$t('shopAdmin.settings.copy')" @click="copyCode" />
            </div>
          </UFormField>
        </div>
      </UiPanel>

      <UButton color="primary" size="lg" :loading="saving" icon="i-lucide-check" @click="save">{{ $t('shopAdmin.settings.save') }}</UButton>
    </div>
  </div>
</template>
