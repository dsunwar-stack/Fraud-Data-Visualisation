import { useMemo, useState } from 'react'
import { ALERTS, CASES, CASE_TYPES, NOW, SOURCE_HEALTH, fmtDur, fmtTime, sourceName, type CaseType, type FraudCase } from '../data'
import { AlertVolume, BarList, ScoreCell, ScoreHistogram, Sparkline, bandVar, type HourPoint } from '../components/charts'
import { FilterBar, Switch, matchCase, type Filters } from '../components/Filters'

const AUTO_DECLINE = 85

// Flatten the per-type hourly buckets into one series that respects the type and band filters.
function series(f: Filters): HourPoint[] {
  const types: CaseType[] = f.type === 'all' ? CASE_TYPES : [f.type]
  return ALERTS.map(h => {
    const p: HourPoint = { t: h.t, high: 0, medium: 0, low: 0, autoDeclined: 0 }
    types.forEach(t => {
      const b = h.byType[t]
      if (f.bands.has('high')) { p.high += b.high; p.autoDeclined += b.autoDeclined }
      if (f.bands.has('medium')) p.medium += b.medium
      if (f.bands.has('low')) p.low += b.low
    })
    return p
  })
}

export function Overview({ onOpen, filters, setFilters }: { onOpen: (id: string) => void; filters: Filters; setFilters: (f: Filters) => void }) {
  const [showAuto, setShowAuto] = useState(true)
  const [factorMode, setFactorMode] = useState<'count' | 'points'>('count')
  const f = filters
  const cases = useMemo(() => CASES.filter(c => matchCase(c, f)), [f])
  const all = useMemo(() => series(f), [f])
  const cur = all.slice(48 - f.range)
  const prev = f.range <= 24 ? all.slice(48 - 2 * f.range, 48 - f.range) : null

  const total = (a: HourPoint[]) => a.reduce((s, h) => s + h.high + h.medium + h.low, 0)
  const alerts = total(cur)
  const delta = prev && total(prev) ? Math.round(((alerts - total(prev)) / total(prev)) * 100) : null
  const high = cur.reduce((s, h) => s + h.high, 0)
  const auto = cur.reduce((s, h) => s + h.autoDeclined, 0)
  const open = cases.filter(c => c.status !== 'Decided')
  const slaRisk = open.filter(c => c.slaDueAt.getTime() - NOW.getTime() < 60 * 60_000)
  const avgScore = cases.length ? Math.round(cases.reduce((s, c) => s + c.score, 0) / cases.length) : 0

  const factorRows = useMemo(() => {
    const m = new Map<string, { n: number; pts: number }>()
    cases.forEach(c => c.factors.forEach(x => {
      if (f.source !== 'all' && x.source !== f.source) return
      const e = m.get(x.label) ?? { n: 0, pts: 0 }
      e.n++; e.pts += x.points; m.set(x.label, e)
    }))
    return [...m.entries()]
      .map(([label, v]) => ({ label, n: v.n, avg: Math.round(v.pts / v.n) }))
      .sort((a, b) => (factorMode === 'count' ? b.n - a.n : b.avg - a.avg))
      .slice(0, 7)
  }, [cases, f.source, factorMode])

  const byType = useMemo(() => {
    const m = new Map<string, FraudCase[]>()
    cases.forEach(c => m.set(c.type, [...(m.get(c.type) ?? []), c]))
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [cases])

  const urgent = open.filter(c => c.band === 'high' || !f.bands.has('high')).sort((a, b) => a.slaDueAt.getTime() - b.slaDueAt.getTime()).slice(0, 6)
  const spikeVisible = f.range >= 12 && (f.type === 'all' || f.type === 'Account takeover') && f.bands.has('high')
  // Real hourly series for the case-based cards, worked out from the cases themselves.
  const history = useMemo(() => {
    const base = CASES.filter(c => matchCase(c, { ...f, includeDecided: true }))
    const decidedAt = (c: FraudCase) => (c.status === 'Decided' ? c.events[c.events.length - 1].at.getTime() : Infinity)
    return cur.map(h => {
      const t = h.t.getTime() + 3600_000
      const openNow = base.filter(c => c.createdAt.getTime() <= t && decidedAt(c) > t)
      return { open: openNow.length, slaRisk: openNow.filter(c => c.slaDueAt.getTime() - t < 3600_000).length }
    })
  }, [f, cur])
  const hourLabels = cur.map(h => `${fmtTime(h.t)}–${fmtTime(new Date(h.t.getTime() + 3600_000))} UTC`)
  const endLabels = cur.map(h => `at ${fmtTime(new Date(h.t.getTime() + 3600_000))} UTC`)
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
  const counts = { high: 0, medium: 0, low: 0 }
  CASES.filter(c => matchCase(c, { ...f, bands: new Set(['high', 'medium', 'low']) })).forEach(c => counts[c.band]++)

  return (
    <div className="stack">
      <FilterBar f={f} set={setFilters} showRange counts={counts} />

      <section className="kpis" aria-label={`Key metrics, last ${f.range} hours`}>
        <Kpi label={`Alerts (${f.range}h)`} value={alerts.toLocaleString()} tone={delta != null && delta > 10 ? 'bad' : 'neutral'}
          delta={delta == null ? 'No prior period in range' : `${delta > 0 ? '+' : ''}${delta}% vs prior ${f.range}h`} spark={cur.map(h => h.high + h.medium + h.low)} labels={hourLabels} unit="alerts" />
        <Kpi label="High-risk alerts" value={String(high)} delta={f.bands.has('high') ? `${pct(high, alerts)}% of volume` : 'High band hidden'} tone="bad"
          spark={cur.map(h => h.high)} color={bandVar('high')} labels={hourLabels} unit="high-risk alerts" />
        <Kpi label="Auto-declined" value={String(auto)} delta={`Score ≥ ${AUTO_DECLINE}`} tone="neutral" spark={cur.map(h => h.autoDeclined)} labels={hourLabels} unit="auto-declined" />
        <Kpi label={f.includeDecided ? 'Cases' : 'Open cases'} value={String(cases.length)} delta={cases.length ? `Average score ${avgScore}` : 'None match filters'} tone="neutral"
          spark={history.map(h => h.open)} labels={endLabels} unit="open cases" />
        <Kpi label="SLA due < 1h" value={String(slaRisk.length)} delta={`${open.filter(c => c.slaDueAt < NOW).length} already breached`}
          tone={slaRisk.length ? 'bad' : 'good'} spark={history.map(h => h.slaRisk)} color={bandVar('medium')} labels={endLabels} unit="due < 1h or breached" />
      </section>

      <section className="grid-2-1">
        <div className="card">
          <header className="card-h">
            <div>
              <h2>Alert volume</h2>
              <p className="sub">Alerts per hour by risk band, last {f.range} hours (UTC){f.type !== 'all' ? ` · ${f.type}` : ''}. Hover a bar for counts.</p>
            </div>
            <Switch id="ov-auto" checked={showAuto} onChange={setShowAuto} label="Auto-declined line" />
          </header>
          <AlertVolume data={cur} showAuto={showAuto} />
          {spikeVisible && (
            <p className="annotation"><span className="dot" style={{ background: bandVar('high') }} />
              Spike on {ALERTS[39].t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}, {fmtTime(ALERTS[39].t)}–{fmtTime(new Date(ALERTS[40].t.getTime() + 3600_000))} UTC: {ALERTS[39].byType['Account takeover'].high + ALERTS[40].byType['Account takeover'].high} high-risk account takeover alerts from one device cluster.
            </p>
          )}
        </div>
        <div className="card">
          <header className="card-h"><div><h2>Risk score distribution</h2><p className="sub">{cases.length} cases, scored 0–100</p></div></header>
          {cases.length ? <ScoreHistogram scores={cases.map(c => c.score)} threshold={AUTO_DECLINE} /> : <Empty />}
          <dl className="bands">
            <div><dt><i className="dot" style={{ background: bandVar('high') }} />High</dt><dd>70–100 · SLA 4h</dd></div>
            <div><dt><i className="dot" style={{ background: bandVar('medium') }} />Medium</dt><dd>40–69 · SLA 24h</dd></div>
            <div><dt><i className="dot" style={{ background: bandVar('low') }} />Low</dt><dd>0–39 · SLA 48h</dd></div>
          </dl>
        </div>
      </section>

      <section className="grid-3">
        <div className="card">
          <header className="card-h">
            <div><h2>Top risk factors</h2><p className="sub">{factorMode === 'count' ? 'Number of cases each factor appears in' : 'Average points each factor adds to the score'}</p></div>
            <div className="segmented sm" role="group" aria-label="Rank factors by">
              <button aria-pressed={factorMode === 'count'} onClick={() => setFactorMode('count')}>Cases</button>
              <button aria-pressed={factorMode === 'points'} onClick={() => setFactorMode('points')}>Points</button>
            </div>
          </header>
          {factorRows.length
            ? <BarList rows={factorRows.map(r => ({ label: r.label, value: factorMode === 'count' ? r.n : r.avg, display: factorMode === 'count' ? String(r.n) : `+${r.avg}` }))} />
            : <Empty />}
        </div>
        <div className="card">
          <header className="card-h"><div><h2>Cases by type</h2><p className="sub">Click a type to filter the dashboard</p></div></header>
          {byType.length ? (
            <div className="barlist">
              {byType.map(([label, cs]) => {
                const hi = cs.filter(c => c.band === 'high').length / cs.length
                const max = Math.max(...byType.map(b => b[1].length))
                const active = f.type === label
                return (
                  <button key={label} className={`barlist-row as-btn ${active ? 'active' : ''}`} aria-pressed={active}
                    onClick={() => setFilters({ ...f, type: active ? 'all' : (label as CaseType) })}>
                    <span className="barlist-label">{label}</span>
                    <span className="barlist-track"><span className="barlist-fill" style={{ width: `${(cs.length / max) * 100}%`, background: hi > 0.3 ? bandVar('high') : hi > 0.15 ? bandVar('medium') : 'var(--primary)' }} /></span>
                    <span className="barlist-val num">{cs.length} · {Math.round(hi * 100)}% high</span>
                  </button>
                )
              })}
            </div>
          ) : <Empty />}
        </div>
        <div className="card">
          <header className="card-h"><div><h2>Data source health</h2><p className="sub">Click a source to filter cases that cite it</p></div></header>
          <table className="slds-table slds-table_cell-buffer mini">
            <thead><tr><th>Source</th><th className="r">Hits</th><th className="r">Precision</th><th className="r">p95</th></tr></thead>
            <tbody>
              {SOURCE_HEALTH.map(s => {
                const active = f.source === s.id
                return (
                  <tr key={s.id} className={`clickable ${active ? 'selected' : ''}`} tabIndex={0} aria-selected={active}
                    onClick={() => setFilters({ ...f, source: active ? 'all' : s.id })}
                    onKeyDown={e => e.key === 'Enter' && setFilters({ ...f, source: active ? 'all' : s.id })}>
                    <td><span className={`status-dot ${s.status}`} title={s.status === 'ok' ? 'Healthy' : 'Degraded'} />{sourceName(s.id)}</td>
                    <td className="r num">{Math.round((s.hits24h * f.range) / 24).toLocaleString()}</td>
                    <td className="r num">{Math.round(s.precision * 100)}%</td>
                    <td className={`r num ${s.status === 'degraded' ? 'warn' : ''}`}>{s.latencyP95.toLocaleString()} ms</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="annotation"><span className="status-dot degraded" />ID document verification is degraded: 98.2% uptime, slower responses since 09:40.</p>
        </div>
      </section>

      <section className="card">
        <header className="card-h"><div><h2>Needs attention</h2><p className="sub">{f.bands.has('high') ? 'High-risk' : 'Matching'} cases closest to their SLA</p></div></header>
        {urgent.length ? (
          <div className="table-wrap">
            <table className="slds-table slds-table_cell-buffer slds-table_bordered data">
              <thead><tr><th>Case</th><th>Customer</th><th>Type</th><th>Risk</th><th>Top factor</th><th className="r">SLA</th><th>Recommended</th></tr></thead>
              <tbody>
                {urgent.map(c => {
                  const left = c.slaDueAt.getTime() - NOW.getTime()
                  return (
                    <tr key={c.id} className={`clickable band-${c.band}`} onClick={() => onOpen(c.id)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpen(c.id)}>
                      <td className="mono">{c.id}</td>
                      <td>{c.customer.name}</td>
                      <td>{c.type}</td>
                      <td><ScoreCell score={c.score} band={c.band} /></td>
                      <td className="muted">{c.factors[0]?.label}</td>
                      <td className={`r num ${left < 0 ? 'bad' : left < 3600_000 ? 'warn' : ''}`}>{left < 0 ? `Breached ${fmtDur(-left)}` : fmtDur(left)}</td>
                      <td><span className={`outcome outcome-${c.recommended.toLowerCase()}`}>{c.recommended}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : <Empty />}
      </section>
    </div>
  )
}

const Empty = () => <p className="muted small empty-inline">Nothing matches these filters. Clear a filter to see data.</p>

function Kpi({ label, value, delta, tone, spark, color, labels, unit }: { label: string; value: string; delta: string; tone: 'good' | 'bad' | 'neutral'; spark: number[]; color?: string; labels: string[]; unit: string }) {
  return (
    <div className="card kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value num">{value}</span>
      <span className={`kpi-delta ${tone}`}>{delta}</span>
      <Sparkline values={spark} color={color} labels={labels} unit={unit} />
      <span className="spark-hint">Hover or tap for hourly values</span>
    </div>
  )
}
