// Version B: one record per case that every part of the case page reads from.
//
// The rules engine's risk factors decide what happened (e.g. "Rapid movement of funds").
// From those, this file builds the customer's activity ONCE (money, payees, logins, device,
// account changes, identity checks) and then writes the AI summary, the factor details and
// the findings from that same activity, with the same numbers. So:
//   - every Unusual row in Evidence is backed by a risk factor, and
//   - every finding points to the Evidence row it came from.
// Synthetic data, seeded per case ID, so it never changes the main sample data (Version A).
import { CATEGORIES, NOW, type Band, type FraudCase, type Finding, type Signal, type SourceId } from './data'

export type EvidenceSection = 'money' | 'behaviour' | 'changes' | 'identity'
export const SECTIONS: { id: EvidenceSection; title: string; question: string }[] = [
  { id: 'money', title: 'Money', question: "What's happening with their money?" },
  { id: 'behaviour', title: 'Behaviour', question: 'How are they using the account?' },
  { id: 'changes', title: 'Account changes', question: 'What has changed on the account in the last 30 days?' },
  { id: 'identity', title: 'Identity', question: 'Is it really them?' },
]

export interface EvidenceRef { section: EvidenceSection; key: string; label: string; also?: EvidenceSection[] } // also: other sections the same factor shows up in
export interface MetricRow {
  key: string
  label: string
  unit: 'gbp' | 'count'
  d7: number        // last 7 days
  d30: number       // weekly average, last 30 days
  usual: number | null // weekly average, last 3 months (null = new customer, no history)
  unusual: boolean
  source: SourceId
  help: string      // what it means and what fraud it can indicate
}
export interface Payee { name: string; added: Date; payments: number; total: number; isNew: boolean; unusual: boolean }
export interface Merchant { label: string; total: number; unusual: boolean }
export interface AccountChange { key: string; label: string; latest: Date | null; count: number; unusual: boolean; source: SourceId; help: string }
export interface IdentityRow { key: string; label: string; value: string; flag?: Band; source: SourceId }
export interface CustomerActivity {
  newCustomer: boolean
  defaultSection: EvidenceSection
  money: MetricRow[]
  payees: Payee[]
  merchants: Merchant[]
  behaviour: MetricRow[]
  device: { current: string; firstSeen: Date; newDevice: boolean; location: string; integrity: string; rooted: boolean; profiles: number }
  changes: AccountChange[]
  identity: IdentityRow[]
}
export interface CaseRecord {
  c: FraudCase                       // the case with summary, factor details, findings and signals rewritten from the activity
  activity: CustomerActivity
  refs: Record<string, EvidenceRef>  // finding id -> the Evidence row behind it
}

function seeded(id: string) {
  let h = 2166136261
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  let s = h >>> 0
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

const DAY = 86_400_000, MIN = 60_000
const r10 = (n: number) => Math.round(n / 10) * 10
const gbp = (n: number) => '£' + Math.round(n).toLocaleString('en-GB')
const dayAgo = (d: Date) => { const n = Math.floor((NOW.getTime() - d.getTime()) / DAY); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago` }
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
const FOREIGN = ['Bucharest, Romania', 'Lisbon, Portugal', 'Warsaw, Poland', 'Madrid, Spain', 'Sofia, Bulgaria']
const PAYEE_NAMES = ['J. Okafor', 'M. Varga', 'A. Novak', 'S. Haddad', 'R. Marsh', 'L. Moreau', 'T. Pryce', 'K. Ibsen', 'D. Quill', 'E. Ferro']

const cache = new Map<string, CaseRecord>()
export function caseRecord(base: FraudCase): CaseRecord {
  const hit = cache.get(base.id); if (hit) return hit
  const rnd = seeded(base.id)
  const between = (a: number, b: number) => a + rnd() * (b - a)
  const int = (a: number, b: number) => Math.round(between(a, b))
  const has = (label: string) => base.factors.some(f => f.label === label)
  const F = {
    rapid: has('Rapid movement of funds'), payeeReset: has('Payee added after password reset'), newDev: has('New device and location'),
    rooted: has('Jailbroken or rooted device'), ported: has('Recently ported phone number'), emailMismatch: has('Email does not match name'),
    indirect: has('Indirect database matches'), inconsistent: has('Inconsistent contact details'), docManual: has('Document check passed manually'),
    thin: has('Thin credit file'),
  }
  const cust = base.customer
  const event = base.createdAt // when the alert was raised
  const newCustomer = base.type === 'Onboarding exception' || cust.accountAgeDays < 90

  // ---------- the facts (each number is decided once, here) ----------
  const weeklyIn = r10(cust.income / 52 * between(0.9, 1.2))
  const weeklyOut = r10(cust.income / 52 * between(0.7, 1))
  const weeklyPayments = int(5, 12)
  const rapid = F.rapid ? { received: base.amount ?? int(2000, 18000), pct: int(85, 99), minutes: int(6, 55), payees: int(3, 5) } : null
  const reset = F.payeeReset ? { at: new Date(event.getTime() - int(20, 90) * MIN), payeeAfter: int(3, 25), amount: r10(between(400, 3000)) } : null
  const newDev = F.newDev ? { firstSeen: new Date(event.getTime() - int(5, 90) * MIN), city: FOREIGN[int(0, FOREIGN.length - 1)], km: int(400, 1800), nonUk: int(1, 4) } : null
  const rooted = F.rooted ? { indicators: int(2, 3), others: int(1, 5) } : null
  const ported = F.ported ? { days: int(1, 9) } : null
  const emailSeen = F.emailMismatch ? int(3, 40) : int(400, 3000)
  const indirect = F.indirect ? { n: int(2, 4), days: int(7, 30) } : null
  const inconsistent = F.inconsistent ? { n: int(2, 5), oldest: int(13, 36), newest: int(4, 20) } : null
  const doc = F.docManual ? { score: int(62, 86) } : null
  const thin = F.thin ? { months: int(4, 14), opened: int(1, 3) } : null
  const faceMatch = int(88, 99)
  const deviceDays = newDev ? 0 : Math.max(1, Math.min(cust.accountAgeDays || 1, int(120, 900)))
  const mobileYears = int(3, 9)

  // ---------- money ----------
  const row = (key: string, label: string, unit: MetricRow['unit'], usual: number, d7: number, unusual: boolean, source: SourceId, help: string): MetricRow => {
    const round = (v: number) => unit === 'gbp' ? r10(v) : Math.round(v)
    const u = round(usual), w = round(d7)
    return { key, label, unit, d7: w, d30: round((3 * u + w) / 4), usual: newCustomer ? null : u, unusual, source, help }
  }
  const jitter = () => between(0.85, 1.15)
  const extraOut = (rapid ? rapid.received * rapid.pct / 100 : 0) + (reset ? reset.amount : 0)
  const money: MetricRow[] = [
    row('in', 'Money in (credits)', 'gbp', weeklyIn, weeklyIn * jitter() + (rapid?.received ?? 0), !!rapid, 'monitoring',
      'Money received into the account. A sudden rise can indicate mule activity or a safe-account scam.'),
    row('out', 'Money out (debits)', 'gbp', weeklyOut, weeklyOut * jitter() + extraOut, !!rapid || !!reset, 'monitoring',
      'Money sent or spent. A sudden rise can indicate a scam victim, account takeover or mule activity.'),
    row('payments', 'Payments made', 'count', weeklyPayments, weeklyPayments * jitter() + (rapid ? rapid.payees + int(0, 2) : 0) + (reset ? 1 : 0), !!rapid, 'monitoring',
      'Number of outgoing payments. Many payments in a short time can indicate funds being moved on quickly.'),
    row('savings', 'Moved out of savings', 'gbp', between(0, 40), between(0, 40), false, 'monitoring',
      'Money transferred from savings into the current account. A sudden rise can indicate a scam victim being coached to move money.'),
  ]
  const nameStart = int(0, PAYEE_NAMES.length - 1)
  let ni = 0
  const nextName = () => `${PAYEE_NAMES[(nameStart + ni++) % PAYEE_NAMES.length]} (••${int(1000, 9999)})`
  const payees: Payee[] = []
  if (rapid) {
    const out = rapid.received * rapid.pct / 100
    const weights = Array.from({ length: rapid.payees }, () => between(0.6, 1.4)), sum = weights.reduce((a, b) => a + b, 0)
    const at = new Date(event.getTime() - int(30, 240) * MIN)
    weights.forEach(w => payees.push({ name: nextName(), added: at, payments: int(1, 2), total: r10(out * w / sum), isNew: true, unusual: true }))
  }
  if (reset) payees.push({ name: nextName(), added: new Date(reset.at.getTime() + reset.payeeAfter * MIN), payments: 1, total: reset.amount, isNew: true, unusual: true })
  const known = newCustomer ? 1 : int(2, 3)
  for (let i = 0; i < known; i++) payees.push({ name: nextName(), added: new Date(NOW.getTime() - int(60, Math.max(61, Math.min(900, cust.accountAgeDays))) * DAY), payments: int(1, 2), total: r10(between(20, 300)), isNew: false, unusual: false })
  payees.sort((a, b) => b.total - a.total)
  const merchants: Merchant[] = [
    { label: 'Groceries', total: int(60, 180), unusual: false },
    { label: 'Bills and utilities', total: int(40, 160), unusual: false },
    { label: 'Transport', total: int(20, 80), unusual: false },
  ].sort((a, b) => b.total - a.total)

  // ---------- behaviour ----------
  const bioUsual = between(8, 16), passUsual = between(0, 2)
  const behaviour: MetricRow[] = [
    row('bio', 'Biometric logins (face or fingerprint)', 'count', bioUsual, newDev ? bioUsual * between(0.1, 0.4) : bioUsual * jitter(), !!newDev, 'device',
      'Logins using face or fingerprint. A drop while passcode logins rise can mean someone else is using the account.'),
    row('pass', 'Passcode logins', 'count', passUsual, newDev ? passUsual + int(4, 8) : passUsual * jitter(), !!newDev, 'device',
      'Logins using a passcode instead of biometrics. A rise can mean the account is being used on another device.'),
    row('failed', 'Failed login attempts', 'count', between(0, 1), between(0, 1), false, 'device',
      'Logins that failed. Repeated failures can mean someone is guessing the customer’s details.'),
    row('nonuk', 'Logins from outside the UK', 'count', 0, newDev?.nonUk ?? 0, !!newDev, 'device',
      'Logins from an IP address outside the UK. Unusual for a UK customer who isn’t travelling.'),
  ]
  const device = {
    current: cust.device, newDevice: !!newDev,
    firstSeen: newDev ? newDev.firstSeen : new Date(NOW.getTime() - deviceDays * DAY),
    location: newDev ? `${newDev.city} (${newDev.km.toLocaleString('en-GB')} km from usual)` : 'United Kingdom (usual)',
    integrity: rooted ? `Rooted (${rooted.indicators} indicators)` : 'Passed', rooted: !!rooted, profiles: rooted ? rooted.others + 1 : 1,
  }

  // ---------- account changes ----------
  const ch = (key: string, label: string, latest: Date | null, source: SourceId, help: string): AccountChange =>
    ({ key, label, latest, count: latest ? 1 : 0, unusual: !!latest, source, help })
  const changes: AccountChange[] = [
    ch('mobile', 'Mobile number moved to a new network', ported ? new Date(event.getTime() - ported.days * DAY) : null, 'contact', 'A number moved to a new network or SIM shortly before payments is a common sign of account takeover (SIM swap).'),
    ch('reset', 'Password reset', reset?.at ?? null, 'device', 'A reset just before new payees or payments can mean someone else took control.'),
    ch('newdevice', 'New device registered', newDev?.firstSeen ?? null, 'device', 'A new phone or browser added to the account. Check it matches the customer’s story.'),
    ch('email-changed', 'Email changed', null, 'contact', 'Changing the email stops the real customer getting security alerts.'),
    ch('address-changed', 'Address changed', null, 'contact', 'Frequent address changes can indicate a false or borrowed identity.'),
  ]

  // ---------- identity ----------
  const identity: IdentityRow[] = [
    { key: 'doc', label: 'Document check', value: doc ? `Passport · passed manually · authenticity ${doc.score}/100 (auto-pass is 90)` : 'Passport · passed automatically', flag: doc ? 'medium' : undefined, source: 'identity' },
    { key: 'face', label: 'Face match', value: `${faceMatch}/100`, source: 'identity' },
    { key: 'credit', label: 'Credit history', value: thin ? `Starts ${thin.months} months ago · ${thin.opened} account${thin.opened > 1 ? 's' : ''} opened in the last 90 days` : `More than ${Math.max(2, Math.floor(cust.age / 6))} years`, flag: thin ? 'medium' : undefined, source: 'identity' },
    { key: 'indirect', label: 'Indirect matches (fraud database)', value: indirect ? `${indirect.n} impersonation matches filed in the last ${indirect.days} days` : 'None', flag: indirect ? 'medium' : undefined, source: 'consortium' },
    { key: 'loadings', label: 'Records with different contact details', value: inconsistent ? `${inconsistent.n} records list other phone numbers (oldest ${inconsistent.oldest} months, newest ${inconsistent.newest} days)` : 'None', flag: inconsistent ? 'high' : undefined, source: 'consortium' },
    { key: 'email', label: 'Email', value: F.emailMismatch ? `${cust.email} · doesn't contain the customer's name · first seen ${emailSeen} days ago` : `${cust.email} · first seen ${emailSeen} days ago`, flag: F.emailMismatch ? 'medium' : undefined, source: 'contact' },
    { key: 'phone', label: 'Mobile number', value: ported ? `${cust.phone} · moved to a new network ${ported.days} days ago` : `${cust.phone} · held for ${mobileYears} years`, flag: ported ? 'high' : undefined, source: 'contact' },
  ]

  const DEFAULT: Record<FraudCase['type'], EvidenceSection> = {
    'Money mule': 'money', 'Payment fraud': 'money', 'Account takeover': 'behaviour', 'Onboarding exception': 'identity', 'Synthetic identity': 'identity',
  }
  const activity: CustomerActivity = { newCustomer, defaultSection: DEFAULT[base.type], money, payees, merchants, behaviour, device, changes, identity }
  // Open the section with the most unusual items first, falling back to the case type's usual section.
  const best = SECTIONS.map(s => ({ id: s.id, n: unusualCount(activity, s.id) })).sort((a, b) => b.n - a.n)[0]
  if (best.n > 0 && unusualCount(activity, activity.defaultSection) === 0) activity.defaultSection = best.id

  // ---------- words, written from the facts above ----------
  type Words = { detail: string; finding: string; clause: string; ref: EvidenceRef }
  const rapidOut = rapid ? payees.filter(p => p.isNew && p.payments).reduce((s, p) => s + p.total, 0) - (reset?.amount ?? 0) : 0
  const resetClause = reset && newDev ? `, ${Math.round((event.getTime() - reset.at.getTime()) / MIN)} minutes after a password reset` : ''
  const words: Record<string, () => Words> = {
    'Rapid movement of funds': () => ({
      detail: `${gbp(rapid!.received)} received and ${gbp(rapidOut)} moved out within ${rapid!.minutes} minutes, to ${rapid!.payees} new payees.`,
      finding: `${gbp(rapid!.received)} came in and ${gbp(rapidOut)} left within ${rapid!.minutes} minutes, to ${rapid!.payees} payees added today. Usual money in is ${gbp(weeklyIn)} a week.`,
      clause: `${gbp(rapid!.received)} came in and ${gbp(rapidOut)} left within ${rapid!.minutes} minutes to ${rapid!.payees} new payees`,
      ref: { section: 'money', key: 'in', label: 'Money in' } }),
    'Payee added after password reset': () => ({
      detail: `New payee added ${reset!.payeeAfter} minutes after a password reset, then paid ${gbp(reset!.amount)}.`,
      finding: `A new payee was added ${reset!.payeeAfter} minutes after a password reset and paid ${gbp(reset!.amount)}.`,
      clause: `a new payee was added ${reset!.payeeAfter} minutes after a password reset`,
      ref: { section: 'changes', key: 'reset', label: 'Password reset', also: ['money'] } }),
    'New device and location': () => ({
      detail: `First login from this device ${Math.round((event.getTime() - newDev!.firstSeen.getTime()) / MIN)} minutes before the alert, from ${newDev!.city}, ${newDev!.km.toLocaleString('en-GB')} km from the usual location.`,
      finding: `Login from a new device in ${newDev!.city}, ${newDev!.km.toLocaleString('en-GB')} km from the usual location${resetClause}. Passcode logins replaced biometrics.`,
      clause: `a login from a new device in ${newDev!.city.split(',')[0]}`,
      ref: { section: 'behaviour', key: 'device', label: 'Current device', also: ['changes'] } }),
    'Jailbroken or rooted device': () => ({
      detail: `Device integrity check failed with ${rooted!.indicators} root indicators. Device seen on ${rooted!.others} other customer profile${rooted!.others > 1 ? 's' : ''}.`,
      finding: `The customer's device is rooted (${rooted!.indicators} indicators) and also used by ${rooted!.others} other customer${rooted!.others > 1 ? 's' : ''}.`,
      clause: `the device is rooted and shared with ${rooted!.others} other customer${rooted!.others > 1 ? 's' : ''}`,
      ref: { section: 'behaviour', key: 'device', label: 'Current device' } }),
    'Recently ported phone number': () => ({
      detail: `Mobile number moved to a new network ${ported!.days} days before the alert. SIM age ${ported!.days} days.`,
      finding: `The mobile number was moved to a new network ${ported!.days} days before the alert.`,
      clause: `the mobile number moved to a new network ${ported!.days} days ago`,
      ref: { section: 'changes', key: 'mobile', label: 'Mobile number', also: ['identity'] } }),
    'Email does not match name': () => ({
      detail: `Email address contains neither the customer's first nor last name. First seen ${emailSeen} days ago.`,
      finding: `The email address doesn't contain the customer's name and was first seen ${emailSeen} days ago.`,
      clause: `the email doesn't match the customer's name`,
      ref: { section: 'identity', key: 'email', label: 'Email' } }),
    'Indirect database matches': () => ({
      detail: `${indirect!.n} indirect matches to Category 01 (impersonation) filed in the last ${indirect!.days} days.`,
      finding: `${indirect!.n} impersonation matches in the shared fraud database, filed by other members in the last ${indirect!.days} days.`,
      clause: `${indirect!.n} impersonation matches in the shared fraud database`,
      ref: { section: 'identity', key: 'indirect', label: 'Indirect matches' } }),
    'Inconsistent contact details': () => ({
      detail: `${inconsistent!.n} records list different phone numbers. Oldest is ${inconsistent!.oldest} months old, newest ${inconsistent!.newest} days old.`,
      finding: `${inconsistent!.n} records in the shared fraud database list phone numbers that differ from the application.`,
      clause: `${inconsistent!.n} fraud database records list different phone numbers`,
      ref: { section: 'identity', key: 'loadings', label: 'Different contact details' } }),
    'Document check passed manually': () => ({
      detail: `The passport was passed manually with an authenticity score of ${doc!.score}/100 (auto-pass is 90).`,
      finding: `The passport was passed manually with an authenticity score of ${doc!.score}/100, below the auto-pass of 90.`,
      clause: `the passport was passed manually at ${doc!.score}/100`,
      ref: { section: 'identity', key: 'doc', label: 'Document check' } }),
    'Thin credit file': () => ({
      detail: `Credit history starts ${thin!.months} months ago, with ${thin!.opened} account${thin!.opened > 1 ? 's' : ''} opened in the last 90 days.`,
      finding: `Credit history starts only ${thin!.months} months ago.`,
      clause: `the credit history starts only ${thin!.months} months ago`,
      ref: { section: 'identity', key: 'credit', label: 'Credit history' } }),
  }

  const refs: Record<string, EvidenceRef> = {}
  const factors = base.factors.map(f => ({ ...f, detail: words[f.label]().detail }))
  const substantiation: Finding[] = base.factors.map((f, k) => {
    const w = words[f.label](); refs[`s${k}`] = w.ref
    return { id: `s${k}`, text: w.finding, source: f.source, category: f.category }
  })

  // Things that lower the risk, only where the activity supports them.
  const mitCandidates: { text: string; source: SourceId; ref: EvidenceRef }[] = []
  if (!newCustomer && !rapid) mitCandidates.push({ text: `Regular income of about ${gbp(weeklyIn * 4.33)} a month, in line with the last 3 months.`, source: 'monitoring', ref: { section: 'money', key: 'in', label: 'Money in' } })
  if (!newDev && !rooted) mitCandidates.push({ text: `Same device (${cust.device}) used for ${deviceDays} days, with normal biometric logins.`, source: 'device', ref: { section: 'behaviour', key: 'device', label: 'Current device' } })
  if (!ported) mitCandidates.push({ text: `Mobile number held for ${mobileYears} years, with no changes in the last 30 days.`, source: 'contact', ref: { section: 'identity', key: 'phone', label: 'Mobile number' } })
  if (!doc) mitCandidates.push({ text: `Passport check passed automatically. Face match ${faceMatch}/100.`, source: 'identity', ref: { section: 'identity', key: 'doc', label: 'Document check' } })
  if (!indirect && !inconsistent) mitCandidates.push({ text: `No matches in the shared fraud database.`, source: 'consortium', ref: { section: 'identity', key: 'indirect', label: 'Fraud database' } })
  const take = base.band === 'low' ? 3 : 2
  const mitigation: Finding[] = mitCandidates.sort(() => rnd() - 0.5).slice(0, take).map((m, k) => { refs[`m${k}`] = m.ref; return { id: `m${k}`, text: m.text, source: m.source } })

  // Evidence that could point either way.
  const unaligned: Finding[] = []
  if (newDev && cust.country !== 'United Kingdom') unaligned.push({ id: 'u0', text: `The customer's country on file is ${cust.country}, so a login from abroad could be travel.`, source: 'device' })
  if (indirect && rnd() < 0.5) unaligned.push({ id: `u${unaligned.length}`, text: `1 of the ${indirect.n} fraud database matches is on a different surname.`, source: 'consortium' })
  if (newCustomer && !rapid) unaligned.push({ id: `u${unaligned.length}`, text: `New customer: there's no account history to compare against yet.`, source: 'monitoring' })
  unaligned.forEach(u => { refs[u.id] = u.source === 'device' ? { section: 'behaviour', key: 'device', label: 'Current device' } : u.source === 'consortium' ? { section: 'identity', key: 'indirect', label: 'Indirect matches' } : { section: 'money', key: 'in', label: 'Money in' } })

  // The AI summary: the two strongest factors, in the same numbers.
  const top = base.factors.slice().sort((a, b) => b.points - a.points).slice(0, 2).map(f => words[f.label]().clause)
  const topCat = CATEGORIES.slice().sort((a, b) => base.categories[b.id] - base.categories[a.id])[0]
  const glance = base.band === 'low' || !top.length
    ? `${top.length ? cap(top[0]) + ', but ' : ''}${mitigation.length} check${mitigation.length === 1 ? '' : 's'} lower${mitigation.length === 1 ? 's' : ''} the risk. This suggests a low risk of fraud.`
    : `${cap(top.join(', and '))}. This suggests a ${base.band} risk of ${topCat.name.toLowerCase()}.`

  // Raw signals, from the same facts (used in copied notes).
  const sig = (rows: IdentityRow[]): Signal[] => rows.map(r => ({ key: r.label, value: r.value, flag: r.flag }))
  const signals: Record<SourceId, Signal[]> = {
    device: [
      { key: 'Device', value: device.current },
      { key: 'Integrity', value: device.integrity, flag: rooted ? 'high' : undefined },
      { key: 'Profiles on device', value: String(device.profiles), flag: rooted ? 'high' : undefined },
      { key: 'Location', value: device.location, flag: newDev ? 'medium' : undefined },
      { key: 'First seen', value: dayAgo(device.firstSeen) },
    ],
    identity: sig(identity.filter(r => r.source === 'identity')),
    consortium: sig(identity.filter(r => r.source === 'consortium')),
    contact: sig(identity.filter(r => r.source === 'contact')),
    monitoring: money.map(m => ({ key: `${m.label} (7 days)`, value: m.unit === 'gbp' ? gbp(m.d7) : String(m.d7), flag: m.unusual ? 'high' as Band : undefined })),
  }

  const rec: CaseRecord = { c: { ...base, glance, factors, findings: { substantiation, mitigation, unaligned }, signals }, activity, refs }
  cache.set(base.id, rec)
  return rec
}

export const customerActivity = (c: FraudCase) => caseRecord(c).activity

export const unusualCount = (a: CustomerActivity, s: EvidenceSection) =>
  s === 'money' ? a.money.filter(r => r.unusual).length + a.payees.filter(p => p.unusual).length + a.merchants.filter(m => m.unusual).length
  : s === 'behaviour' ? a.behaviour.filter(r => r.unusual).length + (a.device.newDevice || a.device.rooted ? 1 : 0)
  : s === 'changes' ? a.changes.filter(c => c.unusual).length
  : a.identity.filter(r => r.flag).length

// How many unusual items each platform contributed: shows the specialist what was brought together.
export function platformCounts(a: CustomerActivity): Record<SourceId, number> {
  const n: Record<SourceId, number> = { monitoring: 0, device: 0, contact: 0, identity: 0, consortium: 0 }
  for (const r of [...a.money, ...a.behaviour]) if (r.unusual) n[r.source]++
  n.monitoring += a.payees.filter(p => p.unusual).length
  if (a.device.newDevice || a.device.rooted) n.device++
  for (const c of a.changes) if (c.unusual) n[c.source]++
  for (const r of a.identity) if (r.flag) n[r.source]++
  return n
}
