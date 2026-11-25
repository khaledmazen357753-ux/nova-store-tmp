/**
 * ينسخ نواة SQLite (wasm) إلى public/sql-wasm/.
 *
 * السبب: ملف الـ wasm يجب أن يُقدَّم من نفس أصل الموقع حتى يخزّنه
 * Service Worker، فيعمل محرك الحسابات من أول فتحة بلا إنترنت.
 * (بدلاً من تحميله من CDN، وهو ما يفشل أوفلاين.)
 */

import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SRC = path.join(ROOT, 'node_modules', 'sql.js', 'dist');
const DEST = path.join(ROOT, 'public', 'sql-wasm');

// الـ glue يأتي من حزمة npm نفسها؛ نحتاج ملف الـ wasm فقط
const FILES = ['sql-wasm.wasm'];

const missing = FILES.filter((f) => !existsSync(path.join(SRC, f)));
if (missing.length) {
  console.error(`❌ ملفات sql.js غير موجودة: ${missing.join(', ')}`);
  console.error('   شغّل: npm install');
  process.exit(1);
}

mkdirSync(DEST, { recursive: true });
for (const f of FILES) {
  copyFileSync(path.join(SRC, f), path.join(DEST, f));
}

const kb = (n) => `${(n / 1024).toFixed(0)} kb`;
const sizes = FILES.map((f) => `${f} ${kb(statSync(path.join(DEST, f)).size)}`).join(' · ');
console.log(`✅ نواة SQLite جاهزة في public/sql-wasm — ${sizes}`);
