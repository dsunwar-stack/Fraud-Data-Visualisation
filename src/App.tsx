import { useEffect, useState } from 'react'
import { CASES } from './data'
import { Overview } from './views/Overview'
import { Queue } from './views/Queue'
import { CaseView } from './views/CaseView'
import { DEFAULT_FILTERS, type Filters } from './components/Filters'
import { RadioButtonGroup, ToastProvider } from './components/slds'
import { VariantProvider, useVariant } from './variant'

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
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
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
    <VariantProvider>
    <ToastProvider>
    <div className="shell">
      <aside className="nav">
        <div className="brand">
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--primary)" /><path d="M6 20h4l3-9 4 13 3-8 2 4h4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>Fraud Signal</span>
        </div>
        <nav className="slds-nav-vertical fs-nav" aria-label="Main">
          <div className="slds-nav-vertical__section">
            <h2 className="slds-nav-vertical__title">Fraud</h2>
            <ul>
              <li className={`slds-nav-vertical__item ${route.view === 'overview' ? 'slds-is-active' : ''}`}>
                <a href="#overview" className="slds-nav-vertical__action" aria-current={route.view === 'overview' ? 'page' : undefined}>
                  <Icon d="M3 13h4V7H3zm5 0h4V3H8zm5 0h4V10h-4z" />Overview
                </a>
              </li>
              <li className={`slds-nav-vertical__item ${route.view === 'queue' ? 'slds-is-active' : ''}`}>
                <a href="#queue" className="slds-nav-vertical__action" aria-current={route.view === 'queue' ? 'page' : undefined}>
                  <Icon d="M3 4h14M3 9h14M3 14h9" stroke />Case queue
                  <span className="slds-badge slds-col_bump-left fs-count">{open.length}</span>
                </a>
              </li>
            </ul>
          </div>
          {lastCase && (
            <div className="slds-nav-vertical__section">
              <h2 className="slds-nav-vertical__title">Open case</h2>
              <ul>
                <li className="slds-nav-vertical__item slds-is-active">
                  <a href={`#case-${lastCase}`} className="slds-nav-vertical__action" aria-current="page">
                    <Icon d="M5 3h7l3 3v11H5z" stroke /><span className="mono">{lastCase}</span>
                  </a>
                </li>
              </ul>
            </div>
          )}
        </nav>
        <div className="nav-foot">
          <LayoutSwitch />
          <RadioButtonGroup name="theme" legend="Theme" size="small" value={theme} onChange={setTheme}
            options={(['light', 'system', 'dark'] as Theme[]).map(t => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }))} />
          <p className="muted small">Synthetic demo data.<br />No real customers or cases.</p>
        </div>
      </aside>

      <main className="main">
        {route.view === 'overview' && <Overview onOpen={id => go(`case-${id}`)} filters={filters} setFilters={setFilters} />}
        {route.view === 'queue' && <Queue onOpen={id => go(`case-${id}`)} filters={filters} setFilters={setFilters} />}
        {route.view === 'case' && <CaseView id={route.id} onBack={() => go('queue')} />}
      </main>
    </div>
    </ToastProvider>
    </VariantProvider>
  )
}

function LayoutSwitch() {
  const { variant, setVariant } = useVariant()
  return (
    <div className="fs-layout-switch">
      <span className="kpi-label">Layout</span>
      <RadioButtonGroup name="layout" legend="Layout version" size="small" value={variant} onChange={setVariant}
        options={[{ value: 'A' as const, label: 'A · Current' }, { value: 'B' as const, label: 'B · Integrated' }]} />
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
