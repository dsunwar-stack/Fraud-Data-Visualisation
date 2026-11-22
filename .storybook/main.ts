import type { StorybookConfig } from '@storybook/react-vite'

const config: StorybookConfig = {
  stories: ['../src/stories/**/*.mdx', '../src/stories/**/*.stories.tsx'],
  addons: ['@storybook/addon-docs'],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
  // The app is served from /Fraud-Data-Visualisation/; Storybook must use relative paths.
  viteFinal: async cfg => ({ ...cfg, base: './' }),
}
export default config
