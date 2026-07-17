import { createHmac, timingSafeEqual } from 'node:crypto'

// Подпись и проверка webhook-подписи (§10 инвариант 2: webhook — единственный
// триггер paid). Вынесено из обработчика в чистую функцию: тестируемо и
// переиспользуемо при подключении реального провайдера. Сравнение — в постоянном
// времени (защита от timing-атаки на подбор подписи).

export function signWebhook(raw: string, secret: string): string {
  return createHmac('sha256', secret).update(raw).digest('hex')
}

export function verifyWebhookSignature(raw: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false
  const expected = signWebhook(raw, secret)
  // timingSafeEqual требует равной длины буферов — сверяем длину до сравнения
  if (signature.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export function verifyOpaqueSecret(received: string, expected: string): boolean {
  if (!received || !expected || received.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected))
}
