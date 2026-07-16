<script setup lang="ts">
const { t, locale } = useI18n()
const { number: fmtNum } = useFormat()
const supabase = useSupabaseClient()

const { data: featured } = await useAsyncData('constructor-featured-preview', async () => {
  const { data } = await supabase
    .from('products')
    .select('alias,base_price,product_images(url,is_primary)')
    .eq('is_active', true)
    .not('alias', 'is', null)
    .order('is_featured', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
})

const createTo = computed(() => (featured.value?.alias ? `/customize/${featured.value.alias}` : '/catalog'))
const fallbackProductImage = computed(() => {
  const images = featured.value?.product_images ?? []
  return images.find(image => image.is_primary)?.url ?? images[0]?.url ?? '/media/products/blank/oversize-v01.webp'
})

const text = ref('ALMATY / 43°')
const scale = ref(58)
const color = ref('#111214')
const side = ref<'front' | 'back'>('front')
const sides = ['front', 'back'] as const
const fileInput = ref<HTMLInputElement | null>(null)
const uploadUrl = ref<string | null>(null)
const uploadName = ref('')

const colors = ['#111214', '#f0ede7', '#7e1f2d']
const garmentImages: Record<string, string> = {
  '#111214': '/media/products/blank/oversize-v01.webp',
  '#f0ede7': '/media/products/blank/oversize-white-v01.webp',
  '#7e1f2d': '/media/products/blank/oversize-burgundy-v01.webp'
}
const productImage = computed(() => garmentImages[color.value] ?? fallbackProductImage.value)
const printColor = computed(() => color.value === '#f0ede7' ? '#111214' : '#f3f0eb')
const price = computed(() => Number(featured.value?.base_price ?? 6990) + 2500)

function pickFile() {
  fileInput.value?.click()
}

function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file || !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) return
  if (uploadUrl.value) URL.revokeObjectURL(uploadUrl.value)
  uploadUrl.value = URL.createObjectURL(file)
  uploadName.value = file.name
}

onBeforeUnmount(() => {
  if (uploadUrl.value) URL.revokeObjectURL(uploadUrl.value)
})
</script>

<template>
  <section class="ink-grain w-screen ml-[calc(50%-50vw)] overflow-hidden bg-ink-raised text-ink-text" aria-labelledby="constructor-heading">
    <div class="mx-auto grid max-w-(--container-max) gap-8 px-4 py-12 lg:grid-cols-12 lg:items-center lg:py-16">
      <div class="lg:col-span-3">
        <UiSectionLabel class="text-white/50">02 / SIMPLE MODE</UiSectionLabel>
        <h2 id="constructor-heading" :key="locale" class="ink-display text-h2 mt-3">{{ t('landing.constructor.title') }}</h2>
        <p class="mt-4 text-ink-text-soft">{{ t('landing.constructor.subtitle') }}</p>
        <div class="mt-7 hidden lg:block">
          <UiAppButton :to="createTo" variant="primary" size="lg" on-dark trailing-icon="i-lucide-arrow-right">
            {{ t('landing.constructor.cta') }}
          </UiAppButton>
        </div>
      </div>

      <div class="overflow-hidden border border-white/10 bg-ink-panel shadow-[0_24px_80px_rgba(0,0,0,.35)] lg:col-span-9">
        <div class="flex items-center justify-between border-b border-white/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-white/50">
          <span>INK SYSTEM / LIVE PREVIEW</span>
          <span>DESIGN ID · 001-ALM</span>
        </div>

        <div class="grid md:grid-cols-[minmax(0,1fr)_240px]">
          <div class="relative min-h-[390px] overflow-hidden bg-[#d9d5ce] sm:min-h-[460px]">
            <div class="absolute left-4 top-4 z-20 flex border border-black/15 bg-white/85 p-1 backdrop-blur">
              <button v-for="value in sides" :key="value" type="button" class="min-h-9 px-3 text-xs font-semibold uppercase" :class="side === value ? 'bg-ink-black text-white' : 'text-black/55'" @click="side = value">
                {{ value === 'front' ? 'Front' : 'Back' }}
              </button>
            </div>

            <NuxtImg
              v-if="productImage"
              :src="productImage"
              alt="Основа изделия в конструкторе"
              format="webp"
              sizes="(max-width: 767px) 100vw, 700px"
              class="absolute inset-0 size-full object-contain p-8 sm:p-12"
            />
            <div v-else class="absolute inset-0 grid place-items-center">
              <UIcon name="i-lucide-shirt" class="size-48 text-black/65" />
            </div>

            <div class="pointer-events-none absolute left-1/2 top-[28%] z-10 grid -translate-x-1/2 place-items-center border border-dashed border-white/55 bg-black/5" :style="{ width: `${scale}%`, aspectRatio: '4 / 5' }">
              <img v-if="uploadUrl" :src="uploadUrl" :alt="uploadName" class="size-full object-contain drop-shadow-lg" />
              <div v-else class="px-2 text-center font-display text-[clamp(18px,3vw,42px)] font-black uppercase leading-[.88] tracking-[-.05em] drop-shadow-lg" :style="{ color: printColor }">
                {{ text || 'YOUR PRINT' }}
              </div>
            </div>

            <button type="button" class="absolute bottom-4 left-4 z-20 inline-flex min-h-11 items-center gap-2 bg-ink-black px-4 text-sm font-semibold text-white shadow-lg" @click="pickFile">
              <UIcon name="i-lucide-upload" class="size-4" />
              {{ locale === 'kk' ? 'Сурет жүктеу' : 'Загрузить изображение' }}
            </button>
            <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="sr-only" @change="onFile">
          </div>

          <div class="flex flex-col border-t border-white/10 bg-ink-surface md:border-l md:border-t-0">
            <div class="border-b border-white/10 p-4">
              <label for="preview-text" class="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">01 / Text</label>
              <input id="preview-text" v-model="text" type="text" maxlength="24" class="mt-2 min-h-11 w-full border border-white/15 bg-ink-panel px-3 text-sm text-white outline-none focus:border-ink-burgundy-hover" placeholder="ALMATY / 43°">
            </div>

            <div class="border-b border-white/10 p-4">
              <p class="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">02 / Garment</p>
              <div class="mt-3 flex gap-2">
                <button v-for="swatch in colors" :key="swatch" type="button" class="size-9 rounded-full border-2 transition" :class="color === swatch ? 'border-white scale-110' : 'border-white/20'" :style="{ backgroundColor: swatch }" :aria-label="`Цвет ${swatch}`" @click="color = swatch" />
              </div>
            </div>

            <div class="border-b border-white/10 p-4">
              <div class="flex items-center justify-between gap-3">
                <label for="preview-scale" class="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">03 / Scale</label>
                <span class="font-mono text-[10px] text-white/45">{{ scale }}%</span>
              </div>
              <input id="preview-scale" v-model="scale" type="range" min="34" max="76" class="mt-3 w-full accent-[var(--color-ink-burgundy)]">
            </div>

            <div class="mt-auto p-4">
              <p class="font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">Итого</p>
              <p class="mt-1 font-display text-3xl font-black">{{ fmtNum(price) }} ₸</p>
              <UiAppButton :to="createTo" variant="primary" size="lg" class="mt-4 w-full" trailing-icon="i-lucide-arrow-right">
                {{ locale === 'kk' ? 'Толық редактор' : 'Продолжить в редакторе' }}
              </UiAppButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
