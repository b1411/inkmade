// INKMADE — конечный автомат статусов заказа (паспорт §5.3).
// Переход в paid — ТОЛЬКО серверный webhook (§10, инвариант 2).

export type OrderStatus =
  | 'created' | 'pending' | 'paid' | 'queued' | 'printing' | 'quality_check'
  | 'packing' | 'ready_to_ship' | 'shipped' | 'delivered'
  | 'on_hold' | 'reprint' | 'cancelled' | 'refunded'

export const STATUS_LABELS: Record<OrderStatus, string> = {
  created: 'Создан',
  pending: 'Ожидает оплаты',
  paid: 'Оплачен',
  queued: 'В очереди',
  printing: 'В печати',
  quality_check: 'Контроль качества',
  packing: 'Упаковка',
  ready_to_ship: 'Готов к отгрузке',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  on_hold: 'На паузе',
  reprint: 'Повторная печать',
  cancelled: 'Отменён',
  refunded: 'Возврат средств',
}

// Укрупнённые статусы для клиента (§5.3 — клиенту показываем обобщённо).
export const CUSTOMER_STATUS: Record<OrderStatus, string> = {
  created: 'Оформление',
  pending: 'Ожидает оплаты',
  paid: 'В производстве',
  queued: 'В производстве',
  printing: 'В производстве',
  quality_check: 'В производстве',
  packing: 'Упаковка',
  ready_to_ship: 'Упаковка',
  shipped: 'В пути',
  delivered: 'Доставлен',
  on_hold: 'В обработке',
  reprint: 'В производстве',
  cancelled: 'Отменён',
  refunded: 'Возврат средств',
}

// Производственные этапы для доски /studio (§8.3).
export const PRODUCTION_STAGES: OrderStatus[] = [
  'queued', 'printing', 'quality_check', 'packing', 'ready_to_ship',
]

// Допустимые переходы автомата. Источник истины валидации (§8.5).
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  created: ['pending', 'cancelled'],
  pending: ['paid', 'cancelled'], // paid — только webhook
  paid: ['queued', 'on_hold', 'cancelled', 'refunded'],
  queued: ['printing', 'on_hold', 'cancelled'],
  printing: ['quality_check', 'on_hold', 'reprint'],
  quality_check: ['packing', 'reprint', 'on_hold'],
  packing: ['ready_to_ship', 'on_hold'],
  ready_to_ship: ['shipped', 'on_hold'],
  shipped: ['delivered'],
  delivered: [],
  on_hold: ['queued', 'printing', 'quality_check', 'packing', 'ready_to_ship', 'cancelled', 'refunded'],
  reprint: ['queued', 'printing'],
  cancelled: [],
  refunded: [],
}

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

// Переходы, требующие обязательной причины в логе (§8.4).
export const REASON_REQUIRED: OrderStatus[] = ['on_hold', 'reprint', 'cancelled', 'refunded']
