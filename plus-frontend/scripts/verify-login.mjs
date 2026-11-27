/**
 * اختبار تسجيل الدخول في الوضع الأوفلاين — بلا Buffer عالمية.
 *
 * السبب: كل الفحوصات السابقة كانت تعمل في Node، وNode عنده Buffer مدمجة.
 * فعطل "Buffer is not defined" الذي منع كل مستخدم من الدخول لم يُكتشف
 * أبداً — الاختبار كان يختبر بيئة مختلفة عن بيئة المستخدم.
 *
 * هنا نحذف Buffer من الكائن العام قبل التحميل، فلا يمرّ شيء إلا إذا كانت
 * الحزمة تحقن بديلها بنفسها.
 */
import { execSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const OUT = path.join(ROOT, 'node_modules', '.verify-login');

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
};

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  const ENTRY = 'src/offline/bridge.ts src/offline/db.ts src/offline/engine.ts src/offline/sha256.ts src/offline/tabLock.ts src/lib/api.ts src/generated/engineBundle.ts';
  execSync(
    `npx esbuild ${ENTRY} --format=cjs --platform=node --outbase=src --outdir=${JSON.stringify(OUT)} --loader:.ts=ts --log-level=error`,
    { cwd: ROOT }
  );

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
  const api = await load('lib/api.js');
  api.setDataMode('offline');

  // ← المحاكاة الحاسمة: نحذف Buffer تماماً كما في المتصفح
  // نحذف Buffer قبل *أي* تحميل للحزمة — كما في المتصفح تمامًا حيث لا وجود لها.
  // الاختبار السابق كان يحذفها بعد التحميل، وهو سيناريو لا يحدث في الواقع.
  const savedBuffer = globalThis.Buffer;
  delete globalThis.Buffer;
  check('Buffer محذوفة (كما في المتصفح)', typeof globalThis.Buffer === 'undefined');

  let login = null, loginErr = null;
  try {
    login = await api.apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123', portal: 'ERP' }),
    });
  } catch (e) { loginErr = e; }

  check('تسجيل الدخول ينجح بلا Buffer', Boolean(login?.token),
    loginErr ? `خطأ: ${loginErr.message}` : `رمز بطول ${login?.token?.length}`);
  check('اسم المستخدم صحيح', login?.user?.username === 'admin', login?.user?.username);
  check('الصلاحيات وصلت', Boolean(login?.user?.role_code), login?.user?.role_code);

  // ── توكن صالح: يفتح مساراً محمياً ──
  if (login?.token) {
    api.setStoredToken(login.token);
    let dash = null, dashErr = null;
    try {
      dash = await api.apiFetch('/api/reports/dashboard');
    } catch (e) { dashErr = e; }
    check('التوكن يفتح مساراً محمياً', Boolean(dash) && !dashErr,
      dashErr ? dashErr.message : 'لوحة التحكم');

    // ── رفض توكن مزوّر ──
    api.setStoredToken(login.token.slice(0, -4) + 'AAAA');
    let rejected = false;
    try { await api.apiFetch('/api/reports/dashboard'); } catch { rejected = true; }
    check('التوكن المزوّر مرفوض', rejected === true);
  }

  // ── كلمة مرور خاطئة ──
  api.setStoredToken(null);
  let wrongRejected = false;
  try {
    await api.apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'خطأ', portal: 'ERP' }),
    });
  } catch { wrongRejected = true; }
  check('كلمة المرور الخاطئة مرفوضة', wrongRejected === true);

  globalThis.Buffer = savedBuffer;

  // ── كل الأدوار تدخل ──
  for (const [u, p] of [['accountant','plus123'],['sales','plus123'],['store','plus123'],['hr','plus123'],['auditor','plus123']]) {
    let lastErr = '';
    let ok = false;
    try {
      const r = await api.apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: u, password: p, portal: 'ERP' }),
      });
      ok = Boolean(r?.token);
    } catch (e) { lastErr = e.message; ok = false; }
    check(`دخول ${u}`, ok, ok ? '' : lastErr.slice(0, 60));
  }

  rmSync(OUT, { recursive: true, force: true });
  console.log(`\nالنتيجة: ${pass} نجح | ${fail} فشل`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('فشل الاختبار:', e); process.exit(1); });
