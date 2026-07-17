import { preflightDesign } from '~~/shared/design/spec'
import { designPreflightSchema, parseOrThrow } from '~~/server/utils/schemas'

export default defineEventHandler(async (event) => {
  const body = parseOrThrow(designPreflightSchema, await readBody(event))
  return preflightDesign(body.spec, body.context)
})
