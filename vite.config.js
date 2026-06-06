import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteObfuscateFile as obfuscatorPlugin } from 'vite-plugin-obfuscator';

export default defineConfig(() => ({
  base: process.env.BASE_URL || '/',
  // Route every react/react-dom import (ours *and* deps like zustand) to Preact.
  // Anchored regex, most-specific first, so jsx-runtime/react-dom don't get
  // swallowed by the bare `react` rule.
  resolve: {
    alias: [
      { find: /^react\/jsx-runtime$/, replacement: 'preact/jsx-runtime' },
      { find: /^react-dom\/client$/, replacement: 'preact/compat' },
      { find: /^react-dom$/, replacement: 'preact/compat' },
      { find: /^react$/, replacement: 'preact/compat' },
    ],
  },
  plugins: [
    // preact/compat aliases (react, react-dom, react-dom/client, react/jsx-runtime)
    // are wired by the preset for both the build and the vitest run.
    preact(),
    obfuscatorPlugin({
      rotateStringArray: true,
      stringArray: true,
      stringArrayThreshold: 0.75,
      identifierNamesGenerator: 'hexadecimal',
      selfDefending: false,
    }),
  ],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        passes: 2,
      },
      mangle: { toplevel: false },
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.js'],
    // Inline zustand so vitest transforms it through Vite and the react ->
    // preact/compat alias applies to its internal `import 'react'` (externalized
    // deps resolve via Node and would otherwise pull the real react).
    server: { deps: { inline: ['zustand'] } },
  },
}));
