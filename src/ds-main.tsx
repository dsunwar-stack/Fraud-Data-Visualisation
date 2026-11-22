// Standalone design system site (separate from the dashboard).
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DesignSystem } from './views/DesignSystem'
import { RadioButtonGroup, ToastProvider } from './design-system'
import './styles.css'

type Theme = 'light' | 'system' | 'dark'

function Site() {
  const [theme, setTheme] = useState<Theme>('system')
  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  return (
    <ToastProvider>
      <div className="ds-site">
        <div className="ds-site-bar">
          <span className="brand">
            <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--primary)" /><path d="M6 20h4l3-9 4 13 3-8 2 4h4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Fraud Signal design system
          </span>
          <RadioButtonGroup name="ds-theme" legend="Theme" size="small" value={theme} onChange={setTheme}
            options={(['light', 'system', 'dark'] as Theme[]).map(t => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }))} />
        </div>
        <DesignSystem />
      </div>
    </ToastProvider>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Site /></StrictMode>)
