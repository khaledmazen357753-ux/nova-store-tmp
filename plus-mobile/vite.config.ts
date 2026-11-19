import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from './scripts/vite-single-file.mjs';

/**
 * تطبيق الجوال يعتمد استراتيجية "قشرة أصلية + واجهة مضمّنة":
 * كل ملفات الواجهة تُحزَم في ملف HTML واحد داخل التطبيق،
 * فيعمل التطبيق ويُفتح فوراً حتى بدون أي اتصال بالشبكة.
 */
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
  // لا نفحص ملفات البناء المضمَّنة داخل مشروعي أندرويد و iOS
  optimizeDeps: {
    entries: ['index.html'],
  },
  server: {
    host: '0.0.0.0',
    port: 3003,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3003,
    strictPort: true,
    allowedHosts: true,
  },
  build: {
    target: 'es2019',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    outDir: mode === 'app' ? 'dist-app' : 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
}));
