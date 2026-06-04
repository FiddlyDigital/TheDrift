import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteObfuscateFile as obfuscatorPlugin } from 'vite-plugin-obfuscator';

export default defineConfig(() => ({
  base: process.env.BASE_URL || '/',
  plugins: [
    react(),
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
  },
}));
