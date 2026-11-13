import { useMemo, useState } from 'react'
import { CASES, NOW, fmtDur, fmtMoney, type FraudCase } from '../data'
import { ScoreCell } from '../components/charts'
import { FilterBar, Switch, matchCase, type Filters } from '../components/Filters'

type SortKey = 'score' | 'sla' | 'created'

export function Queue({ onOpen, filters, setFilters }: { onOpen: (id: string) => void; filters: Filters; setFilters: (f: Filters) => void }) {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('score')
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [showSignals, setShowSignals] = useState(true)
  const [compact, setCompact] = useState(false)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = CASES.filter(c =>
      matchCase(c, filters) &&
      (!urgentOnly || (c.status !== 'Decided' && c.slaDueAt.getTime() - NOW.getTime() < 3600_000)) &&
      (!needle || c.id.toLowerCase().includes(needle) || c.customer.name.toLowerCase().includes(needle) || c.customer.email.includes(needle)),
    )
    const by: Record<SortKey, (a: FraudCase, b: FraudCase) => number> = {
      score: (a, b) => b.score - a.score,
      sla: (a, b) => a.slaDueAt.getTime() - b.slaDueAt.getTime(),
      created: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    }
    return list.sort(by[sort])
  }, [q, filters, urgentOnly, sort])

  const counts = { high: 0, medium: 0, low: 0 }
  CASES.filter(c => matchCase(c, { ...filters, bands: new Set(['high', 'medium', 'low']) })).forEach(c => counts[c.band]++)
  const cols = showSignals ? 9 : 8

  return (
    <div className="stack">
      <FilterBar f={filters} set={setFilters} counts={counts}>
        <label className="search">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input id="queue-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search case ID, name or email" aria-label="Search cases" />
        </label>
      </FilterBar>

      <section className="card flush">
        <div className="table-head">
          <span className="muted small">{rows.length} of {CASES.length} cases</span>
          <div className="toolbar">
            <Switch id="q-urgent" checked={urgentOnly} onChange={setUrgentOnly} label="Due within 1h or breached" />
            <Switch id="q-signals" checked={showSignals} onChange={setShowSignals} label="Signals column" />
            <Switch id="q-compact" checked={compact} onChange={setCompact} label="Compact rows" />
            <select id="queue-sort" value={sort} onChange={e => setSort(e.target.value as SortKey)} aria-label="Sort by">
              <option value="score">Sort: highest risk</option>
              <option value="sla">Sort: SLA due soonest</option>
              <option value="created">Sort: newest</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table className={`data ${compact ? 'compact' : ''}`}>
            <thead>
              <tr><th>Case</th><th>Customer</th><th>Type</th><th>Risk score</th>{showSignals && <th>Signals</th>}<th className="r">Amount</th><th className="r">SLA</th><th>Status</th><th>Recommended</th></tr>
            </thead>
            <tbody>
              {rows.map(c => {
                const left = c.slaDueAt.getTime() - NOW.getTime()
                const done = c.status === 'Decided'
                return (
                  <tr key={c.id} className={`clickable band-${c.band}`} onClick={() => onOpen(c.id)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpen(c.id)}>
                    <td className="mono">{c.id}</td>
                    <td><div>{c.customer.name}</div>{!compact && <div className="muted small">{c.customer.country}</div>}</td>
                    <td>{c.type}</td>
                    <td><ScoreCell score={c.score} band={c.band} /></td>
                    {showSignals && (
                      <td><span className="signals">{c.factors.slice(0, 2).map(f => <span key={f.label} className="tag" title={f.detail}>{f.label}</span>)}{c.factors.length > 2 && <span className="tag muted" title={c.factors.slice(2).map(f => f.label).join(', ')}>+{c.factors.length - 2}</span>}</span></td>
                    )}
                    <td className="r num">{c.amount ? fmtMoney(c.amount) : '—'}</td>
                    <td className={`r num ${done ? 'muted' : left < 0 ? 'bad' : left < 3600_000 ? 'warn' : ''}`}>{done ? 'Closed' : left < 0 ? `-${fmtDur(-left)}` : fmtDur(left)}</td>
                    <td><span className={`status status-${c.status.replace(' ', '-').toLowerCase()}`}>{c.status}</span></td>
                    <td><span className={`outcome outcome-${c.recommended.toLowerCase()}`}>{c.recommended}</span></td>
                  </tr>
                )
              })}
              {!rows.length && <tr><td colSpan={cols} className="empty">No cases match these filters. Clear the search or a filter to see more.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
