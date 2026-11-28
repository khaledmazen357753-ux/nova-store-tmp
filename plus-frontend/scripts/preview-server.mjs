/**
 * خادم معاينة محلي يحاكي Vercel في الأمر الذي يهمّ موقع المشتريات:
 * إعادة كتابة /procurement → /procurement.html.
 *
 * في Vercel يفعلها vercel.json؛ بدونها يعرض المسار صفحة النظام الكامل
 * (fallback الـ SPA) فتظهر شاشة تشغيل النظام لا موقع المشتريات.
 *
 * التشغيل: npm run build && npm run preview:dist
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
};

/** نفس ترتيب vercel.json: مسارات المشتريات أولاً، ثم صفحة النظام */
function resolvePath(pathname) {
  if (pathname === '/procurement' || pathname === '/procurement/') return '/procurement.html';
  if (/^\/procurement\/.+/.test(pathname)) return '/procurement.html';
  if (!path.extname(pathname)) return '/index.html';
  return pathname;
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const target = resolvePath(url.pathname);

  try {
    const file = path.join(ROOT, target);
    if (!file.startsWith(ROOT)) throw new Error('forbidden');
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
      'cache-control': 'no-store',
      'service-worker-allowed': '/',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`404 — ${url.pathname}`);
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`معاينة على المنفذ ${PORT}`);
  console.log(`  النظام الكامل : /`);
  console.log(`  المشتريات     : /procurement`);
});
