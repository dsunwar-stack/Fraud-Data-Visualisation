import { useMemo, useState } from 'react'
import {
  CASES, CATEGORIES, NOW, SOURCES, bandOf, categoryName, fmtDateTime, fmtDur, fmtMoney, fmtTime, sourceName, sourceShort,
  type Category, type FraudCase, type Finding, type Outcome, type SourceId,
} from '../data'
import { RiskGauge, bandText, bandVar } from '../components/charts'
import { Switch } from '../components/Filters'
import { InfoTip } from '../components/InfoTip'
import { ActivityTimeline, AgenticCard, AgenticIcon, Breadcrumb, FeedbackGroup, Icon, PageHeader, ProgressBar, RadioButtonGroup, type TimelineKind } from '../components/slds'

const STEPS = ['Triage', 'Evidence', 'Review', 'Decision', 'Closed']

export function CaseView({ id, onBack }: { id: string; onBack: () => void }) {
  const c = CASES.find(x => x.id === id)
  if (!c) return (
    <div className="slds-card card empty-state">
      <h2>Case {id} was not found</h2>
      <p className="muted">It may have been closed or the link is mistyped.</p>
      <button className="slds-button slds-button_neutral" onClick={onBack}>Back to queue</button>
    </div>
  )
  return <CaseBody key={c.id} c={c} onBack={onBack} />
}

function CaseBody({ c, onBack }: { c: FraudCase; onBack: () => void }) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState(false)
  const [cat, setCat] = useState<Category | 'all'>('all')
  const [srcFilter, setSrcFilter] = useState<SourceId | 'all'>('all')
  const [tab, setTab] = useState<SourceId>(c.factors[0]?.source ?? 'device')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [hideZero, setHideZero] = useState(false)
  const [explain, setExplain] = useState(false)
  const [examining, setExamining] = useState<string | null>(null)
  const [mitigated, setMitigated] = useState<Set<string>>(new Set())
  const [feedback, setFeedback] = useState<null | 'correct' | 'incorrect'>(null)
  const [choice, setChoice] = useState<Outcome>(c.recommended)
  const [notes, setNotes] = useState('')
  const snapshot = useMemo(() => caseSnapshot(c), [c])
  const [reason, setReason] = useState('')
  const [rationale, setRationale] = useState('')
  const [tried, setTried] = useState(false)
  const [showSnap, setShowSnap] = useState(false)
  const [recorded, setRecorded] = useState<null | DecisionRecord>(c.status === 'Decided' ? {
    outcome: c.recommended, at: c.events[c.events.length - 1].at, by: c.owner, overrode: false,
    reason: REASONS[c.recommended][0], rationale: 'Evidence reviewed and consistent with the recommended outcome.', notes: '', snapshot: caseSnapshot(c),
  } : null)
  const overriding = choice !== c.recommended
  const rationaleOk = rationale.trim().length >= 20
  const canRecord = !!reason && rationaleOk
  const record = () => {
    setTried(true)
    if (!canRecord) return
    setRecorded({ outcome: choice, at: NOW, by: 'You', overrode: overriding, reason, rationale: rationale.trim(), notes: notes.trim(), snapshot })
  }

  const adjScore = useMemo(() => Math.max(1, c.score - c.factors.filter(f => excluded.has(f.label)).reduce((s, f) => s + f.points, 0)), [c, excluded])
  const adjBand = bandOf(adjScore)
  const base = c.score - c.factors.reduce((s, f) => s + f.points, 0)
  const left = c.slaDueAt.getTime() - NOW.getTime()
  const stepIdx = recorded ? 4 : c.status === 'New' ? 1 : 2
  const usedSources = new Set(c.factors.map(f => f.source))
  const cats = CATEGORIES.slice().sort((a, b) => c.categories[b.id] - c.categories[a.id])
  const shownCats = hideZero ? cats.filter(k => c.factors.some(f => f.category === k.id)) : cats

  const factorsShown = c.factors.filter(f => (cat === 'all' || f.category === cat) && (srcFilter === 'all' || f.source === srcFilter))
  const inScope = (f: Finding) => (srcFilter === 'all' || f.source === srcFilter) && (cat === 'all' || !f.category || f.category === cat)
  const subst = c.findings.substantiation.filter(f => !mitigated.has(f.id) && inScope(f))
  const mitig = [...c.findings.mitigation.filter(inScope), ...c.findings.substantiation.filter(f => mitigated.has(f.id) && inScope(f)).map(f => ({ ...f, byAnalyst: true }))]
  const unal = c.findings.unaligned.filter(inScope)
  const filtering = cat !== 'all' || srcFilter !== 'all'

  return (
    <div className="stack">
      <PageHeader icon="case" tone="case" label={`Case · ${c.type}`} title={c.customer.name}
        breadcrumb={<Breadcrumb items={[{ label: 'Case queue', onClick: onBack }, { label: c.id }]} />}
        details={[
          { label: 'Case number', value: <span className="mono">{c.id}</span> },
          { label: 'Status', value: <span className={`slds-badge status status-${(recorded ? 'Decided' : c.status).replace(' ', '-').toLowerCase()}`}>{recorded ? 'Decided' : c.status}</span> },
          { label: 'Queue', value: c.owner },
          { label: 'Opened', value: `${fmtDateTime(c.createdAt)} UTC` },
          ...(c.amount ? [{ label: 'Amount at risk', value: <span className="num">{fmtMoney(c.amount)}</span> }] : []),
          { label: 'SLA', value: <span className={`num ${recorded ? '' : left < 0 ? 'bad' : left < 3600_000 ? 'warn' : ''}`}>{recorded ? 'Met' : left < 0 ? `Breached ${fmtDur(-left)} ago` : `${fmtDur(left)} left`} <span className="muted">· due {fmtTime(c.slaDueAt)} UTC</span></span> },
        ]} />

      <AgenticCard as="div" className="glance">
        <AgenticIcon size={32} />
        <div className="glance-body">
          <span className="kpi-label">At a glance <span className="ai-label">AI summary</span></span>
          <p>{c.glance}</p>
        </div>
      </AgenticCard>

      <div className="slds-path fs-path">
        <div className="slds-grid slds-path__track">
          <div className="slds-grid slds-path__scroller-container">
            <div className="slds-path__scroller">
              <div className="slds-path__scroller_inner">
                <ul className="slds-path__nav" role="listbox" aria-label="Case progress" aria-orientation="horizontal">
                  {STEPS.map((st, i) => {
                    const state = i < stepIdx ? 'slds-is-complete' : i === stepIdx ? 'slds-is-current slds-is-active' : 'slds-is-incomplete'
                    return (
                      <li key={st} className={`slds-path__item ${state}`} role="presentation">
                        <span className="slds-path__link" role="option" aria-selected={i === stepIdx} aria-current={i === stepIdx ? 'step' : undefined}>
                          <span className="slds-path__stage">{i < stepIdx && <Icon name="check" size={14} />}<span className="slds-assistive-text">{i < stepIdx ? 'Stage complete' : i === stepIdx ? 'Current stage' : ''}</span></span>
                          <span className="slds-path__title">{st}</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="case-grid">
        <div className="stack">
          {/* ---- Risk hub ---- */}
          <section className="slds-card card">
            <header className="card-h">
              <div>
                <h2>Risk hub</h2>
                <p className="sub">How strongly the evidence points to each type of fraud, from 0 (none) to 100. <b>Show factors</b> narrows the summary and findings below to that type.</p>
              </div>
              <div className="hub-tools">
                <button className={`slds-button slds-button_neutral ${explain ? 'slds-is-selected' : ''}`} aria-expanded={explain} aria-pressed={explain} onClick={() => setExplain(e => !e)}>
                  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 7v4.5M8 4.6v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  {explain ? 'Hide explanations' : 'What do these mean?'}
                </button>
                <Switch id="hub-zero" checked={hideZero} onChange={setHideZero} label="Hide types with no signals" />
              </div>
            </header>
            <ul className="hub-list">
              {shownCats.map(k => {
                const v = c.categories[k.id], b = bandOf(v), active = cat === k.id
                const n = c.factors.filter(f => f.category === k.id).length
                return (
                  <li key={k.id} className={`hub-item ${active ? 'active' : ''}`}>
                    <div className="hub-what">
                      <span className="hub-name"><b>{k.name}</b><InfoTip label={k.name}><span>{k.meaning}</span><span className="infotip-ex"><b>Example:</b> {k.example}</span></InfoTip></span>
                      <span className="hub-plain">{k.plain}</span>
                    </div>
                    <div className="hub-score" aria-label={`${k.name} score ${v} out of 100, ${b} risk`}>
                      <ProgressBar value={v} color={bandVar(b)} label={`${k.name} score ${v} of 100`} />
                      <span className="num hub-v" style={{ color: v ? bandText(b) : 'var(--muted)' }}>{v}</span>
                      <span className={`slds-badge pill ${v ? `pill-${b}` : 'pill-none'} hub-band`}>{v ? (b === 'high' ? 'High' : b === 'medium' ? 'Medium' : 'Low') : 'None'}</span>
                    </div>
                    <div className="hub-act">
                      {n ? (
                        <button className={`slds-button ${active ? 'slds-button_brand' : 'slds-button_neutral'} hub-btn`} aria-pressed={active} onClick={() => setCat(active ? 'all' : k.id)}>
                          {active ? 'Show all evidence' : `Show ${n} factor${n === 1 ? '' : 's'}`}
                        </button>
                      ) : <span className="muted small">No evidence found</span>}
                    </div>
                  </li>
                )
              })}
            </ul>
            {explain && (
              <div className="explain" role="region" aria-label="What the fraud types mean">
                {CATEGORIES.map(k => {
                  const signals = [...new Set(c.factors.filter(f => f.category === k.id).map(f => f.label))]
                  return (
                    <div key={k.id} className="explain-item">
                      <h3>{k.name} <span className="muted">· {k.plain.toLowerCase()}</span></h3>
                      <p>{k.meaning}</p>
                      <p className="muted small"><b>Example:</b> {k.example}</p>
                      <p className="small">{signals.length ? <><b>In this case:</b> {signals.join(', ')}.</> : <span className="muted">No signals for this type in this case.</span>}</p>
                    </div>
                  )
                })}
                <p className="muted small explain-foot">Each score is built from the risk factors linked to that type. More factors, and stronger ones, give a higher score. Scores of 70 or more are high risk, 40–69 medium, and below 40 low.</p>
              </div>
            )}
          </section>

          {/* ---- AI summary ---- */}
          <AgenticCard>
            <header className="card-h">
              <div className="agentic-head">
                <AgenticIcon />
                <div>
                <h2>Fraud summary <span className="ai-label">AI summary</span></h2>
                <p className="sub">Compiled from {usedSources.size} of {SOURCES.length} sources at {fmtTime(c.events[3]?.at ?? c.createdAt)} UTC · model confidence {Math.round(c.confidence * 100)}%</p>
                </div>
              </div>
              <button className={`slds-button slds-button_neutral ${editing ? 'slds-is-selected' : ''}`} aria-pressed={editing} onClick={() => setEditing(e => !e)}>{editing ? 'Done editing' : 'Edit'}</button>
            </header>

            {filtering && (
              <div className="focus-bar">
                Showing {cat !== 'all' && <b title={CATEGORIES.find(k => k.id === cat)!.plain}>{categoryName(cat)}</b>}{cat !== 'all' && srcFilter !== 'all' && ' from '}{srcFilter !== 'all' && <b>{sourceName(srcFilter)}</b>} only
                <button className="slds-button" onClick={() => { setCat('all'); setSrcFilter('all') }}>Show everything</button>
              </div>
            )}

            <div className="summary">
              <div className="summary-score">
                <RiskGauge score={adjScore} band={adjBand} />
                <span className={`slds-badge pill pill-${adjBand} lg`}>{adjBand === 'high' ? 'High risk' : adjBand === 'medium' ? 'Medium risk' : 'Low risk'}</span>
                {adjScore !== c.score && <span className="muted small">Model score {c.score}, adjusted by analyst</span>}
              </div>
              <div className="summary-body">
                <p className="lede">
                  {factorsShown.length} of {c.factors.length} factors shown.
                  {editing && ' Untick a factor to leave it out of the score.'}
                </p>
                <ul className="factors">
                  {factorsShown.map(f => {
                    const off = excluded.has(f.label)
                    return (
                      <li key={f.label} className={off ? 'off' : ''}>
                        {editing && (
                          <input type="checkbox" id={`f-${f.label}`} checked={!off} aria-label={`Include ${f.label}`}
                            onChange={() => setExcluded(s => { const n = new Set(s); if (n.has(f.label)) n.delete(f.label); else n.add(f.label); return n })} />
                        )}
                        <div>
                          <div className="factor-h"><b>{f.label}</b><span className="slds-badge tag src">{sourceShort(f.source)}</span><span className="slds-badge slds-badge_lightest tag" title={CATEGORIES.find(k => k.id === f.category)!.plain}>{categoryName(f.category)}</span><span className="pts num">+{f.points}</span></div>
                          <div className="factor-d">{f.detail}</div>
                        </div>
                      </li>
                    )
                  })}
                  {!factorsShown.length && <li className="muted small">No factors for this filter.</li>}
                </ul>
              </div>
            </div>

            <div className="waterfall" aria-label="How the score is built">
              <div className="kpi-label">How the score is built</div>
              <div className="wf-bar">
                <span style={{ width: `${base}%`, background: 'var(--track-strong)' }} title={`Baseline ${base}`} />
                {c.factors.filter(f => !excluded.has(f.label)).map(f => (
                  <span key={f.label} style={{ width: `${f.points}%`, background: bandVar(adjBand), opacity: filtering && !factorsShown.includes(f) ? 0.3 : 1 }} title={`${f.label} +${f.points}`} />
                ))}
                <i style={{ left: '40%' }} /><i style={{ left: '70%' }} />
              </div>
              <div className="wf-scale num"><span>0</span><span style={{ left: '40%' }}>40</span><span style={{ left: '70%' }}>70</span><span>100</span></div>
              <p className="muted small">Baseline {base} for every case, plus the points from each factor. Bands: low 0–39, medium 40–69, high 70–100.</p>
            </div>

            <footer className="agentic-foot">
              <p className="disclaimer small">
                <Icon name="sparkle" size={12} /> Generated by AI from {usedSources.size} data sources. Check important details in Source evidence before you decide.
                {feedback && <span className="fb-note"> {feedback === 'correct' ? 'You rated this summary helpful.' : 'You flagged this summary for review.'}</span>}
              </p>
              <FeedbackGroup copyText={[c.glance, '', ...c.factors.map(f => `${f.label}: ${f.detail}`)].join('\n')}
                onRated={rt => setFeedback(rt === 'up' ? 'correct' : 'incorrect')} />
            </footer>
          </AgenticCard>

          {/* ---- Findings ---- */}
          <section className="slds-card card">
            <header className="card-h">
              <div><h2>Findings</h2><p className="sub">Evidence sorted by what it says about fraud: for it, against it, or unclear. <b>Examine</b> shows the raw signals behind an item. <b>Mitigate</b> moves it to the middle column once you've cleared it.</p></div>
            </header>
            <RadioButtonGroup name="find-src" legend="Filter findings by source" size="small" value={srcFilter} onChange={setSrcFilter}
              options={[{ value: 'all' as SourceId | 'all', label: 'All sources' }, ...SOURCES.map(x => ({ value: x.id as SourceId | 'all', label: x.short }))]} />
            <div className="findings">
              <div className="fcol fcol-high">
                <FindingHead k="substantiation" count={subst.length} />
                {subst.length ? (
                  <ul>
                    {subst.map(f => (
                      <li key={f.id}>
                        {f.text}<span className="slds-badge tag src">{sourceShort(f.source)}</span>
                        <div className="f-actions">
                          <button className="slds-button small" aria-expanded={examining === f.id} onClick={() => setExamining(examining === f.id ? null : f.id)}>{examining === f.id ? 'Close' : 'Examine'}</button>
                          <button className="slds-button small" onClick={() => { setMitigated(s => new Set(s).add(f.id)); setExamining(null) }}>Mitigate</button>
                        </div>
                        {examining === f.id && (
                          <dl className="kv compact examine">
                            {c.signals[f.source].filter(s => s.flag).concat(c.signals[f.source].filter(s => !s.flag).slice(0, 1)).map(s => (
                              <div key={s.key} className={s.flag ? `flag-${s.flag}` : ''}><dt>{s.key}</dt><dd className="mono">{s.value}</dd></div>
                            ))}
                          </dl>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : <p className="muted small">No supporting evidence{filtering ? ' for this filter' : ''}.</p>}
              </div>
              <div className="fcol fcol-low">
                <FindingHead k="mitigation" count={mitig.length} />
                {mitig.length ? (
                  <ul>
                    {mitig.map(f => (
                      <li key={f.id}>
                        {f.text}<span className="slds-badge tag src">{sourceShort(f.source)}</span>
                        {'byAnalyst' in f && (
                          <div className="f-actions"><span className="slds-badge tag mitig">Mitigated by you</span>
                            <button className="slds-button small" onClick={() => setMitigated(s => { const n = new Set(s); n.delete(f.id); return n })}>Undo</button></div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : <p className="muted small">Nothing found that lowers risk.</p>}
              </div>
              <div className="fcol fcol-neutral">
                <FindingHead k="unaligned" count={unal.length} />
                {unal.length ? (
                  <ul>{unal.map(f => <li key={f.id}>{f.text}<span className="slds-badge tag src">{sourceShort(f.source)}</span></li>)}</ul>
                ) : <p className="muted small">No conflicting evidence.</p>}
              </div>
            </div>
          </section>

          {/* ---- Source evidence ---- */}
          <section className="slds-card card">
            <header className="card-h">
              <div><h2>Source evidence</h2><p className="sub">Raw signals behind the summary, so you can check them without switching systems</p></div>
              <Switch id="ev-flagged" checked={flaggedOnly} onChange={setFlaggedOnly} label="Flagged signals only" />
            </header>
            <div className="slds-tabs_default fs-tabs">
              <ul className="slds-tabs_default__nav" role="tablist">
                {SOURCES.map(src => (
                  <li key={src.id} className={`slds-tabs_default__item ${tab === src.id ? 'slds-is-active' : ''}`} role="presentation">
                    <button className="slds-tabs_default__link" role="tab" aria-selected={tab === src.id} tabIndex={tab === src.id ? 0 : -1} onClick={() => setTab(src.id)}>
                      {src.short}{usedSources.has(src.id) && <i className="dot" style={{ background: bandVar(c.band) }} />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div role="tabpanel" className="signals-panel">
              <div className="muted small">{sourceName(tab)}</div>
              <dl className="kv">
                {c.signals[tab].filter(s => !flaggedOnly || s.flag).map(s => (
                  <div key={s.key} className={s.flag ? `flag-${s.flag}` : ''}>
                    <dt>{s.key}</dt>
                    <dd className="mono">{s.flag && <i className="dot" style={{ background: bandVar(s.flag) }} />}{s.value}</dd>
                  </div>
                ))}
              </dl>
              {flaggedOnly && !c.signals[tab].some(s => s.flag) && <p className="muted small">No flagged signals from this source.</p>}
            </div>
          </section>
        </div>

        <aside className="stack">
          <section className="slds-card card decision">
            <h2>Decision</h2>
            {recorded ? (
              <div className="decision-record" role="status">
                <div className={`recorded outcome-bg-${recorded.outcome.toLowerCase()}`}>
                  <b>{recorded.outcome}</b>
                  <span>recorded by {recorded.by} at {fmtTime(recorded.at)} UTC</span>
                </div>
                {recorded.overrode && <p className="override small">Overrode the recommendation ({c.recommended})</p>}
                <dl className="kv compact">
                  <div><dt>Reason</dt><dd>{recorded.reason}</dd></div>
                  <div><dt>Why</dt><dd className="pre">{recorded.rationale}</dd></div>
                  {recorded.notes && <div><dt>Notes</dt><dd className="pre">{recorded.notes}</dd></div>}
                </dl>
                <button className="slds-button small" aria-expanded={showSnap} onClick={() => setShowSnap(v => !v)}>{showSnap ? 'Hide case snapshot' : 'View case snapshot attached to this decision'}</button>
                {showSnap && <Snapshot text={recorded.snapshot} />}
                {c.status !== 'Decided' && (
                  <button className="slds-button small" onClick={() => { setRecorded(null); setTried(false) }}>Undo and change decision</button>
                )}
              </div>
            ) : (
              <>
                <p className="who-decides small">
                  <b>You make the final decision.</b> The AI summarises the evidence. The recommendation comes from the risk score ({c.score}), not from the AI.
                </p>
                <div className="outcomes" role="radiogroup" aria-label="Outcome">
                  {(['Decline', 'Refer', 'Accept'] as Outcome[]).map(o => (
                    <button key={o} role="radio" aria-checked={choice === o} className={`slds-button slds-button_neutral ob ob-${o.toLowerCase()}`}
                      onClick={() => { setChoice(o); if (!REASONS[o].includes(reason)) setReason('') }}>
                      {o}{o === c.recommended && <span className="rec">Recommended</span>}
                    </button>
                  ))}
                </div>
                {overriding && (
                  <p className="override small" role="note">You're choosing <b>{choice}</b> instead of the recommended <b>{c.recommended}</b>. Explain why below, as this will be reviewed.</p>
                )}

                <label htmlFor="case-reason" className="kpi-label">Reason <span className="req">required</span></label>
                <div className="slds-select_container"><select id="case-reason" value={reason} onChange={e => setReason(e.target.value)} aria-invalid={tried && !reason} className={`slds-select ${tried && !reason ? 'invalid' : ''}`}>
                  <option value="">Choose a reason for {choice.toLowerCase()}…</option>
                  {REASONS[choice].map(x => <option key={x}>{x}</option>)}
                </select></div>
                {tried && !reason && <span className="field-err">Choose a reason.</span>}

                <label htmlFor="case-rationale" className="kpi-label">Why did you make this decision? <span className="req">required</span></label>
                <textarea id="case-rationale" rows={4} value={rationale} onChange={e => setRationale(e.target.value)}
                  placeholder={choice === 'Accept' ? 'e.g. Customer confirmed the new device by phone; the payee is their own savings account.' : choice === 'Refer' ? 'e.g. ID check service was degraded; need a fresh document check before deciding.' : 'e.g. Device is rooted and linked to 4 other profiles; email reported for impersonation twice this month.'}
                  aria-invalid={tried && !rationaleOk} className={`slds-textarea ${tried && !rationaleOk ? 'invalid' : ''}`} />
                <div className="row-between">
                  {tried && !rationaleOk ? <span className="field-err">Write at least 20 characters so reviewers understand your decision.</span> : <span className="muted small">Saved with the decision and shown in the case history.</span>}
                  <span className="muted small num">{rationale.trim().length}</span>
                </div>

                <label htmlFor="case-notes" className="kpi-label">Additional notes <span className="req">optional</span></label>
                <textarea id="case-notes" className="slds-textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Anything else you found or did, e.g. Called the customer at 14:10, no answer. Left a voicemail." />

                <details className="note-box">
                  <summary><span className="kpi-label">Case snapshot</span> <span className="muted small">attached to your decision automatically</span></summary>
                  <p className="note-src small">
                    <b>Built by a fixed template from the case data, not by AI and not by a person.</b> The only AI-written line is marked <span className="ai-label">AI</span>. It's saved with your decision so reviewers can see what you saw. You don't need to edit it.
                  </p>
                  <Snapshot text={snapshot} />
                </details>

                <button className={`slds-button ${choice === 'Decline' ? 'slds-button_destructive' : choice === 'Accept' ? 'slds-button_success' : 'slds-button_brand ob-refer-solid'} record-btn`} onClick={record} aria-disabled={!canRecord}>
                  Record {choice.toLowerCase()}
                </button>
              </>
            )}
          </section>

          <section className="slds-card card">
            <h2>Customer profile</h2>
            <dl className="kv compact">
              <div><dt>Name</dt><dd>{c.customer.name}</dd></div>
              <div><dt>Date of birth</dt><dd className="num">{c.customer.dob.toLocaleDateString('en-GB', { timeZone: 'UTC' })} · {c.customer.age} years</dd></div>
              <div><dt>Address</dt><dd>
                <ol className="addr">
                  {c.customer.addresses.map((a, i) => (
                    <li key={i}><span>{a}</span>{i === 0 && <span className={`tag ${c.customer.electoralRoll ? 'ok' : 'no'}`}>{c.customer.electoralRoll ? 'On electoral roll' : 'Not on electoral roll'}</span>}{i > 0 && <span className="muted small">Previous</span>}</li>
                  ))}
                </ol>
              </dd></div>
              <div><dt>Applied</dt><dd><span className="num">{fmtDateTime(c.appliedAt)} UTC</span><br /><span className={NOW.getTime() - c.appliedAt.getTime() > 24 * 3600_000 ? 'bad small' : 'muted small'}>Waiting {fmtDur(NOW.getTime() - c.appliedAt.getTime())}</span></dd></div>
              <div><dt>Email</dt><dd className="mono">{c.customer.email}</dd></div>
              <div><dt>Mobile</dt><dd className="mono">{c.customer.phone}</dd></div>
              <div><dt>Device</dt><dd>{c.customer.device}</dd></div>
              <div><dt>Source of funds</dt><dd>{c.customer.sourceOfFunds}</dd></div>
              <div><dt>Income</dt><dd className="num">{fmtMoney(c.customer.income)} a year</dd></div>
              <div><dt>Account usage</dt><dd>{c.customer.accountUsage}</dd></div>
              <div><dt>Credit score</dt><dd><span className="num">{c.customer.creditScore}</span> <span className="muted small">/ 999</span>
                <span className="mini-track" style={{ marginLeft: 8 }}><span style={{ width: `${(c.customer.creditScore / 999) * 100}%`, background: c.customer.creditScore < 560 ? bandVar('high') : c.customer.creditScore < 720 ? bandVar('medium') : bandVar('low') }} /></span></dd></div>
              <div><dt>Account age</dt><dd className="num">{c.customer.accountAgeDays ? `${c.customer.accountAgeDays} days` : 'New application'}</dd></div>
            </dl>
          </section>

          <section className="slds-card card">
            <h2>Activity</h2>
            <ActivityTimeline items={[
              ...(recorded && c.status !== 'Decided' ? [{ time: fmtTime(recorded.at), kind: 'task' as const, isNew: true,
                title: `Outcome recorded: ${recorded.outcome}${recorded.overrode ? ' (overrode recommendation)' : ''}`, detail: `You · ${recorded.reason}`,
                extra: <p className="tl-why">"{recorded.rationale}"</p> }] : []),
              ...(feedback ? [{ time: fmtTime(NOW), kind: 'task' as const, isNew: true, title: `Summary marked ${feedback === 'correct' ? 'helpful' : 'for review'}`, detail: 'You' }] : []),
              ...[...c.events].reverse().map(e => ({ time: fmtTime(e.at), title: e.label, detail: e.actor,
                kind: (/received|opened/i.test(e.label) ? 'event' : /Requested/i.test(e.label) ? 'email' : 'task') as TimelineKind })),
            ]} />
          </section>
        </aside>
      </div>
    </div>
  )
}

interface DecisionRecord { outcome: Outcome; at: Date; by: string; overrode: boolean; reason: string; rationale: string; notes: string; snapshot: string }

// Reason codes keep decisions consistent and countable for reporting and audit.
const REASONS: Record<Outcome, string[]> = {
  Decline: ['Confirmed impersonation', 'Confirmed false identity', 'False details on application', 'Account misuse or mule activity', "Customer couldn't verify their identity", 'Other (explain below)'],
  Refer: ['Need more information from the customer', 'Need a senior specialist to review', 'Refer to financial crime team', 'A data source was unavailable or degraded', 'Other (explain below)'],
  Accept: ['Identity verified', 'Risk factors explained by the customer', 'False positive: genuine activity', 'Other (explain below)'],
}

const FINDING_TYPES = {
  substantiation: {
    name: 'Substantiation', plain: 'Supports fraud',
    meaning: 'Evidence that makes fraud more likely. These are the reasons the case was raised.',
    example: "The customer's email address has been reported for impersonation by other banks.",
  },
  mitigation: {
    name: 'Mitigation', plain: 'Lowers the risk',
    meaning: 'Evidence that the customer is probably genuine, or items you have checked and cleared using Mitigate.',
    example: 'The passport chip was read successfully and the face matches.',
  },
  unaligned: {
    name: 'Unaligned', plain: "Doesn't point either way",
    meaning: 'Evidence that is related but unclear: it may be old, involve someone else, or be common among genuine customers. Use your judgement.',
    example: 'An address match from 2021 on a different surname.',
  },
} as const

function FindingHead({ k, count }: { k: keyof typeof FINDING_TYPES; count: number }) {
  const t = FINDING_TYPES[k]
  return (
    <div className="fcol-head">
      <div className="fcol-h">
        {t.name}
        <InfoTip label={t.name} align={k === 'unaligned' ? 'end' : 'start'}><span>{t.meaning}</span><span className="infotip-ex"><b>Example:</b> {t.example}</span></InfoTip>
        <span className="num muted">{count}</span>
      </div>
      <span className="fcol-plain">{t.plain}</span>
    </div>
  )
}

// A read-only record of what the case looked like when the decision was made.
function caseSnapshot(c: FraudCase) {
  return [
    `Case ${c.id}, ${c.type}`,
    `Score: ${c.score}/100 (${c.band}). Recommended: ${c.recommended}.`,
    `[AI] At a glance: ${c.glance}`,
    '',
    'Checks completed:',
    ...SOURCES.map(s => `- ${s.name}: ${c.factors.some(f => f.source === s.id) ? 'adverse, see summary' : 'reviewed, no adverse findings'}`),
    '',
    'Key evidence:',
    ...c.factors.slice(0, 3).map(f => `- ${f.label}: ${f.detail}`),
  ].join('\n')
}

function Snapshot({ text }: { text: string }) {
  return (
    <div className="note-view" aria-label="Case snapshot">
      {text.split('\n').map((line, i) => line.startsWith('[AI] ')
        ? <div key={i}><span className="ai-label">AI</span>{line.slice(5)}</div>
        : <div key={i}>{line || '\u00a0'}</div>)}
    </div>
  )
}
