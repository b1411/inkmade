<script setup lang="ts">
const { t } = useI18n()
const nav = computed(() => [
  { label: t('studio.nav.queue'), to: '/studio', icon: 'i-lucide-layout-list', exact: true },
  { label: t('studio.nav.stock'), to: '/studio/stock', icon: 'i-lucide-boxes' },
])
const { signOut } = useAuth()
async function onSignOut() { await signOut(); await navigateTo('/') }
</script>

<template>
  <WorkspaceShell :title="$t('studio.nav.badge')" badge="STUDIO" :nav="nav" content-class="mx-auto w-full max-w-[1600px]">
    <template #header-actions>
      <span class="hidden items-center gap-2 text-xs text-ink-gray-600 sm:flex">
        <span class="size-2 rounded-full bg-ink-success" />
        Production live
      </span>
    </template>
    <template #rail-footer>
      <button class="flex min-h-11 w-full items-center gap-3 px-3 text-sm text-ink-text-soft transition-colors hover:bg-white/5 hover:text-ink-text" @click="onSignOut">
        <UIcon name="i-lucide-log-out" class="size-4" />
        {{ $t('studio.nav.signOut') }}
      </button>
    </template>
    <slot />
  </WorkspaceShell>
</template>
