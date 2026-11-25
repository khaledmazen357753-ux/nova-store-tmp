/**
 * تحقّق شامل من أن «العقل المحاسبي» يعمل فعلاً داخل المتصفح.
 *
 * ينفّذ نفس المسار الذي تسلكه الواجهة بالحرف:
 *   apiFetch → initOfflineEngine → sql.js → accountingEngine.js → routes/*.js
 * مع IndexedDB حقيقي (fake-indexeddb) لمحاكاة التخزين الدائم.
 *
 * التشغيل: npm run verify:offline
 * (يحتاج: npm i -D fake-indexeddb، ويُثبَّت تلقائياً إن غاب)
 */

import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const TMP = path.join(ROOT, 'node_modules', '.offline-verify');
// نسختان منفصلتان من الحزمة: الثانية تحاكي إعادة تحميل الصفحة بدقة
// (وحدات JS جديدة تماماً + نفس IndexedDB — وهو ما يحدث فعلياً في المتصفح)
const TMP2 = path.join(ROOT, 'node_modules', '.offline-verify-2');
// نسخة ثالثة تحاكي تبويباً ثانياً لم يُهيَّأ بعد
const TMP3 = path.join(ROOT, 'node_modules', '.offline-verify-3');

const results = [];
function check(name, ok, extra = '') {
  results.push({ name, ok, extra });
  console.log(`${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
}

async function main() {
  // ── تحضير بيئة المتصفح ──────────────────────────────────────
  if (!existsSync(path.join(ROOT, 'node_modules', 'fake-indexeddb'))) {
    console.log('تثبيت fake-indexeddb...');
    execSync('npm install -D fake-indexeddb --no-audit --no-fund', { cwd: ROOT, stdio: 'ignore' });
  }

  const ENTRY = 'src/offline/bridge.ts src/offline/db.ts src/offline/engine.ts src/offline/sha256.ts src/offline/tabLock.ts src/lib/api.ts src/generated/engineBundle.ts';
  rmSync(TMP, { recursive: true, force: true });
  rmSync(TMP2, { recursive: true, force: true });
  rmSync(TMP3, { recursive: true, force: true });
  for (const out of [TMP, TMP2, TMP3]) {
    execSync(
      `npx esbuild ${ENTRY} --format=cjs --platform=node --outbase=src --outdir=${JSON.stringify(
        out
      )} --loader:.ts=ts --log-level=error`,
      { cwd: ROOT }
    );
  }

  await import('fake-indexeddb/auto');

  globalThis.localStorage = {
    _d: {},
    getItem(k) {
      return this._d[k] ?? null;
    },
    setItem(k, v) {
      this._d[k] = String(v);
    },
    removeItem(k) {
      delete this._d[k];
    },
  };
  globalThis.__PLUS_WASM_BASE__ =
    pathToFileURL(path.join(ROOT, 'node_modules', 'sql.js', 'dist')).href + '/';
  globalThis.performance = globalThis.performance || { now: () => Date.now() };

  const load = (rel) => import(pathToFileURL(path.join(TMP, rel)).href);
  const api = await load('lib/api.js');
  const engineMod = await load('offline/engine.js');

  // ── 1) التهيئة ─────────────────────────────────────────────
  const t0 = Date.now();
  const st = await engineMod.initOfflineEngine();
  const bootMs = Date.now() - t0;

  check('الوضع الافتراضي أوفلاين', api.getDataMode() === 'offline');
  check('المخطط كامل', st.meta.tables === 37, `${st.meta.tables} جدول`);
  check('كل المسارات مركّبة', st.meta.routes === 74, `${st.meta.routes} مسار`);
  check('المحرك المحاسبي محمَّل', typeof st.engine.postJournalEntryRaw === 'function',
    `${Object.keys(st.engine).length} دالة`);
  check('التهيئة سريعة', bootMs < 3000, `${bootMs}ms`);

  // ── 2) الحماية والمصادقة ────────────────────────────────────
  let unauth = null;
  try {
    await api.apiFetch('/api/reports/dashboard');
  } catch (e) {
    unauth = e;
  }
  check('رفض الطلب بلا توكن', unauth?.status === 401);

  const login = await api.apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  api.setStoredToken(login.token);
  check('دخول بالكلمة الصحيحة', login.user?.role_code === 'SUPER_ADMIN', login.user?.full_name);

  let badPass = null;
  try {
    await api.apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'wrong' }),
    });
  } catch (e) {
    badPass = e;
  }
  check('رفض كلمة المرور الخطأ', badPass?.status === 401);

  // ── 3) البيانات التأسيسية الحقيقية ───────────────────────────
  const dash = await api.apiFetch('/api/reports/dashboard');
  check('لوحة التحكم تعمل', typeof dash.kpis?.total_revenues === 'number');
  check(
    'القيود متوازنة',
    dash.integrity?.journal_debit === dash.integrity?.journal_credit && dash.integrity.journal_balanced,
    `${dash.integrity?.journal_debit} = ${dash.integrity?.journal_credit}`
  );
  check('الأرصدة الافتتاحية متوازنة', dash.integrity?.opening_balanced === true);
  check('المخزون مطابق للقيود', dash.integrity?.stock_reconciled === true);

  // ── 4) الكتابة المحاسبية ────────────────────────────────────
  const beforeRev = Number(dash.kpis.total_revenues);
  const beforeInv = Number(dash.kpis.inventory_value);
  const beforeRecv = Number(dash.kpis.total_receivables);

  const inv = await api.apiFetch('/api/transactions/sales-invoices', {
    method: 'POST',
    body: JSON.stringify({
      invoice_no: 'SINV-VERIFY-1',
      invoice_date: '2026-11-19',
      employee_code: 'EMP-001',
      customer_id: 'CUST-001',
      payment_method: 'آجل',
      items: [{ item_code: 'ITM-101', quantity: 3, unit_price: 1500, discount_percent: 0 }],
    }),
  });
  check('إنشاء فاتورة بيع', inv.invoice_no === 'SINV-VERIFY-1', inv.journal_entry_number);
  check('صافي الفاتورة صحيح', inv.net_total === 4500, `${inv.net_total}`);

  const after = await api.apiFetch('/api/reports/dashboard');
  check('الإيرادات زادت بالمقدار الصحيح', Number(after.kpis.total_revenues) - beforeRev === 4500,
    `+${Number(after.kpis.total_revenues) - beforeRev}`);
  check('المدينون زادوا بالمقدار الصحيح', Number(after.kpis.total_receivables) - beforeRecv === 4500);
  check('المخزون نقص بالتكلفة', Number(after.kpis.inventory_value) < beforeInv,
    `${beforeInv} → ${after.kpis.inventory_value}`);
  check('القيود ما زالت متوازنة', after.integrity?.journal_balanced === true);

  // ── 5) التقارير ────────────────────────────────────────────
  const reports = ['financial', 'sales', 'purchases', 'inventory', 'hr'];
  for (const r of reports) {
    const data = await api.apiFetch(`/api/reports/${r}`);
    check(`تقرير ${r}`, Array.isArray(data.rows) || typeof data === 'object');
  }

  // ── 6) البيانات الأساسية ────────────────────────────────────
  const items = await api.apiFetch('/api/master/items');
  const custs = await api.apiFetch('/api/master/customers');
  const tree = await api.apiFetch('/api/master/accounts-tree');
  check('الأصناف', (items.items || []).length > 0, `${(items.items || []).length} صنف`);
  check('العملاء', (custs.customers || []).length > 0, `${(custs.customers || []).length} عميل`);
  check('شجرة الحسابات', Boolean(tree.tree || tree.rows), 'موجودة');

  // ── 7) بوابة المدير ────────────────────────────────────────
  const ov = await api.apiFetch('/api/admin/overview');
  check('بوابة مدير النظام', Boolean(ov.stats || ov.company));

  // ── 8) الصلاحيات ───────────────────────────────────────────
  api.setStoredToken(null);
  const storeLogin = await api.apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'store', password: 'plus123' }),
  });
  api.setStoredToken(storeLogin.token);
  let denied = null;
  try {
    await api.apiFetch('/api/transactions/sales-invoices', {
      method: 'POST',
      body: JSON.stringify({
        invoice_no: 'SINV-DENIED',
        invoice_date: '2026-11-19',
        employee_code: 'EMP-001',
        customer_id: 'CUST-001',
        payment_method: 'آجل',
        items: [{ item_code: 'ITM-101', quantity: 1, unit_price: 1, discount_percent: 0 }],
      }),
    });
  } catch (e) {
    denied = e;
  }
  check('منع أمين المخزن من البيع', denied?.status === 403);

  // ── 9) الاستمرارية بعد إعادة التحميل ────────────────────────
  api.setStoredToken(login.token);
  const savedKb = Math.round((await engineMod.offlineStorageBytes()) / 1024);
  check('حُفظت القاعدة على القرص', savedKb > 0, `${savedKb} كيلوبايت`);

  // نعيد تحميل وحدة المحرك من جديد — محاكاة إغلاق المتصفح وفتحه
  // النسخة الثانية: وحدات جديدة كلياً، نفس قاعدة IndexedDB
  const engineFresh = await import(pathToFileURL(path.join(TMP2, 'offline/engine.js')).href);
  const apiFresh = await import(pathToFileURL(path.join(TMP2, 'lib/api.js')).href);
  const st2 = await engineFresh.initOfflineEngine();
  check('لم تُفقد البيانات بعد إعادة التحميل', st2.meta.isNew === false);
  check(
    'المستخدمون محفوظون بعد إعادة التحميل',
    st2.db.prepare('SELECT COUNT(*) AS c FROM users').get().c === 6
  );
  apiFresh.setStoredToken(login.token);
  const invAfter = await apiFresh.apiFetch('/api/transactions/sales-invoices?limit=50');
  const found = (invAfter.rows || invAfter.invoices || []).some(
    (r) => r.invoice_no === 'SINV-VERIFY-1'
  );
  check('الفاتورة المحفوظة موجودة بعد إعادة التحميل', found);

  // ── 10) حماية التبويبات المتعددة ────────────────────────────
  // Node لا يوفر Web Locks، فنحقن بديلاً يحاكي الحالة الواقعية:
  // القفل محجوز لتبويب آخر، فلا يُمنح لهذا التبويب أبداً.
  const engineMod3 = await import(pathToFileURL(path.join(TMP3, 'offline/engine.js')).href);
  check('دالة canWrite متاحة', typeof engineMod3.canWrite === 'function');

  const realNavigator = globalThis.navigator;
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      onLine: true,
      locks: {
        // لا يستدعي رد النداء أبداً — تماماً كأن تبويباً آخر يملك القفل
        request: () => new Promise(() => {}),
      },
    },
    configurable: true,
  });

  const readerEngine = await import(pathToFileURL(path.join(TMP3, 'offline/engine.js')).href);
  const readerApi = await import(pathToFileURL(path.join(TMP3, 'lib/api.js')).href);
  await readerEngine.initOfflineEngine();

  const readerCanWrite = readerEngine.canWrite();
  let readerRefused = null;
  try {
    await readerApi.apiFetch('/api/transactions/sales-invoices', {
      method: 'POST',
      body: JSON.stringify({
        invoice_no: 'SINV-READER',
        invoice_date: '2026-11-19',
        employee_code: 'EMP-001',
        customer_id: 'CUST-001',
        payment_method: 'آجل',
        items: [{ item_code: 'ITM-101', quantity: 1, unit_price: 1, discount_percent: 0 }],
      }),
    });
  } catch (e) {
    readerRefused = e;
  }

  let readerCanRead = false;
  try {
    await readerApi.apiFetch('/api/reports/dashboard');
    readerCanRead = true;
  } catch {
    readerCanRead = false;
  }

  Object.defineProperty(globalThis, 'navigator', { value: realNavigator, configurable: true });

  check('التبويب الثاني يصبح قارئاً', readerCanWrite === false);
  check(
    'الكتابة مرفوضة في التبويب الثاني',
    readerRefused?.code === 'READ_ONLY_TAB',
    readerRefused ? `${readerRefused.status} ${readerRefused.code}` : 'سُمح بالكتابة ❌'
  );
  check('القراءة مسموحة في التبويب الثاني', readerCanRead === true);

  // ── الخلاصة ────────────────────────────────────────────────
  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  console.log('\n' + '─'.repeat(56));
  console.log(`النتيجة: ${passed}/${total} ${passed === total ? '✅ نجح كل شيء' : '❌ هناك فشل'}`);
  console.log('─'.repeat(56));

  rmSync(TMP, { recursive: true, force: true });
  rmSync(TMP2, { recursive: true, force: true });
  rmSync(TMP3, { recursive: true, force: true });
  process.exit(passed === total ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ فشل التحقق:', err);
  process.exit(1);
});
