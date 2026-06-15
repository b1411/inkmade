import type { Database, TablesInsert, Json } from '~/types/database.types'
import type { FabricType } from '~~/shared/config/print-methods'
import { defaultMethodForFabric, modeForFabric } from '~~/shared/config/print-methods'
import { getTemplate } from '~~/shared/config/product-types'
import { assertSafeUpload } from '~/utils/upload-guard'
import { getZonePreset, DPI_MIN } from '~~/shared/config/zones'

// CRUD каталога для админ-кабинета (§8.2). Пишет напрямую в Supabase под RLS:
// admin-политики (миграция 0004/0005) разрешают запись только роли admin (§3.2, §5.4).

export const useAdmin = () => {
  const supabase = useSupabaseClient<Database>()

  // путь объекта внутри публичного бакета catalog из его public URL (для очистки, H11)
  function catalogPath(url: string): string | null {
    const marker = '/catalog/'
    const i = url.indexOf(marker)
    return i >= 0 ? url.slice(i + marker.length) : null
  }
  async function removeCatalogObjects(urls: (string | null | undefined)[]) {
    const paths = urls.map(u => (u ? catalogPath(u) : null)).filter((p): p is string => !!p)
    if (paths.length) await supabase.storage.from('catalog').remove(paths) // best-effort
  }

  // ── Товары ──────────────────────────────────────────────────────
  async function listProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async function getProduct(id: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*, materials(*), print_zones(*), variants(*), product_images(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }

  async function createProduct(payload: TablesInsert<'products'>) {
    const { data, error } = await supabase.from('products').insert(payload).select().single()
    if (error) throw error
    return data
  }

  async function updateProduct(id: string, patch: Partial<TablesInsert<'products'>>) {
    const { data, error } = await supabase.from('products').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  }

  async function deleteProduct(id: string) {
    // соберём файлы до удаления (строки уйдут каскадом), затем очистим Storage (H11)
    const { data: imgs } = await supabase.from('product_images').select('url').eq('product_id', id)
    const { data: zones } = await supabase.from('print_zones').select('mockup_url').eq('product_id', id)
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
    await removeCatalogObjects([...(imgs ?? []).map(i => i.url), ...(zones ?? []).map(z => z.mockup_url)])
  }

  /** Публикация/снятие (шаг 6, §8.2.1). */
  async function setPublished(id: string, isActive: boolean) {
    return updateProduct(id, { is_active: isActive })
  }

  /**
   * Создать товар-черновик из шаблона типа изделия (каркас каталога, §6):
   * сразу заводит материал, матрицу вариантов цвет×размер и зоны печати.
   * Админу остаётся загрузить фото/мокапы, выставить остаток и опубликовать.
   */
  async function createFromTemplate(templateKey: string, title?: string) {
    const t = getTemplate(templateKey)
    if (!t) throw new Error('Шаблон типа изделия не найден')
    const slug = `${t.key}-${Math.random().toString(36).slice(2, 7)}`
    const product = await createProduct({
      title: title?.trim() || t.title,
      slug,
      alias: slug,
      category: t.categorySlug,
      base_price: t.basePrice,
      max_print_mm: t.maxPrintMm as unknown as Json,
      max_size_label: t.sizes[t.sizes.length - 1],
      description: t.description,
      is_active: false,
    })
    const material = await addMaterial(product.id, {
      name: t.fabric === 'cotton' ? 'Хлопок' : 'Синтетика',
      fabric: t.fabric,
    })
    await generateVariants(
      product.id, slug, material.id,
      t.colors.map(c => ({ name: c.name, hex: c.hex })),
      t.sizes, 0,
    )
    for (const zoneName of t.zonePresets) {
      const preset = getZonePreset(zoneName)
      if (!preset) continue
      await addZone(product.id, {
        print_mode: preset.mode,
        name: preset.name,
        title: preset.title,
        bounds_mm: preset.bounds_mm as unknown as Json,
        max_width_mm: preset.max_width_mm,
        max_height_mm: preset.max_height_mm,
        min_dpi: DPI_MIN,
        placement_hint: preset.placement_hint ?? null,
      })
    }
    return product.id
  }

  // ── Заказы (админ видит финансы: цена, себестоимость, маржа §6.4) ──
  async function getOrderAdmin(id: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`*,
        order_items(*,
          designs(id, spec, preview_url, original_url, moderation_status),
          variants(color_name, color_hex, size, sku, products(title))
        ),
        order_status_log(*)`)
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  }

  /** Себестоимость заготовки варианта (для маржи и cogs, §6.2). */
  async function setVariantCost(variantId: string, blankCost: number) {
    const { error } = await supabase.from('variants').update({ blank_cost: blankCost }).eq('id', variantId)
    if (error) throw error
  }

  // ── Промокоды (§6.7) ────────────────────────────────────────────
  async function listPromos() {
    const { data, error } = await supabase.from('promo_codes').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  }

  async function createPromo(payload: {
    code: string; discount_type: 'percent' | 'fixed'; discount_value: number
    min_order?: number; max_uses?: number | null; expires_at?: string | null
  }) {
    const { error } = await supabase.from('promo_codes').insert({
      code: payload.code.trim().toUpperCase(),
      discount_type: payload.discount_type,
      discount_value: payload.discount_value,
      min_order: payload.min_order ?? 0,
      max_uses: payload.max_uses ?? null,
      expires_at: payload.expires_at ?? null,
    })
    if (error) throw error
  }

  async function togglePromo(id: string, active: boolean) {
    const { error } = await supabase.from('promo_codes').update({ active }).eq('id', id)
    if (error) throw error
  }

  async function deletePromo(id: string) {
    const { error } = await supabase.from('promo_codes').delete().eq('id', id)
    if (error) throw error
  }

  // ── Материалы (метод/режим выводятся из ткани, §5.2.1) ──────────
  async function addMaterial(productId: string, input: { name: string; fabric: FabricType; surcharge?: number; method?: string }) {
    const payload: TablesInsert<'materials'> = {
      product_id: productId,
      name: input.name,
      fabric_type: input.fabric,
      print_method: input.method ?? defaultMethodForFabric(input.fabric),
      print_mode: modeForFabric(input.fabric),
      surcharge: input.surcharge ?? 0,
    }
    const { data, error } = await supabase.from('materials').insert(payload).select().single()
    if (error) throw error
    return data
  }

  async function deleteMaterial(id: string) {
    const { error } = await supabase.from('materials').delete().eq('id', id)
    if (error) throw error
  }

  // ── Варианты: генерация матрицы цвет × размер (шаг 3, §8.2.1) ────
  async function generateVariants(
    productId: string,
    slug: string,
    materialId: string,
    colors: { name: string; hex: string }[],
    sizes: string[],
    initialStock = 0,
  ) {
    const rows: TablesInsert<'variants'>[] = []
    for (const color of colors) {
      for (const size of sizes) {
        const colorKey = color.name.toLowerCase().replace(/\s+/g, '-')
        rows.push({
          product_id: productId,
          material_id: materialId,
          color_name: color.name,
          color_hex: color.hex,
          size,
          stock: initialStock,
          sku: `${slug}-${colorKey}-${size}`.toUpperCase(),
        })
      }
    }
    const { data, error } = await supabase.from('variants').insert(rows).select()
    if (error) throw error
    return data
  }

  async function deleteVariant(id: string) {
    const { error } = await supabase.from('variants').delete().eq('id', id)
    if (error) throw error
  }

  // ── Зоны печати (шаг 4, §8.2.1) ─────────────────────────────────
  async function addZone(productId: string, zone: Omit<TablesInsert<'print_zones'>, 'product_id'>) {
    const { data, error } = await supabase
      .from('print_zones')
      .insert({ ...zone, product_id: productId })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function updateZone(id: string, patch: Partial<TablesInsert<'print_zones'>>) {
    const { data, error } = await supabase.from('print_zones').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  }

  async function deleteZone(id: string) {
    const { data: zone } = await supabase.from('print_zones').select('mockup_url').eq('id', id).single()
    const { error } = await supabase.from('print_zones').delete().eq('id', id)
    if (error) throw error
    await removeCatalogObjects([zone?.mockup_url])
  }

  // ── Фото товара (шаг 5, §8.2.1) → публичный бакет catalog ───────
  async function uploadCatalogImage(productId: string, file: File): Promise<string> {
    const { contentType } = await assertSafeUpload(file, { allow: ['png', 'jpeg', 'webp', 'gif', 'avif'] })
    const ext = file.name.split('.').pop() || 'png'
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
    const path = `${productId}/${safeName}`
    const { error } = await supabase.storage.from('catalog').upload(path, file, { upsert: false, contentType })
    if (error) throw error
    const { data } = supabase.storage.from('catalog').getPublicUrl(path)
    return data.publicUrl
  }

  async function addImage(productId: string, url: string, isPrimary = false, sortOrder = 0) {
    const { data, error } = await supabase
      .from('product_images')
      .insert({ product_id: productId, url, is_primary: isPrimary, sort_order: sortOrder })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function deleteImage(id: string) {
    const { data: img } = await supabase.from('product_images').select('url').eq('id', id).single()
    const { error } = await supabase.from('product_images').delete().eq('id', id)
    if (error) throw error
    await removeCatalogObjects([img?.url])
  }

  async function setPrimaryImage(productId: string, imageId: string) {
    await supabase.from('product_images').update({ is_primary: false }).eq('product_id', productId)
    const { error } = await supabase.from('product_images').update({ is_primary: true }).eq('id', imageId)
    if (error) throw error
  }

  return {
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    setPublished,
    getOrderAdmin,
    setVariantCost,
    listPromos,
    createPromo,
    togglePromo,
    deletePromo,
    createFromTemplate,
    addMaterial,
    deleteMaterial,
    generateVariants,
    deleteVariant,
    addZone,
    updateZone,
    deleteZone,
    uploadCatalogImage,
    addImage,
    deleteImage,
    setPrimaryImage,
  }
}
