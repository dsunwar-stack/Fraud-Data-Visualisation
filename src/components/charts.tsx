import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Band } from '../data'
import { ProgressBar } from './slds'

export interface HourPoint { t: Date; high: number; medium: number; low: number; autoDeclined: number }
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

// Fills use the SLDS 2 data palette; text uses the semantic colours, which meet contrast.
export const bandVar = (b: Band) => `var(--viz-${b})`
export const bandText = (b: Band) => `var(--risk-${b})`

// ---------- Sparkline (hover or tap for values) ----------
export function Sparkline({ values, labels, unit = '', color = 'var(--primary)', height = 40 }: {
  values: number[]; labels?: string[]; unit?: string; color?: string; height?: number
}) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...values), min = Math.min(...values)
  const n = values.length
  const pts = values.map((v, i) => [(i / Math.max(1, n - 1)) * w, height - 4 - ((v - min) / (max - min || 1)) * (height - 8)])
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('')
  const idx = hover ?? n - 1
  const at = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect()
    setHover(Math.max(0, Math.min(n - 1, Math.round(((clientX - r.left) / r.width) * (n - 1)))))
  }
  const interactive = !!labels
  return (
    <div ref={ref} className={`spark ${interactive ? 'interactive' : ''}`} style={{ height }}
      onPointerMove={interactive ? e => at(e.clientX) : undefined}
      onPointerDown={interactive ? e => at(e.clientX) : undefined}
      onPointerLeave={interactive ? () => setHover(null) : undefined}>
      {w > 0 && (
        <svg width={w} height={height} aria-hidden="true">
          <path d={`${line}L${w} ${height}L0 ${height}Z`} fill={color} opacity={0.1} />
          <path d={line} fill="none" stroke={color} strokeWidth={1.5} />
          {hover != null && <line x1={pts[idx][0]} x2={pts[idx][0]} y1={0} y2={height} stroke="var(--border-strong)" />}
          <circle cx={pts[idx][0]} cy={pts[idx][1]} r={hover != null ? 3.5 : 2.5} fill={color} stroke="var(--surface)" strokeWidth={hover != null ? 1.5 : 0} />
        </svg>
      )}
      {hover != null && labels && (
        <div className="spark-tip" style={{ left: Math.min(Math.max(pts[idx][0] - 70, -8), w - 132) }} role="status">
          <b className="num">{values[idx].toLocaleString()}</b> {unit}
          <span>{labels[idx]}</span>
        </div>
      )}
    </div>
  )
}

// ---------- Stacked alert volume (bars per hour) ----------
export function AlertVolume({ data, showAuto = false }: { data: HourPoint[]; showAuto?: boolean }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const H = 220, padL = 32, padB = 22, padT = 8
  // Axis runs to 4 × a "nice" step so every tick label is a whole number.
  const rawMax = Math.max(1, ...data.map(d => d.high + d.medium + d.low))
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500].find(n => n * 4 >= rawMax) ?? Math.ceil(rawMax / 4)
  const max = step * 4
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
          {showAuto && (
            <path d={data.map((d, i) => `${i ? 'L' : 'M'}${padL + i * bw + bw / 2} ${y(d.autoDeclined)}`).join('')}
              fill="none" stroke="var(--text)" strokeWidth={1.5} strokeDasharray="4 3" pointerEvents="none" />
          )}
          {data.map((d, i) =>
            (data.length <= 12 ? d.t.getUTCHours() % 3 === 0 : d.t.getUTCHours() % 6 === 0) ? (
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
  const [hover, setHover] = useState<number | null>(null)
  const H = 160, padB = 20, padT = 6, B = 20, step = 100 / B
  const bins = Array.from({ length: B }, () => 0)
  scores.forEach(s => bins[Math.min(B - 1, Math.floor(s / step))]++)
  const max = Math.max(...bins, 1)
  const bw = w / B, ih = H - padB - padT
  const tx = (threshold / 100) * w
  const bandAt = (i: number): Band => { const mid = (i + 0.5) * step; return mid >= 70 ? 'high' : mid >= 40 ? 'medium' : 'low' }
  return (
    <div ref={ref} className="chart" onPointerLeave={() => setHover(null)}>
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label="Distribution of risk scores across cases">
          <line x1={0} x2={w} y1={padT + ih} y2={padT + ih} className="grid" />
          {bins.map((v, i) => {
            const h = (v / max) * ih
            return (
              <g key={i} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
                <rect x={i * bw} y={0} width={bw} height={padT + ih} fill="transparent" />
                <rect x={i * bw + 1} y={padT + ih - h} width={bw - 2} height={h} rx={2} fill={bandVar(bandAt(i))}
                  opacity={hover == null || hover === i ? 0.9 : 0.4} />
              </g>
            )
          })}
          <line x1={tx} x2={tx} y1={0} y2={padT + ih} stroke="var(--text)" strokeDasharray="3 3" pointerEvents="none" />
          <text x={tx > w - 120 ? tx - 4 : tx + 4} y={12} textAnchor={tx > w - 120 ? 'end' : 'start'} className="axis strong" pointerEvents="none">Auto-decline ≥ {threshold}</text>
          {[0, 20, 40, 60, 80, 100].map(v => (
            <text key={v} x={(v / 100) * w} y={H - 4} textAnchor={v === 0 ? 'start' : v === 100 ? 'end' : 'middle'} className="axis">{v}</text>
          ))}
        </svg>
      )}
      {hover != null && (
        <div className="tooltip" style={{ left: Math.min(w - 170, Math.max(0, hover * bw - 70)), top: 20 }}>
          <b>Score {hover * step}–{hover * step + step - 1}</b>
          <div className="tt-row"><span><i className="dot" style={{ background: bandVar(bandAt(hover)) }} />{bandAt(hover)[0].toUpperCase() + bandAt(hover).slice(1)} risk</span><span className="num">{bins[hover]} case{bins[hover] === 1 ? '' : 's'}</span></div>
          <div className="tt-row muted"><span>Share of cases</span><span className="num">{scores.length ? Math.round((bins[hover] / scores.length) * 100) : 0}%</span></div>
          {hover * step >= threshold && <div className="tt-row muted"><span>Auto-declined</span><span>Yes</span></div>}
        </div>
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
        <span className="gauge-num" style={{ color: bandText(band) }}>{score}</span>
        <span className="gauge-cap">of 100</span>
      </div>
    </div>
  )
}

// ---------- Horizontal bar list ----------
export function BarList({ rows }: { rows: { label: ReactNode; value: number; display?: ReactNode; color?: string }[] }) {
  const max = Math.max(...rows.map(r => r.value), 1)
  return (
    <div className="barlist">
      {rows.map((r, i) => (
        <div className="barlist-row" key={i}>
          <div className="barlist-label">{r.label}</div>
          <ProgressBar value={(r.value / max) * 100} color={r.color ?? 'var(--viz-brand)'} label={`${typeof r.label === 'string' ? r.label : 'Value'}: ${r.value}`} />
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
      <span className={`slds-badge pill pill-${band}`}>{band === 'high' ? 'High' : band === 'medium' ? 'Med' : 'Low'}</span>
      <span className="num">{score}</span>
      <ProgressBar value={score} color={bandVar(band)} size="x-small" label={`Risk score ${score} of 100`} />
    </span>
  )
}

// ---------- Trend chart: 1–3 lines over time, one axis, crosshair + tooltip ----------
export interface TrendSeries { name: string; values: number[]; color: string; dash?: boolean; area?: boolean }
export function TrendChart({ series, labels, xTick, unit = '', height = 200, threshold, marker, ariaLabel, fmt = (v: number) => v.toLocaleString('en-GB') }: {
  series: TrendSeries[]; labels: string[]; xTick: (i: number) => string | null; unit?: string; height?: number
  threshold?: { value: number; label: string }; marker?: { index: number; label: string }; ariaLabel: string; fmt?: (v: number) => string
}) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const H = height, padL = 40, padB = 22, padT = 14
  const n = labels.length
  const rawMax = Math.max(1, threshold?.value ?? 0, ...series.flatMap(s => s.values))
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000].find(k => k * 4 >= rawMax) ?? Math.ceil(rawMax / 4)
  const max = step * 4
  const iw = Math.max(0, w - padL - 4), ih = H - padB - padT
  const x = (i: number) => padL + (i / Math.max(1, n - 1)) * iw
  const y = (v: number) => padT + ih - (v / max) * ih
  const path = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('')
  const at = (clientX: number) => { const r = ref.current!.getBoundingClientRect(); setHover(Math.max(0, Math.min(n - 1, Math.round(((clientX - r.left - padL) / iw) * (n - 1))))) }
  return (
    <div className="fs-trend">
      {series.length > 1 && (
        <div className="legend fs-trend-legend">
          {series.map(s => <span key={s.name}><svg width="18" height="8" aria-hidden="true"><line x1="0" x2="18" y1="4" y2="4" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash ? '4 3' : undefined} /></svg>&nbsp;{s.name}</span>)}
        </div>
      )}
      <div ref={ref} className="chart" onPointerMove={e => at(e.clientX)} onPointerDown={e => at(e.clientX)} onPointerLeave={() => setHover(null)}>
        {w > 0 && (
          <svg width={w} height={H} role="img" aria-label={ariaLabel}>
            {[0, 1, 2, 3, 4].map(k => (
              <g key={k}>
                <line x1={padL} x2={w} y1={y(k * step)} y2={y(k * step)} className="grid" />
                <text x={padL - 6} y={y(k * step) + 4} textAnchor="end" className="axis">{fmt(k * step)}</text>
              </g>
            ))}
            {labels.map((_, i) => { const t = xTick(i); return t ? <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="axis">{t}</text> : null })}
            {marker && (
              <g>
                <line x1={x(marker.index)} x2={x(marker.index)} y1={padT - 4} y2={padT + ih} stroke="var(--muted)" strokeDasharray="3 3" />
                <text x={x(marker.index) + 4} y={padT + 2} className="axis fs-trend-mark">{marker.label}</text>
              </g>
            )}
            {threshold && (
              <g>
                <line x1={padL} x2={w} y1={y(threshold.value)} y2={y(threshold.value)} stroke="var(--risk-high)" strokeDasharray="5 4" />
                <text x={w - 2} y={y(threshold.value) - 4} textAnchor="end" className="axis fs-trend-thr">{threshold.label}</text>
              </g>
            )}
            {series.map(s => (
              <g key={s.name}>
                {s.area && <path d={`${path(s.values)}L${x(n - 1)} ${y(0)}L${x(0)} ${y(0)}Z`} fill={s.color} opacity={0.12} />}
                <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dash ? '5 4' : undefined} strokeLinejoin="round" />
              </g>
            ))}
            {hover != null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih} stroke="var(--border-strong)" />}
            {series.map(s => {
              const i = hover ?? n - 1
              return <circle key={s.name} cx={x(i)} cy={y(s.values[i])} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
            })}
          </svg>
        )}
        {hover != null && (
          <div className="tooltip" style={{ left: Math.min(w - 180, Math.max(0, x(hover) - 80)), top: 0 }} role="status">
            <b>{labels[hover]}</b>
            {series.map(s => (
              <div key={s.name} className="tt-row"><span><i className="dot" style={{ background: s.color }} />{s.name}</span><span className="num">{fmt(s.values[hover])}{unit ? ` ${unit}` : ''}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Columns: stacked counts per bucket, optional capacity marker per column ----------
export interface ColumnRow { label: string; segs: { name: string; value: number; color: string }[]; cap?: number; note?: string }
export function ColumnChart({ rows, height = 200, capLabel = 'Capacity', ariaLabel }: { rows: ColumnRow[]; height?: number; capLabel?: string; ariaLabel: string }) {
  const [ref, w] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const H = height, padL = 32, padB = 22, padT = 18
  const tot = (r: ColumnRow) => r.segs.reduce((s, x) => s + x.value, 0)
  const rawMax = Math.max(1, ...rows.map(r => Math.max(tot(r), r.cap ?? 0)))
  const step = [1, 2, 5, 10, 20, 25, 50, 100].find(k => k * 4 >= rawMax) ?? Math.ceil(rawMax / 4)
  const max = step * 4
  const iw = Math.max(0, w - padL), ih = H - padB - padT
  const slot = iw / Math.max(1, rows.length), bw = Math.min(56, slot * 0.6)
  const y = (v: number) => padT + ih - (v / max) * ih
  const names = [...new Map(rows.flatMap(r => r.segs.map(s => [s.name, s.color] as const))).entries()]
  return (
    <div className="fs-trend">
      <div className="legend fs-trend-legend">
        {names.length > 1 && names.map(([nm, c]) => <span key={nm}><i className="dot" style={{ background: c }} />{nm}</span>)}
        {rows.some(r => r.cap != null) && <span><svg width="18" height="8" aria-hidden="true"><line x1="0" x2="18" y1="4" y2="4" stroke="var(--text)" strokeWidth="2" /></svg>&nbsp;{capLabel}</span>}
      </div>
      <div ref={ref} className="chart" onPointerLeave={() => setHover(null)}>
        {w > 0 && (
          <svg width={w} height={H} role="img" aria-label={ariaLabel}>
            {[0, 1, 2, 3, 4].map(k => (
              <g key={k}><line x1={padL} x2={w} y1={y(k * step)} y2={y(k * step)} className="grid" /><text x={padL - 6} y={y(k * step) + 4} textAnchor="end" className="axis">{k * step}</text></g>
            ))}
            {rows.map((r, i) => {
              const cx = padL + slot * i + slot / 2
              let acc = 0
              return (
                <g key={r.label} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} opacity={hover == null || hover === i ? 1 : 0.5}>
                  <rect x={padL + slot * i} y={padT} width={slot} height={ih} fill="transparent" />
                  {r.segs.map((s, k) => {
                    const top = k === r.segs.length - 1
                    const el = s.value > 0 ? <rect key={s.name} x={cx - bw / 2} y={y(acc + s.value) + (k ? 0 : 0)} width={bw} height={Math.max(0, (s.value / max) * ih - (k ? 2 : 0))} rx={top ? 3 : 0} fill={s.color} /> : null
                    acc += s.value
                    return el
                  })}
                  <text x={cx} y={y(Math.max(tot(r), r.cap != null && Math.abs(r.cap - tot(r)) < max * 0.08 ? r.cap : 0)) - 6} textAnchor="middle" className="axis fs-col-val">{tot(r)}</text>
                  {r.cap != null && <line x1={cx - bw / 2 - 6} x2={cx + bw / 2 + 6} y1={y(r.cap)} y2={y(r.cap)} stroke="var(--text)" strokeWidth={2} />}
                  <text x={cx} y={H - 6} textAnchor="middle" className="axis">{r.label}</text>
                </g>
              )
            })}
          </svg>
        )}
        {hover != null && (
          <div className="tooltip" style={{ left: Math.min(w - 190, Math.max(0, padL + slot * hover + slot / 2 - 90)), top: 0 }} role="status">
            <b>{rows[hover].label}</b>
            {rows[hover].segs.map(s => <div key={s.name} className="tt-row"><span><i className="dot" style={{ background: s.color }} />{s.name}</span><span className="num">{s.value}</span></div>)}
            {rows[hover].cap != null && <div className="tt-row"><span>{capLabel}</span><span className="num">{rows[hover].cap}</span></div>}
            {rows[hover].note && <div className="tt-row muted"><span>{rows[hover].note}</span></div>}
          </div>
        )}
      </div>
    </div>
  )
}
