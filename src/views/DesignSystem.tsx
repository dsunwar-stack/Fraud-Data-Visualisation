// Live design system reference. Every example renders the real component from src/design-system.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ActivityTimeline, AgenticCard, AgenticIcon, BarList, CheckboxButtonGroup, FeedbackGroup, InfoTip, PageHeader, ProgressBar,
  RadioButtonGroup, RiskGauge, ScoreCell, Sparkline, Toggle, bandText, bandVar, useToast,
} from '../design-system'
import type { Band } from '../data'

const SECTIONS = [
  ['principles', 'Principles'], ['colour', 'Colour'], ['type', 'Typography'], ['space', 'Spacing and shape'],
  ['cards', 'Cards'], ['metrics', 'Metric cards'], ['info', 'Info icon'], ['badges', 'Badges and labels'],
  ['buttons', 'Buttons'], ['filters', 'Filters'], ['charts', 'Charts and meters'], ['tables', 'Tables'],
  ['timeline', 'Activity timeline'], ['ai', 'AI content'], ['writing', 'Writing'],
] as const

export function DesignSystem() {
  const jump = (id: string) => document.getElementById(`ds-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return (
    <div className="stack ds">
      <PageHeader icon="dashboard" label="Reference" title="Design system"
        meta={<>Live components and tokens for Fraud Signal, built on SLDS 2 (Cosmos). Code: <code>src/design-system</code> · Rules: <code>DESIGN_SYSTEM.md</code></>} />

      <nav className="slds-card card ds-toc" aria-label="Design system sections">
        {SECTIONS.map(([id, label]) => <button key={id} className="slds-button slds-button_neutral" onClick={() => jump(id)}>{label}</button>)}
      </nav>

      <Section id="principles" title="Principles for observability" intro="Every component and screen follows these. They came from user research and design reviews.">
        <ol className="ds-principles">
          <li><b>Big picture first, then evidence.</b> Overview → queue → case.</li>
          <li><b>Exact figures, not vague words.</b> Counts and time windows, never "recent".</li>
          <li><b>Explain every number.</b> Say what it measures and where it comes from; use an info icon if it needs more than a few words.</li>
          <li><b>Colour has meaning.</b> Red, orange and teal are risk levels. Purple is only for AI. Blue is for actions and links.</li>
          <li><b>Show related numbers together</b>, and each piece of information once.</li>
          <li><b>Buttons say what happens.</b> "Show 3 factors", not "Go".</li>
          <li><b>The person decides, not the AI.</b> Mark AI content and collect feedback on it.</li>
          <li><b>Use the SLDS 2 component;</b> set layout only, never restyle its colours or shape.</li>
        </ol>
      </Section>

      <Section id="colour" title="Colour" intro="Tokens are CSS variables that point at SLDS 2 styling hooks, so light and dark mode come from SLDS 2. Values below are read live from this page.">
        <Swatches title="Surfaces and text" items={[
          ['--bg', 'Page background', 'surface-2'], ['--surface', 'Card background', 'surface-container-1'], ['--surface-2', 'Subtle fill, table header', 'surface-container-2'],
          ['--border', 'Borders and dividers', 'border-1'], ['--heading', 'Headings and metric values', 'on-surface-3'], ['--text', 'Body text', 'on-surface-2'],
          ['--muted', 'Labels, captions, help', 'on-surface-1'], ['--primary', 'Links, active, selected', 'accent-2'],
        ]} />
        <Swatches title="Risk levels: text and badges (meet contrast)" items={[
          ['--risk-high', 'High risk text', 'error-1'], ['--risk-high-soft', 'High risk badge fill', 'error-container-1'],
          ['--risk-medium', 'Medium risk text', 'warning-1'], ['--risk-medium-soft', 'Medium risk badge fill', 'warning-container-1'],
          ['--risk-low', 'Low risk text', 'success-1'], ['--risk-low-soft', 'Low risk badge fill', 'success-container-1'],
        ]} />
        <Swatches title="Data visualisation: chart fills only" items={[
          ['--viz-high', 'High risk bars and lines', 'palette-red-60'], ['--viz-medium', 'Medium risk', 'palette-orange-70'],
          ['--viz-low', 'Low risk', 'palette-teal-60'], ['--viz-brand', 'Neutral measures (counts)', 'palette-blue-60'],
        ]} />
        <Swatches title="AI content only" items={[
          ['--ai-fill', 'AI outcome fill (Purple-95)', 'palette-purple-95'], ['--ai-ink', 'AI label text and sparkle', 'palette-purple-40'], ['--ai-line', 'AI label border', 'palette-purple-80'],
        ]} />
        <Rule do="Use --viz-* for chart fills and --risk-* for text and badges." dont="Use a risk colour for decoration, or purple for anything that isn't AI." />
      </Section>

      <Section id="type" title="Typography" intro="System font stack from SLDS 2. Headings are regular weight; emphasis comes from size and colour, not bold.">
        <div className="ds-type">
          <TypeRow token="Page title" spec="font-scale-5 (1.75rem) · 400 · --heading" sample={<span style={{ fontSize: 'var(--slds-g-font-scale-5)', color: 'var(--heading)' }}>Case queue</span>} />
          <TypeRow token="Card title (h2)" spec="font-scale-3 (1.25rem) · 400 · --heading" sample={<h2>Alert volume</h2>} />
          <TypeRow token="Metric value" spec=".kpi-value · font-scale-5 · 400 · tabular numbers" sample={<span className="kpi-value num">1,224</span>} />
          <TypeRow token="Body" spec="0.8125rem (13px) · 400 · --text" sample={<span>Alerts per hour by risk band, last 24 hours.</span>} />
          <TypeRow token="Label" spec=".kpi-label · 0.75rem · 400 · --muted · sentence case" sample={<span className="kpi-label">Alerts (24h)</span>} />
          <TypeRow token="Caption / help" spec=".sub · 0.75rem · --muted" sample={<span className="sub">Hover a bar for counts.</span>} />
          <TypeRow token="IDs and raw values" spec=".mono · monospace" sample={<span className="mono">FR-104237 · dv_5bc8379</span>} />
          <TypeRow token="Numbers in tables" spec=".num · tabular-nums" sample={<span className="num">£23,595 · 3h 28m</span>} />
        </div>
        <Rule do="Write labels in sentence case. Give numbers .num so columns line up. Show times in UTC with the zone." dont="Use uppercase labels, bold headings, or bold for whole sentences." />
      </Section>

      <Section id="space" title="Spacing and shape" intro="SLDS 2 spacing and radius hooks.">
        <div className="ds-row">
          {[1, 2, 3, 4, 6].map(n => <div key={n} className="ds-space"><span style={{ width: `var(--slds-g-spacing-${n})` }} /><code>spacing-{n}</code></div>)}
        </div>
        <div className="ds-row">
          {[['radius-border-2', 'Inputs, icon tiles'], ['radius-border-4', 'Cards and page headers'], ['radius-border-pill', 'Buttons, badges, groups']].map(([r, use]) => (
            <div key={r} className="ds-radius"><span style={{ borderRadius: `var(--slds-g-${r})` }} /><code>{r}</code><small>{use}</small></div>
          ))}
        </div>
      </Section>

      <Section id="cards" title="Cards" intro="Every block of content sits in an SLDS card. Title, one-line description, optional control on the right, then content.">
        <Example code={`<section className="slds-card card">
  <header className="card-h">
    <div><h2>Data source health</h2><p className="sub">Hits, precision and p95 latency, last 24h</p></div>
    <Toggle id="x" checked={on} onChange={setOn} label="Show degraded only" />
  </header>
  …content…
</section>`}>
          <DemoCard />
        </Example>
        <Rule do="One job per card. Put the summary first and detail below." dont="Nest cards in cards, or add your own border, radius or shadow; .slds-card provides them." />
      </Section>

      <Section id="metrics" title="Metric cards" intro="A label, the value, a change or context line, and a trend line people can hover. Use for the 3–6 numbers that answer 'is something wrong?'.">
        <Example code={`<div className="slds-card card kpi">
  <span className="kpi-label">High-risk alerts</span>
  <span className="kpi-value num">248</span>
  <span className="kpi-delta bad">20% of volume</span>
  <Sparkline values={series} labels={hourLabels} unit="high-risk alerts" color={bandVar('high')} />
</div>`}>
          <div className="ds-row">
            <Metric label="Alerts (24h)" value="1,224" delta="+3% vs prior 24h" tone="neutral" values={[40, 44, 38, 51, 49, 62, 58, 47, 52, 60, 55, 61]} />
            <Metric label="High-risk alerts" value="248" delta="20% of volume" tone="bad" values={[8, 9, 7, 12, 10, 22, 14, 9, 11, 13, 10, 12]} color={bandVar('high')} />
          </div>
        </Example>
        <Rule do="Always pass labels so the trend line shows values on hover. Say what the change compares against." dont="Draw decorative trend lines that aren't real data." />
      </Section>

      <Section id="info" title="Info icon" intro="An ⓘ next to a term or number that needs explaining. Opens on hover or keyboard focus, toggles on tap, closes with Escape, and stays on screen on phones.">
        <Example code={`<h2 className="fs-h-info">Top risk factors
  <InfoTip label="Top risk factors">
    <span><b>Most common</b> ranks factors by how many cases they appear in.</span>
    <span className="infotip-ex">A factor can be common but minor, or rare but serious.</span>
  </InfoTip>
</h2>`}>
          <div className="ds-row">
            <h2 className="fs-h-info">Top risk factors
              <InfoTip label="Top risk factors"><span><b>Most common</b> ranks factors by how many cases they appear in. <b>Biggest impact</b> ranks them by the average points they add to the risk score.</span><span className="infotip-ex">A factor can be common but minor, or rare but serious.</span></InfoTip>
            </h2>
            <span className="hub-name"><b>Impersonation</b><InfoTip label="Impersonation"><span>The person exists, but the applicant is not them.</span><span className="infotip-ex"><b>Example:</b> an account opened with details from a data breach.</span></InfoTip></span>
          </div>
        </Example>
        <Rule do="Use for specialist terms (Unaligned, Impersonation) and for numbers whose meaning isn't obvious. Start with the plain meaning, then an example. Also show a one-line plain label on screen." dont="Hide information people need to act on inside the popup, or put links and buttons in it." />
      </Section>

      <Section id="badges" title="Badges and labels" intro="Short status markers using slds-badge.">
        <div className="ds-row">
          {(['high', 'medium', 'low'] as Band[]).map(b => <span key={b} className={`slds-badge pill pill-${b}`}>{b === 'high' ? 'High' : b === 'medium' ? 'Medium' : 'Low'}</span>)}
          <span className="slds-badge pill pill-none">None</span>
          <span className="slds-badge status status-new">New</span>
          <span className="slds-badge status status-awaiting-info">Awaiting info</span>
          <span className="slds-badge tag src">Device</span>
          <span className="slds-badge slds-badge_lightest tag">Account misuse</span>
          <span className="ai-label">AI summary</span>
        </div>
        <Rule do="Risk level badges always show the word, not only colour. Source tags say where a fact came from." dont="Use the AI label on anything a person or rule wrote." />
      </Section>

      <Section id="buttons" title="Buttons" intro="SLDS 2 pill buttons. One brand button per area at most.">
        <div className="ds-row">
          <button className="slds-button slds-button_neutral">Show 3 factors</button>
          <button className="slds-button slds-button_brand">Submit</button>
          <button className="slds-button slds-button_destructive">Record decline</button>
          <button className="slds-button slds-button_success">Record accept</button>
          <button className="slds-button">Show everything</button>
        </div>
        <Rule do="Labels say what happens. Decision outcomes: pick with a radio button group; Record uses destructive (Decline), brand (Refer) or success (Accept)." dont='Recolour an SLDS button, or use vague labels like "Go" or "OK".' />
      </Section>

      <Section id="filters" title="Filters" intro="Pick the control by the kind of choice.">
        <DemoFilters />
        <Rule do="Several at once → checkbox button group. Exactly one → radio button group. On/off → toggle. Long list → select." dont="Use custom chips or segmented controls." />
      </Section>

      <Section id="charts" title="Charts and meters" intro="Hand-built SVG charts using the --viz-* palette. Every chart has hover values and a written caption.">
        <div className="ds-grid">
          <div className="slds-card card"><span className="kpi-label">Risk gauge</span><RiskGauge score={90} band="high" /></div>
          <div className="slds-card card"><span className="kpi-label">Bar list (ranked measures)</span>
            <BarList rows={[{ label: 'Jailbroken or rooted device', value: 85, display: '85 cases' }, { label: 'Indirect database matches', value: 75, display: '75 cases' }, { label: 'Email does not match name', value: 69, display: '69 cases' }]} />
          </div>
          <div className="slds-card card"><span className="kpi-label">Progress bar as a meter</span>
            {(['high', 'medium', 'low'] as Band[]).map((b, i) => <div key={b} className="ds-meter"><span>{b}</span><ProgressBar value={[92, 55, 20][i]} color={bandVar(b)} label={`${b} ${[92, 55, 20][i]}`} /><b style={{ color: bandText(b) }} className="num">{[92, 55, 20][i]}</b></div>)}
          </div>
        </div>
        <Rule do="Colour by risk only when the chart is about risk; otherwise use --viz-brand. Label axes with values the chart reaches. Add a one-line note for anything unusual (e.g. a spike)." dont="Use 3D, gradients or pie charts for more than four parts." />
      </Section>

      <Section id="tables" title="Tables" intro="SLDS data table. Whole rows are clickable; the case ID is styled as a link.">
        <div className="table-wrap">
          <table className="slds-table slds-table_cell-buffer slds-table_bordered data">
            <thead><tr><th>Case</th><th>Customer</th><th>Risk score</th><th className="r">SLA</th></tr></thead>
            <tbody>
              <tr className="clickable band-high"><td><span className="fs-link mono">FR-104237</span></td><td>Priya Bellamy</td><td><ScoreCell score={90} band="high" /></td><td className="r num warn">20m</td></tr>
              <tr className="clickable band-medium"><td><span className="fs-link mono">FR-104512</span></td><td>Owen Pryce</td><td><ScoreCell score={56} band="medium" /></td><td className="r num">14h 02m</td></tr>
            </tbody>
          </table>
        </div>
        <Rule do="Right-align numbers. Put the risk marker (word, number, bar) in its own column." dont="Wrap IDs or times onto two lines." />
      </Section>

      <Section id="timeline" title="Activity timeline" intro="What happened on a case, newest first.">
        <ActivityTimeline items={[
          { time: '15:00', kind: 'task', isNew: true, title: 'Outcome recorded: Refer', detail: 'You · A data source was unavailable or degraded' },
          { time: '11:21', kind: 'task', title: 'AI summary generated from 4 sources', detail: 'Summary model' },
          { time: '11:11', kind: 'event', title: 'Event received', detail: 'Intake' },
        ]} />
      </Section>

      <Section id="ai" title="AI content" intro="From the SLDS 2 Agentic Experiences library. Use only where AI wrote the content, and sparingly.">
        <AgenticCard as="div">
          <div className="agentic-head"><AgenticIcon /><div><h2>Fraud summary <span className="ai-label">AI summary</span></h2><p className="sub">Compiled from 4 of 5 sources</p></div></div>
          <p>Jailbroken device and indirect database matches suggest a high risk of impersonation.</p>
          <footer className="agentic-foot"><p className="disclaimer small">Generated by AI. Check important details before you decide.</p><FeedbackGroup copyText="Example AI summary" /></footer>
        </AgenticCard>
        <Rule do="Every AI output gets the AI label, a disclaimer and the feedback group (helpful, not helpful with reasons, copy)." dont="Let AI content look like a decision, or use the aurora style on non-AI content." />
      </Section>

      <Section id="writing" title="Writing" intro="Words are part of the design.">
        <ul className="ds-principles">
          <li>Plain language: "Someone is using a real person's stolen details", not only "Impersonation".</li>
          <li>Exact figures and windows: "2 matches in the last 15 days".</li>
          <li>Say where content came from: "Generated by AI", "Built by a fixed template".</li>
          <li>Errors say what's wrong and how to fix it: "Write at least 20 characters so reviewers understand your decision."</li>
          <li>Empty states say why it's empty and what to do: "Nothing matches these filters. Clear a filter to see data."</li>
        </ul>
      </Section>
    </div>
  )
}

function Section({ id, title, intro, children }: { id: string; title: string; intro: string; children: ReactNode }) {
  return (
    <section id={`ds-${id}`} className="slds-card card ds-section">
      <header><h2>{title}</h2><p className="sub">{intro}</p></header>
      {children}
    </section>
  )
}

export function Rule({ do: yes, dont }: { do: string; dont: string }) {
  return (
    <div className="ds-rules">
      <p className="ds-do"><b>Do</b> {yes}</p>
      <p className="ds-dont"><b>Don't</b> {dont}</p>
    </div>
  )
}

export function Example({ code, children }: { code: string; children: ReactNode }) {
  const toast = useToast()
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); toast('success', 'Code copied.') }
    catch { toast('error', "Couldn't copy. Select the code and copy it instead.") }
  }
  return (
    <div className="ds-example">
      <div className="ds-preview">{children}</div>
      <div className="ds-code">
        <button className="slds-button slds-button_neutral ds-copy" onClick={copy}>Copy code</button>
        <pre><code>{code}</code></pre>
      </div>
    </div>
  )
}

export function Swatches({ title, items }: { title: string; items: [string, string, string][] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  useEffect(() => {
    const read = () => {
      if (!ref.current) return
      const out: Record<string, string> = {}
      ref.current.querySelectorAll<HTMLElement>('[data-token]').forEach(el => { out[el.dataset.token!] = getComputedStyle(el).backgroundColor })
      setValues(out)
    }
    read()
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener('change', read)
    return () => { mo.disconnect(); mq.removeEventListener('change', read) }
  }, [])
  return (
    <div className="ds-swatch-group" ref={ref}>
      <h3>{title}</h3>
      <div className="ds-swatches">
        {items.map(([token, use, hook]) => (
          <div key={token} className="ds-swatch">
            <span className="ds-chip" data-token={token} style={{ background: `var(${token})` }} />
            <div><code>{token}</code><div className="small">{use}</div><div className="muted small">SLDS hook: {hook}</div><div className="muted small mono">{values[token] ?? ''}</div></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TypeRow({ token, spec, sample }: { token: string; spec: string; sample: ReactNode }) {
  return <div className="ds-type-row"><div><b>{token}</b><div className="muted small">{spec}</div></div><div>{sample}</div></div>
}

function Metric({ label, value, delta, tone, values, color }: { label: string; value: string; delta: string; tone: 'bad' | 'neutral'; values: number[]; color?: string }) {
  return (
    <div className="slds-card card kpi ds-metric">
      <span className="kpi-label">{label}</span><span className="kpi-value num">{value}</span><span className={`kpi-delta ${tone}`}>{delta}</span>
      <Sparkline values={values} labels={values.map((_, i) => `${String(i * 2).padStart(2, '0')}:00 UTC`)} unit={label.toLowerCase()} color={color} />
    </div>
  )
}

function DemoCard() {
  const [on, setOn] = useState(false)
  return (
    <section className="slds-card card">
      <header className="card-h">
        <div><h2>Data source health</h2><p className="sub">Hits, precision and p95 latency, last 24h</p></div>
        <Toggle id="ds-demo-toggle" checked={on} onChange={setOn} label="Show degraded only" />
      </header>
      <p className="small">{on ? '1 source is degraded: ID document verification (98.2% uptime).' : '5 sources monitored. 1 is degraded.'}</p>
    </section>
  )
}

function DemoFilters() {
  const [bands, setBands] = useState<Set<Band>>(new Set(['high', 'medium']))
  const [range, setRange] = useState<12 | 24 | 48>(24)
  const [on, setOn] = useState(true)
  return (
    <div className="ds-row">
      <CheckboxButtonGroup name="ds-band" legend="Risk level" selected={bands}
        onToggle={b => setBands(s => { const n = new Set(s); if (n.has(b)) n.delete(b); else n.add(b); return n })}
        options={(['high', 'medium', 'low'] as Band[]).map(b => ({ value: b, label: <><i className={`dot dot-${b}`} />{b[0].toUpperCase() + b.slice(1)}</> }))} />
      <RadioButtonGroup name="ds-range" legend="Time range" value={range} onChange={setRange} options={([12, 24, 48] as const).map(r => ({ value: r, label: `${r}h` }))} />
      <Toggle id="ds-toggle" checked={on} onChange={setOn} label="Include decided" />
      <div className="slds-select_container"><select className="slds-select" aria-label="Case type"><option>All case types</option><option>Account takeover</option></select></div>
    </div>
  )
}
