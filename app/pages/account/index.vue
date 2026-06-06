<script setup lang="ts">
definePageMeta({ layout: 'account', middleware: 'auth' })
const { profile, user } = useAuth()
</script>

<template>
  <div>
    <UiSectionLabel accent>Профиль</UiSectionLabel>
    <h1 class="ink-display text-3xl mt-2 mb-6">Личный кабинет</h1>
    <UCard>
      <dl class="space-y-2 text-body">
        <div class="flex gap-2">
          <dt class="text-ink-gray-600 w-24">Email</dt>
          <dd>{{ user?.email }}</dd>
        </div>
        <div class="flex gap-2">
          <dt class="text-ink-gray-600 w-24">Имя</dt>
          <dd>{{ profile?.full_name || '—' }}</dd>
        </div>
        <div class="flex gap-2">
          <dt class="text-ink-gray-600 w-24">Роль</dt>
          <dd>{{ profile?.role }}</dd>
        </div>
      </dl>
    </UCard>
  </div>
</template>
