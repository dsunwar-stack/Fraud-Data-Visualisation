import { useMemo, useState } from 'react'
import { CASES, NOW, fmtDur, fmtMoney, type Band, type CaseType, type FraudCase } from '../data'
import { ScoreCell } from '../components/charts'

type SortKey = 'score' | 'sla' | 'created'
const BANDS: Band[] = ['high', 'medium', 'low']
const TYPES: CaseType[] = ['Onboarding exception', 'Account takeover', 'Payment fraud', 'Money mule', 'Synthetic identity']

export function Queue({ onOpen }: { onOpen: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [bands, setBands] = useState<Set<Band>>(new Set(BANDS))
  const [type, setType] = useState<CaseType | 'all'>('all')
  const [showDecided, setShowDecided] = useState(false)
  const [sort, setSort] = useState<SortKey>('score')

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = CASES.filter(c =>
      bands.has(c.band) &&
      (type === 'all' || c.type === type) &&
      (showDecided || c.status !== 'Decided') &&
      (!needle || c.id.toLowerCase().includes(needle) || c.customer.name.toLowerCase().includes(needle) || c.customer.email.includes(needle)),
    )
    const by: Record<SortKey, (a: FraudCase, b: FraudCase) => number> = {
      score: (a, b) => b.score - a.score,
      sla: (a, b) => a.slaDueAt.getTime() - b.slaDueAt.getTime(),
      created: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    }
    return list.sort(by[sort])
  }, [q, bands, type, showDecided, sort])

  const toggleBand = (b: Band) => setBands(s => {
    const n = new Set(s)
    if (n.has(b)) n.delete(b); else n.add(b)
    return n
  })

  const counts = BANDS.map(b => CASES.filter(c => c.band === b && (showDecided || c.status !== 'Decided')).length)

  return (
    <div className="stack">
      <section className="card">
        <div className="toolbar">
          <label className="search">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            <input id="queue-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search case ID, name or email" aria-label="Search cases" />
          </label>
          <div className="seg" role="group" aria-label="Risk band filter">
            {BANDS.map((b, i) => (
              <button key={b} className={`chip chip-${b}`} aria-pressed={bands.has(b)} onClick={() => toggleBand(b)}>
                <i className="dot" />{b[0].toUpperCase() + b.slice(1)} <span className="num muted">{counts[i]}</span>
              </button>
            ))}
          </div>
          <select id="queue-type" value={type} onChange={e => setType(e.target.value as CaseType | 'all')} aria-label="Case type">
            <option value="all">All case types</option>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select id="queue-sort" value={sort} onChange={e => setSort(e.target.value as SortKey)} aria-label="Sort by">
            <option value="score">Sort: highest risk</option>
            <option value="sla">Sort: SLA due soonest</option>
            <option value="created">Sort: newest</option>
          </select>
          <label className="check"><input id="queue-decided" type="checkbox" checked={showDecided} onChange={e => setShowDecided(e.target.checked)} /> Show decided</label>
        </div>
      </section>

      <section className="card flush">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Case</th><th>Customer</th><th>Type</th><th>Risk score</th><th>Signals</th><th className="r">Amount</th><th className="r">SLA</th><th>Status</th><th>Recommended</th></tr>
            </thead>
            <tbody>
              {rows.map(c => {
                const left = c.slaDueAt.getTime() - NOW.getTime()
                const done = c.status === 'Decided'
                return (
                  <tr key={c.id} className={`clickable band-${c.band}`} onClick={() => onOpen(c.id)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpen(c.id)}>
                    <td className="mono">{c.id}</td>
                    <td><div>{c.customer.name}</div><div className="muted small">{c.customer.country}</div></td>
                    <td>{c.type}</td>
                    <td><ScoreCell score={c.score} band={c.band} /></td>
                    <td><span className="signals">{c.factors.slice(0, 2).map(f => <span key={f.label} className="tag" title={f.detail}>{f.label}</span>)}{c.factors.length > 2 && <span className="tag muted" title={c.factors.slice(2).map(f => f.label).join(', ')}>+{c.factors.length - 2}</span>}</span></td>
                    <td className="r num">{c.amount ? fmtMoney(c.amount) : '—'}</td>
                    <td className={`r num ${done ? 'muted' : left < 0 ? 'bad' : left < 3600_000 ? 'warn' : ''}`}>{done ? 'Closed' : left < 0 ? `-${fmtDur(-left)}` : fmtDur(left)}</td>
                    <td><span className={`status status-${c.status.replace(' ', '-').toLowerCase()}`}>{c.status}</span></td>
                    <td><span className={`outcome outcome-${c.recommended.toLowerCase()}`}>{c.recommended}</span></td>
                  </tr>
                )
              })}
              {!rows.length && <tr><td colSpan={9} className="empty">No cases match these filters. Clear the search or turn a risk band back on.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="table-foot muted">{rows.length} of {CASES.length} cases</p>
      </section>
    </div>
  )
}
