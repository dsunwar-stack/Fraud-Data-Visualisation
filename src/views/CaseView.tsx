import { useMemo, useState } from 'react'
import {
  CASES, NOW, SOURCES, bandOf, fmtDateTime, fmtDur, fmtMoney, fmtTime, sourceName, sourceShort,
  type FraudCase, type Finding, type Outcome, type SourceId,
} from '../data'
import { RiskGauge, bandVar } from '../components/charts'

const STEPS = ['Triage', 'Evidence', 'Review', 'Decision', 'Closed']

export function CaseView({ id, onBack }: { id: string; onBack: () => void }) {
  const c = CASES.find(x => x.id === id)
  if (!c) return (
    <div className="card empty-state">
      <h2>Case {id} was not found</h2>
      <p className="muted">It may have been closed or the link is mistyped.</p>
      <button className="btn" onClick={onBack}>Back to queue</button>
    </div>
  )
  return <CaseBody key={c.id} c={c} onBack={onBack} />
}

function CaseBody({ c, onBack }: { c: FraudCase; onBack: () => void }) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState<SourceId>(c.factors[0]?.source ?? 'device')
  const [choice, setChoice] = useState<Outcome>(c.recommended)
  const [note, setNote] = useState(() => noteTemplate(c))
  const [recorded, setRecorded] = useState<null | { outcome: Outcome; at: Date }>(c.status === 'Decided' ? { outcome: c.recommended, at: c.events[c.events.length - 1].at } : null)

  const adjScore = useMemo(() => Math.max(1, c.score - c.factors.filter(f => excluded.has(f.label)).reduce((s, f) => s + f.points, 0)), [c, excluded])
  const adjBand = bandOf(adjScore)
  const base = c.score - c.factors.reduce((s, f) => s + f.points, 0)
  const left = c.slaDueAt.getTime() - NOW.getTime()
  const stepIdx = recorded ? 4 : c.status === 'New' ? 1 : c.status === 'Awaiting info' ? 2 : 2
  const usedSources = new Set(c.factors.map(f => f.source))

  return (
    <div className="stack">
      <div className="case-head card">
        <div className="case-title">
          <button className="link" onClick={onBack}>← Case queue</button>
          <div className="eyebrow">{c.type} · <span className="mono">{c.id}</span></div>
          <h1>{c.customer.name}</h1>
          <div className="meta">
            <span className={`status status-${(recorded ? 'Decided' : c.status).replace(' ', '-').toLowerCase()}`}>{recorded ? 'Decided' : c.status}</span>
            <span>Queue: {c.owner}</span>
            <span>Opened {fmtDateTime(c.createdAt)} UTC</span>
            {c.amount && <span>Amount at risk <b className="num">{fmtMoney(c.amount)}</b></span>}
          </div>
        </div>
        <div className={`sla ${recorded ? '' : left < 0 ? 'bad' : left < 3600_000 ? 'warn' : ''}`}>
          <span className="kpi-label">SLA</span>
          <span className="sla-val num">{recorded ? 'Met' : left < 0 ? `Breached ${fmtDur(-left)} ago` : `${fmtDur(left)} left`}</span>
          <span className="muted small">Due {fmtTime(c.slaDueAt)} UTC · {c.band === 'high' ? '4h' : c.band === 'medium' ? '24h' : '48h'} target</span>
        </div>
      </div>

      <ol className="stepper" aria-label="Case progress">
        {STEPS.map((s, i) => (
          <li key={s} className={i < stepIdx ? 'done' : i === stepIdx ? 'current' : ''} aria-current={i === stepIdx ? 'step' : undefined}>
            {i < stepIdx && <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.5l2.5 2.5L11 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}
            {s}
          </li>
        ))}
      </ol>

      <div className="case-grid">
        {/* ---- main column ---- */}
        <div className="stack">
          <section className="card">
            <header className="card-h">
              <div>
                <h2><span className="ai-badge">AI</span> Fraud summary</h2>
                <p className="sub">Compiled from {usedSources.size} of {SOURCES.length} sources at {fmtTime(c.events[3]?.at ?? c.createdAt)} UTC · model confidence {Math.round(c.confidence * 100)}%</p>
              </div>
              <button className="btn ghost" aria-pressed={editing} onClick={() => setEditing(e => !e)}>{editing ? 'Done editing' : 'Edit'}</button>
            </header>

            <div className="summary">
              <div className="summary-score">
                <RiskGauge score={adjScore} band={adjBand} />
                <span className={`pill pill-${adjBand} lg`}>{adjBand === 'high' ? 'High risk' : adjBand === 'medium' ? 'Medium risk' : 'Low risk'}</span>
                {adjScore !== c.score && <span className="muted small">Model score {c.score}, adjusted by analyst</span>}
              </div>
              <div className="summary-body">
                <p className="lede">
                  {c.factors.length} factors point to <b>{c.type === 'Onboarding exception' || c.type === 'Synthetic identity' ? 'possible impersonation' : c.type === 'Money mule' ? 'possible mule activity' : c.type === 'Account takeover' ? 'possible account takeover' : 'possible payment fraud'}</b>.
                  {editing && ' Untick a factor to leave it out of the score.'}
                </p>
                <ul className="factors">
                  {c.factors.map(f => {
                    const off = excluded.has(f.label)
                    return (
                      <li key={f.label} className={off ? 'off' : ''}>
                        {editing && (
                          <input type="checkbox" id={`f-${f.label}`} checked={!off} aria-label={`Include ${f.label}`}
                            onChange={() => setExcluded(s => { const n = new Set(s); if (n.has(f.label)) n.delete(f.label); else n.add(f.label); return n })} />
                        )}
                        <div>
                          <div className="factor-h"><b>{f.label}</b><span className="tag src">{sourceShort(f.source)}</span><span className="pts num">+{f.points}</span></div>
                          <div className="factor-d">{f.detail}</div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>

            <div className="waterfall" aria-label="How the score is built">
              <div className="kpi-label">How the score is built</div>
              <div className="wf-bar">
                <span style={{ width: `${base}%`, background: 'var(--track-strong)' }} title={`Baseline ${base}`} />
                {c.factors.filter(f => !excluded.has(f.label)).map(f => (
                  <span key={f.label} style={{ width: `${f.points}%`, background: bandVar(adjBand) }} title={`${f.label} +${f.points}`} />
                ))}
                <i style={{ left: '40%' }} /><i style={{ left: '70%' }} />
              </div>
              <div className="wf-scale num"><span>0</span><span style={{ left: '40%' }}>40</span><span style={{ left: '70%' }}>70</span><span>100</span></div>
              <p className="muted small">Baseline {base} for every case, plus the points from each factor. Bands: low 0–39, medium 40–69, high 70–100.</p>
            </div>
          </section>

          <section className="card">
            <header className="card-h"><div><h2>Findings</h2><p className="sub">Evidence for and against the fraud hypothesis</p></div></header>
            <div className="findings">
              <FindingCol title="Substantiation" tone="high" items={c.findings.substantiation} empty="No supporting evidence." />
              <FindingCol title="Mitigation" tone="low" items={c.findings.mitigation} empty="Nothing found that lowers risk." />
              <FindingCol title="Unaligned" tone="neutral" items={c.findings.unaligned} empty="No conflicting evidence." />
            </div>
          </section>

          <section className="card">
            <header className="card-h"><div><h2>Source evidence</h2><p className="sub">Raw signals behind the summary, so you can check them without switching systems</p></div></header>
            <div className="tabs" role="tablist">
              {SOURCES.map(s => (
                <button key={s.id} role="tab" aria-selected={tab === s.id} className={usedSources.has(s.id) ? 'has' : ''} onClick={() => setTab(s.id)}>
                  {s.short}{usedSources.has(s.id) && <i className="dot" style={{ background: bandVar(c.band) }} />}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="signals-panel">
              <div className="muted small">{sourceName(tab)}</div>
              <dl className="kv">
                {c.signals[tab].map(s => (
                  <div key={s.key} className={s.flag ? `flag-${s.flag}` : ''}>
                    <dt>{s.key}</dt>
                    <dd className="mono">{s.flag && <i className="dot" style={{ background: bandVar(s.flag) }} />}{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </div>

        {/* ---- side column ---- */}
        <aside className="stack">
          <section className="card decision">
            <h2>Decision</h2>
            {recorded ? (
              <div className={`recorded outcome-bg-${recorded.outcome.toLowerCase()}`} role="status">
                <b>{recorded.outcome}</b> recorded at {fmtTime(recorded.at)} UTC
                {c.status !== 'Decided' && <button className="link" onClick={() => setRecorded(null)}>Undo</button>}
              </div>
            ) : (
              <>
                <p className="muted small">Recommended: <b className={`txt-${c.recommended.toLowerCase()}`}>{c.recommended}</b>, based on score {c.score}.</p>
                <div className="outcomes" role="radiogroup" aria-label="Outcome">
                  {(['Decline', 'Refer', 'Accept'] as Outcome[]).map(o => (
                    <button key={o} role="radio" aria-checked={choice === o} className={`ob ob-${o.toLowerCase()}`} onClick={() => setChoice(o)}>
                      {o}{o === c.recommended && <span className="rec">Recommended</span>}
                    </button>
                  ))}
                </div>
                <label htmlFor="case-note" className="kpi-label">Investigation note</label>
                <textarea id="case-note" value={note} onChange={e => setNote(e.target.value)} rows={11} />
                <div className="row-between">
                  <button className="link small" onClick={() => setNote(noteTemplate(c))}>Reset to template</button>
                  <button className={`btn solid ob-${choice.toLowerCase()}`} onClick={() => setRecorded({ outcome: choice, at: NOW })}>Record {choice.toLowerCase()}</button>
                </div>
              </>
            )}
          </section>

          <section className="card">
            <h2>Customer</h2>
            <dl className="kv compact">
              <div><dt>Email</dt><dd className="mono">{c.customer.email}</dd></div>
              <div><dt>Phone</dt><dd className="mono">{c.customer.phone}</dd></div>
              <div><dt>Country</dt><dd>{c.customer.country}</dd></div>
              <div><dt>Account age</dt><dd className="num">{c.customer.accountAgeDays ? `${c.customer.accountAgeDays} days` : 'New application'}</dd></div>
            </dl>
          </section>

          <section className="card">
            <h2>Timeline</h2>
            <ol className="timeline">
              {[...c.events].reverse().map((e, i) => (
                <li key={i}><span className="num t">{fmtTime(e.at)}</span><div><div>{e.label}</div><div className="muted small">{e.actor}</div></div></li>
              ))}
              {recorded && c.status !== 'Decided' && <li className="new"><span className="num t">{fmtTime(recorded.at)}</span><div><div>Outcome recorded: {recorded.outcome}</div><div className="muted small">You</div></div></li>}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  )
}

function FindingCol({ title, tone, items, empty }: { title: string; tone: 'high' | 'low' | 'neutral'; items: Finding[]; empty: string }) {
  return (
    <div className={`fcol fcol-${tone}`}>
      <div className="fcol-h">{title} <span className="num muted">{items.length}</span></div>
      {items.length ? (
        <ul>{items.map((f, i) => <li key={i}>{f.text}<span className="tag src">{sourceShort(f.source)}</span></li>)}</ul>
      ) : <p className="muted small">{empty}</p>}
    </div>
  )
}

function noteTemplate(c: FraudCase) {
  return [
    `Case ${c.id}, ${c.type}`,
    `Score: ${c.score}/100 (${c.band}). Recommended: ${c.recommended}.`,
    '',
    'Checks completed:',
    ...SOURCES.map(s => `- ${s.name}: ${c.factors.some(f => f.source === s.id) ? 'adverse, see summary' : 'reviewed, no adverse findings'}`),
    '',
    'Key evidence:',
    ...c.factors.slice(0, 3).map(f => `- ${f.label}: ${f.detail}`),
    '',
    'Analyst rationale:',
    '',
  ].join('\n')
}
