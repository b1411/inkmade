<script setup lang="ts">
// Self-serve открытие B2B-магазина (миграция 0086). Заменяет цепочку «заявка → админ
// approve → claim-ссылка → письмо»: владелец заводит магазин сам, owner_id проставляется
// сразу под его сессией, одобрение не нужно. Модерация — пост-фактум (админ может
// приостановить магазин в /admin/shops). Гейт роута — feature-flags (b2bStorefront).
definePageMeta({ middleware: 'auth' })

const { t } = useI18n()
useHead({ title: t('business.new.headTitle') })

const { getMine, createMine, checkSlug } = useMyShop()
const toast = useToast()
const { public: { siteUrl } } = useRuntimeConfig()
// хост без протокола — для подсказки «витрина будет тут»
const host = ((siteUrl as string) || 'https://inkmade.kz').replace(/^https?:\/\//, '').replace(/\/$/, '')

// один магазин на пользователя (create_my_shop проверяет это же) — владельца сразу в кабинет
const { data: existing } = await useAsyncData('shop-new-existing', () => getMine())
if (existing.value) await navigateTo('/shop-admin', { replace: true })

const name = ref('')
const slug = ref('')
const slugTouched = ref(false)
const creating = ref(false)

type SlugState = 'idle' | 'checking' | 'ok' | 'invalid' | 'reserved' | 'taken'
const slugState = ref<SlugState>('idle')

// адрес предлагаем из названия, пока пользователь не правил его руками
watch(name, (v) => { if (!slugTouched.value) slug.value = shopSlugify(v) })

// живая проверка адреса: дебаунс + защита от гонки (применяем только последний ответ)
let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0
watch(slug, (v) => {
  clearTimeout(timer)
  if (!v) { slugState.value = 'idle'; return }
  slugState.value = 'checking'
  const my = ++seq
  timer = setTimeout(async () => {
    try {
      const res = await checkSlug(v)
      if (my !== seq) return // пришёл ответ на устаревший запрос
      slugState.value = res.ok ? 'ok' : (res.reason as SlugState)
    } catch {
      if (my === seq) slugState.value = 'idle' // проверка недоступна — решает RPC при создании
    }
  }, 400)
})
onBeforeUnmount(() => clearTimeout(timer))

// ручной ввод: чистим до допустимого набора, но НЕ режем дефис на конце —
// иначе нельзя набрать «my-team». Ведущий/хвостовой дефис поймает проверка формата.
function onSlugInput(v: string | number) {
  slugTouched.value = true
  slug.value = String(v).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 63)
}

const slugHint = computed(() => {
  switch (slugState.value) {
    case 'checking': return { text: t('business.new.slugChecking'), color: 'neutral' as const }
    case 'ok': return { text: t('business.new.slugOk'), color: 'success' as const }
    case 'invalid': return { text: t('business.new.slugInvalid'), color: 'error' as const }
    case 'reserved': return { text: t('business.new.slugReserved'), color: 'error' as const }
    case 'taken': return { text: t('business.new.slugTaken'), color: 'error' as const }
    default: return null
  }
})

const canSubmit = computed(() => !!name.value.trim() && slugState.value === 'ok' && !creating.value)

async function onSubmit() {
  if (!canSubmit.value) return
  creating.value = true
  try {
    await createMine(name.value.trim(), slug.value)
    useAnalytics().track('b2b_store_created', { slug: slug.value })
    toast.add({ title: t('business.new.created'), color: 'success' })
    await navigateTo('/shop-admin')
  } catch (e) {
    // сообщения RPC уже человекочитаемы (адрес занят/зарезервирован, «у вас уже есть магазин»)
    toast.add({ title: t('business.new.errCreate'), description: getFetchMessage(e), color: 'error' })
    creating.value = false
  }
}
</script>

<template>
  <div class="max-w-xl mx-auto py-10 sm:py-14">
    <UiSectionLabel accent>{{ $t('business.new.label') }}</UiSectionLabel>
    <h1 class="ink-display text-h2 mt-2">{{ $t('business.new.title') }}</h1>
    <p class="text-ink-gray-600 mt-3">{{ $t('business.new.subtitle') }}</p>

    <form class="mt-8 space-y-5" @submit.prevent="onSubmit">
      <UFormField :label="$t('business.new.nameLabel')" :help="$t('business.new.nameHelp')" required>
        <UInput v-model="name" size="lg" :placeholder="$t('business.new.namePh')" class="w-full" />
      </UFormField>

      <UFormField :label="$t('business.new.slugLabel')" :help="$t('business.new.slugHelp')" required>
        <UInput
          :model-value="slug"
          size="lg"
          placeholder="brand"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          class="w-full"
          @update:model-value="onSlugInput"
        >
          <template #trailing>
            <UIcon v-if="slugState === 'checking'" name="i-lucide-loader-circle" class="size-4 animate-spin text-ink-gray-400" />
            <UIcon v-else-if="slugState === 'ok'" name="i-lucide-check" class="size-4 text-ink-success" />
          </template>
        </UInput>
        <p v-if="slugHint" class="text-caption mt-1.5" :class="slugHint.color === 'success' ? 'text-ink-success' : slugHint.color === 'error' ? 'text-ink-error' : 'text-ink-gray-500'">
          {{ slugHint.text }}
        </p>
        <p v-if="slug" class="text-caption text-ink-gray-500 mt-1">
          {{ $t('business.new.urlPreview') }} <span class="font-mono text-ink-black">{{ host }}/s/{{ slug }}</span>
        </p>
      </UFormField>

      <div class="rounded-xl border border-ink-cream-dark bg-ink-cream/40 p-4">
        <p class="text-caption text-ink-gray-600">{{ $t('business.new.terms') }}</p>
      </div>

      <UiAppButton type="submit" variant="primary" size="lg" block :loading="creating" :disabled="!canSubmit">
        {{ $t('business.new.submit') }}
      </UiAppButton>
    </form>
  </div>
</template>
