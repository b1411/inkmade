// Единый диалог подтверждения/ввода вместо нативных window.confirm()/prompt() —
// брендовый, i18n и тестируемый. Глобальный <UiConfirmDialog> (в app.vue) отражает
// состояние и резолвит промис.
//   const ok  = await useConfirm().confirm({ title, tone: 'danger' })       // → boolean
//   const txt = await useConfirm().prompt({ title, placeholder, required }) // → string | null

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
}

export interface PromptOptions extends ConfirmOptions {
  placeholder?: string
  initial?: string
  required?: boolean // при true confirm недоступен, пока ввод пустой
  multiline?: boolean
}

export interface DialogState extends PromptOptions {
  open: boolean
  mode: 'confirm' | 'prompt'
  input: string
}

// module-singleton resolver: трогается ТОЛЬКО на клиенте (по клику юзера),
// поэтому кросс-запросной утечки на SSR нет (диалог рендерится закрытым).
let resolver: ((value: boolean | string | null) => void) | null = null

export const useConfirmState = () =>
  useState<DialogState>('ui_confirm', () => ({ open: false, mode: 'confirm', title: '', tone: 'default', input: '' }))

export function useConfirm() {
  const state = useConfirmState()

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    resolver?.(false) // незакрытый предыдущий диалог — отмена
    state.value = { ...opts, mode: 'confirm', tone: opts.tone ?? 'default', input: '', open: true }
    return new Promise<boolean>((resolve) => { resolver = resolve as (v: boolean | string | null) => void })
  }

  function prompt(opts: PromptOptions): Promise<string | null> {
    resolver?.(null)
    state.value = { ...opts, mode: 'prompt', tone: opts.tone ?? 'default', input: opts.initial ?? '', open: true }
    return new Promise<string | null>((resolve) => { resolver = resolve as (v: boolean | string | null) => void })
  }

  // вызываются диалогом
  function accept() {
    const s = state.value
    const result: boolean | string = s.mode === 'prompt' ? s.input : true
    state.value = { ...s, open: false }
    resolver?.(result)
    resolver = null
  }
  function cancel() {
    const s = state.value
    const result: boolean | null = s.mode === 'prompt' ? null : false
    state.value = { ...s, open: false }
    resolver?.(result)
    resolver = null
  }

  return { confirm, prompt, accept, cancel, state }
}
