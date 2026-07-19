/** Отличает реальное отсутствие товара от временной ошибки БД/сети. */
export function isCatalogNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return error instanceof Error && error.message === 'Product not found'
  }

  const value = error as Record<string, unknown>
  const response = value.response && typeof value.response === 'object' ? value.response as Record<string, unknown> : null
  const data = value.data && typeof value.data === 'object' ? value.data as Record<string, unknown> : null
  return value.code === 'PGRST116'
    || value.status === 404
    || value.statusCode === 404
    || response?.status === 404
    || data?.statusCode === 404
    || value.message === 'Product not found'
}

export const isNotFoundError = isCatalogNotFoundError
