import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/__tests__/**/*.test.{js,jsx,ts,tsx}'],
    setupFiles: ['src/test/setup.js'],
  },
})
