<script setup lang="ts">
// Глобальный диалог подтверждения/ввода (смонтирован в app.vue). Управляется useConfirm().
// Заменяет нативные window.confirm()/prompt(): брендовый вид, i18n, тестируемость.
const { state, accept, cancel } = useConfirm()

const canAccept = computed(() =>
  !(state.value.mode === 'prompt' && state.value.required && !state.value.input.trim()),
)
</script>

<template>
  <UModal :open="state.open" :title="state.title" @update:open="(v: boolean) => { if (!v) cancel() }">
    <template #body>
      <p v-if="state.description" class="text-ink-gray-600" :class="state.mode === 'prompt' ? 'mb-3' : ''">
        {{ state.description }}
      </p>
      <template v-if="state.mode === 'prompt'">
        <UTextarea
          v-if="state.multiline"
          :model-value="state.input" :placeholder="state.placeholder" :rows="3" autofocus class="w-full"
          @update:model-value="(v: string | number) => state.input = String(v)"
        />
        <UInput
          v-else
          :model-value="state.input" :placeholder="state.placeholder" autofocus class="w-full"
          @update:model-value="(v: string | number) => state.input = String(v)"
          @keydown.enter="canAccept && accept()"
        />
      </template>
      <p v-else-if="!state.description" class="text-ink-gray-600">{{ $t('actions.confirm') }}?</p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="ghost" @click="cancel">
          {{ state.cancelLabel || $t('actions.cancel') }}
        </UButton>
        <UButton :color="state.tone === 'danger' ? 'error' : 'primary'" :disabled="!canAccept" @click="accept">
          {{ state.confirmLabel || $t('actions.confirm') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
