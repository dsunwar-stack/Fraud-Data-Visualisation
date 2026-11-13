import { useEffect, useState } from 'react'
import { CASES, NOW, fmtDateTime } from './data'
import { Overview } from './views/Overview'
import { Queue } from './views/Queue'
import { CaseView } from './views/CaseView'

type Route = { view: 'overview' } | { view: 'queue' } | { view: 'case'; id: string }

const parse = (h: string): Route => {
  const s = h.replace(/^#/, '')
  if (s.startsWith('case-')) return { view: 'case', id: s.slice(5) }
  if (s === 'queue') return { view: 'queue' }
  return { view: 'overview' }
}

type Theme = 'light' | 'dark' | 'system'

export default function App() {
  const [route, setRoute] = useState<Route>(() => parse(location.hash))
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (localStorage.getItem('theme') as Theme) || 'system' } catch { return 'system' }
  })

  useEffect(() => {
    const on = () => { setRoute(parse(location.hash)); window.scrollTo(0, 0) }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', theme)
    try { localStorage.setItem('theme', theme) } catch { /* storage unavailable */ }
  }, [theme])

  const go = (h: string) => { location.hash = h }
  const open = CASES.filter(c => c.status !== 'Decided')
  const lastCase = route.view === 'case' ? route.id : null

  return (
    <div className="shell">
      <aside className="nav">
        <div className="brand">
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--primary)" /><path d="M6 20h4l3-9 4 13 3-8 2 4h4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>Fraud Signal</span>
        </div>
        <nav aria-label="Main">
          <a href="#overview" className={route.view === 'overview' ? 'active' : ''}>
            <Icon d="M3 13h4V7H3zm5 0h4V3H8zm5 0h4V10h-4z" />Overview
          </a>
          <a href="#queue" className={route.view === 'queue' ? 'active' : ''}>
            <Icon d="M3 4h14M3 9h14M3 14h9" stroke />Case queue<span className="count num">{open.length}</span>
          </a>
          {lastCase && (
            <a href={`#case-${lastCase}`} className="active sub">
              <Icon d="M5 3h7l3 3v11H5z" stroke /><span className="mono">{lastCase}</span>
            </a>
          )}
        </nav>
        <div className="nav-foot">
          <div className="theme" role="group" aria-label="Theme">
            {(['light', 'system', 'dark'] as Theme[]).map(t => (
              <button key={t} aria-pressed={theme === t} onClick={() => setTheme(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
            ))}
          </div>
          <p className="muted small">Synthetic demo data.<br />No real customers or cases.</p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="page-title">{route.view === 'overview' ? 'Fraud overview' : route.view === 'queue' ? 'Case queue' : 'Case investigation'}</h1>
          </div>
          <div className="topbar-r">
            <span className="live"><i />Live · updated {fmtDateTime(NOW)} UTC</span>
          </div>
        </header>
        {route.view === 'overview' && <Overview onOpen={id => go(`case-${id}`)} />}
        {route.view === 'queue' && <Queue onOpen={id => go(`case-${id}`)} />}
        {route.view === 'case' && <CaseView id={route.id} onBack={() => go('queue')} />}
      </main>
    </div>
  )
}

function Icon({ d, stroke }: { d: string; stroke?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <path d={d} fill={stroke ? 'none' : 'currentColor'} stroke={stroke ? 'currentColor' : 'none'} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
