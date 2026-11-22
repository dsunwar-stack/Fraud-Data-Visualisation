// Synthetic, seeded fraud data. Nothing here describes a real person or institution.

export type Band = 'high' | 'medium' | 'low'
export type Outcome = 'Decline' | 'Accept' | 'Refer'
export type Status = 'New' | 'In review' | 'Awaiting info' | 'Decided'
export type CaseType =
  | 'Onboarding exception'
  | 'Account takeover'
  | 'Payment fraud'
  | 'Money mule'
  | 'Synthetic identity'

export type Category = 'impersonation' | 'falseApplication' | 'accountMisuse' | 'falseIdentity'
export interface CategoryInfo {
  id: Category
  name: string
  plain: string   // one line, no jargon
  meaning: string // fuller explanation
  example: string
}
export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'impersonation', name: 'Impersonation',
    plain: "Someone is using a real person's stolen details",
    meaning: 'The person exists, but the applicant is not them. A fraudster has their name, date of birth or address and is pretending to be them.',
    example: "A fraudster applies for an account in your name using details from a data breach.",
  },
  {
    id: 'falseIdentity', name: 'False identity',
    plain: "The person doesn't exist",
    meaning: 'The identity is made up, or stitched together from real and invented details (sometimes called a synthetic identity). There is no real victim behind it.',
    example: 'A new name with a real address and a fake ID document, built up with small credit accounts over a few months.',
  },
  {
    id: 'falseApplication', name: 'False application',
    plain: 'A real person giving false details about themselves',
    meaning: 'The applicant is who they say they are, but has lied on the application, for example about their income, job, address or contact details.',
    example: 'A genuine customer overstates their salary or gives a different phone number to pass checks.',
  },
  {
    id: 'accountMisuse', name: 'Account misuse',
    plain: 'A genuine account being used for fraud',
    meaning: 'Either a criminal has taken over a real customer\'s account, or the account holder is letting it be used to move stolen money (a money mule).',
    example: 'Money arrives from several strangers and is sent straight on to new payees within an hour.',
  },
]
export const categoryName = (c: Category) => CATEGORIES.find(x => x.id === c)!.name

export type SourceId = 'device' | 'identity' | 'consortium' | 'monitoring' | 'contact'

export interface Source {
  id: SourceId
  name: string
  short: string
}

export const SOURCES: Source[] = [
  { id: 'device', name: 'Device intelligence', short: 'Device' },
  { id: 'identity', name: 'ID document verification', short: 'ID check' },
  { id: 'consortium', name: 'Shared fraud database', short: 'Fraud DB' },
  { id: 'monitoring', name: 'Account monitoring', short: 'Monitoring' },
  { id: 'contact', name: 'Email & phone intelligence', short: 'Contact' },
]

export interface Factor {
  label: string
  detail: string
  source: SourceId
  category: Category
  points: number // contribution to the 0–100 risk score
}

export interface Finding {
  id: string
  text: string
  source: SourceId
  category?: Category
}

export interface Signal {
  key: string
  value: string
  flag?: Band
}

export interface CaseEvent {
  at: Date
  label: string
  actor: string
}

export interface FraudCase {
  id: string
  customer: {
    name: string; email: string; phone: string; country: string; accountAgeDays: number
    dob: Date; age: number; addresses: string[]; electoralRoll: boolean
    device: string; sourceOfFunds: string; income: number; accountUsage: string; creditScore: number
  }
  appliedAt: Date
  categories: Record<Category, number>
  glance: string
  type: CaseType
  score: number
  band: Band
  confidence: number // model confidence, 0–1
  createdAt: Date
  slaDueAt: Date
  status: Status
  recommended: Outcome
  owner: string
  amount: number | null
  factors: Factor[]
  findings: { substantiation: Finding[]; mitigation: Finding[]; unaligned: Finding[] }
  signals: Record<SourceId, Signal[]>
  events: CaseEvent[]
}

// ---------- seeded RNG ----------
let seed = 4021
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rnd() * a.length)]
const shuffle = <T,>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const bandOf = (score: number): Band => (score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low')

// Fixed "now" so the demo reads the same on every load.
export const NOW = new Date('2026-11-13T15:00:00Z')

const FIRST = ['Amara', 'Rhys', 'Priya', 'Tomasz', 'Leila', 'Owen', 'Nia', 'Marco', 'Hana', 'Callum', 'Ifeoma', 'Jonah', 'Sofia', 'Dev', 'Elif', 'Grace', 'Kwame', 'Ruth', 'Felix', 'Yara']
const LAST = ['Okafor', 'Lindqvist', 'Marsh', 'Novak', 'Haddad', 'Pryce', 'Castell', 'Ibsen', 'Moreau', 'Achterberg', 'Quill', 'Tanaka', 'Bellamy', 'Ferro', 'Dunmore', 'Varga']
const COUNTRIES = ['United Kingdom', 'United Kingdom', 'United Kingdom', 'Ireland', 'France', 'Germany', 'Poland', 'Nigeria', 'Romania', 'Spain']
const OWNERS: Record<CaseType, string> = {
  'Onboarding exception': 'Onboarding exceptions',
  'Account takeover': 'ATO response',
  'Payment fraud': 'Payments review',
  'Money mule': 'Financial crime',
  'Synthetic identity': 'Identity assurance',
}
const TYPES: CaseType[] = ['Onboarding exception', 'Account takeover', 'Payment fraud', 'Money mule', 'Synthetic identity']

interface FactorTemplate {
  source: SourceId
  category: Category
  label: string
  detail: () => string
  points: [number, number]
  types: CaseType[] | 'all'
  finding: () => string
}

// Every detail states an exact count and window. The research asked for this in place of "recent" or "longstanding".
const FACTORS: FactorTemplate[] = [
  {
    source: 'consortium', label: 'Indirect database matches', category: 'impersonation', points: [14, 22], types: 'all',
    detail: () => `${int(2, 4)} indirect matches to Category 01 (impersonation) filed in the last ${int(7, 30)} days.`,
    finding: () => `${int(2, 3)} Category 01 matches on the customer's email address in the last 30 days, filed by other members.`,
  },
  {
    source: 'contact', label: 'Email does not match name', category: 'impersonation', points: [6, 12], types: 'all',
    detail: () => `Email local part shares 0 of ${int(2, 3)} name tokens. Domain first seen ${int(3, 40)} days ago.`,
    finding: () => `Email address does not contain the customer's first or last name.`,
  },
  {
    source: 'consortium', label: 'Inconsistent contact details', category: 'falseApplication', points: [10, 18], types: ['Onboarding exception', 'Synthetic identity', 'Money mule'],
    detail: () => `${int(2, 5)} direct clear loadings list different phone numbers. Oldest is ${int(13, 36)} months old, newest ${int(4, 20)} days old.`,
    finding: () => `${int(2, 4)} direct clear loadings (${int(13, 30)}–${int(31, 60)} months old) show contact details that differ from the application.`,
  },
  {
    source: 'device', label: 'Jailbroken or rooted device', category: 'impersonation', points: [12, 20], types: 'all',
    detail: () => `Device integrity check failed with ${int(2, 3)} root indicators. Device seen on ${int(1, 6)} other customer profiles.`,
    finding: () => `The customer's device is jailbroken.`,
  },
  {
    source: 'device', label: 'New device and location', category: 'accountMisuse', points: [8, 15], types: ['Account takeover', 'Payment fraud'],
    detail: () => `First login from this device ${int(5, 90)} minutes before the event, ${int(300, 1900)} km from the last session.`,
    finding: () => `Login from a new device ${int(400, 1800)} km from usual location within 2 hours of a password reset.`,
  },
  {
    source: 'identity', label: 'Document check passed manually', category: 'falseIdentity', points: [8, 14], types: ['Onboarding exception', 'Synthetic identity'],
    detail: () => `A document submission was passed manually with an authenticity score of ${int(62, 86)}/100 (auto-pass is 90).`,
    finding: () => `One document submission was manually passed with a score of ${int(70, 88)}.`,
  },
  {
    source: 'monitoring', label: 'Rapid movement of funds', category: 'accountMisuse', points: [12, 22], types: ['Money mule', 'Payment fraud'],
    detail: () => `£${int(2, 18)},${int(100, 999)} received and ${int(85, 99)}% moved out within ${int(6, 55)} minutes, to ${int(3, 9)} new payees.`,
    finding: () => `${int(85, 99)}% of incoming funds left the account within one hour, to new payees.`,
  },
  {
    source: 'monitoring', label: 'Payee added after password reset', category: 'accountMisuse', points: [10, 16], types: ['Account takeover'],
    detail: () => `New payee added ${int(3, 25)} minutes after a password reset done through the self-service flow.`,
    finding: () => `New payee created within 30 minutes of a credential change.`,
  },
  {
    source: 'contact', label: 'Recently ported phone number', category: 'accountMisuse', points: [6, 12], types: ['Account takeover', 'Synthetic identity'],
    detail: () => `Mobile number ported to a new network ${int(1, 9)} days ago. SIM age ${int(1, 9)} days.`,
    finding: () => `Mobile number was ported ${int(2, 8)} days before the event.`,
  },
  {
    source: 'identity', label: 'Thin credit file', category: 'falseIdentity', points: [6, 12], types: ['Synthetic identity', 'Onboarding exception'],
    detail: () => `Credit footprint starts ${int(4, 14)} months ago, with ${int(1, 3)} accounts opened in the last 90 days.`,
    finding: () => `Credit history is less than 12 months old.`,
  },
]

const MITIGATIONS: { source: SourceId; text: () => string }[] = [
  { source: 'consortium', text: () => `One direct national clear loading matches the mobile and email on the application.` },
  { source: 'contact', text: () => `Mobile number held for ${int(3, 9)} years. Carrier risk is low.` },
  { source: 'identity', text: () => `Passport chip read succeeded. Face match ${int(93, 99)}/100.` },
  { source: 'monitoring', text: () => `Salary credited monthly for ${int(14, 60)} months from the same employer.` },
  { source: 'device', text: () => `Device has been bound to this customer for ${int(200, 900)} days.` },
]

const UNALIGNED: { source: SourceId; text: () => string }[] = [
  { source: 'consortium', text: () => `${int(2, 3)} indirect local address matches filed in 2021, on a different surname.` },
  { source: 'monitoring', text: () => `A dormant period of ${int(5, 14)} months ended with this event.` },
  { source: 'contact', text: () => `Email domain is a privacy relay. This is common and not in itself suspicious.` },
]

const signalsFor = (c: { band: Band; customer: { accountAgeDays: number; email: string; phone: string } }): Record<SourceId, Signal[]> => {
  const hi = c.band === 'high'
  const md = c.band === 'medium'
  return {
    device: [
      { key: 'Device ID', value: `dv_${Math.floor(rnd() * 1e8).toString(16)}` },
      { key: 'Integrity', value: hi ? 'Rooted (3 indicators)' : 'Passed', flag: hi ? 'high' : undefined },
      { key: 'Profiles on device', value: String(hi ? int(2, 7) : 1), flag: hi ? 'high' : undefined },
      { key: 'IP geolocation', value: hi ? 'Bucharest, RO (proxy)' : 'Leeds, GB', flag: hi ? 'medium' : undefined },
      { key: 'Session age', value: `${int(2, 59)} min` },
    ],
    identity: [
      { key: 'Document', value: 'Passport' },
      { key: 'Authenticity score', value: `${hi ? int(60, 80) : int(88, 99)}/100`, flag: hi ? 'medium' : undefined },
      { key: 'Face match', value: `${int(85, 99)}/100` },
      { key: 'Review', value: hi || md ? 'Manually passed' : 'Auto-passed', flag: hi || md ? 'medium' : undefined },
    ],
    consortium: [
      { key: 'Direct matches', value: String(hi ? int(1, 3) : 0), flag: hi ? 'high' : undefined },
      { key: 'Indirect matches', value: String(hi || md ? int(2, 4) : int(0, 1)), flag: hi || md ? 'medium' : undefined },
      { key: 'Most recent filing', value: `${int(4, 30)} days ago` },
      { key: 'Categories', value: hi ? '01 Impersonation, 06 Facility' : md ? '01 Impersonation' : 'None' },
    ],
    monitoring: [
      { key: 'Account age', value: `${c.customer.accountAgeDays} days` },
      { key: 'Inbound (7 days)', value: `£${int(0, 19)},${int(100, 999)}` },
      { key: 'Outbound to new payees', value: `${hi ? int(80, 99) : int(0, 20)}%`, flag: hi ? 'high' : undefined },
      { key: 'Alerts (90 days)', value: String(hi ? int(3, 9) : int(0, 2)) },
    ],
    contact: [
      { key: 'Email', value: c.customer.email },
      { key: 'Email first seen', value: `${hi ? int(2, 40) : int(400, 3000)} days ago`, flag: hi ? 'medium' : undefined },
      { key: 'Phone', value: c.customer.phone },
      { key: 'Number ported', value: hi ? `${int(1, 9)} days ago` : 'Never', flag: hi ? 'high' : undefined },
    ],
  }
}

function makeCase(i: number): FraudCase {
  const type = pick(TYPES)
  const first = pick(FIRST)
  const last = pick(LAST)
  const handle = rnd() < 0.5 ? `${pick(['nova', 'quick', 'blue', 'zen', 'echo'])}${int(10, 999)}` : `${first}.${last}`.toLowerCase()
  const customer = {
    name: `${first} ${last}`,
    email: `${handle}@example.com`,
    phone: `+44 7700 9${int(10, 99)}${int(100, 999)}`,
    country: pick(COUNTRIES),
    accountAgeDays: type === 'Onboarding exception' ? 0 : int(3, 2400),
  }
  const age = int(21, 72)
  const dob = new Date(Date.UTC(2026 - age, int(0, 11), int(1, 28)))
  const streets = ['Harbour Row', 'Mill Lane', 'Ashgrove Road', 'Kingfisher Way', 'Station Approach', 'Elm Terrace', 'Canal Street']
  const towns = ['Leeds LS2', 'Bristol BS1', 'Glasgow G2', 'Norwich NR1', 'Cardiff CF10', 'York YO1', 'Hull HU1']
  const nAddr = int(1, 3)
  const profile = {
    ...customer, dob, age,
    addresses: Array.from({ length: nAddr }, () => `${int(2, 180)} ${pick(streets)}, ${pick(towns)} ${int(1, 9)}${pick(['AB', 'QT', 'XR', 'DN', 'LP'])}`),
    electoralRoll: false,
    device: pick(['iPhone 15', 'iPhone 12', 'Pixel 8', 'Galaxy S23', 'Galaxy A14', 'Desktop · Chrome', 'Desktop · Safari']),
    sourceOfFunds: pick(['Salary', 'Salary', 'Self-employed income', 'Investments', 'Savings', 'Gift or inheritance']),
    income: int(14, 140) * 1000,
    accountUsage: pick(['Everyday spending', 'Savings', 'Travel', 'Business payments', 'Receiving salary']),
    creditScore: 0,
  }
  const candidates = shuffle(FACTORS.filter(f => f.types === 'all' || f.types.includes(type)))
  // skew the population toward medium and low
  const r = rnd()
  const target = r < 0.22 ? int(72, 96) : r < 0.6 ? int(42, 69) : int(8, 39)
  const factors: Factor[] = []
  let score = 4
  for (const f of candidates) {
    if (score >= target) break
    const p = int(f.points[0], f.points[1])
    factors.push({ label: f.label, detail: f.detail(), source: f.source, category: f.category, points: p })
    score += p
  }
  score = Math.min(99, score)
  const band = bandOf(score)
  profile.electoralRoll = band === 'high' ? rnd() < 0.3 : rnd() < 0.85
  profile.creditScore = band === 'high' ? int(380, 620) : int(560, 960)
  const categories = Object.fromEntries(CATEGORIES.map(k => {
    const pts = factors.filter(f => f.category === k.id).reduce((s, f) => s + f.points, 0)
    const baseline = int(3, 12)
    return [k.id, pts ? Math.min(97, Math.round(pts * 2.4 + baseline)) : 0] // no factors, no score
  })) as Record<Category, number>
  const topCat = CATEGORIES.slice().sort((a, b) => categories[b.id] - categories[a.id])[0]
  const slaHours = band === 'high' ? 4 : band === 'medium' ? 24 : 48
  const status: Status = rnd() < 0.18 ? 'Decided' : pick(['New', 'New', 'In review', 'Awaiting info'] as const)
  // Open cases mostly sit inside their SLA; about 1 in 12 has slipped past it.
  const ageMin = status === 'Decided' ? int(60, 60 * 47) : rnd() < 0.08 ? int(slaHours * 60 + 5, slaHours * 60 + 180) : int(4, slaHours * 60 - 5)
  const createdAt = new Date(NOW.getTime() - ageMin * 60_000)
  const slaDueAt = new Date(createdAt.getTime() + slaHours * 3600_000)
  const recommended: Outcome = band === 'high' ? 'Decline' : band === 'medium' ? (rnd() < 0.5 ? 'Refer' : 'Decline') : 'Accept'
  const c: FraudCase = {
    id: `FR-${(104200 + i * 7 + int(0, 6)).toString()}`,
    customer: profile, type, score, band, categories,
    appliedAt: new Date(createdAt.getTime() - int(5, 90) * 60_000),
    glance: '',
    confidence: Math.round((0.62 + rnd() * 0.35) * 100) / 100,
    createdAt, slaDueAt, status, recommended,
    owner: OWNERS[type],
    amount: type === 'Payment fraud' || type === 'Money mule' ? int(180, 24000) : null,
    factors,
    findings: {
      substantiation: factors.map((f, k) => ({ id: `s${k}`, text: FACTORS.find(t => t.label === f.label)!.finding(), source: f.source, category: f.category })),
      mitigation: shuffle([...MITIGATIONS]).slice(0, band === 'low' ? 3 : int(1, 2)).map((m, k) => ({ id: `m${k}`, text: m.text(), source: m.source })),
      unaligned: shuffle([...UNALIGNED]).slice(0, int(0, 2)).map((m, k) => ({ id: `u${k}`, text: m.text(), source: m.source })),
    },
    signals: {} as Record<SourceId, Signal[]>,
    events: [],
  }
  c.signals = signalsFor(c)
  const top2 = factors.slice().sort((a, b) => b.points - a.points).slice(0, 2).map(f => f.label.toLowerCase())
  c.glance = band === 'low'
    ? `Few adverse signals and ${c.findings.mitigation.length} mitigating checks suggest a low risk of fraud.`
    : `${top2.join(' and ')[0].toUpperCase() + top2.join(' and ').slice(1)} suggest a ${band} risk of ${topCat.name.toLowerCase()}.`
  const t0 = createdAt.getTime()
  c.events = [
    { at: new Date(t0 - int(1, 9) * 60_000), label: `${type === 'Onboarding exception' ? 'Application' : 'Event'} received`, actor: 'Intake' },
    { at: new Date(t0 - int(0, 1) * 60_000), label: `Rules engine raised alert (${factors.length} rules)`, actor: 'Rules engine' },
    { at: new Date(t0), label: `Case opened, score ${score}`, actor: 'Scoring model' },
    { at: new Date(t0 + int(1, 3) * 60_000), label: `AI summary generated from ${new Set(factors.map(f => f.source)).size} sources`, actor: 'Summary model' },
  ]
  if (status !== 'New') c.events.push({ at: new Date(t0 + int(10, 90) * 60_000), label: 'Picked up by analyst', actor: c.owner })
  if (status === 'Awaiting info') c.events.push({ at: new Date(t0 + int(95, 200) * 60_000), label: 'Requested proof of address', actor: c.owner })
  if (status === 'Decided') c.events.push({ at: new Date(t0 + int(95, 200) * 60_000), label: `Outcome recorded: ${recommended}`, actor: c.owner })
  c.events = c.events.filter(e => e.at <= NOW)
  return c
}

export const CASES: FraudCase[] = Array.from({ length: 148 }, (_, i) => makeCase(i)).sort((a, b) => b.score - a.score)

// ---------- time series (alerts per hour, last 48h, by case type) ----------
export interface BandCounts { high: number; medium: number; low: number; autoDeclined: number }
export interface HourBucket { t: Date; byType: Record<CaseType, BandCounts> }
export const CASE_TYPES = TYPES
const TYPE_MIX: Record<CaseType, [number, number]> = {
  // [share of volume, share that is high risk]
  'Onboarding exception': [0.3, 0.14],
  'Account takeover': [0.22, 0.22],
  'Payment fraud': [0.26, 0.16],
  'Money mule': [0.1, 0.24],
  'Synthetic identity': [0.12, 0.18],
}
export const ALERTS: HourBucket[] = Array.from({ length: 48 }, (_, i) => {
  const t = new Date(NOW.getTime() - (47 - i) * 3600_000)
  const h = t.getUTCHours()
  const diurnal = 0.45 + 0.55 * Math.sin(((h - 6) / 24) * Math.PI * 2 - Math.PI / 2 + Math.PI) ** 2
  const base = 38 * diurnal + 8
  const byType = Object.fromEntries(TYPES.map(ty => {
    const [share, hiShare] = TYPE_MIX[ty]
    const spike = ty === 'Account takeover' && (i === 39 || i === 40) ? 4.5 : 1 // device-cluster burst
    const vol = base * share
    const high = Math.round((vol * hiShare + rnd() * 1.2) * spike)
    const medium = Math.round(vol * 0.34 + rnd() * 2)
    const low = Math.round(vol * (0.66 - hiShare) + rnd() * 2.5)
    return [ty, { high, medium, low, autoDeclined: Math.round(high * (0.55 + rnd() * 0.2)) }]
  })) as Record<CaseType, BandCounts>
  return { t, byType }
})

// ---------- source health ----------
export interface SourceHealth { id: SourceId; hits24h: number; precision: number; latencyP95: number; uptime: number; status: 'ok' | 'degraded' }
export const SOURCE_HEALTH: SourceHealth[] = SOURCES.map(s => ({
  id: s.id,
  hits24h: int(180, 1400),
  precision: Math.round((0.48 + rnd() * 0.42) * 100) / 100,
  latencyP95: s.id === 'identity' ? 2840 : int(90, 640),
  uptime: s.id === 'identity' ? 98.2 : Math.round((99.6 + rnd() * 0.39) * 100) / 100,
  status: s.id === 'identity' ? 'degraded' : 'ok',
}))

export const sourceName = (id: SourceId) => SOURCES.find(s => s.id === id)!.name
export const sourceShort = (id: SourceId) => SOURCES.find(s => s.id === id)!.short

// ---------- formatting ----------
export const fmtMoney = (n: number) => '£' + n.toLocaleString('en-GB', { maximumFractionDigits: 0 })
export const fmtDur = (ms: number) => {
  const neg = ms < 0
  const m = Math.abs(Math.round(ms / 60_000))
  const s = m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`
  return neg ? `-${s}` : s
}
export const fmtTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
export const fmtDateTime = (d: Date) =>
  d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
