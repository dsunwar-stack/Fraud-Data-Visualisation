import type { Meta, StoryObj } from '@storybook/react-vite'
import { Rule, Swatches, TypeRow } from '../views/DesignSystem'

const meta: Meta = { title: 'Foundations', parameters: { layout: 'padded' } }
export default meta
type S = StoryObj

export const Colour: S = {
  render: () => (
    <div className="stack">
      <p className="sub">Tokens are CSS variables (src/styles.css) pointing at SLDS 2 styling hooks. Switch Theme in the toolbar: values update live.</p>
      <Swatches title="Surfaces and text" items={[
        ['--bg', 'Page background', 'surface-2'], ['--surface', 'Card background', 'surface-container-1'], ['--surface-2', 'Subtle fill, table header', 'surface-container-2'],
        ['--border', 'Borders and dividers', 'border-1'], ['--heading', 'Headings and metric values', 'on-surface-3'], ['--text', 'Body text', 'on-surface-2'],
        ['--muted', 'Labels, captions, help', 'on-surface-1'], ['--primary', 'Links, active, selected', 'accent-2'],
      ]} />
      <Swatches title="Risk levels: text and badges" items={[
        ['--risk-high', 'High risk text', 'error-1'], ['--risk-high-soft', 'High risk badge fill', 'error-container-1'],
        ['--risk-medium', 'Medium risk text', 'warning-1'], ['--risk-medium-soft', 'Medium risk badge fill', 'warning-container-1'],
        ['--risk-low', 'Low risk text', 'success-1'], ['--risk-low-soft', 'Low risk badge fill', 'success-container-1'],
      ]} />
      <Swatches title="Data visualisation: chart fills only" items={[
        ['--viz-high', 'High risk', 'palette-red-60'], ['--viz-medium', 'Medium risk', 'palette-orange-70'], ['--viz-low', 'Low risk', 'palette-teal-60'], ['--viz-brand', 'Neutral measures', 'palette-blue-60'],
      ]} />
      <Swatches title="AI content only" items={[
        ['--ai-fill', 'AI outcome fill', 'palette-purple-95'], ['--ai-ink', 'AI label text', 'palette-purple-40'], ['--ai-line', 'AI label border', 'palette-purple-80'],
      ]} />
      <Rule do="Use --viz-* for chart fills and --risk-* for text and badges." dont="Use a risk colour for decoration, or purple for anything that isn't AI." />
    </div>
  ),
}

export const Typography: S = {
  render: () => (
    <div className="stack ds-type">
      <TypeRow token="Page title" spec="font-scale-5 (1.75rem) · 400 · --heading" sample={<span style={{ fontSize: 'var(--slds-g-font-scale-5)', color: 'var(--heading)' }}>Case queue</span>} />
      <TypeRow token="Card title (h2)" spec="font-scale-3 (1.25rem) · 400 · --heading" sample={<h2>Alert volume</h2>} />
      <TypeRow token="Metric value" spec=".kpi-value · font-scale-5 · tabular numbers" sample={<span className="kpi-value num">1,224</span>} />
      <TypeRow token="Body" spec="0.8125rem · 400 · --text" sample={<span>Alerts per hour by risk band, last 24 hours.</span>} />
      <TypeRow token="Label" spec=".kpi-label · 0.75rem · --muted · sentence case" sample={<span className="kpi-label">Alerts (24h)</span>} />
      <TypeRow token="Caption / help" spec=".sub · 0.75rem · --muted" sample={<span className="sub">Hover a bar for counts.</span>} />
      <TypeRow token="IDs and raw values" spec=".mono" sample={<span className="mono">FR-104237 · dv_5bc8379</span>} />
      <TypeRow token="Numbers in tables" spec=".num · tabular-nums" sample={<span className="num">£23,595 · 3h 28m</span>} />
      <Rule do="Sentence-case labels; .num on numbers; times in UTC with the zone." dont="Uppercase labels, bold headings, or bold whole sentences." />
    </div>
  ),
}

export const SpacingAndShape: S = {
  name: 'Spacing and shape',
  render: () => (
    <div className="stack">
      <div className="ds-row">{[1, 2, 3, 4, 6].map(n => <div key={n} className="ds-space"><span style={{ width: `var(--slds-g-spacing-${n})` }} /><code>spacing-{n}</code></div>)}</div>
      <div className="ds-row">{[['radius-border-2', 'Inputs, icon tiles'], ['radius-border-4', 'Cards, page headers'], ['radius-border-pill', 'Buttons, badges, groups']].map(([r, u]) => (
        <div key={r} className="ds-radius"><span style={{ borderRadius: `var(--slds-g-${r})` }} /><code>{r}</code><small>{u}</small></div>))}</div>
    </div>
  ),
}
