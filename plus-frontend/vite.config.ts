import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/**
 * بناء متعدد الصفحات — موقعان في نشر واحد:
 *
 *   /                ← النظام المحاسبي الكامل (index.html)
 *   /procurement     ← موقع المشتريات والمخازن والموردين (procurement.html)
 *
 * لماذا موقعان في نفس مشروع Vite وليس مشروعين؟
 *   لأن كل المنطق المحاسبي واحد: نفس المخطط، نفس كود الخادم، نفس المحرك.
 *   مشروعان كانا يعنيان نسختين من `engineBundle` تتباعدان مع أول تعديل.
 *   ما يجب أن ينفصل هو **البيانات والجلسة** — وقد انفصلا فعلاً على مستوى
 *   IndexedDB وlocalStorage (انظر offline/db.ts وoffline/engine.ts).
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(ROOT, 'index.html'),
        procurement: path.resolve(ROOT, 'procurement.html'),
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3001,
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
    port: 3001,
    strictPort: true,
    allowedHosts: true,
  },
});
