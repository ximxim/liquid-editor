import { defineConfig, mergeConfig } from 'vitest/config'
import vitestBase from '../../tooling/vitest/base'
import react from '@vitejs/plugin-react'

export default mergeConfig(
  vitestBase,
  defineConfig({
    plugins: [react()],
    test: {
      setupFiles: ['./src/test-setup.ts'],
    },
  })
)
