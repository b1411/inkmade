# INKMADE — production readiness

Срез: 17 июля 2026 года. Документ фиксирует фактическое состояние репозитория после реализации плана INKMADE 10/10 и отделяет готовый код от внешних launch-gates.

## Текущий статус

- В проекте 63 активных маршрута и 8 compatibility-only маршрутов designer marketplace. Исходная оценка «62 активных» была уточнена автоматическим inventory-тестом.
- Designer marketplace, AI-дизайн и групповые B2B-заказы выключены feature flags. Advanced admin и B2B storefront включены.
- Production checkout fail-fast: при отсутствии любого критического параметра `/api/payment/create` отвечает 503, а `/api/health/ready` возвращает подробный readiness-статус без секретов.
- Все изменения схемы аддитивны. Существующие заказы с `design_spec.version = 1` читаются адаптером; разрушительная миграция исторических заказов не требуется.

## Реализовано в коде

### UI и маршруты

- Три визуальных режима: Editorial, Commerce и Workspace.
- Единые account/admin/shop-admin/studio shells, мобильная навигация, page headers, command/filter bars, cards, tables, badges, forms, sticky actions, empty/error/loading states и подтверждения destructive actions.
- Обновлены commerce-сценарии catalog → product → customizer → cart → auth → checkout → payment → order.
- RU и KK заведены в общей системе переводов; критические экраны проверяются на доступность и длинные строки.
- B2B storefront поддерживает tenant branding, access code, closed/empty/sold-out/promo состояния; branding editor имеет desktop/mobile preview.

### Customizer 2.0

- Simple и Advanced режимы, multi-select, group/ungroup, copy/paste, reorder, align/distribute, числовая геометрия в сантиметрах, rotation, crop, flip, opacity, lock, visibility и дублирование.
- Шаблоны, слои, расширенный текст, DPI/физический размер, preflight, proof preview по зонам и переключение совместимого изделия.
- Mobile canvas с нижними инструментами и альтернативами drag-действиям.
- Guest autosave в IndexedDB и server draft с `revision`, `updated_at`, конфликтом версий и восстановлением.
- Общий `design_spec.version = 2` для draft, share, cart и checkout; v1 adapter сохранён.
- Server preflight использует общую схему с checkout. Warning можно подтвердить, blocker не пропускает заказ.
- Konva, PDF, HEIC и background removal загружаются лениво; тяжёлые операции вынесены из landing bundle.

### Платежи и наблюдаемость

- Halyk ePay: OAuth, создание invoice/payment, callback, проверка статуса, cancel/refund и replay-safe обработка paid webhook.
- Mock provider оставлен только для local development; production допускает только `PAYMENT_PROVIDER=epay`.
- Единая event taxonomy commerce/customizer/B2B и события ошибок.
- Health/readiness endpoints, release tag и серверное error reporting.

## Миграции

Применять последовательно после backup и проверки staging:

1. `0089_design_spec_v2.sql` — templates, draft metadata, revision/status и v2-совместимость.
2. `0090_epay_payment_foundation.sql` — ePay invoice/payment identifiers и индексы.

Обе миграции аддитивны и содержат RLS. Rollback релиза выполняется откатом приложения/feature flags; добавленные nullable-поля и таблицы не удалять во время инцидента. Физическое удаление допустимо только отдельной миграцией после подтверждения отсутствия новых записей.

## Автоматическая приёмка

- `pnpm test`: 18 файлов, 203 теста — pass.
- `pnpm typecheck` — pass.
- `pnpm build` — pass, production Nitro output сформирован.
- Chromium WCAG smoke: 8/8 критических экранов — pass.
- Chromium public/catalog/customizer regression — pass на детерминированном E2E-каталоге; credential-зависимые admin/shop/payment сценарии пропускаются без staging seed-аккаунтов.
- Visual baselines: 390, 768, 1440 и 1920 px обновлены после проверки фактических рендеров.
- Product audit: production dependencies — 0 известных уязвимостей; transitive `esbuild` зафиксирован безопасным override.
- Bundle с максимальным gzip: landing entry 246.55 KB; customizer route chunk 93.63 KB. PDF/HEIC/background removal остаются lazy chunks и не входят в landing.

Browser-matrix считается закрытой только после установки Playwright Firefox/WebKit и отдельной проверки реальных iPhone Safari и Android Chrome. Для offline-приёмки catalog/product/customizer используется изолированный E2E seed, который не активируется в обычном dev/production runtime. Payment и role-based сценарии должны дополнительно запускаться на seeded staging Supabase с реальными тестовыми аккаунтами и ePay merchant.

## Критические внешние launch-gates

До публичного запуска обязательны все пункты ниже:

1. Создать отдельные staging и production Supabase, применить миграции, проверить RLS и подготовить seed-аккаунты customer/shop owner/admin/operator.
2. Получить Halyk ePay test/prod merchant credentials и заполнить `EPAY_CLIENT_ID`, `EPAY_CLIENT_SECRET`, `EPAY_SHOP_ID`, `EPAY_ACCOUNT_ID`, при необходимости `EPAY_TERMINAL_ID`; установить `PAYMENT_PROVIDER=epay`.
3. Выполнить минимум 20 sandbox-платежей: success, cancel, timeout, status recovery, refund и повтор callback/webhook.
4. Выбрать и интегрировать реальную онлайн-ККМ/ОФД. Одного статуса `pending_fiscalization` недостаточно; до этого production checkout обязан оставаться заблокированным.
5. Подключить `inkmade.kz`: DNS, HTTPS, canonical, email-domain и wildcard/subdomain routing для B2B.
6. Настроить Resend, product analytics, error monitoring/source maps/release tags и uptime probe на `/api/health/ready`.
7. Заменить AI/placeholder товары, фото печати и отзывы реальными материалами; после контент-приёмки выставить `REAL_CONTENT_APPROVED=true`.
8. Провести юридическое ревью terms/privacy/consents для РК; только после подписи выставить `LEGAL_REVIEW_APPROVED=true`.
9. Прогнать полный browser/device matrix, визуальную инвентаризацию всех активных маршрутов и data-dependent E2E на staging.
10. Провести закрытую beta на 20 реальных заказов с ручной сверкой proof/print files, затем 7 дней наблюдения без critical incidents.

## Обязательные production env

Источник истины — `.env.example`. Минимальный critical-набор:

```text
NUXT_PUBLIC_SUPABASE_URL
NUXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NUXT_PUBLIC_SITE_URL=https://inkmade.kz
PAYMENT_PROVIDER=epay
PAYMENT_WEBHOOK_SECRET
EPAY_ENV=production
EPAY_CLIENT_ID
EPAY_CLIENT_SECRET
EPAY_SHOP_ID
EPAY_ACCOUNT_ID
FISCAL_PROVIDER
FISCAL_API_KEY
RESEND_API_KEY
RESEND_FROM
LEGAL_REVIEW_APPROVED=true
REAL_CONTENT_APPROVED=true
```

Проверка перед переключением трафика:

```text
GET /api/health/ready → HTTP 200, ready: true
```

## Go / no-go

`GO` разрешён только если readiness endpoint зелёный, staging browser/E2E matrix пройден, 20 ePay sandbox-сценариев подтверждены, фискализация выдаёт реальный чек, legal/content approvals подписаны и закрытая beta завершена без критических ошибок. Любой незакрытый critical пункт означает `NO-GO` независимо от визуальной готовности интерфейса.
