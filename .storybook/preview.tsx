import type { Preview } from '@storybook/react-vite'
import { useEffect } from 'react'
import { ToastProvider } from '../src/design-system'
import '../src/styles.css'

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Colour scheme (SLDS 2 Cosmos light and dark)',
      toolbar: { title: 'Theme', icon: 'mirror', items: [{ value: 'light', title: 'Light' }, { value: 'dark', title: 'Dark' }], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (Story, ctx) => {
      const theme = ctx.globals.theme as string
      useEffect(() => { document.documentElement.setAttribute('data-theme', theme) }, [theme])
      return <ToastProvider><div className="sb-canvas"><Story /></div></ToastProvider>
    },
  ],
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    options: { storySort: { order: ['Introduction', 'Foundations', 'Components', 'Charts', 'AI patterns'] } },
  },
}
export default preview
