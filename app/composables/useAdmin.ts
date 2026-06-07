import type { Database, TablesInsert } from '~/types/database.types'
import type { FabricType } from '~~/shared/config/print-methods'
import { defaultMethodForFabric, modeForFabric } from '~~/shared/config/print-methods'

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
    const ext = file.name.split('.').pop() || 'png'
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
    const path = `${productId}/${safeName}`
    const { error } = await supabase.storage.from('catalog').upload(path, file, { upsert: false })
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
