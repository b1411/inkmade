import { productionReadiness } from '~~/server/utils/readiness'

export default defineEventHandler((event) => {
  const checks = productionReadiness(process.env)
  const ready = checks.every(check => !check.critical || check.ok)
  setResponseStatus(event, ready ? 200 : 503)
  return {
    ready,
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.RELEASE_TAG || 'development',
    checks,
    checkedAt: new Date().toISOString(),
  }
})
