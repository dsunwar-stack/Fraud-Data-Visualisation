// Customer activity history for Version B's integrated Evidence card.
// Synthetic, generated per case from its own seed (derived from the case ID), so it never
// changes the main sample data. Shapes follow the earlier Fraud Data Visualisation research:
// last 7 days and last 30 days compared with the customer's usual (3-month weekly average),
// absolute numbers only, grouped by the question the specialist is asking.
import { NOW, type CaseType, type FraudCase, type SourceId } from './data'

export type EvidenceSection = 'money' | 'behaviour' | 'changes' | 'identity'
export const SECTIONS: { id: EvidenceSection; title: string; question: string }[] = [
  { id: 'money', title: 'Money', question: "What's happening with their money?" },
  { id: 'behaviour', title: 'Behaviour', question: 'How are they using the account?' },
  { id: 'changes', title: 'Account changes', question: 'What has changed on the account in the last 30 days?' },
  { id: 'identity', title: 'Identity', question: 'Is it really them?' },
]

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
export interface AccountChange { label: string; latest: Date | null; count: number; unusual: boolean; source: SourceId; help: string }
export interface CustomerActivity {
  newCustomer: boolean
  defaultSection: EvidenceSection
  money: MetricRow[]
  payees: Payee[]
  merchants: Merchant[]
  behaviour: MetricRow[]
  device: { current: string; firstSeen: Date; newDevice: boolean }
  changes: AccountChange[]
}

// Which evidence section a factor's source belongs to (used to jump from findings).
export const SECTION_FOR_SOURCE: Record<SourceId, EvidenceSection> = {
  monitoring: 'money', device: 'behaviour', contact: 'changes', identity: 'identity', consortium: 'identity',
}

const DEFAULT_SECTION: Record<CaseType, EvidenceSection> = {
  'Money mule': 'money', 'Payment fraud': 'money', 'Account takeover': 'behaviour',
  'Onboarding exception': 'identity', 'Synthetic identity': 'identity',
}

function seeded(id: string) {
  let h = 2166136261
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  let s = h >>> 0
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

const cache = new Map<string, CustomerActivity>()
export function customerActivity(c: FraudCase): CustomerActivity {
  const hit = cache.get(c.id); if (hit) return hit
  const rnd = seeded(c.id)
  const between = (a: number, b: number) => a + rnd() * (b - a)
  const int = (a: number, b: number) => Math.round(between(a, b))
  const strong = c.band === 'high' ? 1 : c.band === 'medium' ? 0.55 : 0.12 // how strongly the pattern shows
  const t = c.type
  const newCustomer = t === 'Onboarding exception' || c.customer.accountAgeDays < 90
  const weeklyIncome = c.customer.income / 52

  const row = (key: string, label: string, unit: MetricRow['unit'], usual: number, spike: number, source: SourceId, help: string, roundTo = 1): MetricRow => {
    const u = Math.max(0, usual)
    const d7raw = u * (1 + (spike - 1) * strong) * between(0.9, 1.1)
    const r = (v: number) => Math.round(v / roundTo) * roundTo
    const d7 = r(d7raw), d30 = r((3 * u + d7raw) / 4), usualR = newCustomer ? null : r(u)
    const unusual = usualR === null ? false : d7 - usualR >= Math.max(roundTo * 2, usualR * 1.5) || (usualR > 0 && d7 / usualR >= 2.5 && d7 - usualR >= roundTo)
    return { key, label, unit, d7, d30, usual: usualR, unusual, source, help }
  }

  const mule = t === 'Money mule', pay = t === 'Payment fraud', ato = t === 'Account takeover'
  const money: MetricRow[] = [
    row('in', 'Money in (credits)', 'gbp', weeklyIncome * between(0.9, 1.2), mule ? between(7, 12) : 1, 'monitoring',
      'Money received into the account. A sudden rise can indicate mule activity or a safe-account scam.', 10),
    row('out', 'Money out (debits)', 'gbp', weeklyIncome * between(0.7, 1), mule ? between(7, 11) : pay ? between(3, 6) : ato ? between(2, 4) : 1, 'monitoring',
      'Money sent or spent. A sudden rise can indicate a scam victim, account takeover or mule activity.', 10),
    row('payments', 'Payments made', 'count', between(6, 14), mule ? between(3, 5) : pay ? between(2, 3) : 1, 'monitoring',
      'Number of outgoing payments. Many payments in a short time can indicate funds being moved on quickly.'),
    row('savings', 'Moved out of savings', 'gbp', between(0, 40), pay ? between(15, 40) : 1, 'monitoring',
      'Money transferred from savings into the current account. A sudden rise can indicate a scam victim being coached to move money.', 10),
  ]
  const nNew = mule ? int(3, 6) : pay ? int(1, 2) : ato ? 1 : 0
  const firstNames = ['J. Okafor', 'M. Varga', 'A. Novak', 'S. Haddad', 'R. Marsh', 'L. Moreau', 'T. Pryce', 'K. Ibsen', 'D. Quill', 'E. Ferro']
  const nameStart = int(0, firstNames.length - 1)
  const payees: Payee[] = Array.from({ length: Math.max(2, nNew + int(1, 2)) }, (_, i) => {
    const isNew = i < nNew && strong > 0.3
    const added = new Date(NOW.getTime() - (isNew ? int(1, 6) : int(60, 900)) * 86_400_000)
    const payments = isNew ? int(1, 4) : int(0, 2)
    const total = Math.round((isNew ? between(400, 4000) : between(20, 300)) / 10) * 10
    return { name: `${firstNames[(nameStart + i) % firstNames.length]} (••${int(1000, 9999)})`, added, payments, total, isNew, unusual: isNew }
  }).sort((a, b) => b.total - a.total)
  const merchants: Merchant[] = [
    { label: 'Groceries', total: int(60, 180), unusual: false },
    { label: 'Transport', total: int(20, 80), unusual: false },
    ...(pay && strong > 0.3 ? [{ label: 'Crypto exchange', total: int(900, 4500), unusual: true }, { label: 'Electronics', total: int(600, 2200), unusual: true }] : []),
    ...(t === 'Synthetic identity' && strong > 0.3 ? [{ label: 'Money transfer services', total: int(300, 1500), unusual: true }] : []),
  ].sort((a, b) => b.total - a.total)

  const behaviour: MetricRow[] = [
    row('bio', 'Biometric logins (face or fingerprint)', 'count', between(8, 16), ato ? between(0.05, 0.3) : 1, 'device',
      'Logins using face or fingerprint. A drop while passcode logins rise can mean someone else is using the account.'),
    row('pass', 'Passcode logins', 'count', between(0, 3), ato ? between(5, 9) : 1, 'device',
      'Logins using a passcode instead of biometrics. A rise can mean the account is being used on another device.'),
    row('failed', 'Failed login attempts', 'count', between(0, 1), ato ? between(6, 14) : t === 'Synthetic identity' ? 3 : 1, 'device',
      'Logins that failed. Repeated failures can mean someone is guessing the customer’s details.'),
    row('nonuk', 'Logins from outside the UK', 'count', 0, 1, 'device',
      'Logins from an IP address outside the UK. Unusual for a UK customer who isn’t travelling.'),
  ]
  // Account takeover: fixed spikes where the usual is near 0 (can't be multiplied), and a drop in biometric logins.
  if (ato && strong > 0.3 && !newCustomer) {
    const set = (r: MetricRow, d7: number) => { r.d7 = d7; r.d30 = Math.round(((3 * (r.usual ?? 0) + d7) / 4) * 10) / 10; r.unusual = true }
    set(behaviour[1], int(5, 9)) // passcode logins up
    set(behaviour[3], int(2, 6)) // non-UK logins
    const bio = behaviour[0]; if (bio.usual !== null && bio.usual - bio.d7 >= 4) bio.unusual = true // biometric logins dropped
  }

  const ago = (d: number) => new Date(NOW.getTime() - d * 86_400_000)
  const ch = (label: string, on: boolean, days: [number, number], count: [number, number], source: SourceId, help: string): AccountChange =>
    on ? { label, latest: ago(int(days[0], days[1])), count: int(count[0], count[1]), unusual: true, source, help } : { label, latest: null, count: 0, unusual: false, source, help }
  const sig = strong > 0.3
  const changes: AccountChange[] = [
    ch('Mobile number changed', ato && sig, [1, 6], [1, 1], 'contact', 'A new mobile number shortly before payments is a common sign of account takeover (SIM swap).'),
    ch('Email changed', (ato || t === 'Synthetic identity') && sig, [1, 10], [1, 2], 'contact', 'Changing the email stops the real customer getting security alerts.'),
    ch('Address changed', (t === 'Synthetic identity' || mule) && sig, [3, 20], [1, 2], 'contact', 'Frequent address changes can indicate a false or borrowed identity.'),
    ch('Password reset', ato && sig, [0, 2], [1, 3], 'device', 'A reset just before new payees or payments can mean someone else took control.'),
    ch('New device registered', (ato || pay) && sig, [0, 3], [1, 2], 'device', 'A new phone or browser added to the account. Check it matches the customer’s story.'),
  ]

  const activity: CustomerActivity = {
    newCustomer,
    defaultSection: DEFAULT_SECTION[t],
    money, payees, merchants, behaviour,
    device: { current: c.customer.device, firstSeen: ago((ato || pay) && sig ? int(0, 3) : int(120, 800)), newDevice: (ato || pay) && sig },
    changes,
  }
  cache.set(c.id, activity)
  return activity
}

export const unusualCount = (a: CustomerActivity, s: EvidenceSection, identityFlags = 0) =>
  s === 'money' ? a.money.filter(r => r.unusual).length + a.payees.filter(p => p.unusual).length + a.merchants.filter(m => m.unusual).length
  : s === 'behaviour' ? a.behaviour.filter(r => r.unusual).length + (a.device.newDevice ? 1 : 0)
  : s === 'changes' ? a.changes.filter(c => c.unusual).length
  : identityFlags
