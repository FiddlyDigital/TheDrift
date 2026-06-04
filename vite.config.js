import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => ({
  base: process.env.BASE_URL || '/',
  plugins: [
    react(),
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
