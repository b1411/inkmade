<script setup lang="ts">
import type { PreflightResult } from '~~/shared/design/spec'

defineProps<{ result: PreflightResult }>()
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-start gap-3 border p-3" :class="result.can_continue ? 'border-ink-success/40 bg-ink-success/5' : 'border-ink-error/40 bg-ink-error/5'">
      <UIcon :name="result.can_continue ? 'i-lucide-shield-check' : 'i-lucide-shield-alert'" class="mt-0.5 size-5 shrink-0" :class="result.can_continue ? 'text-ink-success' : 'text-ink-error'" />
      <div>
        <p class="text-sm font-semibold">{{ result.ready ? $t('customize.preflight.ready') : result.can_continue ? $t('customize.preflight.readyWithWarnings') : $t('customize.preflight.blocked') }}</p>
        <p class="mt-1 text-xs text-ink-gray-600">{{ $t('customize.preflight.summary', { warnings: result.summary.warnings, blockers: result.summary.blockers }) }}</p>
      </div>
    </div>

    <ul v-if="result.issues.length" class="divide-y divide-ink-gray-200 border border-ink-gray-200">
      <li v-for="(issue, index) in result.issues" :key="`${issue.code}-${issue.placement}-${index}`" class="flex gap-3 p-3">
        <UIcon :name="issue.severity === 'blocker' ? 'i-lucide-circle-x' : 'i-lucide-triangle-alert'" class="mt-0.5 size-4 shrink-0" :class="issue.severity === 'blocker' ? 'text-ink-error' : 'text-ink-warning'" />
        <div class="min-w-0">
          <p class="text-sm font-medium">{{ $t(`customize.preflight.issues.${issue.code}`) }}</p>
          <p v-if="issue.zone || issue.value != null" class="mt-0.5 text-xs text-ink-gray-600">
            <span v-if="issue.zone">{{ issue.zone }}</span>
            <span v-if="issue.zone && issue.value != null"> · </span>
            <span v-if="issue.value != null">{{ issue.value }}{{ issue.code === 'low_dpi' ? ' DPI' : '' }}</span>
          </p>
        </div>
      </li>
    </ul>

    <div v-if="result.zones.length" class="flex flex-wrap gap-1.5">
      <span v-for="zone in result.zones" :key="zone" class="ink-label border border-ink-gray-200 px-2 py-1 text-[9px] text-ink-gray-600">{{ zone }}</span>
    </div>
  </div>
</template>
