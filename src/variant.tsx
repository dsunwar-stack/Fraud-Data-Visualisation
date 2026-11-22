// Layout variants. A = current layout (round 18). B = integrated evidence (round 19).
// The default comes from the build (VITE_VARIANT=B for the Version B site); people can switch in the sidebar.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Variant = 'A' | 'B'
const BUILD_DEFAULT: Variant = import.meta.env.VITE_VARIANT === 'B' ? 'B' : 'A'
const KEY = 'fraud-signal-variant'

const Ctx = createContext<{ variant: Variant; setVariant: (v: Variant) => void }>({ variant: BUILD_DEFAULT, setVariant: () => {} })
export const useVariant = () => useContext(Ctx)

export function VariantProvider({ children }: { children: ReactNode }) {
  const [variant, setVariant] = useState<Variant>(() => {
    try { const v = localStorage.getItem(KEY); return v === 'A' || v === 'B' ? v : BUILD_DEFAULT } catch { return BUILD_DEFAULT }
  })
  useEffect(() => { try { localStorage.setItem(KEY, variant) } catch { /* storage unavailable */ } }, [variant])
  return <Ctx.Provider value={{ variant, setVariant }}>{children}</Ctx.Provider>
}
