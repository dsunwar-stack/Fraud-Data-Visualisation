import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

// An ⓘ button with help text. Opens on hover or keyboard focus, and toggles on click or tap
// (so it works on touch screens). Escape or a click elsewhere closes it.
export function InfoTip({ label, children, align = 'start' }: { label: string; children: ReactNode; align?: 'start' | 'end' }) {
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const id = useId()
  const popRef = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<CSSProperties>({ visibility: 'hidden' })

  // Place the popup next to the icon but always inside the viewport, flipping above when there's no room below.
  useLayoutEffect(() => {
    if (!open || !ref.current || !popRef.current) return
    const a = ref.current.getBoundingClientRect()
    const pw = popRef.current.offsetWidth, ph = popRef.current.offsetHeight
    const vw = window.innerWidth, vh = window.innerHeight, m = 8
    const left = Math.min(Math.max(m, align === 'end' ? a.right - pw + 8 : a.left - 8), vw - pw - m)
    const below = a.bottom + 6
    const top = below + ph > vh - m && a.top - ph - 6 > m ? a.top - ph - 6 : below
    setPos({ left, top })
  }, [open, align])

  useEffect(() => {
    if (!open) { setPos({ visibility: 'hidden' }); return }
    const onDoc = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setPinned(false) } }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setPinned(false) } }
    const onScroll = () => { setOpen(false); setPinned(false) }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('pointerdown', onDoc); document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onScroll)
    }
  }, [open])

  return (
    <span ref={ref} className="infotip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => { if (!pinned) setOpen(false) }}>
      <button type="button" className="infotip-btn" aria-label={`What is ${label}?`} aria-describedby={open ? id : undefined} aria-expanded={open}
        onFocus={() => setOpen(true)}
        onBlur={() => { if (!pinned) setOpen(false) }}
        onClick={e => { e.stopPropagation(); const next = !pinned; setPinned(next); setOpen(next) }}>
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 7.2v4.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="4.8" r="0.95" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <span role="tooltip" id={id} ref={popRef} className="infotip-pop" style={pos}>
          <b>{label}</b>
          {children}
        </span>
      )}
    </span>
  )
}
