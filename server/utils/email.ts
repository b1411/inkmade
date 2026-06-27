import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { normalizeKzPhone } from '~~/shared/config/phone'
import { logError } from '~~/server/utils/logger'

// Транзакционные письма + WhatsApp (P1.7). Провайдеры включаются ключами в env;
// без ключа — no-op (код готов, отправка не критична для бизнес-операции и не валит её).
// Email — Resend (HTTP API). WhatsApp — Meta Cloud API (нужны верификация и шаблоны).

const BRAND = {
  burgundy: '#7A1F28',
  cream: '#F4ECE2',
  ink: '#1A1614',
  gray: '#6B6460',
  line: '#E7DFD5',
}

interface SendArgs {
  to: string
  subject: string
  html: string
}

export async function sendEmail(args: SendArgs): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) return
  const from = process.env.RESEND_FROM || 'INKMADE <onboarding@resend.dev>'
  try {
    await $fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: { from, to: args.to, subject: args.subject, html: args.html },
    })
  } catch (e) {
    await logError('email', e, { to: args.to, subject: args.subject })
  }
}

// ── Брендовый HTML-лейаут (всё инлайн — требование почтовых клиентов) ──
interface LayoutOpts {
  heading: string
  intro: string
  ctaLabel: string
  ctaUrl: string
  rows?: Array<{ k: string; v: string }>
  note?: string
}
function layout(o: LayoutOpts): string {
  const rows = (o.rows ?? [])
    .map(r => `<tr><td style="padding:6px 0;color:${BRAND.gray};font-size:14px">${r.k}</td><td style="padding:6px 0;text-align:right;font-weight:600;color:${BRAND.ink};font-size:14px">${r.v}</td></tr>`)
    .join('')
  return `<!doctype html><html lang="ru"><body style="margin:0;background:${BRAND.cream};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid ${BRAND.line};border-radius:16px;overflow:hidden">
        <tr><td style="background:${BRAND.burgundy};padding:22px 28px">
          <span style="color:${BRAND.cream};font-size:22px;font-weight:800;letter-spacing:0.14em">INKMADE</span>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 12px;color:${BRAND.ink};font-size:22px;line-height:1.25">${o.heading}</h1>
          <p style="margin:0 0 18px;color:${BRAND.gray};font-size:15px;line-height:1.5">${o.intro}</p>
          ${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BRAND.line};border-bottom:1px solid ${BRAND.line};margin:0 0 20px">${rows}</table>` : ''}
          <a href="${o.ctaUrl}" style="display:inline-block;background:${BRAND.burgundy};color:${BRAND.cream};text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:10px">${o.ctaLabel}</a>
          ${o.note ? `<p style="margin:18px 0 0;color:${BRAND.gray};font-size:13px;line-height:1.5">${o.note}</p>` : ''}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid ${BRAND.line};background:#FBF8F4">
          <p style="margin:0;color:${BRAND.gray};font-size:12px;line-height:1.5">INKMADE · мерч с печатью по требованию · Казахстан<br>Это письмо отправлено по вашему заказу. Статус всегда доступен по кнопке выше.</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`
}

type OrderEmailType = 'paid' | 'shipped' | 'delivered'

function template(type: OrderEmailType, ctx: { shortId: string; link: string; trackingNo?: string; carrier?: string }) {
  switch (type) {
    case 'paid':
      return {
        subject: `INKMADE — заказ #${ctx.shortId} принят в работу`,
        html: layout({
          heading: 'Спасибо за заказ!',
          intro: `Оплата получена, заказ <strong>#${ctx.shortId}</strong> передан в производство. Мы напишем, когда отправим.`,
          ctaLabel: 'Следить за заказом',
          ctaUrl: ctx.link,
        }),
      }
    case 'shipped':
      return {
        subject: `INKMADE — заказ #${ctx.shortId} отправлен`,
        html: layout({
          heading: 'Заказ в пути',
          intro: `Заказ <strong>#${ctx.shortId}</strong> отправлен${ctx.carrier ? ` (${ctx.carrier})` : ''}.`,
          rows: ctx.trackingNo ? [{ k: 'Трек-номер', v: ctx.trackingNo }] : [],
          ctaLabel: 'Отследить',
          ctaUrl: ctx.link,
        }),
      }
    case 'delivered':
      return {
        subject: `INKMADE — заказ #${ctx.shortId} доставлен`,
        html: layout({
          heading: 'Заказ доставлен',
          intro: 'Надеемся, вам понравилось! Поделитесь своим дизайном и расскажите друзьям про INKMADE.',
          ctaLabel: 'Создать ещё',
          ctaUrl: ctx.link.replace(/\/order\/.*$/, '/catalog'),
        }),
      }
  }
}

// ── WhatsApp (Meta Cloud API). No-op без WHATSAPP_TOKEN+WHATSAPP_PHONE_ID. ──
// Прод требует верифицированный бизнес и одобренные шаблоны для сообщений вне
// 24-часового окна — здесь шлём текст best-effort; при ошибке тихо логируем.
function waText(type: OrderEmailType, shortId: string, link: string): string {
  switch (type) {
    case 'paid': return `INKMADE: заказ #${shortId} оплачен и передан в производство. Статус: ${link}`
    case 'shipped': return `INKMADE: заказ #${shortId} отправлен. Отслеживание: ${link}`
    case 'delivered': return `INKMADE: заказ #${shortId} доставлен. Спасибо! ${link}`
  }
}
async function sendWhatsApp(phoneE164: string, body: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_ID
  if (!token || !phoneId) return
  try {
    await $fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: { messaging_product: 'whatsapp', to: phoneE164.replace('+', ''), type: 'text', text: { body } },
    })
  } catch (e) {
    await logError('whatsapp', e, { phone: phoneE164 })
  }
}

/** Уведомить клиента о ключевом статусе заказа (email + WhatsApp). Best-effort. */
export async function notifyOrder(
  svc: SupabaseClient<Database>,
  orderId: string,
  type: OrderEmailType,
  extra?: { trackingNo?: string; carrier?: string },
): Promise<void> {
  const emailOn = !!process.env.RESEND_API_KEY
  const waOn = !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID)
  if (!emailOn && !waOn) return

  const { data: order } = await svc
    .from('orders')
    .select('id, user_id, shipping_addr')
    .eq('id', orderId)
    .single()
  if (!order) return

  const site = process.env.NUXT_PUBLIC_SITE_URL || 'https://inkmade-pi.vercel.app'
  const shortId = order.id.slice(0, 8)
  const link = `${site}/order/${order.id}`

  // получатель: данные из формы checkout (shipping_addr) → fallback на аккаунт/профиль
  const addr = order.shipping_addr as { email?: string; phone?: string } | null

  if (emailOn) {
    let to = addr?.email ?? null
    if (!to) {
      const { data } = await svc.auth.admin.getUserById(order.user_id)
      to = data.user?.email ?? null
    }
    if (to) {
      const tpl = template(type, { shortId, link, trackingNo: extra?.trackingNo, carrier: extra?.carrier })
      await sendEmail({ to, subject: tpl.subject, html: tpl.html })
    }
  }

  if (waOn) {
    let phone = addr?.phone ?? null
    if (!phone) {
      const { data: prof } = await svc.from('profiles').select('phone').eq('id', order.user_id).maybeSingle()
      phone = prof?.phone ?? null
    }
    const e164 = phone ? normalizeKzPhone(phone) : null
    if (e164) await sendWhatsApp(e164, waText(type, shortId, link))
  }
}
