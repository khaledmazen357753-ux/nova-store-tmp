/**
 * طرف آخر داخل فحص العزل: يُشغّل «النظام الكامل» في عملية Node مستقلة.
 *
 * ═══ لماذا عملية أخرى، لا استدعاء داخل نفس الملف؟ ═══════════════════════
 *
 * لأن هذا هو الواقع: كل موقع صفحة مستقلة لها محرك واحد. تشغيل محركين
 * في عملية واحدة ممكن تقنياً لكنه لا يمثّل ما يحدث للمستخدم، وقد يُخفي
 * عطلاً حقيقياً (مثل تلوّث حالة مشتركة بين الموقعين).
 *
 * المخرجات: سطر JSON واحد في آخر ما يُطبع — يقرأه الفحص الرئيسي.
 * كل ما قبل السطر الأخير تشخيص لا يُعتمد عليه.
 */
import { execSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const OUT = path.join(ROOT, 'node_modules', '.verify-procurement');

// نفس حزمة الفحص الرئيسي — تُبنى مرة واحدة لو لم تكن موجودة
const ENTRY =
  'src/offline/bridge.ts src/offline/db.ts src/offline/engine.ts src/offline/sha256.ts ' +
  'src/offline/tabLock.ts src/offline/sqliteFile.ts src/lib/api.ts src/generated/engineBundle.ts ' +
  'src/procurement/engine.ts src/procurement/data.ts';
execSync(
  `npx esbuild ${ENTRY} --format=cjs --platform=node --outbase=src --outdir=${JSON.stringify(OUT)} --loader:.ts=ts --log-level=error`,
  { cwd: ROOT, stdio: 'ignore' }
);

await import('fake-indexeddb/auto');
const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => {
    store[k] = String(v);
  },
  removeItem: (k) => {
    delete store[k];
  },
};
globalThis.__PLUS_WASM_BYTES__ = new Uint8Array(
  readFileSync(path.join(ROOT, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'))
);
globalThis.performance = globalThis.performance || { now: () => Date.now() };

const load = (rel) => import(pathToFileURL(path.join(OUT, rel)).href);
const api = await load('lib/api.js');
const engine = await load('offline/engine.js');

api.configureApi({ namespace: '' });
api.setDataMode('offline');

// نفس ما يفعله النظام الكامل في الإنتاج: زراعة الخادم الكاملة
const state = await engine.initOfflineEngine({ label: 'main' });
const company = state.db.prepare(`SELECT company_name FROM company_settings WHERE id = 1`).get().company_name;
const users = state.db.prepare(`SELECT COUNT(*) c FROM users`).get().c;
const tables = state.db.prepare(`SELECT COUNT(*) c FROM sqlite_master WHERE type='table'`).get().c;

// وأيضاً: دخول حقيقي وعملية كتابة حقيقية — فالقاعدة تحمل أثر مستخدم
const login = await api.apiFetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username: 'accountant', password: 'plus123', portal: 'ERP' }),
});
api.setStoredToken(login.token);
const dash = await api.apiFetch('/api/reports/dashboard');

console.log(
  JSON.stringify({
    company,
    users,
    tables,
    dbName: 'plus_erp_offline',
    keyName: 'plus_erp.sqlite',
    cash: dash.kpis?.cash_and_banks ?? null,
    payables: dash.kpis?.total_payables ?? null,
  })
);
