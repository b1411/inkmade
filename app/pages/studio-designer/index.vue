<script setup lang="ts">
// Дашборд дизайнера (CRM §4.1): заработок на виду + последние продажи.
definePageMeta({ layout: 'designer', middleware: 'designer-role' })
const d = useDesigner()

const { data, refresh } = await useAsyncData('designer-dash', async () => {
  const [profile, balance, earnings, prints, stats] = await Promise.all([
    d.profile(), d.balance(), d.earnings(20), d.myPrints(), d.printStats(),
  ])
  return { profile, balance, earnings, prints, stats }
})

// топ принтов по сумме роялти (CRM §4.1)
const topPrints = computed(() => {
  const prints = data.value?.prints ?? []
  const stats = data.value?.stats ?? {}
  return prints
    .map(p => ({ id: p.id, title: p.title, ...(stats[p.id] ?? { sales: 0, royalty: 0 }) }))
    .filter(p => p.sales > 0)
    .sort((a, b) => b.royalty - a.royalty)
    .slice(0, 5)
})

const counts = computed(() => {
  const p = data.value?.prints ?? []
  return {
    total: p.length,
    pending: p.filter(x => x.moderation_status === 'pending').length,
    approved: p.filter(x => x.moderation_status === 'approved').length,
    rejected: p.filter(x => x.moderation_status === 'rejected').length,
  }
})

onMounted(() => {
  const stop = d.subscribeSales(() => refresh())
  onBeforeUnmount(stop)
})
const money = (n: number | null | undefined) => `${Math.round(Number(n) || 0).toLocaleString('ru')} ₸`
</script>

<template>
  <div class="space-y-8">
    <div>
      <UiSectionLabel accent>Студия</UiSectionLabel>
      <h1 class="ink-display text-h2 mt-1">Привет, {{ data?.profile?.display_name || 'дизайнер' }}</h1>
    </div>

    <div v-if="!data?.profile" class="border border-ink-warning/40 bg-ink-warning/5 rounded-lg p-4 text-caption">
      Профиль дизайнера ещё не настроен администратором. Загрузка принтов и роялти станут доступны после активации.
    </div>

    <!-- баланс -->
    <div class="grid sm:grid-cols-3 gap-4">
      <div class="border border-ink-gray-200 rounded-lg p-5">
        <p class="ink-label text-ink-gray-600">Заработано всего</p>
        <p class="text-h2 ink-display text-ink-black mt-1">{{ money(data?.balance?.total_earned) }}</p>
      </div>
      <div class="border-2 border-ink-burgundy rounded-lg p-5 bg-ink-burgundy/5">
        <p class="ink-label text-ink-burgundy">Доступно к выводу</p>
        <p class="text-h2 ink-display text-ink-burgundy mt-1">{{ money(data?.balance?.available) }}</p>
        <UButton to="/studio-designer/finance" size="xs" color="primary" variant="link" class="mt-1 px-0">Запросить выплату →</UButton>
      </div>
      <div class="border border-ink-gray-200 rounded-lg p-5">
        <p class="ink-label text-ink-gray-600">Ставка роялти</p>
        <p class="text-h2 ink-display mt-1">{{ data?.profile?.royalty_pct ?? '—' }}%</p>
      </div>
    </div>

    <!-- счётчики принтов -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="border border-ink-gray-200 rounded-lg p-4 text-center">
        <p class="text-h3 font-bold">{{ counts.total }}</p><p class="text-caption text-ink-gray-600">всего принтов</p>
      </div>
      <div class="border border-ink-gray-200 rounded-lg p-4 text-center">
        <p class="text-h3 font-bold text-ink-warning">{{ counts.pending }}</p><p class="text-caption text-ink-gray-600">на модерации</p>
      </div>
      <div class="border border-ink-gray-200 rounded-lg p-4 text-center">
        <p class="text-h3 font-bold text-ink-success">{{ counts.approved }}</p><p class="text-caption text-ink-gray-600">одобрено</p>
      </div>
      <div class="border border-ink-gray-200 rounded-lg p-4 text-center">
        <p class="text-h3 font-bold text-ink-error">{{ counts.rejected }}</p><p class="text-caption text-ink-gray-600">отклонено</p>
      </div>
    </div>

    <!-- топ принтов -->
    <div v-if="topPrints.length">
      <UiSectionLabel accent>Топ принтов</UiSectionLabel>
      <div class="mt-3 divide-y divide-ink-gray-200 border border-ink-gray-200 rounded-lg">
        <div v-for="(p, i) in topPrints" :key="p.id" class="flex items-center justify-between p-3 text-caption">
          <span class="flex items-center gap-2">
            <span class="ink-label text-ink-gray-400">#{{ i + 1 }}</span>{{ p.title }}
          </span>
          <span class="text-ink-gray-500">{{ p.sales }} продаж</span>
          <span class="font-semibold text-ink-success">{{ money(p.royalty) }}</span>
        </div>
      </div>
    </div>

    <!-- последние продажи -->
    <div>
      <UiSectionLabel accent>Последние продажи</UiSectionLabel>
      <div v-if="!data?.earnings?.length" class="py-6 text-ink-gray-600 text-caption">
        Продаж пока нет. Загрузите принты в <NuxtLink to="/studio-designer/prints" class="text-ink-burgundy font-semibold">разделе «Мои принты»</NuxtLink> — после одобрения они появятся в каталоге.
      </div>
      <div v-else class="mt-3 divide-y divide-ink-gray-200 border border-ink-gray-200 rounded-lg">
        <div v-for="e in data!.earnings" :key="e.id" class="flex items-center justify-between p-3 text-caption">
          <span>{{ e.print_library?.title ?? 'принт' }}</span>
          <span class="text-ink-gray-500">{{ new Date(e.created_at).toLocaleDateString('ru') }}</span>
          <span class="font-semibold text-ink-success">+{{ money(e.amount) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
