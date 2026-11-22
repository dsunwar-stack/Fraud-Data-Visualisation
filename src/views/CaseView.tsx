import { useMemo, useState } from 'react'
import {
  CASES, CATEGORIES, NOW, SOURCES, bandOf, categoryName, fmtDateTime, fmtDur, fmtMoney, fmtTime, sourceName, sourceShort,
  type Category, type FraudCase, type Finding, type Outcome, type SourceId,
} from '../data'
import { RiskGauge, bandVar } from '../components/charts'
import { Switch } from '../components/Filters'
import { InfoTip } from '../components/InfoTip'

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
  const [note, setNote] = useState(() => noteTemplate(c))
  const [recorded, setRecorded] = useState<null | { outcome: Outcome; at: Date }>(c.status === 'Decided' ? { outcome: c.recommended, at: c.events[c.events.length - 1].at } : null)

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

      <div className={`glance glance-${c.band}`} role="note">
        <span className="kpi-label">At a glance</span>
        <p>{c.glance}</p>
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
        <div className="stack">
          {/* ---- Risk hub ---- */}
          <section className="card">
            <header className="card-h">
              <div>
                <h2>Risk hub</h2>
                <p className="sub">How strongly the evidence points to each type of fraud, from 0 (none) to 100. <b>Show factors</b> narrows the summary and findings below to that type.</p>
              </div>
              <div className="hub-tools">
                <button className="btn ghost" aria-expanded={explain} aria-pressed={explain} onClick={() => setExplain(e => !e)}>
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
                      <span className="barlist-track"><span className="barlist-fill" style={{ width: `${v}%`, background: bandVar(b) }} /></span>
                      <span className="num hub-v" style={{ color: v ? bandVar(b) : 'var(--muted)' }}>{v}</span>
                      <span className={`pill ${v ? `pill-${b}` : 'pill-none'} hub-band`}>{v ? (b === 'high' ? 'High' : b === 'medium' ? 'Medium' : 'Low') : 'None'}</span>
                    </div>
                    <div className="hub-act">
                      {n ? (
                        <button className={`btn hub-btn ${active ? 'on' : ''}`} aria-pressed={active} onClick={() => setCat(active ? 'all' : k.id)}>
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
          <section className="card">
            <header className="card-h">
              <div>
                <h2><span className="ai-badge">AI</span> Fraud summary</h2>
                <p className="sub">Compiled from {usedSources.size} of {SOURCES.length} sources at {fmtTime(c.events[3]?.at ?? c.createdAt)} UTC · model confidence {Math.round(c.confidence * 100)}%</p>
              </div>
              <button className="btn ghost" aria-pressed={editing} onClick={() => setEditing(e => !e)}>{editing ? 'Done editing' : 'Edit'}</button>
            </header>

            {filtering && (
              <div className="focus-bar">
                Showing {cat !== 'all' && <b title={CATEGORIES.find(k => k.id === cat)!.plain}>{categoryName(cat)}</b>}{cat !== 'all' && srcFilter !== 'all' && ' from '}{srcFilter !== 'all' && <b>{sourceName(srcFilter)}</b>} only
                <button className="link small" onClick={() => { setCat('all'); setSrcFilter('all') }}>Show everything</button>
              </div>
            )}

            <div className="summary">
              <div className="summary-score">
                <RiskGauge score={adjScore} band={adjBand} />
                <span className={`pill pill-${adjBand} lg`}>{adjBand === 'high' ? 'High risk' : adjBand === 'medium' ? 'Medium risk' : 'Low risk'}</span>
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
                          <div className="factor-h"><b>{f.label}</b><span className="tag src">{sourceShort(f.source)}</span><span className="tag" title={CATEGORIES.find(k => k.id === f.category)!.plain}>{categoryName(f.category)}</span><span className="pts num">+{f.points}</span></div>
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

            <div className="feedback">
              <span className="small">Is this summary accurate?</span>
              {feedback ? (
                <span className={`small ${feedback === 'correct' ? 'txt-accept' : 'txt-refer'}`} role="status">
                  {feedback === 'correct' ? 'Marked as correct. Thanks, this helps train the summary.' : 'Flagged for review. Add what was wrong in your note.'}
                  <button className="link small" onClick={() => setFeedback(null)}>Undo</button>
                </span>
              ) : (
                <>
                  <button className="btn fb-yes" onClick={() => setFeedback('correct')}>This is correct</button>
                  <button className="btn" onClick={() => setFeedback('incorrect')}>Something's wrong</button>
                </>
              )}
            </div>
          </section>

          {/* ---- Findings ---- */}
          <section className="card">
            <header className="card-h">
              <div><h2>Findings</h2><p className="sub">Evidence for and against fraud. Examine an item to see its raw signals, or mitigate it once you've cleared it.</p></div>
            </header>
            <div className="seg" role="group" aria-label="Filter findings by source">
              <button className="chip" aria-pressed={srcFilter === 'all'} onClick={() => setSrcFilter('all')}>All sources</button>
              {SOURCES.map(s => (
                <button key={s.id} className="chip" aria-pressed={srcFilter === s.id} onClick={() => setSrcFilter(srcFilter === s.id ? 'all' : s.id)}>{s.short}</button>
              ))}
            </div>
            <div className="findings">
              <div className="fcol fcol-high">
                <div className="fcol-h">Substantiation <span className="num muted">{subst.length}</span></div>
                {subst.length ? (
                  <ul>
                    {subst.map(f => (
                      <li key={f.id}>
                        {f.text}<span className="tag src">{sourceShort(f.source)}</span>
                        <div className="f-actions">
                          <button className="link small" aria-expanded={examining === f.id} onClick={() => setExamining(examining === f.id ? null : f.id)}>{examining === f.id ? 'Close' : 'Examine'}</button>
                          <button className="link small" onClick={() => { setMitigated(s => new Set(s).add(f.id)); setExamining(null) }}>Mitigate</button>
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
                <div className="fcol-h">Mitigation <span className="num muted">{mitig.length}</span></div>
                {mitig.length ? (
                  <ul>
                    {mitig.map(f => (
                      <li key={f.id}>
                        {f.text}<span className="tag src">{sourceShort(f.source)}</span>
                        {'byAnalyst' in f && (
                          <div className="f-actions"><span className="tag mitig">Mitigated by you</span>
                            <button className="link small" onClick={() => setMitigated(s => { const n = new Set(s); n.delete(f.id); return n })}>Undo</button></div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : <p className="muted small">Nothing found that lowers risk.</p>}
              </div>
              <div className="fcol fcol-neutral">
                <div className="fcol-h">Unaligned <span className="num muted">{unal.length}</span></div>
                {unal.length ? (
                  <ul>{unal.map(f => <li key={f.id}>{f.text}<span className="tag src">{sourceShort(f.source)}</span></li>)}</ul>
                ) : <p className="muted small">No conflicting evidence.</p>}
              </div>
            </div>
          </section>

          {/* ---- Source evidence ---- */}
          <section className="card">
            <header className="card-h">
              <div><h2>Source evidence</h2><p className="sub">Raw signals behind the summary, so you can check them without switching systems</p></div>
              <Switch id="ev-flagged" checked={flaggedOnly} onChange={setFlaggedOnly} label="Flagged signals only" />
            </header>
            <div className="tabs" role="tablist">
              {SOURCES.map(s => (
                <button key={s.id} role="tab" aria-selected={tab === s.id} onClick={() => setTab(s.id)}>
                  {s.short}{usedSources.has(s.id) && <i className="dot" style={{ background: bandVar(c.band) }} />}
                </button>
              ))}
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

          <section className="card">
            <h2>Timeline</h2>
            <ol className="timeline">
              {recorded && c.status !== 'Decided' && <li className="new"><span className="num t">{fmtTime(recorded.at)}</span><div><div>Outcome recorded: {recorded.outcome}</div><div className="muted small">You</div></div></li>}
              {feedback && <li className="new"><span className="num t">{fmtTime(NOW)}</span><div><div>Summary marked {feedback === 'correct' ? 'correct' : 'for review'}</div><div className="muted small">You</div></div></li>}
              {[...c.events].reverse().map((e, i) => (
                <li key={i}><span className="num t">{fmtTime(e.at)}</span><div><div>{e.label}</div><div className="muted small">{e.actor}</div></div></li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  )
}

function noteTemplate(c: FraudCase) {
  return [
    `Case ${c.id}, ${c.type}`,
    `Score: ${c.score}/100 (${c.band}). Recommended: ${c.recommended}.`,
    `At a glance: ${c.glance}`,
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
