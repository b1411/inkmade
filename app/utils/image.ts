// Клиентская генерация уменьшенной превью из файла изображения (§ мелочи).
// Для растровых принтов: даунскейл через canvas → webp. Вектор (SVG)/не-изображения
// возвращают null — для них thumbnail = оригинал (он и так лёгкий/масштабируемый).
export async function makeThumbnail(file: File, max = 400): Promise<Blob | null> {
  if (!import.meta.client) return null
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return null

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('image load failed'))
      el.src = url
    })
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, w, h)
    return await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), 'image/webp', 0.85))
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}
