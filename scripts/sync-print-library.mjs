/**
 * Idempotent sync of the curated INKMADE print collection.
 *
 * - uploads full PNG artwork and WebP thumbnails to the public catalog bucket;
 * - creates or updates brand-owned print_library rows by stable title;
 * - never deletes user prints or storage objects.
 *
 * Run: node --env-file=.env scripts/sync-print-library.mjs
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NUXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Supabase environment is not configured')

const supabase = createClient(url, key, { auth: { persistSession: false } })
const root = resolve(import.meta.dirname, '..')
const author = 'INKMADE Studio'

const collection = [
  { slug: 'steppe-frequency', title: 'Steppe Frequency', tags: ['степь', 'звук', 'графика', 'бордо'] },
  { slug: 'alatau-night', title: 'Alatau Night', tags: ['алатау', 'горы', 'ночь', 'геометрия'] },
  { slug: 'nomad-grid', title: 'Nomad Grid', tags: ['орнамент', 'геометрия', 'сетка', 'минимализм'] },
  { slug: 'orbit-43', title: 'Orbit 43', tags: ['космос', 'орбита', 'алматы', 'техническая графика'] },
  { slug: 'concrete-bloom', title: 'Concrete Bloom', tags: ['цветок', 'бетон', 'коллаж', 'бордо'] },
  { slug: 'silk-sun', title: 'Silk Sun', tags: ['солнце', 'шелкография', 'горы', 'минимализм'] },
  { slug: 'city-pulse', title: 'City Pulse', tags: ['алматы', 'город', 'движение', 'стритвир'] },
  { slug: 'kok-tobe-signal', title: 'Kok-Tobe Signal', tags: ['кок-тобе', 'сигнал', 'ночь', 'ретрофутуризм'] },
]

async function upload(path, localPath, contentType) {
  const buffer = await readFile(resolve(root, localPath))
  const { error } = await supabase.storage.from('catalog').upload(path, buffer, {
    contentType,
    cacheControl: '31536000',
    upsert: true,
  })
  if (error) throw error
  return supabase.storage.from('catalog').getPublicUrl(path).data.publicUrl
}

async function syncPrint(item) {
  const base = `public/media/prints/${item.slug}-v01`
  const fileUrl = await upload(`library/inkmade/${item.slug}-v01.png`, `${base}.png`, 'image/png')
  const thumbnailUrl = await upload(`library/inkmade/${item.slug}-thumb-v01.webp`, `${base}.webp`, 'image/webp')
  const row = {
    title: item.title,
    author,
    tags: item.tags,
    royalty_pct: 0,
    is_active: true,
    compatible_methods: ['dtg', 'dtf', 'silkscreen', 'sublimation'],
    file_url: fileUrl,
    thumbnail_url: thumbnailUrl,
    moderation_status: 'approved',
    moderation_note: 'Курируемая коллекция INKMADE',
    owner_id: null,
    shop_id: null,
  }

  const { data: existing, error: readError } = await supabase
    .from('print_library')
    .select('id')
    .eq('title', item.title)
    .eq('author', author)
    .maybeSingle()
  if (readError) throw readError

  const query = existing
    ? supabase.from('print_library').update(row).eq('id', existing.id)
    : supabase.from('print_library').insert(row)
  const { error } = await query
  if (error) throw error
  console.log(`✓ ${item.title}`)
}

for (const item of collection) await syncPrint(item)
console.log(`Curated print library synced: ${collection.length} artworks.`)

