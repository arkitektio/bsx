import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // jsdom workers are heavy: more than a few at once runs a machine out of memory.
    maxWorkers: 4,
    // The runtime Tailwind reads Tailwind's own stylesheets as text (`?raw`).
    css: {include: [/tailwindcss\/(theme|utilities)\.css/]},
  },
});
