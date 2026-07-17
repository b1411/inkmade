<script setup lang="ts">
import type { Database } from '~/types/database.types'

const { t, locale } = useI18n()
const supabase = useSupabaseClient<Database>()
const design = useDesign()
const templates = ref<Database['public']['Tables']['design_templates']['Row'][]>([])
const loading = ref(false)
const query = ref('')

const filtered = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return templates.value
  return templates.value.filter(template =>
    template.title.toLowerCase().includes(needle)
    || template.tags.some(tag => tag.toLowerCase().includes(needle)),
  )
})

async function loadTemplates() {
  const product = design.product.value
  if (!product) return
  loading.value = true
  try {
    let request = supabase.from('design_templates')
      .select('*')
      .eq('status', 'published')
      .in('locale', [locale.value, 'all'])
      .order('sort')
      .limit(60)
    if (design.printMode.value) request = request.eq('print_mode', design.printMode.value)
    request = request.or(`product_id.eq.${product.id},product_type.eq.${product.category}`)
    const { data, error } = await request
    if (error) throw error
    templates.value = data ?? []
  } finally {
    loading.value = false
  }
}

watch([() => design.product.value?.id, () => design.printMode.value, locale], loadTemplates, { immediate: true })

function applyTemplate(template: Database['public']['Tables']['design_templates']['Row']) {
  design.loadSpec(template.spec)
  useAnalytics().track('template_used', {
    template_id: template.id,
    product_id: design.product.value?.id,
    print_mode: template.print_mode,
  })
}
</script>

<template>
  <div class="space-y-3">
    <UiSectionLabel accent>{{ t('customize.templates.label') }}</UiSectionLabel>
    <UInput v-model="query" :placeholder="t('customize.templates.search')" icon="i-lucide-search" class="w-full" />
    <div v-if="loading" class="grid grid-cols-2 gap-2" aria-busy="true">
      <UiSkeleton v-for="n in 4" :key="n" class="aspect-[4/5]" />
    </div>
    <div v-else-if="filtered.length" class="grid max-h-[55vh] grid-cols-2 gap-2 overflow-y-auto pr-1">
      <button
        v-for="template in filtered"
        :key="template.id"
        type="button"
        class="group overflow-hidden border border-white/10 bg-white/5 text-left transition hover:border-ink-burgundy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-burgundy"
        @click="applyTemplate(template)"
      >
        <img :src="template.thumbnail_url" :alt="template.title" class="aspect-[4/5] w-full bg-white/5 object-cover" loading="lazy">
        <span class="block truncate p-2 text-xs font-semibold text-white/80 group-hover:text-white">{{ template.title }}</span>
      </button>
    </div>
    <UiEmptyState
      v-else
      icon="i-lucide-layout-template"
      :title="t('customize.templates.emptyTitle')"
      :description="t('customize.templates.emptyText')"
    />
  </div>
</template>
