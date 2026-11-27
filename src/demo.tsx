// Demo switches for edge cases, so they can be shown on any case in an interview or test session.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface DemoFlags { aiDown: boolean; lowConfidence: boolean; otherViewer: boolean }
const KEY = 'fraud-signal-demo'
const OFF: DemoFlags = { aiDown: false, lowConfidence: false, otherViewer: false }
const Ctx = createContext<{ flags: DemoFlags; set: (k: keyof DemoFlags, v: boolean) => void }>({ flags: OFF, set: () => {} })
export const useDemo = () => useContext(Ctx)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<DemoFlags>(() => { try { return { ...OFF, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return OFF } })
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(flags)) } catch { /* storage unavailable */ } }, [flags])
  return <Ctx.Provider value={{ flags, set: (k, v) => setFlags(f => ({ ...f, [k]: v })) }}>{children}</Ctx.Provider>
}

// Confidence below this is treated as low: the AI summary is collapsed behind a warning.
export const LOW_CONFIDENCE = 0.7
// A score within this many points of a threshold is borderline.
export const BORDERLINE_POINTS = 2
