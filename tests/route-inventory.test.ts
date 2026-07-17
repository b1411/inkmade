import { describe, expect, it } from 'vitest'
import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

function vueFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const path = join(root, entry.name)
    return entry.isDirectory() ? vueFiles(path) : entry.name.endsWith('.vue') ? [path] : []
  })
}

function routeOf(file: string): string {
  const relativePath = relative(join(process.cwd(), 'app/pages'), file).replaceAll('\\', '/')
  const route = relativePath.replace(/\.vue$/, '').replace(/\/index$/, '').replace(/^index$/, '')
    .replace(/\[([^\]]+)\]/g, ':$1')
  return `/${route}`.replace(/\/$/, '') || '/'
}

describe('route inventory', () => {
  const routes = vueFiles(join(process.cwd(), 'app/pages')).map(routeOf).sort()
  const designerRoutes = routes.filter(route =>
    route.startsWith('/studio-designer')
    || route.startsWith('/designer')
    || route.startsWith('/invite')
    || route.startsWith('/admin/designers'),
  )

  it('keeps exactly eight designer-marketplace routes compatibility-only', () => {
    expect(designerRoutes).toHaveLength(8)
  })

  it('has no duplicate generated route paths', () => {
    expect(new Set(routes).size).toBe(routes.length)
  })

  it('tracks the current active production surface explicitly', () => {
    expect(routes.length - designerRoutes.length).toBe(63)
  })
})
