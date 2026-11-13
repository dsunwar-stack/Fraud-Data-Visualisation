import { CASE_TYPES, SOURCES, type Band, type CaseType, type FraudCase, type SourceId } from '../data'

export type Range = 12 | 24 | 48

export interface Filters {
  range: Range
  bands: Set<Band>
  type: CaseType | 'all'
  source: SourceId | 'all'
  includeDecided: boolean
}

export const BANDS: Band[] = ['high', 'medium', 'low']
export const DEFAULT_FILTERS: Filters = { range: 24, bands: new Set(BANDS), type: 'all', source: 'all', includeDecided: false }

export const matchCase = (c: FraudCase, f: Filters) =>
  f.bands.has(c.band) &&
  (f.type === 'all' || c.type === f.type) &&
  (f.source === 'all' || c.factors.some(x => x.source === f.source)) &&
  (f.includeDecided || c.status !== 'Decided')

export const activeCount = (f: Filters) =>
  (f.bands.size < 3 ? 1 : 0) + (f.type !== 'all' ? 1 : 0) + (f.source !== 'all' ? 1 : 0) + (f.includeDecided ? 1 : 0)

export function Switch({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="switch" htmlFor={id}>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="switch-track" aria-hidden="true"><span /></span>
      {label}
    </label>
  )
}

export function FilterBar({ f, set, showRange, counts, children }: {
  f: Filters
  set: (f: Filters) => void
  showRange?: boolean
  counts?: Record<Band, number>
  children?: React.ReactNode
}) {
  const toggleBand = (b: Band) => {
    const n = new Set(f.bands)
    if (n.has(b)) n.delete(b); else n.add(b)
    set({ ...f, bands: n })
  }
  const n = activeCount(f)
  return (
    <section className="card filterbar" aria-label="Filters">
      <div className="toolbar">
        {showRange && (
          <div className="segmented" role="group" aria-label="Time range">
            {([12, 24, 48] as Range[]).map(r => (
              <button key={r} aria-pressed={f.range === r} onClick={() => set({ ...f, range: r })}>{r}h</button>
            ))}
          </div>
        )}
        <div className="seg" role="group" aria-label="Risk band">
          {BANDS.map(b => (
            <button key={b} className={`chip chip-${b}`} aria-pressed={f.bands.has(b)} onClick={() => toggleBand(b)}>
              <i className="dot" />{b[0].toUpperCase() + b.slice(1)}{counts && <span className="num muted"> {counts[b]}</span>}
            </button>
          ))}
        </div>
        <select id="f-type" value={f.type} onChange={e => set({ ...f, type: e.target.value as Filters['type'] })} aria-label="Case type">
          <option value="all">All case types</option>
          {CASE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select id="f-source" value={f.source} onChange={e => set({ ...f, source: e.target.value as Filters['source'] })} aria-label="Data source">
          <option value="all">All data sources</option>
          {SOURCES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {children}
        <Switch id="f-decided" checked={f.includeDecided} onChange={v => set({ ...f, includeDecided: v })} label="Include decided" />
        {n > 0 && (
          <button className="link small reset" onClick={() => set({ ...DEFAULT_FILTERS, range: f.range })}>
            Clear {n} filter{n > 1 ? 's' : ''}
          </button>
        )}
      </div>
    </section>
  )
}
