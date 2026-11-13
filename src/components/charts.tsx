import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Band, HourBucket } from '../data'
import { fmtTime } from '../data'

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e.contentRect.width)))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

export const bandVar = (b: Band) => `var(--risk-${b})`

// ---------- Sparkline ----------
export function Sparkline({ values, color = 'var(--primary)', height = 32 }: { values: number[]; color?: string; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const max = Math.max(...values), min = Math.min(...values)
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, height - 3 - ((v - min) / (max - min || 1)) * (height - 6)])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('')
  const last = pts[pts.length - 1]
  return (
    <div ref={ref} style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} aria-hidden="true">
          <path d={`${line}L${w} ${height}L0 ${height}Z`} fill={color} opacity={0.1} />
          <path d={line} fill="none" stroke={color} strokeWidth={1.5} />
          <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />
        </svg>
      )}
    </div>
  )
}

// ---------- Stacked alert volume (bars per hour) ----------
export function AlertVolume({ data }: { data: HourBucket[] }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const H = 220, padL = 32, padB = 22, padT = 8
  const max = Math.ceil(Math.max(...data.map(d => d.high + d.medium + d.low)) / 20) * 20
  const iw = Math.max(0, w - padL), ih = H - padB - padT
  const bw = iw / data.length
  const y = (v: number) => padT + ih - (v / max) * ih
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max]
  const hv = hover != null ? data[hover] : null
  return (
    <div ref={ref} className="chart" onMouseLeave={() => setHover(null)}>
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label="Alerts per hour by risk band, last 48 hours">
          {ticks.map(t => (
            <g key={t}>
              <line x1={padL} x2={w} y1={y(t)} y2={y(t)} className="grid" />
              <text x={padL - 6} y={y(t) + 4} textAnchor="end" className="axis">{t}</text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = padL + i * bw + 1
            const segs: [Band, number][] = [['low', d.low], ['medium', d.medium], ['high', d.high]]
            let acc = 0
            return (
              <g key={i} onMouseEnter={() => setHover(i)} opacity={hover == null || hover === i ? 1 : 0.45}>
                <rect x={x - 1} y={padT} width={bw} height={ih} fill="transparent" />
                {segs.map(([b, v]) => {
                  const r = <rect key={b} x={x} y={y(acc + v)} width={Math.max(1, bw - 2)} height={(v / max) * ih} fill={bandVar(b)} rx={1} />
                  acc += v
                  return r
                })}
              </g>
            )
          })}
          {data.map((d, i) =>
            d.t.getUTCHours() % 6 === 0 ? (
              <text key={'x' + i} x={padL + i * bw + bw / 2} y={H - 6} textAnchor="middle" className="axis">
                {d.t.getUTCHours() === 0 ? d.t.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }) : fmtTime(d.t)}
              </text>
            ) : null,
          )}
        </svg>
      )}
      {hv && hover != null && (
        <div className="tooltip" style={{ left: Math.min(w - 170, Math.max(0, padL + hover * bw - 70)), top: 0 }}>
          <b>{fmtTime(hv.t)}–{fmtTime(new Date(hv.t.getTime() + 3600_000))} UTC</b>
          <Row c="high" l="High" v={hv.high} />
          <Row c="medium" l="Medium" v={hv.medium} />
          <Row c="low" l="Low" v={hv.low} />
          <div className="tt-row muted"><span>Auto-declined</span><span className="num">{hv.autoDeclined}</span></div>
        </div>
      )}
    </div>
  )
}
const Row = ({ c, l, v }: { c: Band; l: string; v: number }) => (
  <div className="tt-row"><span><i className="dot" style={{ background: bandVar(c) }} />{l}</span><span className="num">{v}</span></div>
)

// ---------- Score distribution histogram ----------
export function ScoreHistogram({ scores, threshold }: { scores: number[]; threshold: number }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const H = 160, padB = 20, padT = 6, B = 20
  const bins = Array.from({ length: B }, () => 0)
  scores.forEach(s => bins[Math.min(B - 1, Math.floor(s / (100 / B)))]++)
  const max = Math.max(...bins, 1)
  const bw = w / B, ih = H - padB - padT
  const tx = (threshold / 100) * w
  return (
    <div ref={ref} className="chart">
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label="Distribution of risk scores across open cases">
          <line x1={0} x2={w} y1={padT + ih} y2={padT + ih} className="grid" />
          {bins.map((v, i) => {
            const mid = (i + 0.5) * (100 / B)
            const h = (v / max) * ih
            return <rect key={i} x={i * bw + 1} y={padT + ih - h} width={bw - 2} height={h} rx={2} fill={bandVar(mid >= 70 ? 'high' : mid >= 40 ? 'medium' : 'low')} opacity={0.85} />
          })}
          <line x1={tx} x2={tx} y1={0} y2={padT + ih} stroke="var(--text)" strokeDasharray="3 3" />
          <text x={tx > w - 120 ? tx - 4 : tx + 4} y={12} textAnchor={tx > w - 120 ? 'end' : 'start'} className="axis strong">Auto-decline ≥ {threshold}</text>
          {[0, 20, 40, 60, 80, 100].map(v => (
            <text key={v} x={(v / 100) * w} y={H - 4} textAnchor={v === 0 ? 'start' : v === 100 ? 'end' : 'middle'} className="axis">{v}</text>
          ))}
        </svg>
      )}
    </div>
  )
}

// ---------- Risk gauge (donut) ----------
export function RiskGauge({ score, band, size = 132 }: { score: number; band: Band; size?: number }) {
  const r = size / 2 - 10, c = 2 * Math.PI * r
  const arc = 0.75 // 270° gauge
  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Risk score ${score} out of 100, ${band} risk`}>
        <g transform={`rotate(135 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={10} strokeDasharray={`${c * arc} ${c}`} strokeLinecap="round" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bandVar(band)} strokeWidth={10} strokeDasharray={`${(c * arc * score) / 100} ${c}`} strokeLinecap="round" />
        </g>
      </svg>
      <div className="gauge-label">
        <span className="gauge-num" style={{ color: bandVar(band) }}>{score}</span>
        <span className="gauge-cap">of 100</span>
      </div>
    </div>
  )
}

// ---------- Horizontal bar list ----------
export function BarList({ rows }: { rows: { label: ReactNode; value: number; display?: string; color?: string }[] }) {
  const max = Math.max(...rows.map(r => r.value), 1)
  return (
    <div className="barlist">
      {rows.map((r, i) => (
        <div className="barlist-row" key={i}>
          <div className="barlist-label">{r.label}</div>
          <div className="barlist-track"><div className="barlist-fill" style={{ width: `${(r.value / max) * 100}%`, background: r.color ?? 'var(--primary)' }} /></div>
          <div className="barlist-val num">{r.display ?? r.value}</div>
        </div>
      ))}
    </div>
  )
}

// ---------- Inline score signifier for tables ----------
export function ScoreCell({ score, band }: { score: number; band: Band }) {
  return (
    <span className="scorecell">
      <span className={`pill pill-${band}`}>{band === 'high' ? 'High' : band === 'medium' ? 'Med' : 'Low'}</span>
      <span className="num">{score}</span>
      <span className="mini-track"><span style={{ width: `${score}%`, background: bandVar(band) }} /></span>
    </span>
  )
}
