import { useMemo } from 'react'
import { ALERTS, CASES, NOW, SOURCE_HEALTH, fmtDur, fmtTime, sourceName, type FraudCase } from '../data'
import { AlertVolume, BarList, ScoreCell, ScoreHistogram, Sparkline, bandVar } from '../components/charts'

const AUTO_DECLINE = 85

export function Overview({ onOpen }: { onOpen: (id: string) => void }) {
  const open = CASES.filter(c => c.status !== 'Decided')
  const last24 = ALERTS.slice(24)
  const prev24 = ALERTS.slice(0, 24)
  const sum = (a: typeof ALERTS, f: (h: (typeof ALERTS)[number]) => number) => a.reduce((s, h) => s + f(h), 0)
  const alerts24 = sum(last24, h => h.high + h.medium + h.low)
  const alertsPrev = sum(prev24, h => h.high + h.medium + h.low)
  const high24 = sum(last24, h => h.high)
  const auto24 = sum(last24, h => h.autoDeclined)
  const slaRisk = open.filter(c => c.slaDueAt.getTime() - NOW.getTime() < 60 * 60_000)
  const avgScore = Math.round(open.reduce((s, c) => s + c.score, 0) / open.length)

  const factorCounts = useMemo(() => {
    const m = new Map<string, { n: number; pts: number }>()
    open.forEach(c => c.factors.forEach(f => {
      const e = m.get(f.label) ?? { n: 0, pts: 0 }
      e.n++; e.pts += f.points; m.set(f.label, e)
    }))
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 7)
  }, [open])

  const byType = useMemo(() => {
    const m = new Map<string, FraudCase[]>()
    open.forEach(c => m.set(c.type, [...(m.get(c.type) ?? []), c]))
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [open])

  const urgent = open.filter(c => c.band === 'high').sort((a, b) => a.slaDueAt.getTime() - b.slaDueAt.getTime()).slice(0, 6)
  const delta = Math.round(((alerts24 - alertsPrev) / alertsPrev) * 100)

  return (
    <div className="stack">
      <section className="kpis" aria-label="Key metrics, last 24 hours">
        <Kpi label="Alerts (24h)" value={alerts24.toLocaleString()} delta={`${delta > 0 ? '+' : ''}${delta}% vs prior 24h`} tone={delta > 10 ? 'bad' : 'neutral'}
          spark={ALERTS.map(h => h.high + h.medium + h.low)} />
        <Kpi label="High-risk alerts" value={String(high24)} delta={`${Math.round((high24 / alerts24) * 100)}% of volume`} tone="bad"
          spark={ALERTS.map(h => h.high)} color={bandVar('high')} />
        <Kpi label="Auto-declined" value={String(auto24)} delta={`Score ≥ ${AUTO_DECLINE}`} tone="neutral"
          spark={ALERTS.map(h => h.autoDeclined)} />
        <Kpi label="Open cases" value={String(open.length)} delta={`Average score ${avgScore}`} tone="neutral"
          spark={ALERTS.map((_, i) => 120 + Math.round(Math.sin(i / 5) * 12 + i * 0.6))} />
        <Kpi label="SLA due < 1h" value={String(slaRisk.length)} delta={`${open.filter(c => c.slaDueAt < NOW).length} already breached`} tone={slaRisk.length ? 'bad' : 'good'}
          spark={ALERTS.map((_, i) => 4 + Math.round(Math.cos(i / 4) * 3 + (i > 36 ? 4 : 0)))} color={bandVar('medium')} />
      </section>

      <section className="grid-2-1">
        <div className="card">
          <header className="card-h">
            <div>
              <h2>Alert volume</h2>
              <p className="sub">Alerts per hour by risk band, last 48 hours (UTC). Hover a bar for counts.</p>
            </div>
            <Legend />
          </header>
          <AlertVolume data={ALERTS} />
          <p className="annotation"><span className="dot" style={{ background: bandVar('high') }} />Spike on {ALERTS[39].t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}, {fmtTime(ALERTS[39].t)}–{fmtTime(new Date(ALERTS[40].t.getTime() + 3600_000))} UTC: {ALERTS[39].high + ALERTS[40].high} high-risk alerts, mostly account takeover from one device cluster.</p>
        </div>
        <div className="card">
          <header className="card-h">
            <div>
              <h2>Risk score distribution</h2>
              <p className="sub">{open.length} open cases, scored 0–100</p>
            </div>
          </header>
          <ScoreHistogram scores={open.map(c => c.score)} threshold={AUTO_DECLINE} />
          <dl className="bands">
            <div><dt><i className="dot" style={{ background: bandVar('high') }} />High</dt><dd>70–100 · SLA 4h</dd></div>
            <div><dt><i className="dot" style={{ background: bandVar('medium') }} />Medium</dt><dd>40–69 · SLA 24h</dd></div>
            <div><dt><i className="dot" style={{ background: bandVar('low') }} />Low</dt><dd>0–39 · SLA 48h</dd></div>
          </dl>
        </div>
      </section>

      <section className="grid-3">
        <div className="card">
          <header className="card-h"><div><h2>Top risk factors</h2><p className="sub">How many open cases each factor appears in</p></div></header>
          <BarList rows={factorCounts.map(([label, v]) => ({ label, value: v.n, display: `${v.n}` }))} />
        </div>
        <div className="card">
          <header className="card-h"><div><h2>Cases by type</h2><p className="sub">Open cases, coloured by share of high risk</p></div></header>
          <BarList rows={byType.map(([label, cs]) => {
            const hi = cs.filter(c => c.band === 'high').length / cs.length
            return { label, value: cs.length, display: `${cs.length} · ${Math.round(hi * 100)}% high`, color: hi > 0.3 ? bandVar('high') : hi > 0.15 ? bandVar('medium') : 'var(--primary)' }
          })} />
        </div>
        <div className="card">
          <header className="card-h"><div><h2>Data source health</h2><p className="sub">Hits, precision and p95 latency, last 24h</p></div></header>
          <table className="mini">
            <thead><tr><th>Source</th><th className="r">Hits</th><th className="r">Precision</th><th className="r">p95</th></tr></thead>
            <tbody>
              {SOURCE_HEALTH.map(s => (
                <tr key={s.id}>
                  <td><span className={`status-dot ${s.status}`} title={s.status === 'ok' ? 'Healthy' : 'Degraded'} />{sourceName(s.id)}</td>
                  <td className="r num">{s.hits24h.toLocaleString()}</td>
                  <td className="r num">{Math.round(s.precision * 100)}%</td>
                  <td className={`r num ${s.status === 'degraded' ? 'warn' : ''}`}>{s.latencyP95.toLocaleString()} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="annotation"><span className="status-dot degraded" />ID document verification is degraded: 98.2% uptime, slower responses since 09:40.</p>
        </div>
      </section>

      <section className="card">
        <header className="card-h">
          <div><h2>Needs attention</h2><p className="sub">High-risk cases closest to their SLA</p></div>
        </header>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Case</th><th>Customer</th><th>Type</th><th>Risk</th><th>Top factor</th><th className="r">SLA</th><th>Recommended</th></tr></thead>
            <tbody>
              {urgent.map(c => {
                const left = c.slaDueAt.getTime() - NOW.getTime()
                return (
                  <tr key={c.id} className="clickable" onClick={() => onOpen(c.id)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpen(c.id)}>
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
      </section>
    </div>
  )
}

function Kpi({ label, value, delta, tone, spark, color }: { label: string; value: string; delta: string; tone: 'good' | 'bad' | 'neutral'; spark: number[]; color?: string }) {
  return (
    <div className="card kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value num">{value}</span>
      <span className={`kpi-delta ${tone}`}>{delta}</span>
      <Sparkline values={spark} color={color} />
    </div>
  )
}

export function Legend() {
  return (
    <div className="legend">
      <span><i className="dot" style={{ background: bandVar('high') }} />High</span>
      <span><i className="dot" style={{ background: bandVar('medium') }} />Medium</span>
      <span><i className="dot" style={{ background: bandVar('low') }} />Low</span>
    </div>
  )
}
