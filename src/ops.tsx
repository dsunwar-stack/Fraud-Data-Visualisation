// Team observability: who holds which case, why cases are late, and how the team and its systems are doing.
// Synthetic, seeded from each case ID (own RNG), so the main sample data never changes.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CASES, NOW, SOURCE_HEALTH, type CaseType, type FraudCase, type Outcome, type SourceId } from './data'

export interface Specialist {
  id: string; name: string; skills: CaseType[]; status: 'Available' | 'In a meeting' | 'On leave'
  backOn?: string        // when someone on leave returns
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
  { id: 'fn', name: 'Farid Nasser', skills: ['Onboarding exception'], status: 'On leave', backOn: '18 Nov', capacity: 10, avgDecisionMin: 29, decidedToday: 3 },
  { id: 'gl', name: 'Grace Lin', skills: ['Account takeover', 'Money mule', 'Payment fraud'], status: 'Available', capacity: 15, avgDecisionMin: 20, decidedToday: 15 },
  { id: 'hw', name: 'Harry Walsh', skills: ['Onboarding exception', 'Synthetic identity', 'Account takeover'], status: 'Available', capacity: 12, avgDecisionMin: 35, decidedToday: 7 },
]
export const specialist = (id: string | null) => SPECIALISTS.find(s => s.id === id) ?? null

export type Step = 'Triage' | 'Evidence' | 'Review' | 'Decision'
export const STEPS: Step[] = ['Triage', 'Evidence', 'Review', 'Decision']
export type Cause = 'Unassigned' | 'Specialist unavailable' | 'Specialist overloaded' | 'System degraded' | 'Waiting on customer' | 'In progress'
export const CAUSE_HELP: Record<Cause, { help: string; action: string }> = {
  'Unassigned': { help: 'Nobody owns the case yet.', action: 'Assign it to an available specialist with the right skills.' },
  'Specialist unavailable': { help: 'The owner is on leave or in a meeting, so the case isn’t moving.', action: 'Reassign it.' },
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

// Why the system recommends someone, in plain words (shown under every suggestion).
export function suggestReason(c: FraudCase, s: Specialist, a: Ctx): string {
  const free = s.capacity - a.load(s.id)
  return `${c.type} skill · available · ${free} free slot${free === 1 ? '' : 's'}`
}

// Best person to take a case: available, has the skill, most free capacity.
export function suggestFor(c: FraudCase, a: Ctx, extra: Record<string, number> = {}): Specialist | null {
  return SPECIALISTS
    .filter(s => s.status === 'Available' && s.skills.includes(c.type))
    .map(s => ({ s, free: s.capacity - a.load(s.id) - (extra[s.id] ?? 0) }))
    .filter(x => x.free > 0)
    .sort((x, y) => y.free - x.free)[0]?.s ?? null
}

// ---------- history (last 24 hours, last 7 days) ----------
// Synthetic trends that end at today's live values. The ID check outage starts OUTAGE_AT hours ago.
export const OUTAGE_AT = 6
export const ALERT_MS = 1500 // response-time alert line
export interface TeamHistory {
  hours: Date[]; casesIn: number[]; decided: number[]; backlog: number[]; breached: number[]
  due1h: number[]; unassigned: number[]; free: number[]; latency: Record<SourceId, number[]>
  days: Date[]; dayDecided: number[]; dayAgreed: number[]; dayAvgDecide: number[]
}
export function teamHistory(now: { open: number; breached: number; due1h: number; unassigned: number; free: number; decided: number; agreed: number }): TeamHistory {
  const r = seeded('team-history')
  const between = (a: number, b: number) => Math.round(a + r() * (b - a))
  const hours = Array.from({ length: 24 }, (_, i) => new Date(NOW.getTime() - (23 - i) * 3600_000))
  const out = (i: number) => i >= 24 - OUTAGE_AT // during the ID check outage
  const night = (d: Date) => d.getUTCHours() < 7
  const casesIn = hours.map((d, i) => night(d) ? between(1, 4) : between(5, 9) + (out(i) ? between(1, 3) : 0))
  const decided = hours.map((d, i) => night(d) ? between(0, 2) : out(i) ? between(3, 5) : between(6, 9))
  const backlog = Array(24).fill(0); backlog[23] = now.open
  for (let i = 23; i > 0; i--) backlog[i - 1] = Math.max(0, backlog[i] - casesIn[i] + decided[i])
  const ramp = (end: number, calm: [number, number]) => hours.map((_, i) => i === 23 ? end : out(i) ? Math.round(calm[1] + (end - calm[1]) * ((i - (24 - OUTAGE_AT)) / OUTAGE_AT)) + between(-1, 1) : between(calm[0], calm[1])).map(v => Math.max(0, v))
  const latency = Object.fromEntries(SOURCE_HEALTH.map(s => {
    const base = s.status === 'degraded' ? between(380, 460) : s.latencyP95
    return [s.id, hours.map((_, i) => i === 23 ? s.latencyP95 : s.status === 'degraded' && out(i) ? between(2300, 3100) : Math.round(base * (0.8 + r() * 0.35)))]
  })) as Record<SourceId, number[]>
  const days = Array.from({ length: 7 }, (_, i) => new Date(NOW.getTime() - (6 - i) * 86_400_000))
  const dayDecided = days.map((_, i) => i === 6 ? now.decided : between(38, 52))
  const dayAgreed = dayDecided.map((d, i) => i === 6 ? now.agreed : Math.round(d * (0.84 + r() * 0.08)))
  const dayAvgDecide = days.map((_, i) => i === 6 ? 31 : between(21, 25))
  return {
    hours, casesIn, decided, backlog, breached: ramp(now.breached, [0, 2]), due1h: ramp(now.due1h, [4, 8]),
    unassigned: ramp(now.unassigned, [6, 12]), free: ramp(now.free, [24, 32]),
    latency, days, dayDecided, dayAgreed, dayAvgDecide,
  }
}
