/**
 * Idempotent Supabase catalog media sync.
 *
 * - uploads the approved INKMADE WebP media pack to the public `catalog` bucket;
 * - adds semantic product_images rows and hides superseded synthetic lifestyle slots;
 * - creates the missing hoodie base with black variants and print zones;
 * - never deletes products, variants, zones, storage objects, or image rows.
 *
 * Run: node --env-file=.env scripts/sync-brand-media.mjs
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NUXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Supabase environment is not configured')

const supabase = createClient(url, key, { auth: { persistSession: false } })
const root = resolve(import.meta.dirname, '..')

const catalog = {
  tshirt: {
    front: 'public/media/products/blank/classic-black-v01.webp',
    fit: 'public/media/models/fit-classic-v02.webp',
    back: 'public/media/products/back/classic-back-v01.webp',
  },
  tshirt_oversize: {
    front: 'public/media/products/blank/oversize-v01.webp',
    fit: 'public/media/models/fit-oversize-v02.webp',
    back: 'public/media/products/back/oversize-back-v01.webp',
  },
  polo: {
    front: 'public/media/products/blank/polo-v01.webp',
    fit: 'public/media/models/fit-polo-v02.webp',
    back: 'public/media/products/back/polo-back-v01.webp',
    detail: 'public/media/products/detail/polo-pique-v02.webp',
  },
  sweatshirt: {
    front: 'public/media/products/blank/sweatshirt-v01.webp',
    fit: 'public/media/models/fit-sweatshirt-v02.webp',
    back: 'public/media/products/back/sweatshirt-back-v01.webp',
  },
  hoodie: {
    front: 'public/media/products/blank/hoodie-v01.webp',
    fit: 'public/media/models/fit-hoodie-v02.webp',
    back: 'public/media/products/back/hoodie-back-v01.webp',
    detail: 'public/media/products/detail/hoodie-rib-v02.webp',
  },
  cap: {
    front: 'public/media/products/blank/cap-v01.webp',
    fit: 'public/media/models/fit-cap-v02.webp',
    back: 'public/media/products/back/cap-back-v01.webp',
    detail: 'public/media/products/detail/cap-twill-v02.webp',
  },
  tote: {
    front: 'public/media/products/blank/tote-v01.webp',
    fit: 'public/media/models/fit-tote-v02.webp',
    back: 'public/media/products/back/tote-back-v01.webp',
    detail: 'public/media/products/detail/tote-handles-v02.webp',
  },
}

async function ensureAccessoriesCategory() {
  const { data: current, error: readError } = await supabase
    .from('categories').select('id').eq('slug', 'accessories').maybeSingle()
  if (readError) throw readError
  if (current) return current
  const { data, error } = await supabase.from('categories').insert({
    slug: 'accessories',
    title: 'Аксессуары',
    icon: 'i-lucide-shopping-bag',
    sort_order: 2,
    is_active: true,
  }).select('id').single()
  if (error) throw error
  console.log('✓ category: accessories')
  return data
}

async function ensureHoodie() {
  const { data: current, error: readError } = await supabase
    .from('products').select('*').eq('slug', 'hoodie').maybeSingle()
  if (readError) throw readError
  if (current) return current

  const { data: product, error } = await supabase.from('products').insert({
    slug: 'hoodie',
    alias: 'hoodie',
    title: 'Худи Oversize',
    category: 'textile',
    base_price: 11990,
    max_size_label: 'XXL',
    max_print_mm: { width: 300, height: 400 },
    description: 'Плотное худи свободного кроя с мягким начёсом и двойным капюшоном.',
    is_active: false,
    is_featured: false,
    fit: {
      label: 'Свободная oversize',
      recommendation: 'Для более собранной посадки выберите на размер меньше.',
      composition: '80% хлопок, 20% полиэстер',
      densityGsm: 340,
      care: 'Стирка при 30 °C, вывернув изделие наизнанку.',
    },
  }).select('*').single()
  if (error) throw error

  const { data: materials, error: materialsError } = await supabase.from('materials').insert([
    { product_id: product.id, name: 'Футер · DTG', fabric_type: 'cotton', print_method: 'dtg', print_mode: 'zonal', surcharge: 0 },
    { product_id: product.id, name: 'Футер · DTF', fabric_type: 'cotton', print_method: 'dtf', print_mode: 'zonal', surcharge: 0 },
    { product_id: product.id, name: 'Футер · Шелкография', fabric_type: 'cotton', print_method: 'silkscreen', print_mode: 'zonal', surcharge: 0 },
  ]).select('id, print_method')
  if (materialsError) throw materialsError

  const sizes = ['S', 'M', 'L', 'XL', 'XXL']
  const variants = materials.flatMap(material => sizes.map(size => ({
    product_id: product.id,
    material_id: material.id,
    color_name: 'Чёрный',
    color_hex: '#111111',
    size,
    stock: 40,
    sku: `HOODIE-${material.print_method}-${size}`,
    blank_cost: 0,
  })))
  const { error: variantsError } = await supabase.from('variants').insert(variants)
  if (variantsError) throw variantsError

  const { error: zonesError } = await supabase.from('print_zones').insert([
    {
      product_id: product.id, print_mode: 'zonal', name: 'chest', title: 'Грудь',
      bounds_mm: { x: 55, y: 70, width: 200, height: 250 }, max_width_mm: 200, max_height_mm: 250,
      min_dpi: 150, placement_hint: 'Основной рисунок чуть ниже центра груди.',
      bounds_canvas: { x: 0.3, y: 0.32, width: 0.4, height: 0.42 },
    },
    {
      product_id: product.id, print_mode: 'zonal', name: 'back', title: 'Спина',
      bounds_mm: { x: 50, y: 60, width: 300, height: 400 }, max_width_mm: 300, max_height_mm: 400,
      min_dpi: 150, placement_hint: 'Крупный макет на спине.',
      bounds_canvas: { x: 0.27, y: 0.28, width: 0.46, height: 0.48 },
    },
  ])
  if (zonesError) throw zonesError
  return product
}

async function ensureTote() {
  const { data: current, error: readError } = await supabase
    .from('products').select('*').eq('slug', 'tote').maybeSingle()
  if (readError) throw readError
  if (current) return current

  const { data: product, error } = await supabase.from('products').insert({
    slug: 'tote',
    alias: 'tote',
    title: 'Шоппер Canvas',
    category: 'accessories',
    base_price: 4990,
    max_size_label: 'ONE SIZE',
    max_print_mm: { width: 260, height: 300 },
    description: 'Плотный чёрный шоппер из хлопкового канваса с усиленными ручками.',
    is_active: false,
    is_featured: false,
    fit: {
      label: 'One size',
      recommendation: 'Формат для повседневных вещей и документов A4.',
      composition: '100% хлопковый канвас',
      densityGsm: 320,
      care: 'Ручная стирка при 30 °C, сушить в расправленном виде.',
    },
  }).select('*').single()
  if (error) throw error

  const { data: materials, error: materialsError } = await supabase.from('materials').insert([
    { product_id: product.id, name: 'Canvas · DTF', fabric_type: 'cotton', print_method: 'dtf', print_mode: 'zonal', surcharge: 0 },
    { product_id: product.id, name: 'Canvas · Шелкография', fabric_type: 'cotton', print_method: 'silkscreen', print_mode: 'zonal', surcharge: 0 },
  ]).select('id, print_method')
  if (materialsError) throw materialsError

  const { error: variantsError } = await supabase.from('variants').insert(materials.map(material => ({
    product_id: product.id,
    material_id: material.id,
    color_name: 'Чёрный',
    color_hex: '#111111',
    size: 'ONE',
    stock: 100,
    sku: `TOTE-${material.print_method}-ONE`,
    blank_cost: 0,
  })))
  if (variantsError) throw variantsError

  const { error: zonesError } = await supabase.from('print_zones').insert([
    {
      product_id: product.id, print_mode: 'zonal', name: 'front', title: 'Лицевая сторона',
      bounds_mm: { x: 45, y: 75, width: 260, height: 300 }, max_width_mm: 260, max_height_mm: 300,
      min_dpi: 150, placement_hint: 'Центр основной плоскости сумки.',
      bounds_canvas: { x: 0.27, y: 0.32, width: 0.46, height: 0.44 },
    },
    {
      product_id: product.id, print_mode: 'zonal', name: 'back', title: 'Оборот',
      bounds_mm: { x: 45, y: 75, width: 260, height: 300 }, max_width_mm: 260, max_height_mm: 300,
      min_dpi: 150, placement_hint: 'Центр обратной стороны сумки.',
      bounds_canvas: { x: 0.27, y: 0.32, width: 0.46, height: 0.44 },
    },
  ])
  if (zonesError) throw zonesError
  return product
}

async function upload(productId, slot, localPath, version = 'v01') {
  const storagePath = `${productId}/brand/${slot}-${version}.webp`
  const buffer = await readFile(resolve(root, localPath))
  const { error } = await supabase.storage.from('catalog').upload(storagePath, buffer, {
    contentType: 'image/webp',
    cacheControl: '31536000',
    upsert: true,
  })
  if (error) throw error
  return supabase.storage.from('catalog').getPublicUrl(storagePath).data.publicUrl
}

async function ensureImage(product, row) {
  const { data: existing, error: readError } = await supabase
    .from('product_images').select('id').eq('product_id', product.id).eq('url', row.url).maybeSingle()
  if (readError) throw readError
  if (existing) {
    const { error } = await supabase.from('product_images').update(row).eq('id', existing.id)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('product_images').insert({ product_id: product.id, ...row })
  if (error) throw error
}

async function syncProduct(product) {
  const files = catalog[product.slug]
  if (!files) return

  const slots = [
    { slot: 'front', path: files.front, kind: 'mockup', label: 'Вид спереди', color_hex: '#111111', primary: true, order: 0 },
    { slot: 'back', path: files.back, kind: 'mockup', label: 'Вид сзади', color_hex: '#111111', primary: false, order: 1 },
    { slot: 'fit', version: 'v02', path: files.fit, kind: 'lifestyle', label: 'Посадка', color_hex: null, primary: false, order: 2 },
    { slot: 'detail-cotton', path: files.detail ?? 'public/media/products/detail/cotton-collar-v01.webp', kind: 'lifestyle', label: 'Ткань и швы', color_hex: null, primary: false, order: 3 },
    { slot: 'detail-print', path: 'public/media/products/detail/print-texture-v01.webp', kind: 'lifestyle', label: 'Фактура печати', color_hex: null, primary: false, order: 4 },
  ]

  const { error: resetPrimaryError } = await supabase
    .from('product_images')
    .update({ is_primary: false })
    .eq('product_id', product.id)
  if (resetPrimaryError) throw resetPrimaryError

  const { error: hideLifestyleError } = await supabase
    .from('product_images')
    .update({ is_hidden: true })
    .eq('product_id', product.id)
    .like('url', '%/brand/lifestyle-v01.webp')
  if (hideLifestyleError) throw hideLifestyleError
  for (const item of slots) {
    const publicUrl = await upload(product.id, item.slot, item.path, item.version)
    await ensureImage(product, {
      url: publicUrl,
      is_primary: item.primary,
      sort_order: item.order,
      color_hex: item.color_hex,
      kind: item.kind,
      label: item.label,
      is_hidden: false,
      alt: `${product.title} — ${item.label.toLowerCase()}`,
    })
  }
  console.log(`✓ ${product.slug}: 5 product-first media slots synced`)
}

async function run() {
  await ensureAccessoriesCategory()
  await ensureHoodie()
  await ensureTote()
  const { data: products, error } = await supabase
    .from('products').select('id, slug, title, is_active').in('slug', Object.keys(catalog))
  if (error) throw error

  for (const product of products) await syncProduct(product)

  const { count: visibleLifestyleCount, error: lifestyleAuditError } = await supabase
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('is_hidden', false)
    .like('url', '%/brand/lifestyle-v01.webp')
  if (lifestyleAuditError) throw lifestyleAuditError
  if (visibleLifestyleCount) throw new Error(`${visibleLifestyleCount} synthetic lifestyle rows are still visible`)
  console.log('✓ synthetic lifestyle audit: 0 visible rows')

  const hoodie = products.find(product => product.slug === 'hoodie')
  if (hoodie && !hoodie.is_active) {
    const { error: publishError } = await supabase.from('products').update({ is_active: true }).eq('id', hoodie.id)
    if (publishError) throw publishError
    console.log('✓ hoodie: published')
  }
  const tote = products.find(product => product.slug === 'tote')
  if (tote && !tote.is_active) {
    const { error: publishError } = await supabase.from('products').update({ is_active: true }).eq('id', tote.id)
    if (publishError) throw publishError
    console.log('✓ tote: published')
  }
  console.log('Brand media sync complete.')
}

run().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})
