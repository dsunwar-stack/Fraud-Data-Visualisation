// Team observability: who holds which case, why cases are late, and how the team and its systems are doing.
// Synthetic, seeded from each case ID (own RNG), so the main sample data never changes.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CASES, NOW, SOURCE_HEALTH, type CaseType, type FraudCase, type Outcome, type SourceId } from './data'

export interface Specialist {
  id: string; name: string; skills: CaseType[]; status: 'Available' | 'In a meeting' | 'Away'
  capacity: number       // open cases they can hold at once
  avgDecisionMin: number // average time to decide a case, last 7 days
  decidedToday: number
}
// Fictional team.
export const SPECIALISTS: Specialist[] = [
  { id: 'ar', name: 'Aisha Rahman', skills: ['Money mule', 'Payment fraud'], status: 'Available', capacity: 14, avgDecisionMin: 22, decidedToday: 14 },
  { id: 'bc', name: 'Ben Carter', skills: ['Account takeover'], status: 'Available', capacity: 13, avgDecisionMin: 18, decidedToday: 17 },
  { id: 'ce', name: 'Chloe Evans', skills: ['Onboarding exception', 'Synthetic identity'], status: 'Available', capacity: 14, avgDecisionMin: 26, decidedToday: 11 },
  { id: 'do', name: 'Daniel Osei', skills: ['Payment fraud', 'Account takeover'], status: 'In a meeting', capacity: 10, avgDecisionMin: 31, decidedToday: 6 },
  { id: 'ek', name: 'Emma Kowalski', skills: ['Synthetic identity', 'Money mule'], status: 'Available', capacity: 13, avgDecisionMin: 24, decidedToday: 12 },
  { id: 'fn', name: 'Farid Nasser', skills: ['Onboarding exception'], status: 'Away', capacity: 10, avgDecisionMin: 29, decidedToday: 3 },
  { id: 'gl', name: 'Grace Lin', skills: ['Account takeover', 'Money mule', 'Payment fraud'], status: 'Available', capacity: 15, avgDecisionMin: 20, decidedToday: 15 },
  { id: 'hw', name: 'Harry Walsh', skills: ['Onboarding exception', 'Synthetic identity', 'Account takeover'], status: 'Available', capacity: 12, avgDecisionMin: 35, decidedToday: 7 },
]
export const specialist = (id: string | null) => SPECIALISTS.find(s => s.id === id) ?? null

export type Step = 'Triage' | 'Evidence' | 'Review' | 'Decision'
export const STEPS: Step[] = ['Triage', 'Evidence', 'Review', 'Decision']
export type Cause = 'Unassigned' | 'Specialist unavailable' | 'Specialist overloaded' | 'System degraded' | 'Waiting on customer' | 'In progress'
export const CAUSE_HELP: Record<Cause, { help: string; action: string }> = {
  'Unassigned': { help: 'Nobody owns the case yet.', action: 'Assign it to an available specialist with the right skills.' },
  'Specialist unavailable': { help: 'The owner is away or in a meeting, so the case isn’t moving.', action: 'Reassign it.' },
  'Specialist overloaded': { help: 'The owner holds more cases than they can handle.', action: 'Reassign it to someone with free capacity.' },
  'System degraded': { help: 'A system this case relies on is degraded, so its evidence may be incomplete.', action: 'Tell the specialist to check that system manually or refer the case.' },
  'Waiting on customer': { help: 'Waiting for the customer to send information.', action: 'Chase the customer, or refer if the SLA will be missed.' },
  'In progress': { help: 'Being worked on, but close to the SLA.', action: 'Check in with the owner.' },
}

function seeded(id: string) {
  let h = 2166136261
  for (const ch of id + ':ops') h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  let s = h >>> 0
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

export interface CaseOps { step: Step; minutesInStep: number; initialAssignee: string | null; aiAgreed?: boolean; decidedAs?: Outcome }
const opsCache = new Map<string, CaseOps>()
export function caseOps(c: FraudCase): CaseOps {
  const hit = opsCache.get(c.id); if (hit) return hit
  const r = seeded(c.id)
  const ageMin = Math.max(1, Math.round((NOW.getTime() - c.createdAt.getTime()) / 60_000))
  const step: Step = c.status === 'New' ? 'Triage' : c.status === 'Awaiting info' ? 'Review' : c.status === 'Decided' ? 'Decision' : (r() < 0.55 ? 'Evidence' : 'Review')
  const minutesInStep = Math.max(1, Math.round(ageMin * (0.3 + r() * 0.6)))
  // Most cases are routed to someone with the right skills; some arrive unassigned.
  const skilled = SPECIALISTS.filter(s => s.skills.includes(c.type))
  const initialAssignee = c.status === 'New' && r() < 0.45 ? null : skilled[Math.floor(r() * skilled.length)]?.id ?? null
  const ops: CaseOps = { step, minutesInStep, initialAssignee }
  if (c.status === 'Decided') {
    ops.aiAgreed = r() < 0.84
    ops.decidedAs = ops.aiAgreed ? c.recommended : (['Decline', 'Refer', 'Accept'] as Outcome[]).filter(o => o !== c.recommended)[Math.floor(r() * 2)]
  }
  opsCache.set(c.id, ops)
  return ops
}

export const DEGRADED: SourceId[] = SOURCE_HEALTH.filter(s => s.status === 'degraded').map(s => s.id)
export const usesDegraded = (c: FraudCase) => c.factors.some(f => DEGRADED.includes(f.source))

// ---------- assignments (shared across screens) ----------
export interface AssignmentLog { at: Date; caseIds: string[]; to: string; from: (string | null)[] }
interface Ctx {
  assignee: (caseId: string) => string | null
  assign: (caseIds: string[], to: string) => void
  load: (specId: string) => number
  log: AssignmentLog[]
}
const AssignCtx = createContext<Ctx | null>(null)
const STORE = 'fraud-signal-assignments'
export const OPEN_CASES = CASES.filter(c => c.status !== 'Decided')

export function AssignmentProvider({ children }: { children: ReactNode }) {
  // Assignments you make are kept in this browser so they survive a reload (demo only; a real system saves them on the case).
  const [map, setMap] = useState<Record<string, string | null>>(() => {
    let saved: Record<string, string> = {}
    try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') } catch { /* storage unavailable */ }
    return { ...Object.fromEntries(CASES.map(c => [c.id, caseOps(c).initialAssignee])), ...saved }
  })
  const [log, setLog] = useState<AssignmentLog[]>([])
  const assign = useCallback((caseIds: string[], to: string) => {
    setLog(l => [{ at: NOW, caseIds, to, from: caseIds.map(id => map[id] ?? null) }, ...l])
    setMap(m => ({ ...m, ...Object.fromEntries(caseIds.map(id => [id, to])) }))
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || '{}')
      caseIds.forEach(id => { saved[id] = to })
      localStorage.setItem(STORE, JSON.stringify(saved))
    } catch { /* storage unavailable */ }
  }, [map])
  const value = useMemo<Ctx>(() => {
    const loads: Record<string, number> = {}
    for (const c of OPEN_CASES) { const a = map[c.id]; if (a) loads[a] = (loads[a] ?? 0) + 1 }
    return { assignee: id => map[id] ?? null, assign, load: id => loads[id] ?? 0, log }
  }, [map, assign, log])
  return <AssignCtx.Provider value={value}>{children}</AssignCtx.Provider>
}
export const useAssignments = () => useContext(AssignCtx)!

// Why an open case is at risk of missing its SLA, given who holds it now.
export function causeOf(c: FraudCase, a: Ctx): Cause {
  const who = specialist(a.assignee(c.id))
  if (!who) return 'Unassigned'
  if (who.status !== 'Available') return 'Specialist unavailable'
  if (a.load(who.id) > who.capacity) return 'Specialist overloaded'
  if (usesDegraded(c)) return 'System degraded'
  if (c.status === 'Awaiting info') return 'Waiting on customer'
  return 'In progress'
}

// Best person to take a case: available, has the skill, most free capacity.
export function suggestFor(c: FraudCase, a: Ctx, extra: Record<string, number> = {}): Specialist | null {
  return SPECIALISTS
    .filter(s => s.status === 'Available' && s.skills.includes(c.type))
    .map(s => ({ s, free: s.capacity - a.load(s.id) - (extra[s.id] ?? 0) }))
    .filter(x => x.free > 0)
    .sort((x, y) => y.free - x.free)[0]?.s ?? null
}
