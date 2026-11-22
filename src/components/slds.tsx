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
  return <Tag ref={ref as never} className={`slds-card card agentic ${className}`} onPointerMove={onMove}>{children}</Tag>
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

// ---------- Object icon tile (as in SLDS page and card headers) ----------
const objectPaths = {
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm8 0h8v-9h-8v9Zm0-16v5h8V4h-8Z',
  list: 'M4 6h2v2H4V6Zm4 0h12v2H8V6Zm-4 5h2v2H4v-2Zm4 0h12v2H8v-2Zm-4 5h2v2H4v-2Zm4 0h12v2H8v-2Z',
  case: 'M9 4h6a2 2 0 0 1 2 2v1h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h3V6a2 2 0 0 1 2-2Zm0 3h6V6H9v1Zm-4 3v8h14v-8H5Z',
  shield: 'M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1 14-4-4 1.4-1.4 2.6 2.6 5.6-5.6L18 9l-7 7Z',
}
export type ObjectIconName = keyof typeof objectPaths
export function ObjectIcon({ name, tone = 'brand', size = 32 }: { name: ObjectIconName; tone?: 'brand' | 'case' | 'shield'; size?: number }) {
  return (
    <span className={`fs-object-icon tone-${tone}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24"><path d={objectPaths[name]} fill="currentColor" /></svg>
    </span>
  )
}

// ---------- Page header (SLDS page header) ----------
export function PageHeader({ icon, tone, label, title, meta, actions, details, breadcrumb }: {
  icon: ObjectIconName; tone?: 'brand' | 'case' | 'shield'; label: string; title: ReactNode; meta?: ReactNode; actions?: ReactNode
  details?: { label: string; value: ReactNode }[]; breadcrumb?: ReactNode
}) {
  return (
    <div className="slds-page-header fs-page-header">
      {breadcrumb}
      <div className="slds-page-header__row">
        <div className="slds-page-header__col-title">
          <div className="slds-media">
            <div className="slds-media__figure"><ObjectIcon name={icon} tone={tone} /></div>
            <div className="slds-media__body">
              <div className="slds-page-header__name">
                <div className="slds-page-header__name-title">
                  <span className="fs-object-label">{label}</span>
                  <h1 className="slds-page-header__title">{title}</h1>
                </div>
              </div>
            </div>
          </div>
        </div>
        {actions && <div className="slds-page-header__col-actions"><div className="slds-page-header__controls">{actions}</div></div>}
      </div>
      {meta && <div className="slds-page-header__row"><div className="slds-page-header__col-meta"><p className="slds-page-header__meta-text">{meta}</p></div></div>}
      {details && (
        <div className="slds-page-header__row slds-page-header__row_gutters">
          <div className="slds-page-header__col-details">
            <ul className="slds-page-header__detail-row">
              {details.map(d => (
                <li key={d.label} className="slds-page-header__detail-block">
                  <div className="slds-text-title fs-detail-label">{d.label}</div>
                  <div className="fs-detail-value">{d.value}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- Radio button group (single choice) ----------
export function RadioButtonGroup<T extends string | number>({ name, legend, options, value, onChange, size }: {
  name: string; legend: string; options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; size?: 'small'
}) {
  return (
    <fieldset className={`slds-form-element fs-rbg ${size === 'small' ? 'fs-rbg-small' : ''}`}>
      <legend className="slds-assistive-text">{legend}</legend>
      <div className="slds-form-element__control">
        <div className="slds-radio_button-group">
          {options.map(o => {
            const id = `${name}-${o.value}`
            return (
              <span key={String(o.value)} className="slds-button slds-radio_button">
                <input type="radio" name={name} id={id} value={String(o.value)} checked={value === o.value} onChange={() => onChange(o.value)} />
                <label className="slds-radio_button__label" htmlFor={id}><span className="slds-radio_faux">{o.label}</span></label>
              </span>
            )
          })}
        </div>
      </div>
    </fieldset>
  )
}

// ---------- Checkbox button group (multiple choice) ----------
export function CheckboxButtonGroup<T extends string>({ name, legend, options, selected, onToggle }: {
  name: string; legend: string; options: { value: T; label: ReactNode }[]; selected: Set<T>; onToggle: (v: T) => void
}) {
  return (
    <fieldset className="slds-form-element fs-cbg">
      <legend className="slds-assistive-text">{legend}</legend>
      <div className="slds-form-element__control">
        <div className="slds-checkbox_button-group">
          {options.map(o => {
            const id = `${name}-${o.value}`
            return (
              <span key={o.value} className="slds-button slds-checkbox_button">
                <input type="checkbox" id={id} name={name} checked={selected.has(o.value)} onChange={() => onToggle(o.value)} />
                <label className="slds-checkbox_button__label" htmlFor={id}><span className="slds-checkbox_faux">{o.label}</span></label>
              </span>
            )
          })}
        </div>
      </div>
    </fieldset>
  )
}

// ---------- Progress bar (SLDS progress bar, used as a meter) ----------
export function ProgressBar({ value, color, label, size = 'small' }: { value: number; color?: string; label: string; size?: 'x-small' | 'small' | 'medium' }) {
  return (
    <div className={`slds-progress-bar slds-progress-bar_${size} fs-progress`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} aria-label={label}>
      <span className="slds-progress-bar__value" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  )
}

// ---------- Breadcrumb ----------
export function Breadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <nav role="navigation" aria-label="Breadcrumbs" className="fs-breadcrumb">
      <ol className="slds-breadcrumb slds-list_horizontal slds-wrap">
        {items.map((it, i) => (
          <li key={i} className="slds-breadcrumb__item">
            {i > 0 && <span className="fs-crumb-sep" aria-hidden="true">›</span>}
            {it.onClick ? <button className="slds-button" onClick={it.onClick}>{it.label}</button> : <span aria-current="page">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}

// ---------- Activity timeline (SLDS timeline items) ----------
export type TimelineKind = 'task' | 'event' | 'email' | 'call'
export function ActivityTimeline({ items }: { items: { time: string; title: string; detail: string; kind: TimelineKind; isNew?: boolean; extra?: ReactNode }[] }) {
  const glyph: Record<TimelineKind, string> = {
    task: 'M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z',
    event: 'M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm-2 7h14v10H5V9Z',
    email: 'M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm1 2.4V17h16V7.4l-8 5-8-5ZM5.4 7l6.6 4.1L18.6 7H5.4Z',
    call: 'M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1l-2.2 2.2Z',
  }
  return (
    <ul className="fs-timeline">
      {items.map((it, i) => (
        <li key={i} className={it.isNew ? 'is-new' : ''}>
          <div className={`slds-timeline__item_expandable slds-timeline__item_${it.kind} fs-timeline-item`}>
            <div className="slds-media">
              <div className="slds-media__figure">
                <span className={`slds-icon_container slds-timeline__icon fs-tl-icon kind-${it.kind}`} title={it.kind}>
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d={glyph[it.kind]} fill="currentColor" /></svg>
                </span>
              </div>
              <div className="slds-media__body">
                <div className="fs-tl-row">
                  <h3 className="fs-tl-title" title={it.title}>{it.title}</h3>
                  <p className="slds-timeline__date">{it.time}</p>
                </div>
                <p className="fs-tl-detail">{it.detail}</p>
                {it.extra}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

// ---------- Scoped notification (SLDS 2) ----------
// Advisory status bar scoped to its container. Not dismissible. Utility icon + message + optional link.
export type NotificationVariant = 'default' | 'info' | 'warning' | 'error' | 'success'
const notifIcons: Record<NotificationVariant, { d: string; label: string }> = {
  default: { label: 'Note', d: 'M11 21h-1l1-7H7.5c-.6 0-.9-.6-.6-1.1L13 3h1l-1 7h3.5c.6 0 .9.6.6 1.1L11 21Z' },
  info: { label: 'Information', d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z' },
  warning: { label: 'Warning', d: 'M12 2.5 1.5 21h21L12 2.5ZM13 18h-2v-2h2v2Zm0-4h-2V9h2v5Z' },
  error: { label: 'Error', d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 0 1 6.3 12.9L7.1 5.7A8 8 0 0 1 12 4Zm0 16a8 8 0 0 1-6.3-12.9l11.2 11.2A8 8 0 0 1 12 20Z' },
  success: { label: 'Success', d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.4 14.2-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7Z' },
}
export function ScopedNotification({ variant = 'default', children, link }: {
  variant?: NotificationVariant; children: ReactNode; link?: { label: string; onClick: () => void }
}) {
  const icon = notifIcons[variant]
  const theme = variant === 'default' ? 'slds-scoped-notification_light' : `slds-theme_${variant}`
  return (
    <div className={`slds-scoped-notification slds-media slds-media_center ${theme} fs-scoped`} role="status">
      <div className="slds-media__figure">
        <span className="slds-icon_container" title={icon.label}>
          <svg className="slds-icon slds-icon_x-small fs-scoped-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={icon.d} fillRule="evenodd" /></svg>
          <span className="slds-assistive-text">{icon.label}</span>
        </span>
      </div>
      <div className="slds-media__body">
        <p>{children}{link && <> <button type="button" className="fs-scoped-link" onClick={link.onClick}>{link.label}</button></>}</p>
      </div>
    </div>
  )
}
