// Team lead view: see where the SLA is at risk, why, and act on it by assigning cases.
import { useMemo, useState } from 'react'
import { CASES, NOW, SOURCES, SOURCE_HEALTH, fmtDateTime, fmtDur, fmtTime, sourceName, sourceShort, type FraudCase, type SourceId } from '../data'
import { BarList, ColumnChart, ScoreCell, Sparkline, TrendChart, bandVar } from '../components/charts'
import { InfoTip } from '../components/InfoTip'
import { PageHeader, ProgressBar, RadioButtonGroup, ScopedNotification, useToast } from '../components/slds'
import {
  ALERT_MS, CAUSE_HELP, DEGRADED, OPEN_CASES, OUTAGE_AT, SPECIALISTS, STEPS, caseOps, teamHistory, causeOf, specialist, suggestFor, useAssignments, type Cause,
} from '../ops'

type Show = 'atRisk' | 'breached' | 'unassigned' | 'all'
const left = (c: FraudCase) => c.slaDueAt.getTime() - NOW.getTime()
const H = 3600_000
const fmtMin = (m: number) => m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
const CAUSE_ORDER: Cause[] = ['Unassigned', 'Specialist unavailable', 'Specialist overloaded', 'System degraded', 'Waiting on customer', 'In progress']

export function Observability({ onOpen }: { onOpen: (id: string) => void }) {
  const a = useAssignments()
  const toast = useToast()
  const [show, setShow] = useState<Show>('atRisk')
  const [cause, setCause] = useState<Cause | 'all'>('all')
  const [who, setWho] = useState<string>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkTo, setBulkTo] = useState('')
  const [sys, setSys] = useState<SourceId>(DEGRADED[0] ?? 'device')

  const breached = OPEN_CASES.filter(c => left(c) < 0)
  const due1h = OPEN_CASES.filter(c => left(c) >= 0 && left(c) < H)
  const atRisk = OPEN_CASES.filter(c => left(c) < 4 * H)
  const unassigned = OPEN_CASES.filter(c => !a.assignee(c.id))
  const available = SPECIALISTS.filter(s => s.status === 'Available')
  const freeSlots = available.reduce((n, s) => n + Math.max(0, s.capacity - a.load(s.id)), 0)
  const decided = CASES.filter(c => c.status === 'Decided')
  const agreed = decided.filter(c => caseOps(c).aiAgreed).length
  const hist = useMemo(() => teamHistory({ open: OPEN_CASES.length, breached: breached.length, due1h: due1h.length, unassigned: unassigned.length, free: freeSlots, decided: decided.length, agreed }),
    [breached.length, due1h.length, unassigned.length, freeSlots, decided.length, agreed])
  const hourLabels = hist.hours.map(h => `${fmtTime(h)}–${fmtTime(new Date(h.getTime() + H))} UTC`)
  const hourTick = (i: number) => i === 23 ? 'Now' : (23 - i) % 6 === 0 ? `−${23 - i}h` : null
  const outageIdx = 24 - OUTAGE_AT
  const outageLabel = `${DEGRADED.map(sourceShort).join(', ')} degraded`
  const dayLabel = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })

  // SLA forecast: open cases by when they're due, against what the team can decide in that window.
  const perHour = available.reduce((t, s) => t + 60 / s.avgDecisionMin, 0) * 0.6 // ~60% of time goes on deciding
  const buckets: { label: string; from: number; to: number }[] = [{ label: 'Breached', from: -Infinity, to: 0 }, { label: '0–1h', from: 0, to: 1 }, { label: '1–2h', from: 1, to: 2 }, { label: '2–4h', from: 2, to: 4 }, { label: '4–8h', from: 4, to: 8 }]
  let capUsed = 0, backlogCarry = 0
  const forecast = buckets.map(b => {
    const cs = OPEN_CASES.filter(c => left(c) / H >= b.from && left(c) / H < b.to)
    const cap = b.from === -Infinity ? undefined : Math.round(perHour * (b.to - b.from))
    let late = 0
    if (b.from === -Infinity) backlogCarry = cs.length
    else { const need = cs.length + backlogCarry; late = Math.max(0, need - (cap ?? 0)); backlogCarry = late; capUsed += cap ?? 0 }
    return { b, n: cs.length, high: cs.filter(c => c.band === 'high').length, cap, late }
  })
  const next2 = forecast.slice(1, 3), likelyLate = forecast[2].late

  const rows = useMemo(() => {
    const base = show === 'breached' ? breached : show === 'unassigned' ? unassigned : show === 'atRisk' ? atRisk : OPEN_CASES
    return base
      .filter(c => cause === 'all' || causeOf(c, a) === cause)
      .filter(c => who === 'all' || (who === 'none' ? !a.assignee(c.id) : a.assignee(c.id) === who))
      .sort((x, y) => left(x) - left(y))
  }, [show, cause, who, a, breached, unassigned, atRisk])

  // Breaches and near-breaches by cause.
  const late = [...breached, ...due1h]
  const byCause = CAUSE_ORDER.map(k => ({ k, n: late.filter(c => causeOf(c, a) === k).length })).filter(x => x.n)

  // Time in each step (open cases, average).
  const steps = STEPS.slice(0, 3).map(s => {
    const cs = OPEN_CASES.filter(c => caseOps(c).step === s)
    return { s, n: cs.length, avg: cs.length ? Math.round(cs.reduce((t, c) => t + caseOps(c).minutesInStep, 0) / cs.length) : 0 }
  })
  const slowest = steps.slice().sort((x, y) => y.avg - x.avg)[0]

  const assign = (ids: string[], to: string) => {
    if (!ids.length || !to) return
    a.assign(ids, to)
    setSelected(new Set())
    toast('success', `${ids.length} case${ids.length > 1 ? 's' : ''} assigned to ${specialist(to)!.name}`)
  }
  const assignSuggested = (ids: string[]) => {
    const extra: Record<string, number> = {}
    const plan: Record<string, string[]> = {}
    for (const id of ids) {
      const c = CASES.find(x => x.id === id)!
      const s = suggestFor(c, a, extra); if (!s) continue
      extra[s.id] = (extra[s.id] ?? 0) + 1;(plan[s.id] ??= []).push(id)
    }
    Object.entries(plan).forEach(([to, cs]) => a.assign(cs, to))
    setSelected(new Set())
    const n = Object.values(plan).flat().length
    toast(n ? 'success' : 'error', n ? `${n} case${n > 1 ? 's' : ''} assigned to ${Object.keys(plan).length} specialist${Object.keys(plan).length > 1 ? 's' : ''} by skill and free capacity` : 'No available specialist with the right skills')
  }
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOn = rows.length > 0 && rows.every(c => selected.has(c.id))

  return (
    <div className="stack">
      <PageHeader icon="dashboard" label="Team lead" title="Observability"
        meta={<><span className="fs-live"><i />Live</span> · Updated {fmtDateTime(NOW)} UTC · {OPEN_CASES.length} open cases · {SPECIALISTS.length} specialists · Synthetic data</>} />

      {breached.length > 0 && (
        <ScopedNotification variant="error" link={{ label: 'Show breached cases', onClick: () => { setShow('breached'); setCause('all'); setWho('all') } }}>
          <b>{breached.length} cases have breached their SLA</b> and {due1h.length} more are due within 1 hour. {breached.filter(c => !a.assignee(c.id)).length} of the breached cases have no owner.
        </ScopedNotification>
      )}
      {DEGRADED.map(id => {
        const hit = OPEN_CASES.filter(c => c.factors.some(f => f.source === id))
        return (
          <ScopedNotification key={id} variant="warning" link={{ label: 'Show affected cases', onClick: () => { setShow('all'); setCause('System degraded'); setWho('all') } }}>
            <b>{sourceName(id)} is degraded</b> (p95 {SOURCE_HEALTH.find(s => s.id === id)!.latencyP95.toLocaleString()} ms). {hit.length} open cases rely on it, {hit.filter(c => left(c) < H).length} of them breached or due within 1 hour. Specialists should check it manually or refer.
          </ScopedNotification>
        )
      })}

      <section className="kpis" aria-label="Team status now">
        <Tile label="SLA breached" value={breached.length} note={`${breached.filter(c => c.band === 'high').length} high risk · was ${hist.breached[0]} 24h ago`} tone="bad"
          spark={hist.breached} labels={hourLabels} unit="breached" color={bandVar('high')} />
        <Tile label="Due within 1 hour" value={due1h.length} note={`${atRisk.length} due within 4 hours`} tone={due1h.length ? 'warn' : 'good'}
          spark={hist.due1h} labels={hourLabels} unit="due within 1h" color={bandVar('medium')} />
        <Tile label="Unassigned" value={unassigned.length} note={`${unassigned.filter(c => left(c) < 4 * H).length} due within 4 hours`} tone={unassigned.length ? 'warn' : 'good'}
          spark={hist.unassigned} labels={hourLabels} unit="unassigned" />
        <Tile label="Team capacity" value={freeSlots} note={`free slots · ${available.length} of ${SPECIALISTS.length} specialists available`} tone="neutral"
          spark={hist.free} labels={hourLabels} unit="free slots" />
        <Tile label="AI recommendation agreed" value={agreed} note={`of ${decided.length} decided cases · ${decided.length - agreed} overridden`} tone="neutral"
          info="How often specialists decided the same as the AI recommended. Many overrides can mean the model needs review."
          spark={hist.dayAgreed} labels={hist.days.map(dayLabel)} unit="agreed" />
      </section>

      <section className="grid-2-1 fs-obs-charts">
        <div className="slds-card card">
          <header className="card-h"><div>
            <h2 className="fs-h-info">Are we keeping up?<InfoTip label="Are we keeping up?"><span>New cases each hour against cases decided. When the line for new cases stays above decided, the backlog grows and SLA breaches follow.</span></InfoTip></h2>
            <p className="sub">Cases in against cases decided, per hour, last 24 hours. Hover for values.</p>
          </div></header>
          <TrendChart ariaLabel="Cases in and decided per hour, last 24 hours" labels={hourLabels} xTick={hourTick} unit="cases"
            marker={DEGRADED.length ? { index: outageIdx, label: outageLabel } : undefined}
            series={[{ name: 'Cases in', values: hist.casesIn, color: 'var(--viz-brand)' }, { name: 'Decided', values: hist.decided, color: 'var(--viz-series-2)', dash: true }]} />
          <p className="small fs-obs-read">Since {fmtTime(hist.hours[outageIdx])} UTC: <b>{hist.casesIn.slice(outageIdx).reduce((a, b) => a + b, 0)} in</b>, <b>{hist.decided.slice(outageIdx).reduce((a, b) => a + b, 0)} decided</b>. The backlog grew by {hist.backlog[23] - hist.backlog[outageIdx - 1]}.</p>
        </div>
        <div className="slds-card card">
          <header className="card-h"><div>
            <h2 className="fs-h-info">SLA forecast<InfoTip label="SLA forecast"><span>Open cases by when their SLA is due. The black line is roughly how many the available specialists can decide in that window. Cases above the line, plus any already breached, are likely to breach.</span></InfoTip></h2>
            <p className="sub">Open cases by SLA due time, against what the team can decide</p>
          </div></header>
          <ColumnChart ariaLabel="Open cases by SLA due window, with team capacity" capLabel="Team can decide"
            rows={forecast.map(f => ({ label: f.b.label, cap: f.cap, note: f.late ? `${f.late} likely to breach` : undefined,
              segs: [{ name: f.b.label === 'Breached' ? 'Breached' : 'Cases due', value: f.n, color: f.b.label === 'Breached' ? bandVar('high') : 'var(--viz-brand)' }] }))} />
          {likelyLate > 0
            ? <ScopedNotification variant="warning">About <b>{likelyLate} more cases</b> will breach in the next 2 hours ({next2.reduce((t, f) => t + f.n, 0)} due, team can decide about {next2.reduce((t, f) => t + (f.cap ?? 0), 0)} after clearing the {breached.length} breached). Free up or add specialists.</ScopedNotification>
            : <p className="small fs-obs-read">The team can clear what's due in the next 2 hours.</p>}
        </div>
      </section>

      <section className="grid-2 fs-obs-charts">
        <div className="slds-card card">
          <header className="card-h"><div><h2>Open cases and breaches</h2><p className="sub">Last 24 hours. Breached cases are part of the open total.</p></div></header>
          <TrendChart ariaLabel="Open cases and breached cases, last 24 hours" labels={hourLabels} xTick={hourTick} unit="cases"
            marker={DEGRADED.length ? { index: outageIdx, label: outageLabel } : undefined}
            series={[{ name: 'Open cases', values: hist.backlog, color: 'var(--viz-brand)', area: true }, { name: 'Breached SLA', values: hist.breached, color: bandVar('high') }]} />
        </div>
        <div className="slds-card card">
          <header className="card-h">
            <div><h2>System response time</h2><p className="sub">Slowest 5% of responses (p95), last 24 hours. Red line: alert at {ALERT_MS.toLocaleString()} ms.</p></div>
          </header>
          <RadioButtonGroup name="obs-sys" legend="System" size="small" value={sys} onChange={setSys}
            options={SOURCES.map(s => ({ value: s.id, label: <>{s.short}{DEGRADED.includes(s.id) ? ' ⚠' : ''}</> }))} />
          <TrendChart ariaLabel={`${sourceName(sys)} response time, last 24 hours`} labels={hourLabels} xTick={hourTick} unit="ms" height={180}
            threshold={{ value: ALERT_MS, label: 'Alert' }} marker={DEGRADED.includes(sys) ? { index: outageIdx, label: 'Degraded' } : undefined}
            series={[{ name: sourceName(sys), values: hist.latency[sys], color: 'var(--viz-brand)' }]} />
        </div>
      </section>

      <section className="slds-card card" aria-label="Act now">
        <header className="card-h">
          <div>
            <h2>Act now</h2>
            <p className="sub">Open cases sorted by SLA, with the reason each is at risk. Select cases to assign them, or use the suggested specialist (right skills, most free capacity).</p>
          </div>
          <RadioButtonGroup name="obs-show" legend="Show cases" size="small" value={show} onChange={v => { setShow(v); setSelected(new Set()) }}
            options={[{ value: 'atRisk' as Show, label: `Due < 4h (${atRisk.length})` }, { value: 'breached' as Show, label: `Breached (${breached.length})` }, { value: 'unassigned' as Show, label: `Unassigned (${unassigned.length})` }, { value: 'all' as Show, label: 'All open' }]} />
        </header>

        <div className="fs-obs-filters">
          <div className="slds-form-element">
            <label className="slds-form-element__label" htmlFor="obs-cause">Cause</label>
            <div className="slds-form-element__control"><div className="slds-select_container">
              <select className="slds-select" id="obs-cause" value={cause} onChange={e => setCause(e.target.value as Cause | 'all')}>
                <option value="all">All causes</option>{CAUSE_ORDER.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div></div>
          </div>
          <div className="slds-form-element">
            <label className="slds-form-element__label" htmlFor="obs-who">Assigned to</label>
            <div className="slds-form-element__control"><div className="slds-select_container">
              <select className="slds-select" id="obs-who" value={who} onChange={e => setWho(e.target.value)}>
                <option value="all">Anyone</option><option value="none">Nobody</option>{SPECIALISTS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div></div>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="fs-obs-bulk" role="region" aria-label="Bulk assign">
            <b>{selected.size} selected</b>
            <div className="slds-select_container">
              <select className="slds-select" aria-label="Assign selected cases to" value={bulkTo} onChange={e => setBulkTo(e.target.value)}>
                <option value="">Choose a specialist…</option>
                {SPECIALISTS.map(s => <option key={s.id} value={s.id} disabled={s.status !== 'Available'}>{s.name} · {Math.max(0, s.capacity - a.load(s.id))} free{s.status !== 'Available' ? ` · ${s.status}` : ''}</option>)}
              </select>
            </div>
            <button className="slds-button slds-button_brand" disabled={!bulkTo} onClick={() => assign([...selected], bulkTo)}>Assign</button>
            <button className="slds-button slds-button_neutral" onClick={() => assignSuggested([...selected])}>Assign to suggested</button>
            <button className="slds-button" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}

        <div className="table-wrap">
          <table className="slds-table slds-table_cell-buffer slds-table_bordered data fs-obs-table">
            <thead><tr>
              <th className="fs-obs-check">
                <div className="slds-checkbox"><input type="checkbox" id="obs-all" checked={allOn} onChange={() => setSelected(allOn ? new Set() : new Set(rows.map(c => c.id)))} />
                  <label className="slds-checkbox__label" htmlFor="obs-all"><span className="slds-checkbox_faux" /><span className="slds-assistive-text">Select all</span></label></div>
              </th>
              <th>Case</th><th>Risk</th><th className="r">SLA</th><th>Step</th><th>Why it's at risk</th><th>Assigned to</th><th>Action</th>
            </tr></thead>
            <tbody>
              {rows.map(c => {
                const l = left(c), k = causeOf(c, a), owner = specialist(a.assignee(c.id)), ops = caseOps(c), sug = suggestFor(c, a)
                const needsMove = k === 'Unassigned' || k === 'Specialist unavailable' || k === 'Specialist overloaded'
                return (
                  <tr key={c.id} className={selected.has(c.id) ? 'slds-is-selected' : ''}>
                    <td className="fs-obs-check">
                      <div className="slds-checkbox"><input type="checkbox" id={`obs-${c.id}`} checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                        <label className="slds-checkbox__label" htmlFor={`obs-${c.id}`}><span className="slds-checkbox_faux" /><span className="slds-assistive-text">Select {c.id}</span></label></div>
                    </td>
                    <td><a href={`#case-${c.id}`} onClick={e => { e.preventDefault(); onOpen(c.id) }} className="mono">{c.id}</a><div className="muted small">{c.type}</div></td>
                    <td><ScoreCell score={c.score} band={c.band} /></td>
                    <td className={`r num ${l < 0 ? 'bad' : l < H ? 'warn' : ''}`}>{l < 0 ? `Breached ${fmtDur(-l)}` : `Due in ${fmtDur(l)}`}</td>
                    <td className="small">{ops.step}<div className="muted">{fmtMin(ops.minutesInStep)} in step</div></td>
                    <td><span className={`slds-badge ${k === 'In progress' ? 'slds-badge_lightest' : k === 'System degraded' || k === 'Waiting on customer' ? 'pill pill-medium' : 'pill pill-high'}`}>{k}</span>
                      <InfoTip label={k}><span>{CAUSE_HELP[k].help} <b>Action:</b> {CAUSE_HELP[k].action}</span></InfoTip></td>
                    <td className="small">{owner ? <>{owner.name}{owner.status !== 'Available' && <div className="muted">{owner.status}</div>}</> : <span className="muted">Nobody</span>}</td>
                    <td>
                      {needsMove && sug && sug.id !== owner?.id
                        ? <button className="slds-button slds-button_neutral small" onClick={() => assign([c.id], sug.id)}>{owner ? 'Reassign' : 'Assign'} to {sug.name.split(' ')[0]}</button>
                        : k === 'System degraded' ? <span className="small muted">Check {DEGRADED.map(d => sourceShort(d).replace(/ check$/, '')).join(', ')} manually or refer</span>
                        : k === 'Waiting on customer' ? <span className="small muted">Chase customer</span>
                        : needsMove ? <span className="small muted">No one free with these skills</span>
                        : <span className="small muted">Check in with {owner?.name.split(' ')[0]}</span>}
                    </td>
                  </tr>
                )
              })}
              {!rows.length && <tr><td colSpan={8} className="muted small">No cases match.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="muted small">{rows.length} case{rows.length === 1 ? '' : 's'} shown.</p>
      </section>

      <section className="slds-card card" aria-label="Team workload">
        <header className="card-h"><div><h2>Team workload</h2><p className="sub">Open cases each specialist holds against what they can handle. Updates as you assign. Select a name to see their cases.</p></div></header>
        <div className="table-wrap">
          <table className="slds-table slds-table_cell-buffer slds-table_bordered data">
            <thead><tr><th>Specialist</th><th>Skills</th><th>Status</th><th>Open cases</th><th className="r">Breached</th><th className="r">Due &lt; 1h</th><th className="r">Avg time to decide</th><th className="r">Decided today</th></tr></thead>
            <tbody>
              {SPECIALISTS.map(s => {
                const mine = OPEN_CASES.filter(c => a.assignee(c.id) === s.id), load = mine.length, over = load > s.capacity
                return (
                  <tr key={s.id}>
                    <td><button className="slds-button fs-obs-link" title="Show their cases in Act now" onClick={() => { setWho(s.id); setShow('all'); setCause('all'); document.querySelector('[aria-label="Act now"]')?.scrollIntoView({ behavior: 'smooth' }) }}><b>{s.name}</b></button></td>
                    <td className="small">{s.skills.join(', ')}</td>
                    <td><span className={`slds-badge ${s.status === 'Available' ? 'pill pill-low' : s.status === 'Away' ? 'pill pill-high' : 'pill pill-medium'}`}>{s.status}</span></td>
                    <td className="fs-obs-load">
                      <span className={`num ${over ? 'bad' : ''}`}>{load} of {s.capacity}</span>
                      <ProgressBar value={Math.min(100, (load / s.capacity) * 100)} color={over ? bandVar('high') : load / s.capacity > 0.8 ? bandVar('medium') : 'var(--viz-brand)'} label={`${s.name}: ${load} of ${s.capacity} cases`} />
                    </td>
                    <td className={`r num ${mine.some(c => left(c) < 0) ? 'bad' : ''}`}>{mine.filter(c => left(c) < 0).length}</td>
                    <td className="r num">{mine.filter(c => left(c) >= 0 && left(c) < H).length}</td>
                    <td className="r num">{s.avgDecisionMin} min</td>
                    <td className="r num">{s.decidedToday}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid-3">
        <div className="slds-card card">
          <header className="card-h"><div><h2>Why cases are late</h2><p className="sub">{late.length} cases breached or due within 1 hour, by cause</p></div></header>
          {byCause.length ? <BarList rows={byCause.map(x => ({ label: <button className="slds-button fs-obs-link" onClick={() => { setShow('all'); setCause(x.k); setWho('all') }}>{x.k}</button>, value: x.n, color: x.k === 'In progress' ? 'var(--viz-brand)' : bandVar(x.k === 'System degraded' || x.k === 'Waiting on customer' ? 'medium' : 'high') }))} />
            : <p className="muted small">Nothing late.</p>}
          <p className="muted small">Select a cause to see its cases in Act now.</p>
        </div>
        <div className="slds-card card">
          <header className="card-h"><div><h2>Where cases wait</h2><p className="sub">Average time open cases have spent in their current step</p></div></header>
          <BarList rows={steps.map(x => ({ label: `${x.s} (${x.n})`, value: x.avg, display: fmtMin(x.avg), color: x === slowest ? bandVar('medium') : 'var(--viz-brand)' }))} />
          <p className="muted small"><b>{slowest.s}</b> is the slowest step: {fmtMin(slowest.avg)} on average across {slowest.n} cases.</p>
        </div>
        <div className="slds-card card">
          <header className="card-h"><div><h2>Systems feeding cases</h2><p className="sub">Health of the 5 platforms brought into each case</p></div></header>
          <ul className="fs-obs-systems">
            {SOURCE_HEALTH.map(s => {
              const n = OPEN_CASES.filter(c => c.factors.some(f => f.source === s.id)).length
              return (
                <li key={s.id}>
                  <span><b>{sourceName(s.id)}</b><span className="muted small"> · {n} open cases · p95 {s.latencyP95.toLocaleString()} ms · uptime {s.uptime}</span></span>
                  <span className={`slds-badge ${s.status === 'ok' ? 'pill pill-low' : 'pill pill-medium'}`}>{s.status === 'ok' ? 'Healthy' : 'Degraded'}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section className="grid-2 fs-obs-charts">
        <div className="slds-card card">
          <header className="card-h"><div><h2>Decisions, last 7 days</h2><p className="sub">Cases decided each day: agreed with the AI recommendation, or overridden</p></div></header>
          <ColumnChart ariaLabel="Decisions per day, agreed or overridden, last 7 days"
            rows={hist.days.map((d, i) => ({ label: i === 6 ? 'Today' : dayLabel(d), segs: [
              { name: 'Agreed with AI', value: hist.dayAgreed[i], color: 'var(--viz-brand)' },
              { name: 'Overridden', value: hist.dayDecided[i] - hist.dayAgreed[i], color: 'var(--viz-series-2)' }] }))} />
        </div>
        <div className="slds-card card">
          <header className="card-h"><div><h2>Average time to decide</h2><p className="sub">Minutes from opening a case to the decision, last 7 days</p></div></header>
          <TrendChart ariaLabel="Average minutes to decide, last 7 days" labels={hist.days.map(dayLabel)} xTick={i => i === 6 ? 'Today' : dayLabel(hist.days[i])} unit="min" height={200}
            series={[{ name: 'Average time to decide', values: hist.dayAvgDecide, color: 'var(--viz-brand)', area: true }]} />
          <p className="small fs-obs-read">Today is <b>{hist.dayAvgDecide[6] - Math.round(hist.dayAvgDecide.slice(0, 6).reduce((a, b) => a + b, 0) / 6)} minutes slower</b> than the 6-day average, since {outageLabel.replace(' degraded', '')} became degraded.</p>
        </div>
      </section>

      <section className="slds-card card" aria-label="AI recommendation quality">
        <header className="card-h"><div><h2>AI recommendation by outcome</h2><p className="sub">Decided cases by recommended outcome. Many overrides for one outcome can mean the model needs review.</p></div></header>
        <BarList rows={(['Decline', 'Refer', 'Accept'] as const).map(o => {
          const ds = decided.filter(c => c.recommended === o), ok = ds.filter(c => caseOps(c).aiAgreed).length
          return { label: `Recommended ${o}`, value: ds.length ? ok / ds.length * 100 : 0, display: `${ok} of ${ds.length} agreed`, color: 'var(--viz-brand)' }
        })} />
      </section>

      {a.log.length > 0 && (
        <section className="slds-card card" aria-label="Your assignments">
          <header className="card-h"><div><h2>Your assignments</h2><p className="sub">Saved with each case for audit</p></div></header>
          <ul className="fs-obs-log">
            {a.log.map((l, i) => (
              <li key={i} className="small">Assigned <b>{l.caseIds.length} case{l.caseIds.length > 1 ? 's' : ''}</b> ({l.caseIds.join(', ')}) to <b>{specialist(l.to)!.name}</b>
                {l.from.some(Boolean) && <span className="muted"> · from {[...new Set(l.from.map(f => specialist(f)?.name ?? 'nobody'))].join(', ')}</span>}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Tile({ label, value, note, tone, info, spark, labels, unit, color }: { label: string; value: number; note: string; tone: 'bad' | 'warn' | 'good' | 'neutral'; info?: string; spark?: number[]; labels?: string[]; unit?: string; color?: string }) {
  return (
    <div className="slds-card card kpi">
      <span className="kpi-label">{label}{info && <InfoTip label={label}><span>{info}</span></InfoTip>}</span>
      <span className={`kpi-value num fs-tone-${tone}`}>{value}</span>
      <span className="kpi-delta neutral">{note}</span>
      {spark && <><Sparkline values={spark} labels={labels} unit={unit} color={color} /><span className="spark-hint">Hover or tap for values</span></>}
    </div>
  )
}
