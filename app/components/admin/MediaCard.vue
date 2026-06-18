<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

// Карточка одного фото в медиа-менеджере товара. Presentational + меню действий.
// Drag-reorder живёт на родителе (обёртка draggable).
type ImageRow = Database['public']['Tables']['product_images']['Row']

const props = defineProps<{
  image: ImageRow
  colors: { hex: string; name: string }[]
  selectionMode?: boolean
  selected?: boolean
}>()
const emit = defineEmits<{
  primary: []
  toggleHide: []
  delete: []
  replace: []
  preview: []
  toggleSelect: []
  updateLabel: [value: string]
  updateAlt: [value: string]
  moveColor: [hex: string | null]
  setKind: [kind: 'mockup' | 'lifestyle']
}>()

const { t } = useI18n()

function onImageClick() {
  if (props.selectionMode) emit('toggleSelect')
  else emit('preview')
}

const menu = computed<DropdownMenuItem[][]>(() => {
  const groups: DropdownMenuItem[][] = [[
    {
      label: props.image.is_primary ? t('admin.media.primaryPhoto') : t('admin.media.makePrimary'),
      icon: 'i-lucide-star',
      disabled: props.image.is_primary || props.image.kind !== 'mockup',
      onSelect: () => emit('primary'),
    },
    {
      label: props.image.is_hidden ? t('admin.media.showToCustomer') : t('admin.media.hideFromCustomer'),
      icon: props.image.is_hidden ? 'i-lucide-eye' : 'i-lucide-eye-off',
      onSelect: () => emit('toggleHide'),
    },
  ]]

  const colorChildren: DropdownMenuItem[] = [
    {
      label: t('admin.media.common'),
      icon: 'i-lucide-circle-dashed',
      disabled: !props.image.color_hex,
      onSelect: () => emit('moveColor', null),
    },
    ...props.colors.map(c => ({
      label: c.name,
      icon: 'i-lucide-circle',
      disabled: props.image.color_hex === c.hex,
      onSelect: () => emit('moveColor', c.hex),
    })),
  ]
  groups.push([
    { label: t('admin.media.linkToColor'), icon: 'i-lucide-palette', children: colorChildren },
    {
      label: props.image.kind === 'lifestyle' ? t('admin.media.makeProductPhoto') : t('admin.media.makeLifestyle'),
      icon: props.image.kind === 'lifestyle' ? 'i-lucide-shirt' : 'i-lucide-users',
      onSelect: () => emit('setKind', props.image.kind === 'lifestyle' ? 'mockup' : 'lifestyle'),
    },
    { label: t('admin.media.replaceFile'), icon: 'i-lucide-replace', onSelect: () => emit('replace') },
  ])

  groups.push([
    { label: t('admin.media.delete'), icon: 'i-lucide-trash-2', color: 'error', onSelect: () => emit('delete') },
  ])
  return groups
})
</script>

<template>
  <div class="space-y-1">
    <div
      class="relative border rounded-md overflow-hidden aspect-square bg-ink-gray-50 transition-all"
      :class="[
        image.is_hidden ? 'opacity-45' : '',
        selected ? 'ring-2 ring-ink-burgundy border-ink-burgundy' : 'border-ink-gray-200',
      ]"
    >
      <img
        :src="image.url"
        :alt="image.alt ?? ''"
        class="w-full h-full object-cover"
        :class="selectionMode ? 'cursor-pointer' : 'cursor-zoom-in'"
        @click="onImageClick"
      >

      <!-- чекбокс выделения -->
      <label
        v-if="selectionMode"
        class="absolute inset-0 flex items-start justify-start p-1.5 cursor-pointer"
        @click.stop="emit('toggleSelect')"
      >
        <span
          class="size-5 rounded-md border-2 flex items-center justify-center transition-colors"
          :class="selected ? 'bg-ink-burgundy border-ink-burgundy text-ink-cream' : 'bg-white/80 border-white'"
        >
          <UIcon v-if="selected" name="i-lucide-check" class="size-3.5" />
        </span>
      </label>

      <!-- статусы -->
      <div v-if="!selectionMode" class="absolute top-1 left-1 flex flex-col gap-1">
        <UBadge v-if="image.is_primary" color="primary" size="xs">{{ $t('admin.media.primaryBadge') }}</UBadge>
        <UBadge v-if="image.is_hidden" color="neutral" variant="solid" size="xs" icon="i-lucide-eye-off">{{ $t('admin.media.hiddenBadge') }}</UBadge>
      </div>

      <span
        v-if="image.kind === 'lifestyle' && image.color_hex && !selectionMode"
        class="absolute top-1 right-9 size-4 rounded-full border-2 border-white shadow"
        :style="{ backgroundColor: image.color_hex }"
      />

      <!-- меню действий -->
      <UDropdownMenu v-if="!selectionMode" :items="menu" :content="{ align: 'end' }">
        <UButton
          icon="i-lucide-ellipsis-vertical"
          color="neutral"
          variant="solid"
          size="xs"
          class="absolute top-1 right-1 bg-black/50 hover:bg-black/70"
          :aria-label="$t('admin.media.photoActions')"
          @click.stop
        />
      </UDropdownMenu>
    </div>

    <UInput
      :model-value="image.label ?? ''"
      size="xs" :placeholder="$t('admin.media.anglePlaceholder')" class="w-full"
      @blur="(e: FocusEvent) => emit('updateLabel', (e.target as HTMLInputElement).value)"
    />
    <UInput
      :model-value="image.alt ?? ''"
      size="xs" :placeholder="$t('admin.media.altPlaceholder')" variant="soft"
      class="w-full" :ui="{ base: 'text-[11px] text-ink-gray-500' }"
      @blur="(e: FocusEvent) => emit('updateAlt', (e.target as HTMLInputElement).value)"
    />
  </div>
</template>
