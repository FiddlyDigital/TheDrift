import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteObfuscateFile as obfuscatorPlugin } from 'vite-plugin-obfuscator';

export default defineConfig(({ command }) => ({
  base: process.env.BASE_URL || '/',
  plugins: [
    react(),
    ...(command === 'build' ? [
      obfuscatorPlugin({
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        selfDefending: false,
        stringArray: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 1,
        stringArrayWrappersChainedCalls: true,
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: false,
      }),
    ] : []),
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
  },
}));
