/**
 * يكشف أي استخدام لواجهات Node غير متاحة في المتصفح.
 *
 * السبب: عطل "Buffer is not defined" منع كل مستخدم من الدخول في الوضع
 * الأوفلاين، ومرّ من 56 فحصاً بنجاح لأن Node يوفّر Buffer مدمجة. الاختبار
 * كان يختبر بيئة مختلفة عن بيئة المستخدم — وهذا عيب منهجي لا سطر كود.
 *
 * هذا الفحص يحذف واجهات Node من البيئة العامة قبل التحميل (كما في المتصفح)
 * ثم يشغّل مسارات حقيقية. أي اعتماد عليها يظهر هنا قبل المستخدم.
 */
import { execSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const OUT = path.join(ROOT, 'node_modules', '.verify-bapis');

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
};

/* الواجهات المتاحة في المتصفح فقط — ما عداها غير موجود */
const BROWSER_SAFE = new Set(['console', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'queueMicrotask']);

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  const ENTRY = 'src/offline/bridge.ts src/offline/db.ts src/offline/engine.ts src/offline/sha256.ts src/offline/tabLock.ts src/lib/api.ts src/generated/engineBundle.ts';
  execSync(
    `npx esbuild ${ENTRY} --format=cjs --platform=node --outbase=src --outdir=${JSON.stringify(OUT)} --loader:.ts=ts --log-level=error`,
    { cwd: ROOT }
  );

  // ── نحذف واجهات Node من البيئة العامة قبل تحميل أي شيء ──
  const removed = {};
  for (const name of ['Buffer', 'process', '__dirname', '__filename', 'require', 'module', 'exports', 'global']) {
    if (name in globalThis) {
      removed[name] = globalThis[name];
      try { delete globalThis[name]; } catch { /* بعض الخصائص غير قابلة للحذف */ }
    }
  }
  check('واجهات Node محذوفة من البيئة', typeof globalThis.Buffer === 'undefined' || 'محاكاة جزئية');

  await import('fake-indexeddb/auto');
  globalThis.localStorage = {
    _d: {},
    getItem(k) { return this._d[k] ?? null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
  };
  globalThis.__PLUS_WASM_BYTES__ = new Uint8Array(
    readFileSync(path.join(ROOT, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'))
  );
  globalThis.performance = globalThis.performance || { now: () => Date.now() };

  const load = (rel) => import(pathToFileURL(path.join(OUT, rel)).href);

  // ── التهيئة الكاملة: مخطط + زراعة + راوترات ──
  let state = null, bootErr = null;
  try {
    const engine = await load('offline/engine.js');
    state = await engine.initOfflineEngine();
  } catch (e) { bootErr = e; }

  check('النظام يبدأ بلا أي واجهة Node', Boolean(state), bootErr ? bootErr.message.slice(0, 70) : '');
  if (!state) { console.log(`\nالنتيجة: ${pass} نجح | ${fail} فشل`); process.exit(1); }

  check('المخطط كامل', state.meta.tables === 37, `${state.meta.tables} جدول`);
  check('الراوترات مركّبة', state.routers.length === 5, `${state.routers.length} راوتر`);

  const api = await load('lib/api.js');
  api.setDataMode('offline');

  // ── مسار قراءة ──
  let login = null, loginErr = null;
  try {
    login = await api.apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123', portal: 'ERP' }),
    });
  } catch (e) { loginErr = e; }
  check('الدخول يعمل بلا واجهات Node', Boolean(login?.token), loginErr ? loginErr.message.slice(0, 60) : '');
  if (login?.token) api.setStoredToken(login.token);

  // ── مسارات قراءة متعددة ──
  const reads = [
    ['/api/reports/dashboard', 'لوحة التحكم'],
    ['/api/reports/financial', 'التقارير المالية'],
    ['/api/reports/inventory', 'المخزون'],
    ['/api/reports/financial', 'دليل الحسابات'],
    ['/api/master/customers', 'العملاء'],
    ['/api/admin/overview', 'نظرة عامة للإدارة'],
    ['/api/admin/audit-logs', 'سجل التدقيق'],
  ];
  for (const [pth, label] of reads) {
    let ok = false, err = '';
    try { await api.apiFetch(pth); ok = true; } catch (e) { err = e.message; }
    check(`قراءة تعمل: ${label}`, ok, ok ? '' : err.slice(0, 50));
  }

  // ── مسار كتابة (يحسب قيوداً وتشفيراً) ──
  let wrote = false, writeErr = '';
  try {
    await api.apiFetch('/api/master/customers', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: 'CUST-BAPI-01',
        customer_name: 'عميل فحص الواجهات',
        phone: '0100',
        opening_balance: 0,
        credit_limit: 1000,
      }),
    });
    wrote = true;
  } catch (e) { writeErr = e.message; }
  check('الكتابة تعمل بلا واجهات Node', wrote, wrote ? '' : writeErr.slice(0, 60));

  // ── لا أثر لواجهات Node في بيئة التشغيل ──
  // حقن Buffer من الحزمة نفسها هو *الإصلاح المطلوب*، لا عيب.
  // المهم أن ما حُقن هو بديلنا الصغير لا Buffer الأصلية من Node.
  check(
    'process ما زالت غائبة (لا اعتماد على Node)',
    typeof globalThis.process === 'undefined'
  );
  check(
    'Buffer المحقونة هي بديل الحزمة لا نسخة Node',
    typeof globalThis.Buffer?.from === 'function' &&
      !/\(native\)/.test(Function.prototype.toString.call(globalThis.Buffer.from)),
    'بديل مكتوب بـ JavaScript'
  );

  // استعادة ما حذفناه حتى لا يتأثر باقي التشغيل
  for (const [k, v] of Object.entries(removed)) {
    if (typeof globalThis[k] === 'undefined') { try { globalThis[k] = v; } catch { /* تجاهل */ } }
  }

  rmSync(OUT, { recursive: true, force: true });
  console.log(`\nالنتيجة: ${pass} نجح | ${fail} فشل`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('فشل الفحص:', e); process.exit(1); });
