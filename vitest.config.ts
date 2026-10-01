import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    execArgv: ['--import', './scripts/vitest-node-shim.mjs'],
  },
});
