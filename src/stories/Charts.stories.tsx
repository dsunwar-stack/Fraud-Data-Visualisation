import type { Meta, StoryObj } from '@storybook/react-vite'
import { AlertVolume, BarList, RiskGauge, ScoreHistogram, Sparkline, bandVar, type HourPoint } from '../design-system'
import type { Band } from '../data'

const meta: Meta = { title: 'Charts', parameters: { docs: { description: { component: 'Hand-built SVG charts using the --viz-* palette. Every chart has hover values and a written caption.' } } } }
export default meta

const hours: HourPoint[] = Array.from({ length: 24 }, (_, i) => {
  const base = 20 + Math.round(12 * Math.sin(i / 3.5) ** 2)
  const high = Math.round(base * 0.2) + (i === 16 ? 14 : 0)
  return { t: new Date(Date.UTC(2026, 10, 13, i)), high, medium: Math.round(base * 0.35), low: Math.round(base * 0.45), autoDeclined: Math.round(high * 0.6) }
})

type SparkArgs = { band: Band | 'none' }
export const TrendLine: StoryObj<SparkArgs> = {
  name: 'Trend line',
  args: { band: 'high' },
  argTypes: { band: { control: 'inline-radio', options: ['high', 'medium', 'low', 'none'] } },
  render: a => <div style={{ width: 240 }}><Sparkline values={hours.map(h => h.high)} labels={hours.map(h => `${String(h.t.getUTCHours()).padStart(2, '0')}:00 UTC`)} unit="alerts" color={a.band === 'none' ? undefined : bandVar(a.band)} /></div>,
}

type VolArgs = { showAuto: boolean }
export const AlertVolumeChart: StoryObj<VolArgs> = {
  name: 'Alert volume',
  args: { showAuto: true },
  render: a => <div className="slds-card card"><AlertVolume data={hours} showAuto={a.showAuto} /></div>,
}

type HistArgs = { threshold: number }
export const ScoreDistribution: StoryObj<HistArgs> = {
  name: 'Score distribution',
  args: { threshold: 85 },
  argTypes: { threshold: { control: { type: 'range', min: 50, max: 95, step: 5 } } },
  render: a => {
    const scores = Array.from({ length: 120 }, (_, i) => Math.round(Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 100))
    return <div className="slds-card card" style={{ maxWidth: 420 }}><ScoreHistogram scores={scores} threshold={a.threshold} /></div>
  },
}

type GaugeArgs = { score: number }
export const RiskGaugeStory: StoryObj<GaugeArgs> = {
  name: 'Risk gauge',
  args: { score: 90 },
  argTypes: { score: { control: { type: 'range', min: 0, max: 100 } } },
  render: a => <RiskGauge score={a.score} band={a.score >= 70 ? 'high' : a.score >= 40 ? 'medium' : 'low'} />,
}

export const BarListStory: StoryObj = {
  name: 'Bar list',
  render: () => (
    <div className="slds-card card fs-factors" style={{ maxWidth: 380 }}>
      <BarList rows={[
        { label: 'Jailbroken or rooted device', value: 85, display: <span className="fs-two-val"><b className="on">85 cases</b> · <b>+15 pts</b></span> },
        { label: 'Indirect database matches', value: 75, display: <span className="fs-two-val"><b className="on">75 cases</b> · <b>+19 pts</b></span> },
        { label: 'Email does not match name', value: 69, display: <span className="fs-two-val"><b className="on">69 cases</b> · <b>+9 pts</b></span> },
      ]} />
    </div>
  ),
}
