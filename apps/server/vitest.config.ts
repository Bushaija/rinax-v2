import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/api': path.resolve(__dirname, './src/api'),
      '@/db': path.resolve(__dirname, './src/db'),
      '@/lib': path.resolve(__dirname, './src/lib'),
    },
  },
});
