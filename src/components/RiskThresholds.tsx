import { THRESHOLDS, type Band } from '../data'
import { bandText } from './charts'
import { InfoTip } from './InfoTip'

// Shows the risk bands, their SLA and recommendation, and the auto-decline line.
export function RiskThresholds({ current, compact = false }: { current?: Band; compact?: boolean }) {
  return (
    <div className={`fs-thresholds ${compact ? 'compact' : ''}`}>
      <div className="fs-thr-head">
        <span className="kpi-label">Risk thresholds</span>
        <InfoTip label="Risk thresholds" align="end">
          <span>The risk score (0–100) puts each case in a band. The band sets the SLA and the recommended outcome. Alerts at or above the auto-decline line are declined automatically.</span>
          <span className="infotip-ex">These are placeholder values for this concept, to be confirmed by fraud policy.</span>
        </InfoTip>
      </div>
      <div className="table-wrap">
        <table className="slds-table slds-table_cell-buffer data fs-thr-table">
          <thead><tr><th>Band</th><th>Score</th><th>SLA</th><th>Recommendation</th></tr></thead>
          <tbody>
            {THRESHOLDS.bands.map(r => (
              <tr key={r.band} className={current === r.band ? 'is-current' : ''} aria-current={current === r.band ? 'true' : undefined}>
                <td><span className={`slds-badge pill pill-${r.band}`}>{r.label}</span>{current === r.band && <span className="fs-thr-you">This case</span>}</td>
                <td className="num">{r.min}–{r.max}</td>
                <td className="num">{r.slaHours}h</td>
                <td style={{ color: bandText(r.band) }}>{r.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small fs-thr-foot">Auto-decline at <b className="num">{THRESHOLDS.autoDecline}+</b> · Placeholder values, to be confirmed by fraud policy.</p>
    </div>
  )
}
