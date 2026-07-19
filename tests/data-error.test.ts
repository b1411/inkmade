import { describe, expect, it } from 'vitest'
import { isNotFoundError } from '../app/utils/catalog-error'

describe('isNotFoundError', () => {
  it('распознаёт отсутствие строки Supabase', () => {
    expect(isNotFoundError({ code: 'PGRST116' })).toBe(true)
  })

  it('распознаёт 404 у Nuxt и $fetch', () => {
    expect(isNotFoundError({ statusCode: 404 })).toBe(true)
    expect(isNotFoundError({ response: { status: 404 } })).toBe(true)
    expect(isNotFoundError({ data: { statusCode: 404 } })).toBe(true)
  })

  it('не превращает сетевые и серверные сбои в 404', () => {
    expect(isNotFoundError({ statusCode: 503 })).toBe(false)
    expect(isNotFoundError({ message: 'Failed to fetch' })).toBe(false)
    expect(isNotFoundError(null)).toBe(false)
  })
})
