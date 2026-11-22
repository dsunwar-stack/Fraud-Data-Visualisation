// SLDS 2 building blocks, using SLDS 2 markup and classes, plus the agentic patterns
// from the SLDS 2 Agentic Experiences library (agentic card, human feedback).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

// ---------- Icons (inline SVG, sized like SLDS utility icons) ----------
const paths = {
  sparkle: 'M12 2.5c.4 3.9 1.6 6.2 3.4 7.6 1.4 1.1 3.4 1.7 6.1 1.9-2.7.2-4.7.8-6.1 1.9-1.8 1.4-3 3.7-3.4 7.6-.4-3.9-1.6-6.2-3.4-7.6C7.2 12.8 5.2 12.2 2.5 12c2.7-.2 4.7-.8 6.1-1.9C10.4 8.7 11.6 6.4 12 2.5Z',
  like: 'M7 10v10H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3Zm2 0 3.6-6.3a1.6 1.6 0 0 1 2.9 1.1L14.9 9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H9V10Z',
  dislike: 'M17 14V4h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-3Zm-2 0-3.6 6.3a1.6 1.6 0 0 1-2.9-1.1L9.1 15H5a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 6.2 4H15v10Z',
  copy: 'M8 8V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h3Zm2 0h4a2 2 0 0 1 2 2v4h3V5h-9v3Zm-5 2v9h9v-9H5Z',
  check: 'M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z',
  close: 'M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7l-1.4-1.4L9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z',
  error: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z',
}
export type IconName = keyof typeof paths

export function Icon({ name, size = 16, className = '', title }: { name: IconName; size?: number; className?: string; title?: string }) {
  return (
    <svg className={`fs-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
      {title && <title>{title}</title>}
      <path d={paths[name]} fill="currentColor" />
    </svg>
  )
}

// ---------- Toggle (SLDS checkbox toggle) ----------
export function Toggle({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="slds-form-element fs-toggle">
      <label className="slds-checkbox_toggle slds-grid" htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="slds-checkbox_faux_container" aria-hidden="true"><span className="slds-checkbox_faux" /></span>
        <span className="slds-form-element__label">{label}</span>
      </label>
    </div>
  )
}

// ---------- Toast (SLDS notify toast) ----------
type Toast = { id: number; kind: 'success' | 'error'; text: string }
const ToastCtx = createContext<(kind: Toast['kind'], text: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)
  const push = useCallback((kind: Toast['kind'], text: string) => {
    const id = ++seq.current
    setToasts(t => [...t, { id, kind, text }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="slds-notify_container fs-toasts" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`slds-notify slds-notify_toast slds-theme_${t.kind}`} role="status">
            <span className="slds-icon_container fs-toast-icon"><Icon name={t.kind === 'success' ? 'check' : 'error'} size={20} /></span>
            <div className="slds-notify__content"><h2 className="slds-text-heading_small">{t.text}</h2></div>
            <button className="slds-button slds-button_icon slds-notify__close fs-toast-close" title="Close" onClick={() => setToasts(x => x.filter(y => y.id !== t.id))}>
              <Icon name="close" size={16} /><span className="slds-assistive-text">Close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

// ---------- Agentic card: aurora border and a cursor-driven aurora glow ----------
export function AgenticCard({ children, className = '', as: Tag = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' }) {
  const ref = useRef<HTMLElement>(null)
  const onMove = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    ref.current!.style.setProperty('--mx', `${e.clientX - r.left}px`)
    ref.current!.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return <Tag ref={ref as never} className={`card agentic ${className}`} onPointerMove={onMove}>{children}</Tag>
}

export function AgenticIcon({ size = 28 }: { size?: number }) {
  return <span className="fs-agentic-icon" style={{ width: size, height: size }}><Icon name="sparkle" size={Math.round(size * 0.62)} /></span>
}

// ---------- Human feedback (SLDS 2 agentic pattern) ----------
const REASONS = ['Inaccurate', 'Incomplete', 'Biased, toxic, or harmful', 'Inappropriate tone or style', 'Other']

export function FeedbackGroup({ copyText, onRated }: { copyText: string; onRated?: (rating: 'up' | 'down', detail?: string) => void }) {
  const toast = useToast()
  const [rating, setRating] = useState<null | 'up' | 'down'>(null)
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [more, setMore] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', k)
    boxRef.current?.querySelector<HTMLInputElement>('input')?.focus()
    return () => document.removeEventListener('keydown', k)
  }, [open])

  const up = () => {
    if (rating === 'up') { setRating(null); return }
    setRating('up'); setOpen(false); onRated?.('up'); toast('success', 'Thanks for your feedback.')
  }
  const down = () => { if (rating === 'down') { setRating(null); return } setOpen(o => !o) }
  const submit = () => {
    setRating('down'); setOpen(false)
    onRated?.('down', [...picked].join(', ') + (more.trim() ? ` · ${more.trim()}` : ''))
    toast('success', 'Thanks for your feedback.')
    setPicked(new Set()); setMore('')
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(copyText); toast('success', 'Copied to clipboard.') }
    catch { toast('error', "Couldn't copy. Select the text and copy it instead.") }
  }

  return (
    <div className="fs-feedback">
      <div className="slds-button-group" role="group" aria-label="Rate this AI response">
        <IconBtn label={rating === 'up' ? 'Helpful response selected' : 'Helpful response'} pressed={rating === 'up'} onClick={up} icon="like" />
        <IconBtn label={rating === 'down' ? 'Not a helpful response selected' : 'Not a helpful response'} pressed={rating === 'down' || open} onClick={down} icon="dislike" expanded={open} />
        <IconBtn label="Copy" onClick={copy} icon="copy" />
      </div>
      {open && (
        <div ref={boxRef} className="slds-popover fs-feedback-pop" role="dialog" aria-label="Why wasn't it helpful?">
          <div className="fs-pop-head">
            <b>Why wasn't it helpful?</b>
            <button className="slds-button slds-button_icon" title="Close" onClick={() => setOpen(false)}><Icon name="close" size={14} /><span className="slds-assistive-text">Close</span></button>
          </div>
          <fieldset className="fs-reasons">
            <legend className="slds-assistive-text">Reasons</legend>
            {REASONS.map((r, i) => (
              <div key={r} className="slds-checkbox">
                <input type="checkbox" id={`fb-r${i}`} checked={picked.has(r)} onChange={() => setPicked(s => { const n = new Set(s); if (n.has(r)) n.delete(r); else n.add(r); return n })} />
                <label className="slds-checkbox__label" htmlFor={`fb-r${i}`}><span className="slds-checkbox_faux" /><span className="slds-form-element__label">{r}</span></label>
              </div>
            ))}
          </fieldset>
          <label className="slds-form-element__label" htmlFor="fb-more">Tell us more</label>
          <textarea id="fb-more" className="slds-textarea" rows={3} placeholder="Give feedback…" value={more} onChange={e => setMore(e.target.value)} />
          <div className="fs-pop-foot">
            <button className="slds-button slds-button_neutral" onClick={() => setOpen(false)}>Cancel</button>
            <button className="slds-button slds-button_brand" onClick={submit} disabled={!picked.size && !more.trim()}>Submit</button>
          </div>
        </div>
      )}
    </div>
  )
}

function IconBtn({ label, icon, onClick, pressed, expanded }: { label: string; icon: IconName; onClick: () => void; pressed?: boolean; expanded?: boolean }) {
  return (
    <button className={`slds-button slds-button_icon slds-button_icon-border-filled fs-icon-btn ${pressed ? 'slds-is-selected' : ''}`}
      title={label} aria-pressed={icon === 'copy' ? undefined : !!pressed} aria-expanded={expanded} onClick={onClick}>
      <Icon name={icon} size={14} />
      <span className="slds-assistive-text">{label}</span>
    </button>
  )
}
