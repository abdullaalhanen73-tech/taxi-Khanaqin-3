import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ['browser', 'import', 'module', 'default', 'require'],
  },
  optimizeDeps: {
    include: ['firebase/app', 'firebase/firestore'],
    esbuildOptions: {
      mainFields: ['module', 'browser', 'main'],
    },
  },
});
