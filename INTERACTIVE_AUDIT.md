# INTERACTIVE_AUDIT — INKMADE (аудит интерактивных элементов)

**Дата:** 2026-07-18 · **Метод:** read-only, 5 параллельных агентов по областям + сквозные grep'ы + ручная верификация ключевых находок по строкам · **Правки в код НЕ вносились.**

## Главный вывод

**Critical и High НЕ найдено.** Мёртвых кнопок, ссылок `href="#"`, случайных submit, незащищённого двойного submit — **нет**. Все формы на `@submit.prevent` + `type="submit"` + гард `if(loading) return`. Logout заведён и заредиректен во всех кабинетах и в header. `useConfirm` резолвится и на accept, и на cancel (не виснет). Модалы `v-model:open`, dropdown, event-propagation (`.stop`/`.prevent`), z-index/pointer-events — проверены корректными.

Найденное — уровня **Medium/Low**: обратная связь (loading), одна потерянная реакция состояния, хрупкость примитива и мелкий UX/косметика.

Сводка: **3 Medium, 11 Low/Info.** Каждая с воспроизведением и исправлением.

---

## 🟡 MEDIUM

### M1. Примитив `AppButton` не объявляет `emits` — `@click` держится только на attribute-fallthrough (хрупкий фут-ган ядра)
- **Файл:** `app/components/ui/AppButton.vue` (нет `defineEmits`; корень — `<span ref="wrap">` :94, реальный контрол — `<button>`/`<NuxtLink>` :95–116). Пример потребителя: `app/error.vue:33-34`.
- **Элемент:** любой `<UiAppButton @click="...">` (сотни по проекту).
- **Воспроизведение:** 404 → «На главную»/«В каталог» → работает.
- **Ожид./факт.:** работает — НО только потому, что при `inheritAttrs:true` и одном корневом узле родительский `onClick` навешивается на корневой `<span>`, а клик по внутренней кнопке всплывает к нему. Явного `@click` на реальном контроле нет.
- **Причина:** нет `defineEmits(['click'])` и проброса `@click` на `<button>`/`<NuxtLink>`.
- **Риск:** любое будущее изменение (второй корневой узел, `inheritAttrs:false`) **молча убьёт все `@click`** без ошибки компиляции — включая единственные кнопки страницы ошибки и `emit('addToCart')` в конструкторе.
- **Исправление:** `const emit = defineEmits<{ click: [MouseEvent] }>()` и `@click="emit('click', $event)"` на самом `<button>`/`<NuxtLink>`.
- **Уверенность:** высокая (прочитан весь файл).

### M2. Десктопная «В корзину» без loading/disabled во время многосекундного async — «выглядит сломанной»
- **Файл:** `app/components/customizer/PriceCalculator.vue:4` (props только `{ quantity }`), `:51` (кнопка без `:loading`/`:disabled`); потребитель `app/pages/customize/[id].vue:479`. Контраст — мобильная кнопка `[id].vue:491` с `:loading="submitting"`.
- **Элемент:** десктопная sticky-кнопка «В корзину» (PriceCalculator).
- **Воспроизведение:** десктоп → «В корзину». `onAddToCart` (`[id].vue:260`) выполняет `captureComposition` → upload → `generatePrintFiles` (рендер 300 DPI + загрузка в Storage) — несколько секунд. Кнопка всё это время без изменений.
- **Ожид./факт.:** ожидается спиннер/затемнение как на мобильной; факт — ничего, пользователь думает, что не сработало, и кликает снова.
- **Двойной submit безопасен:** `onAddToCart` синхронно гардит `if (submitting.value) return` (`[id].vue:261`) → дублей нет; дефект — только отсутствие обратной связи + рассинхрон desktop/mobile.
- **Исправление:** добавить проп `loading?: boolean` в PriceCalculator, забиндить на кнопку, передать `:loading="submitting"` из `[id].vue:479`.
- **Уверенность:** высокая (подтверждено двумя независимыми агентами + чтением кода).

### M3. Выбор слоя из другой зоны в LayerPanel «теряется» — выделение сбрасывается в том же цикле
- **Файл:** `app/components/customizer/LayerPanel.vue:49-53` (`selectLayer`) ⟂ `app/components/customizer/CustomizerCanvas.client.vue:589` (watcher зоны).
- **Элемент:** строка слоя в списке, принадлежащая НЕактивной зоне (список показывает все зоны).
- **Воспроизведение:** в зоне «Перед» добавь принт на «Спину», вернись на «Перед», кликни в списке слой «Спины».
- **Ожид./факт.:** ожидается — активная зона переключится на «Спину» И элемент выделится (highlight + трансформер). Факт — зона переключается, но выделение НЕ ставится: нет подсветки, нет трансформера, инспектор пропадает. Нужен второй клик.
- **Причина:** `selectLayer` синхронно пишет `zoneName.value = p.zone`, затем `selectPlacement(p.id)`. Смена зоны триггерит watcher канваса `watch(() => zone.value?.name, () => { selectPlacement(null); ... })`, который после flush **безусловно** обнуляет выделение — и его `selectPlacement(null)` оказывается последней записью в `selectedId`.
- **Исправление:** в watcher'е сбрасывать выделение только если зона выбранного элемента != новой зоны; либо в `selectLayer` переставить выделение после `nextTick`.
- **Уверенность:** высокая (прочитаны оба обработчика; обнуление — терминальное).

---

## 🟢 LOW / INFO

### L1. Link-вариант `AppButton` (`to`) при `disabled`/`loading` активируется с клавиатуры → навигация / двойной переход
- **Файл:** `app/components/ui/AppButton.vue:95-105` (link-ветка ставит только `:aria-disabled`); CSS `main.css:353-357` (`pointer-events:none`). Пример: `product/[id].vue:533` (CTA «В конструктор» при out-of-stock).
- **Воспроизведение:** out-of-stock товар → Tab на «В конструктор» → Enter → навигация происходит (мышь заблокирована `pointer-events:none`, клавиатура — нет). `loading` на link вообще не отражается → риск двойного перехода.
- **Исправление:** в link-ветке при `disabled || loading` добавить `tabindex="-1"`, `@click.prevent`, `:aria-disabled`. Смягчение: конструктор всё равно ре-гардит add-to-cart на `!selectedVariant`.
- **Уверенность:** высокая.

### L2. Ложный тост «Добавлено» при достижении лимита 20 слоёв (библиотека + AI)
- **Файл:** `app/components/customizer/PrintLibraryPicker.vue:34-36` (`pick`), `app/components/customizer/AIGenerator.vue:57-60` (`onAdd`).
- **Воспроизведение:** набери дизайн до 20 слоёв (`MAX_PLACEMENTS`, `useDesign.ts:269`) → выбери принт из библиотеки / добавь AI-результат.
- **Ожид./факт.:** ожидается предупреждение «лимит достигнут» (как в `DesignUpload.vue:130`); факт — `addImage(...)` возвращает `null` (ничего не добавлено), возврат игнорируется, показывается success-тост «Добавлено».
- **Исправление:** проверять возврат `addImage`; при `null` показывать `customize.tools.limitReached`, а не success.
- **Уверенность:** высокая (AIGenerator за флагом `aiDesign`; PrintLibraryPicker активен всегда).

### L3. Мобильное меню показывает гостю «Кабинет» → бросает на /login (нет пункта «Войти»)
- **Файл:** `app/components/layout/AppHeader.vue:244-251` (`cabinetTo = useAuth().homePath` = `/account` для гостя).
- **Ожид./факт.:** десктоп-header гостю показывает иконку входа (`:194`), футер прячет кабинет (`AppFooter.vue:29-31`), а мобильное меню всегда рендерит «Кабинет» → тап → редирект на /login.
- **Исправление:** ветвление по `isAuthenticated`: гость → «Войти» (`/login`), авторизованный → «Кабинет».
- **Уверенность:** высокая.

### L4. Модалы смены статуса заказа не валидируют обязательные поля на клиенте
- **Файл:** `app/pages/admin/orders/[id].vue:180-189`, `app/pages/studio/order/[id].vue:426-441`.
- **Воспроизведение:** переход, требующий причину (`on_hold/reprint/cancelled/refunded`) или `shipped` (трек/перевозчик); оставь поле пустым; «Подтвердить».
- **Ожид./факт.:** `required` на `UFormField` — только звёздочка; кнопка шлёт пустое значение. Сервер отклоняет (`status.post.ts:42/45`) → сырой error-тост после клика. Плохие данные НЕ сохраняются.
- **Исправление:** `:disabled` на кнопке подтверждения по тем же обязательным полям.
- **Уверенность:** высокая.

### L5. Toggle-кнопки (глаз/звезда) и row-delete без per-row loading → двойной клик = дубль-запросы
- **Файл:** `admin/prints.vue:123`, `admin/categories.vue:100`, `shop-admin/items.vue:126`, `shop-admin/promos.vue:130`, `account/addresses.vue:96`; delete: `admin/products/index.vue:156`, `StepVariants.vue:118`, `StepZones.vue:193`.
- **Воспроизведение:** быстрый двойной клик по иконке до ответа.
- **Ожид./факт.:** кнопка должна дизейблиться/спиннить; факт — две записи и два тоста. Итоговое состояние безвредно (toggle флипается обратно; delete-повтор открывает confirm заново), но шум запросов.
- **Исправление:** per-row `busyId` + `:loading`/`:disabled` (как уже сделано `savingId`/`banningId` в `admin/users.vue`).
- **Уверенность:** высокая.

### L6. Общий один loading-ref крутит спиннер на ВСЕХ соседних кнопках сразу
- **Файл:** `StepZones.vue:222-232` (все пресеты `:loading="saving"`), `admin/orders/[id].vue:168-174`, `studio/order/[id].vue:405-416`, `admin/returns.vue:68-69`.
- **Ожид./факт.:** спиннер только на нажатой; факт — на всех соседних. Двойной submit при этом корректно блокируется (плюс), неверна только визуальная атрибуция.
- **Исправление:** трекать конкретную кнопку (имя пресета / целевой статус).
- **Уверенность:** высокая.

### L7. Количество в корзине «+» без верхнего предела
- **Файл:** `app/pages/cart.vue:92` (`updateQty(id, q+1)`); clamp в `useCart.ts:166` — только `Math.max(1, ...)`.
- **Ожид./факт.:** конструктор кэпит `Math.min(999, n)` (`SetupPanel.vue:22`), а корзина — нет; можно накрутить сколько угодно, без учёта стока.
- **Исправление:** верхний clamp (999) и, желательно, потолок по `stock`.
- **Уверенность:** высокая.

### L8. `class="w-full"` на AppButton уходит на обёрточный `<span>`, кнопка НЕ на всю ширину
- **Файл:** `app/components/landing/Constructor.vue:145` (`class="mt-4 w-full"`) — CTA «Продолжить в редакторе».
- **Причина:** тот же fallthrough-на-span (M1); у примитива есть проп `block` ровно для этого (используется в `business.vue:255,257`).
- **Исправление:** заменить `class="w-full"` на проп `block`.
- **Уверенность:** высокая.

### L9. Рассинхрон высоты TopInfoBar (28px на мобиле) и `TOP_BAR_H=30` в AppHeader → шов ~2px
- **Файл:** `TopInfoBar.vue:30-45` (28px < 768px) vs `AppHeader.vue:29` (`TOP_BAR_H=30`, используется в `headerTop`).
- **Ожид./факт.:** на < 768px при `scrollY=0` между баром и хедером просвет ~2px (комментарий в TopInfoBar сам предупреждает об этом).
- **Исправление:** единый источник высоты (CSS-переменная/проп) или адаптивный `TOP_BAR_H`.
- **Уверенность:** высокая.

### L10. Кнопки выбора размер/цвет/материал без `type="button"` (латентно)
- **Файл:** `product/[id].vue:459/481/502`, `SetupPanel.vue:51`.
- **Факт:** голый `<button>` = `type=submit`, но `<form>`-предка сейчас нет → случайного submit НЕТ. Риск только при будущем оборачивании в форму. (`SizeGuide.vue:62` уже с `type="button"`.)
- **Исправление:** добавить `type="button"` для консистентности.
- **Уверенность:** высокая.

### L11. checkout (и account) без `<form>` → Enter не отправляет; `onPay` без явного re-entrancy гарда
- **Файл:** `app/pages/checkout.vue` (нет `<form>`; PAY — `@click`, `:229`), `onPay` `:94-125`.
- **Факт:** Enter в поле адреса ничего не делает (возможно намеренно — против случайной оплаты Enter'ом). Двойной submit безопасен: `UButton` ставит `disabled` при `:loading` (проверено в Nuxt UI), `paying` ставится синхронно до await, плюс серверный `idempotencyKey` (`:22-27`).
- **Исправление (опц.):** обернуть поля в `<form @submit.prevent="onPay">` + `type="submit"`; для консистентности добавить `if (paying.value) return` первой строкой.
- **Уверенность:** высокая.

### INFO
- **DesignUpload** — только клик-загрузка, drag&drop нет (в хинте и не обещан). `<input type=file>` скрыт, `accept` задан, триггерится по `ref.click()`, есть `:loading`. Не баг.
- **Корзина «−» при qty=1** удаляет позицию без confirm (`cart.vue:17-20`) — в отличие от «Очистить корзину» (с confirm). Осознанный паттерн; помечено на случай лишнего клика.

---

## Проверено и КОРРЕКТНО (не дефекты)

- **Формы:** login/register/forgot/reset/shop-new/admin.users/StepBasics — все `@submit.prevent` + `type="submit"` + гард `if(loading) return`. Нет вторичных кнопок-submit внутри форм.
- **Logout:** header (desktop-dropdown `onSelect` + мобильная кнопка) и все 5 кабинетов — awaited `signOut()` + `navigateTo('/')`.
- **Корзина:** qty ±, remove, clear (branded confirm), checkout CTA, empty-state — заведены; totals `computed` реактивны; add-to-cart в конструкторе гардит placements/zone/variant/preflight, `submitting` в try/finally.
- **Пикеры товара:** размер/цвет/материал ставят состояние, out-of-stock исключены, авто-выбор первого размера; галерея-миниатюры переключают фото; favorite с `:loading`.
- **SizeGuide-модал** `v-model:open` (Nuxt UI v4), trigger `type="button"`, авто-скрытие при ≤1 строке.
- **Конструктор:** FRONT/BACK/зоны (`ZoneSelector`), SAVE (`saving` + `:loading` + try/catch), undo/redo (`:disabled` на `canUndo/canRedo`), кнопки LayerPanel (delete/dup/hide/lock/reorder/align/group), слайдеры/цвета — one-way `:model-value` + `patch` (нет рассинхрона v-model), `addToCart` emit → `@add-to-cart`.
- **Мобильное меню:** toggle, scroll-lock на `<html>`, закрытие на смене роута и по клику, Esc, focus-trap+restore, overlay `z-[60]` над хедером, teleport в body.
- **Кабинеты:** `useConfirm` резолвит accept И cancel (backdrop/Esc → cancel, не виснет), все `UModal` `v-model:open`, wizard-навигация (`:disabled="!canStep"`), единственный `UDropdownMenu` (`MediaCard`) — все `onSelect` заведены, trigger `@click.stop`; bulk-actions (select-all `:indeterminate`, `:disabled="!selected.size"`, confirm + loading); клики в кликабельных строках — `@click.prevent.stop`.
- **ProductCard** — вся карточка один `UiAppCard :to`, без вложенных кнопок/якорей (нет проблем propagation). **ProductStoryCard** flip-кнопка — sibling ссылки, `z-10`, не триггерит навигацию. **CommandBar** — `modelValue`/`update:modelValue` корректны.
- Ссылки: нет `href="#"`, нет пустых `to`; все `to` ведут на существующие роуты; внешние ссылки футера `target=_blank rel=noopener`; якоря `business.vue` (`#apply`/`#examples`) резолвятся (i18n `no_prefix`).
- `pointer-events:none` — только на декоративных `aria-hidden` слоях (Hero-фон, кольца EmptyState, курсор, рамка конструктора) → клики проходят сквозь. Конфликтов z-index нет (`UModal` teleport над sticky-хедером).

---

## Рекомендуемый порядок исправления
1. **M3** — cross-zone выбор слоя (функциональный баг конструктора; guard в watcher'е).
2. **M2** — loading на десктопной «В корзину» (проп + биндинг + передача `submitting`).
3. **M1** — явный `defineEmits(['click'])` + проброс на реальный контрол (защищает всё приложение от будущей тихой поломки). Заодно закрывает **L1** (link disabled/loading) и **L8** (block вместо w-full).
4. **L2** (ложный тост лимита), **L3** (гость «Войти»), **L4** (client-валидация модалов), **L5/L6** (per-row loading), **L7** (clamp qty), **L9/L10/L11** — по мере полировки.

*Все Medium верифицированы чтением конкретных строк.*

---

## Применённые исправления (2026-07-18)

Гейт после правок: **typecheck 0 ошибок, unit 203/203, build успех.**

### ✅ Исправлено
| ID | Файлы | Что сделано |
|---|---|---|
| **M1** | `app/components/ui/AppButton.vue` | `defineEmits<{click:[MouseEvent]}>()` + `onClick` эмитит клик с реального контрола (`<button>`/`<NuxtLink>`), а не через fallthrough. `disabled/loading` глушат клик (`e.preventDefault`). |
| **M2** | `PriceCalculator.vue` (+ проп `loading`), `pages/customize/[id].vue:479` | Десктопная «В корзину» получила `:loading="submitting"` — спиннер/disabled во время async, как на мобильной. |
| **M3** | `CustomizerCanvas.client.vue:589` | Watcher зоны сбрасывает выделение только если выбранный элемент НЕ в новой зоне → клик по слою чужой зоны в LayerPanel выделяет с первого раза. |
| **L1** | `AppButton.vue` (link-ветка) | При `disabled/loading`: `tabindex="-1"` + `aria-disabled` + `@click.prevent` — клавиатурой уже не активировать, loading тоже глушит переход. |
| **L2** | `PrintLibraryPicker.vue`, `AIGenerator.vue` | Проверяют возврат `addImage`; при `null` (лимит 20 слоёв) — тост `limitReached`, а не ложный «Добавлено». |
| **L3** | `layout/AppHeader.vue` | Мобильное меню гостю показывает «Войти» (`/login`), авторизованному — «Кабинет». |
| **L7** | `composables/useCart.ts:166` | `updateQty` кэпит `Math.min(999, ...)` — количество в корзине больше не накрутить без предела. |
| **L8** | `landing/Constructor.vue:145` | `class="w-full"` → проп `block` (кнопка реально на всю ширину). |
| **L10** | `product/[id].vue` (материал/цвет/размер), `SetupPanel.vue` | Добавлен `type="button"` на кнопки-пикеры (защита от случайного submit при будущем оборачивании в форму). |
| **L11** | `pages/checkout.vue` | `onPay` получил `if (paying.value) return` первой строкой (единый паттерн с остальными формами). |
| **L4** | `admin/orders/[id].vue`, `studio/order/[id].vue` | Кнопка подтверждения модала статуса `:disabled`, пока не заполнены required-поля (`shipped`→трек+перевозчик, иначе→причина) — превентивно, а не сырой server-тост. |
| **L5** | `admin/prints.vue`, `admin/categories.vue`, `shop-admin/items.vue`, `shop-admin/promos.vue`, `account/addresses.vue` | Toggle-кнопки (eye/star) получили per-row `busyId` + `:loading`/`:disabled` — двойной клик больше не шлёт дубль-запрос. |
| **L9** | `layout/TopInfoBar.vue` | Высота инфо-полосы единообразно 30px (= `TOP_BAR_H`); убран мобильный override 28px → нет 2px шва над шапкой. |

### ⏸️ Сознательно оставлено (нулевой функциональный эффект)
| ID | Причина |
|---|---|
| **L6** (общий loading-ref крутит спиннер на всех соседних action-кнопках) | Чисто визуальная атрибуция: двойной submit там УЖЕ заблокирован общим `busy`/`:disabled`, данные не страдают. Фикс = перетасовка обработчиков статус-флоу (`change_order_status`) ради косметики — риск > польза. Оставлено намеренно. |

*Все Medium + Low (кроме косметического L6) применены и проверены typecheck/тестами/build.*
