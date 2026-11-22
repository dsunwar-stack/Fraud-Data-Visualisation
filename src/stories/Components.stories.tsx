import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ActivityTimeline, CheckboxButtonGroup, InfoTip, PageHeader, ProgressBar, RadioButtonGroup, ScopedNotification, ScoreCell, Sparkline, Toggle, bandVar, type NotificationVariant } from '../design-system'
import type { Band } from '../data'

const meta: Meta = { title: 'Components' }
export default meta

// ---------- Card ----------
type CardArgs = { title: string; description: string; body: string }
export const Card: StoryObj<CardArgs> = {
  args: { title: 'Data source health', description: 'Hits, precision and p95 latency, last 24h', body: '5 sources monitored. 1 is degraded.' },
  render: a => (
    <section className="slds-card card" style={{ maxWidth: 480 }}>
      <header className="card-h"><div><h2>{a.title}</h2><p className="sub">{a.description}</p></div></header>
      <p className="small">{a.body}</p>
    </section>
  ),
  parameters: { docs: { description: { story: 'Every block of content sits in an SLDS card: title, one-line description, optional control on the right, then content. `.slds-card` provides border, radius and shadow; don’t add your own.' } } },
}

// ---------- Metric card ----------
type MetricArgs = { label: string; value: string; delta: string; tone: 'bad' | 'good' | 'neutral'; band: Band | 'none' }
export const MetricCard: StoryObj<MetricArgs> = {
  name: 'Metric card',
  args: { label: 'High-risk alerts', value: '248', delta: '20% of volume', tone: 'bad', band: 'high' },
  argTypes: { tone: { control: 'inline-radio', options: ['bad', 'good', 'neutral'] }, band: { control: 'inline-radio', options: ['high', 'medium', 'low', 'none'] } },
  render: a => {
    const values = [8, 9, 7, 12, 10, 22, 14, 9, 11, 13, 10, 12]
    return (
      <div className="slds-card card kpi" style={{ width: 240 }}>
        <span className="kpi-label">{a.label}</span><span className="kpi-value num">{a.value}</span><span className={`kpi-delta ${a.tone}`}>{a.delta}</span>
        <Sparkline values={values} labels={values.map((_, i) => `${String(i * 2).padStart(2, '0')}:00 UTC`)} unit={a.label.toLowerCase()} color={a.band === 'none' ? undefined : bandVar(a.band)} />
      </div>
    )
  },
  parameters: { docs: { description: { story: 'Label, value, a context line and a trend line that shows hourly values on hover or tap. Always pass `labels` so the line is readable.' } } },
}

// ---------- Info icon ----------
type InfoArgs = { term: string; meaning: string; example: string }
export const InfoIcon: StoryObj<InfoArgs> = {
  name: 'Info icon',
  args: { term: 'Impersonation', meaning: 'The person exists, but the applicant is not them.', example: 'An account opened with details from a data breach.' },
  render: a => (
    <span className="hub-name"><b>{a.term}</b><InfoTip label={a.term}><span>{a.meaning}</span><span className="infotip-ex"><b>Example:</b> {a.example}</span></InfoTip></span>
  ),
  parameters: { docs: { description: { story: 'For specialist terms and numbers whose meaning isn’t obvious. Opens on hover or focus, toggles on tap, closes with Escape, stays on screen on phones. Start with the plain meaning, then an example. Never hide information people need to act on.' } } },
}

// ---------- Badges ----------
export const Badges: StoryObj = {
  render: () => (
    <div className="ds-row">
      {(['high', 'medium', 'low'] as Band[]).map(b => <span key={b} className={`slds-badge pill pill-${b}`}>{b[0].toUpperCase() + b.slice(1)}</span>)}
      <span className="slds-badge pill pill-none">None</span>
      <span className="slds-badge status status-new">New</span>
      <span className="slds-badge status status-awaiting-info">Awaiting info</span>
      <span className="slds-badge tag src">Device</span>
      <span className="slds-badge slds-badge_lightest tag">Account misuse</span>
      <span className="ai-label">AI summary</span>
    </div>
  ),
  parameters: { docs: { description: { story: 'Risk badges always show the word, not only colour. Source tags (blue) say where a fact came from. The AI label is only for AI-written content.' } } },
}

// ---------- Buttons ----------
type BtnArgs = { label: string; variant: 'brand' | 'neutral' | 'base' | 'destructive' | 'success' }
export const Button: StoryObj<BtnArgs> = {
  args: { label: 'Record decline', variant: 'brand' },
  argTypes: { variant: { control: 'inline-radio', options: ['brand', 'neutral', 'base', 'destructive', 'success'], description: 'brand = primary · neutral = secondary · base = tertiary · destructive = delete/remove only · success = rare' } },
  render: a => <button className={`slds-button ${a.variant === 'base' ? '' : `slds-button_${a.variant}`}`}>{a.label}</button>,
  parameters: { docs: { description: { story: 'SLDS 2 pill buttons by importance. **Primary** (brand): the one main action per area. **Secondary** (neutral): other actions, including Cancel. **Tertiary** (base): link-like actions such as Undo. **Destructive**: only for delete or remove. **Success**: rare. Use one primary Record button whatever outcome is chosen; never colour a button by the option chosen.' } } },
}

// ---------- Filters ----------
export const Filters: StoryObj = {
  render: () => {
    const [bands, setBands] = useState<Set<Band>>(new Set(['high', 'medium']))
    const [range, setRange] = useState<12 | 24 | 48>(24)
    const [on, setOn] = useState(true)
    return (
      <div className="stack">
        <div><div className="kpi-label">Several at once: checkbox button group</div>
          <CheckboxButtonGroup name="sb-band" legend="Risk level" selected={bands} onToggle={b => setBands(s => { const n = new Set(s); if (n.has(b)) n.delete(b); else n.add(b); return n })}
            options={(['high', 'medium', 'low'] as Band[]).map(b => ({ value: b, label: <><i className={`dot dot-${b}`} />{b[0].toUpperCase() + b.slice(1)}</> }))} /></div>
        <div><div className="kpi-label">Exactly one: radio button group</div>
          <RadioButtonGroup name="sb-range" legend="Time range" value={range} onChange={setRange} options={([12, 24, 48] as const).map(r => ({ value: r, label: `${r}h` }))} /></div>
        <div><div className="kpi-label">On or off: toggle</div><Toggle id="sb-toggle" checked={on} onChange={setOn} label="Include decided" /></div>
        <div style={{ maxWidth: 240 }}><div className="kpi-label">Long list: select</div><div className="slds-select_container"><select className="slds-select" aria-label="Case type"><option>All case types</option><option>Account takeover</option></select></div></div>
      </div>
    )
  },
}

// ---------- Page header ----------
type HeaderArgs = { label: string; title: string; meta: string }
export const PageHeaderStory: StoryObj<HeaderArgs> = {
  name: 'Page header',
  args: { label: 'Cases', title: 'Case queue', meta: '112 of 148 items · Sorted by highest risk · Updated 13 Nov, 15:00 UTC' },
  render: a => <PageHeader icon="list" label={a.label} title={a.title} meta={a.meta} />,
}

// ---------- Progress bar ----------
type BarArgs = { value: number; band: Band }
export const ProgressBarMeter: StoryObj<BarArgs> = {
  name: 'Progress bar (meter)',
  args: { value: 72, band: 'high' },
  argTypes: { value: { control: { type: 'range', min: 0, max: 100 } }, band: { control: 'inline-radio', options: ['high', 'medium', 'low'] } },
  render: a => <div style={{ maxWidth: 320 }}><ProgressBar value={a.value} color={bandVar(a.band)} label={`Score ${a.value}`} /></div>,
}

// ---------- Table row ----------
type ScoreArgs = { score: number }
export const RiskScoreCell: StoryObj<ScoreArgs> = {
  name: 'Risk score cell (tables)',
  args: { score: 86 },
  argTypes: { score: { control: { type: 'range', min: 0, max: 99 } } },
  render: a => {
    const band: Band = a.score >= 70 ? 'high' : a.score >= 40 ? 'medium' : 'low'
    return (
      <table className="slds-table slds-table_cell-buffer slds-table_bordered data" style={{ maxWidth: 520 }}>
        <thead><tr><th>Case</th><th>Customer</th><th>Risk score</th></tr></thead>
        <tbody><tr className={`clickable band-${band}`}><td><span className="fs-link mono">FR-104237</span></td><td>Priya Bellamy</td><td><ScoreCell score={a.score} band={band} /></td></tr></tbody>
      </table>
    )
  },
  parameters: { docs: { description: { story: 'Risk level word, number and bar together. Bands: low 0–39, medium 40–69, high 70–100.' } } },
}

// ---------- Activity timeline ----------
export const ActivityTimelineStory: StoryObj = {
  name: 'Activity timeline',
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <ActivityTimeline items={[
        { time: '15:00', kind: 'task', isNew: true, title: 'Outcome recorded: Refer', detail: 'You · A data source was unavailable or degraded' },
        { time: '11:21', kind: 'task', title: 'AI summary generated from 4 sources', detail: 'Summary model' },
        { time: '11:20', kind: 'event', title: 'Case opened, score 90', detail: 'Scoring model' },
        { time: '10:57', kind: 'email', title: 'Requested proof of address', detail: 'ATO response' },
      ]} />
    </div>
  ),
}

// ---------- Scoped notification ----------
type NotifArgs = { variant: NotificationVariant; message: string; linkLabel: string }
export const ScopedNotificationStory: StoryObj<NotifArgs> = {
  name: 'Scoped notification',
  args: { variant: 'warning', message: 'ID document verification is degraded. Checks that rely on it may be incomplete.', linkLabel: 'Show affected cases' },
  argTypes: { variant: { control: 'inline-radio', options: ['default', 'info', 'warning', 'error', 'success'] } },
  render: a => (
    <div style={{ maxWidth: 560 }}>
      <ScopedNotification variant={a.variant} link={a.linkLabel ? { label: a.linkLabel, onClick: () => {} } : undefined}>{a.message}</ScopedNotification>
    </div>
  ),
  parameters: { docs: { description: { story: 'Advisory status bar scoped to its container; not dismissible. Default = neutral note, Info = context, Warning = needs care (degraded source, SLA due soon, override), Error = needs action (SLA breached), Success = completed action (decision recorded). One or two lines, at the top of the card it is about, with at most one link.' } } },
}
