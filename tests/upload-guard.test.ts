import { describe, it, expect } from 'vitest'
import { detectKind, assertSafeUpload } from '../app/utils/upload-guard'

function bytes(...arr: number[]): Uint8Array {
  return new Uint8Array(arr)
}
function ascii(s: string): Uint8Array {
  return new Uint8Array([...s].map(c => c.charCodeAt(0)))
}

describe('detectKind — распознаёт по сигнатуре', () => {
  it('PNG', () => {
    expect(detectKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('png')
  })
  it('JPEG', () => {
    expect(detectKind(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg')
  })
  it('GIF', () => {
    expect(detectKind(ascii('GIF89a'))).toBe('gif')
  })
  it('PDF', () => {
    expect(detectKind(ascii('%PDF-1.7'))).toBe('pdf')
  })
  it('WEBP', () => {
    const u = new Uint8Array(12)
    u.set(ascii('RIFF'), 0); u.set(ascii('WEBP'), 8)
    expect(detectKind(u)).toBe('webp')
  })
  it('AVIF', () => {
    const u = new Uint8Array(12)
    u.set(ascii('ftyp'), 4); u.set(ascii('avif'), 8)
    expect(detectKind(u)).toBe('avif')
  })
})

describe('detectKind — отвергает опасное/неизвестное', () => {
  it('SVG (XSS-вектор) → null', () => {
    expect(detectKind(ascii('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull()
  })
  it('XML-пролог SVG → null', () => {
    expect(detectKind(ascii('<?xml version="1.0"?><svg>'))).toBeNull()
  })
  it('HTML → null', () => {
    expect(detectKind(ascii('<!DOCTYPE html>'))).toBeNull()
  })
  it('мусор → null', () => {
    expect(detectKind(bytes(0x00, 0x01, 0x02, 0x03))).toBeNull()
  })
})

describe('assertSafeUpload', () => {
  const png = () => new File([bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3)], 'a.png')
  const svg = () => new File([ascii('<svg onload="alert(1)"></svg>')], 'a.svg', { type: 'image/svg+xml' })

  it('пропускает PNG и отдаёт contentType по сигнатуре', async () => {
    const r = await assertSafeUpload(png())
    expect(r.kind).toBe('png')
    expect(r.contentType).toBe('image/png')
  })
  it('отвергает SVG даже с image/svg+xml в file.type', async () => {
    await expect(assertSafeUpload(svg())).rejects.toThrow()
  })
  it('отвергает превышение лимита размера', async () => {
    const big = new File([new Uint8Array(3 * 1024 * 1024)], 'big.png')
    await expect(assertSafeUpload(big, { maxMb: 1 })).rejects.toThrow(/слишком большой/)
  })
  it('уважает белый список allow (PDF не в списке → отказ)', async () => {
    const pdf = new File([ascii('%PDF-1.4')], 'a.pdf')
    await expect(assertSafeUpload(pdf, { allow: ['png', 'jpeg'] })).rejects.toThrow()
  })
})
