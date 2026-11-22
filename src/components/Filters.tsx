import { CheckboxButtonGroup, RadioButtonGroup, Toggle } from './slds'
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

export function Switch(props: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <Toggle {...props} />
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
    <section className="slds-card card filterbar" aria-label="Filters">
      <div className="toolbar">
        {showRange && (
          <RadioButtonGroup name="range" legend="Time range" value={f.range} onChange={r => set({ ...f, range: r })}
            options={([12, 24, 48] as Range[]).map(r => ({ value: r, label: `${r}h` }))} />
        )}
        <CheckboxButtonGroup name="band" legend="Risk level" selected={f.bands} onToggle={toggleBand}
          options={BANDS.map(b => ({ value: b, label: <><i className={`dot dot-${b}`} />{b[0].toUpperCase() + b.slice(1)}{counts && <span className="fs-count-inline num">{counts[b]}</span>}</> }))} />
        <div className="slds-select_container"><select className="slds-select" id="f-type" value={f.type} onChange={e => set({ ...f, type: e.target.value as Filters['type'] })} aria-label="Case type">
          <option value="all">All case types</option>
          {CASE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select></div>
        <div className="slds-select_container"><select className="slds-select" id="f-source" value={f.source} onChange={e => set({ ...f, source: e.target.value as Filters['source'] })} aria-label="Data source">
          <option value="all">All data sources</option>
          {SOURCES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></div>
        {children}
        <Switch id="f-decided" checked={f.includeDecided} onChange={v => set({ ...f, includeDecided: v })} label="Include decided" />
        {n > 0 && (
          <button className="slds-button reset" onClick={() => set({ ...DEFAULT_FILTERS, range: f.range })}>
            Clear {n} filter{n > 1 ? 's' : ''}
          </button>
        )}
      </div>
    </section>
  )
}
