import { defineConfig, mergeConfig } from 'vitest/config'
import vitestBase from '../../tooling/vitest/base'

export default mergeConfig(vitestBase, defineConfig({}))
