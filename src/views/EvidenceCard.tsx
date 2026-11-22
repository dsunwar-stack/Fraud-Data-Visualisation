// Version B: one Evidence card that brings every platform's data together, grouped by the
// question the specialist is asking rather than by source system.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NOW, sourceName, sourceShort, type FraudCase, type SourceId } from '../data'
import { SECTIONS, customerActivity, unusualCount, type EvidenceSection, type MetricRow } from '../activity'
import { InfoTip } from '../components/InfoTip'
import { RadioButtonGroup, ScopedNotification, Toggle } from '../components/slds'

type Period = 'd7' | 'd30'

const gbp = (n: number) => '£' + Math.round(n).toLocaleString('en-GB')
const fmt = (r: MetricRow, v: number) => r.unit === 'gbp' ? gbp(v) : (Math.round(v * 10) / 10).toLocaleString('en-GB')
const ago = (d: Date) => { const days = Math.round((NOW.getTime() - d.getTime()) / 86_400_000); return days <= 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago` }
const date = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function EvidenceCard({ c, degraded, openRequest }: { c: FraudCase; degraded: SourceId[]; openRequest?: { section: EvidenceSection; n: number } }) {
  const a = customerActivity(c)
  const [period, setPeriod] = useState<Period>('d7')
  const [unusualOnly, setUnusualOnly] = useState(false)
  const [open, setOpen] = useState<Set<EvidenceSection>>(new Set([a.defaultSection]))
  const refs = useRef<Partial<Record<EvidenceSection, HTMLElement | null>>>({})

  // Open and scroll to a section when a finding asks for it (Examine).
  useEffect(() => {
    if (!openRequest) return
    setOpen(s => new Set(s).add(openRequest.section))
    requestAnimationFrame(() => refs.current[openRequest.section]?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [openRequest])

  const identityRows = [
    ...c.signals.identity.map(s => ({ ...s, source: 'identity' as SourceId })),
    ...c.signals.consortium.map(s => ({ ...s, source: 'consortium' as SourceId })),
    ...c.signals.contact.filter(s => /first seen|ported/i.test(s.key)).map(s => ({ ...s, source: 'contact' as SourceId })),
  ]
  const identityFlags = identityRows.filter(r => r.flag).length
  const toggle = (s: EvidenceSection) => setOpen(o => { const n = new Set(o); if (n.has(s)) n.delete(s); else n.add(s); return n })
  const periodLabel = period === 'd7' ? 'Last 7 days' : 'Last 30 days (weekly avg)'

  const metricTable = (rows: MetricRow[]) => {
    const shown = rows.filter(r => !unusualOnly || r.unusual)
    if (!shown.length) return <p className="muted small">Nothing unusual here.</p>
    return (
      <div className="table-wrap">
        <table className="slds-table slds-table_cell-buffer slds-table_bordered data fs-ev-table">
          <thead><tr><th>Measure</th><th className="r">{periodLabel}</th><th className="r">Usual (weekly)</th><th className="r">Change</th><th>Source</th></tr></thead>
          <tbody>
            {shown.map(r => {
              const v = r[period], diff = r.usual === null ? null : v - r.usual
              return (
                <tr key={r.key} className={r.unusual ? 'is-unusual' : ''}>
                  <td><span className="fs-ev-label">{r.label}<InfoTip label={r.label}><span>{r.help}</span></InfoTip></span>{r.unusual && <span className="slds-badge pill pill-high fs-ev-flag">Unusual</span>}</td>
                  <td className="r num">{fmt(r, v)}</td>
                  <td className="r num muted">{r.usual === null ? '—' : fmt(r, r.usual)}</td>
                  <td className={`r num ${r.unusual ? 'bad' : ''}`}>{diff === null ? '—' : `${diff > 0 ? '+' : diff < 0 ? '−' : ''}${fmt(r, Math.abs(diff))}`}</td>
                  <td><span className="slds-badge tag src">{sourceShort(r.source)}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const body: Record<EvidenceSection, ReactNode> = {
    money: (
      <>
        {metricTable(a.money)}
        <h4 className="fs-ev-sub">Payees paid in the last 7 days</h4>
        <div className="table-wrap">
          <table className="slds-table slds-table_cell-buffer slds-table_bordered data fs-ev-table">
            <thead><tr><th>Payee</th><th>Added</th><th className="r">Payments</th><th className="r">Total</th></tr></thead>
            <tbody>
              {a.payees.filter(p => !unusualOnly || p.unusual).map(p => (
                <tr key={p.name} className={p.unusual ? 'is-unusual' : ''}>
                  <td>{p.name}{p.isNew && <span className="slds-badge pill pill-high fs-ev-flag">New payee</span>}</td>
                  <td className="num">{date(p.added)} <span className="muted">· {ago(p.added)}</span></td>
                  <td className="r num">{p.payments}</td>
                  <td className={`r num ${p.unusual ? 'bad' : ''}`}>{gbp(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h4 className="fs-ev-sub">Top spending in the last 7 days</h4>
        <ul className="fs-ev-merchants">
          {a.merchants.filter(m => !unusualOnly || m.unusual).map(m => (
            <li key={m.label} className={m.unusual ? 'is-unusual' : ''}><span>{m.label}{m.unusual && <span className="slds-badge pill pill-high fs-ev-flag">Out of character</span>}</span><span className="num">{gbp(m.total)}</span></li>
          ))}
        </ul>
      </>
    ),
    behaviour: (
      <>
        {metricTable(a.behaviour)}
        {(!unusualOnly || a.device.newDevice) && (
          <p className="fs-ev-device small"><b>Current device:</b> {a.device.current} · first seen {ago(a.device.firstSeen)}
            {a.device.newDevice && <span className="slds-badge pill pill-high fs-ev-flag">New device</span>}</p>
        )}
      </>
    ),
    changes: (
      <div className="table-wrap">
        <table className="slds-table slds-table_cell-buffer slds-table_bordered data fs-ev-table">
          <thead><tr><th>Change</th><th className="r">Times (30 days)</th><th>Latest</th><th>Source</th></tr></thead>
          <tbody>
            {a.changes.filter(x => !unusualOnly || x.unusual).map(x => (
              <tr key={x.label} className={x.unusual ? 'is-unusual' : ''}>
                <td><span className="fs-ev-label">{x.label}<InfoTip label={x.label}><span>{x.help}</span></InfoTip></span></td>
                <td className={`r num ${x.unusual ? 'bad' : ''}`}>{x.count}</td>
                <td className="num">{x.latest ? <>{date(x.latest)} <span className="muted">· {ago(x.latest)}</span></> : <span className="muted">None</span>}</td>
                <td><span className="slds-badge tag src">{sourceShort(x.source)}</span></td>
              </tr>
            ))}
            {unusualOnly && !a.changes.some(x => x.unusual) && <tr><td colSpan={4} className="muted small">Nothing unusual here.</td></tr>}
          </tbody>
        </table>
      </div>
    ),
    identity: (
      <>
        {degraded.includes('identity') && (
          <ScopedNotification variant="warning">{sourceName('identity')} was degraded when this case was checked. Its results may be incomplete.</ScopedNotification>
        )}
        <dl className="kv">
          {identityRows.filter(r => !unusualOnly || r.flag).map(r => (
            <div key={r.source + r.key} className={r.flag ? `flag-${r.flag}` : ''}>
              <dt>{r.key}</dt>
              <dd className="mono">{r.value}<span className="slds-badge tag src fs-ev-src">{sourceShort(r.source)}</span></dd>
            </div>
          ))}
        </dl>
      </>
    ),
  }

  return (
    <section className="slds-card card fs-evidence" aria-label="Evidence">
      <header className="card-h">
        <div>
          <h2>Evidence</h2>
          <p className="sub">Data from every platform in one place, grouped by question. Compared with this customer's usual weekly average over 3 months.</p>
        </div>
        <div className="fs-ev-controls">
          <RadioButtonGroup name="ev-period" legend="Compare period" size="small" value={period} onChange={setPeriod}
            options={[{ value: 'd7' as Period, label: 'Last 7 days' }, { value: 'd30' as Period, label: 'Last 30 days' }]} />
          <Toggle id="ev-unusual" checked={unusualOnly} onChange={setUnusualOnly} label="Unusual only" />
        </div>
      </header>
      {a.newCustomer && (
        <ScopedNotification>New customer: there's no 3-month history to compare against, so money and behaviour aren't marked unusual.</ScopedNotification>
      )}
      <ul className="slds-accordion">
        {SECTIONS.map(s => {
          const isOpen = open.has(s.id)
          const n = unusualCount(a, s.id, identityFlags)
          return (
            <li key={s.id} className="slds-accordion__list-item" ref={el => { refs.current[s.id] = el }}>
              <section className={`slds-accordion__section ${isOpen ? 'slds-is-open' : ''}`}>
                <div className="slds-accordion__summary">
                  <h3 className="slds-accordion__summary-heading">
                    <button className="slds-button slds-button_reset slds-accordion__summary-action" aria-expanded={isOpen} aria-controls={`ev-${s.id}`} onClick={() => toggle(s.id)}>
                      <svg className="slds-accordion__summary-action-icon fs-ev-chev" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9l5 6 5-6z" fill="currentColor" /></svg>
                      <span className="slds-accordion__summary-content">{s.title}</span>
                    </button>
                  </h3>
                  <span className="fs-ev-q muted small">{s.question}</span>
                  <span className={`slds-badge ${n ? 'pill pill-high' : 'pill pill-none'} fs-ev-count`}>{n ? `${n} unusual` : 'Nothing unusual'}</span>
                </div>
                <div className="slds-accordion__content" id={`ev-${s.id}`}>{isOpen && body[s.id]}</div>
              </section>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
