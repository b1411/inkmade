<script setup lang="ts">
// AI-генерация принта (§AI). Промпт → /api/ai/generate → картинка в нашем Storage →
// addImage(url, w, h, 'ai') кладёт её в активную зону (как загрузка/библиотека).
// Только для вошедших; месячная квота показывается индикатором.
const { t } = useI18n()
const route = useRoute()
const { addImage } = useDesign()
const { quota, loadQuota, generate } = useAiDesign()
const toast = useToast()
const user = useSupabaseUser()
const analytics = useAnalytics()

const STYLES = ['minimal', 'vintage', 'lettering', 'street', 'anime', 'ornament'] as const
type Style = typeof STYLES[number]
const ASPECTS = ['square', 'portrait', 'landscape'] as const
type Aspect = typeof ASPECTS[number]

const prompt = ref('')
const style = ref<Style | null>(null)
const aspect = ref<Aspect>('square')
const generating = ref(false)
const result = ref<{ url: string; w: number; h: number } | null>(null)

const loginHref = computed(() => `/login?redirect=${encodeURIComponent(route.fullPath)}`)
const outOfQuota = computed(() => !!quota.value && quota.value.remaining <= 0)

onMounted(() => { if (user.value) loadQuota() })

async function onGenerate() {
  if (generating.value) return
  const p = prompt.value.trim()
  if (p.length < 3) { toast.add({ title: t('customize.aiPanel.promptTooShort'), color: 'warning' }); return }
  generating.value = true
  result.value = null
  try {
    const res = await generate(p, style.value ?? undefined, aspect.value)
    result.value = { url: res.imageUrl, w: res.width, h: res.height }
    analytics.aiGenerate(true, style.value ?? undefined)
    toast.add({ title: t('customize.aiPanel.success'), color: 'success' })
  } catch (e) {
    analytics.aiGenerate(false, style.value ?? undefined)
    const err = e as { statusCode?: number; data?: { statusMessage?: string }; statusMessage?: string }
    let msg = err?.data?.statusMessage || err?.statusMessage || t('customize.aiPanel.error')
    if (err?.statusCode === 401) msg = t('customize.aiPanel.loginRequired')
    else if (err?.statusCode === 429) msg = t('customize.aiPanel.limitReached')
    toast.add({ title: msg, color: 'error' })
  } finally {
    generating.value = false
  }
}

function onAdd() {
  const r = result.value
  if (!r) return
  const img = new window.Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    const pl = addImage(r.url, img.naturalWidth || r.w || 1024, img.naturalHeight || r.h || 1024, 'ai')
    if (!pl) { toast.add({ title: t('customize.tools.limitReached'), color: 'warning' }); return }
    toast.add({ title: t('customize.aiPanel.added'), color: 'success' })
  }
  img.onerror = () => toast.add({ title: t('customize.aiPanel.loadFailed'), color: 'error' })
  img.src = r.url
}
</script>

<template>
  <div class="space-y-3">
    <UiSectionLabel accent>{{ $t('customize.aiPanel.title') }}</UiSectionLabel>

    <!-- гость: вход обязателен (rate-conversion) -->
    <template v-if="!user">
      <p class="text-caption text-ink-gray-600">{{ $t('customize.aiPanel.guestHint') }}</p>
      <UButton :to="loginHref" color="neutral" variant="solid" icon="i-lucide-log-in" block>
        {{ $t('customize.aiPanel.loginCta') }}
      </UButton>
    </template>

    <template v-else>
      <p class="text-caption text-ink-gray-600">{{ $t('customize.aiPanel.description') }}</p>

      <UTextarea
        v-model="prompt"
        :rows="3"
        :maxlength="500"
        :placeholder="$t('customize.aiPanel.promptPlaceholder')"
        autoresize
        class="w-full"
      />

      <!-- пресеты стиля -->
      <div>
        <div class="text-caption text-ink-gray-500 mb-1">{{ $t('customize.aiPanel.styleLabel') }}</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="s in STYLES"
            :key="s"
            type="button"
            class="text-caption px-2.5 py-1 rounded-full border transition-colors"
            :class="style === s
              ? 'bg-ink-burgundy text-ink-white border-ink-burgundy'
              : 'bg-ink-gray-50 text-ink-gray-600 border-ink-gray-200 hover:border-ink-burgundy'"
            @click="style = style === s ? null : s"
          >
            {{ $t(`customize.aiPanel.styles.${s}`) }}
          </button>
        </div>
      </div>

      <!-- форма (аспект под зону) -->
      <div>
        <div class="text-caption text-ink-gray-500 mb-1">{{ $t('customize.aiPanel.aspectLabel') }}</div>
        <div class="flex gap-1.5">
          <button
            v-for="a in ASPECTS"
            :key="a"
            type="button"
            class="flex-1 text-caption px-2 py-1 rounded-md border transition-colors"
            :class="aspect === a
              ? 'bg-ink-burgundy text-ink-white border-ink-burgundy'
              : 'bg-ink-gray-50 text-ink-gray-600 border-ink-gray-200 hover:border-ink-burgundy'"
            @click="aspect = a"
          >
            {{ $t(`customize.aiPanel.aspects.${a}`) }}
          </button>
        </div>
      </div>

      <UButton
        color="neutral"
        variant="solid"
        icon="i-lucide-sparkles"
        block
        :loading="generating"
        :disabled="generating || outOfQuota"
        @click="onGenerate"
      >
        {{ generating ? $t('customize.aiPanel.generating') : $t('customize.aiPanel.generate') }}
      </UButton>

      <p v-if="quota" class="text-caption text-center" :class="outOfQuota ? 'text-ink-burgundy' : 'text-ink-gray-500'">
        {{ outOfQuota ? $t('customize.aiPanel.limitReached') : $t('customize.aiPanel.remaining', { n: quota.remaining, max: quota.max }) }}
      </p>

      <!-- результат -->
      <div v-if="result" class="space-y-2">
        <div class="rounded-lg border border-ink-gray-200 overflow-hidden bg-[repeating-conic-gradient(#eee_0_25%,#fff_0_50%)] bg-[length:16px_16px]">
          <img :src="result.url" :alt="prompt" class="w-full object-contain max-h-64 mx-auto">
        </div>
        <UButton color="neutral" variant="solid" icon="i-lucide-plus" block @click="onAdd">
          {{ $t('customize.aiPanel.addToProduct') }}
        </UButton>
      </div>
    </template>
  </div>
</template>
