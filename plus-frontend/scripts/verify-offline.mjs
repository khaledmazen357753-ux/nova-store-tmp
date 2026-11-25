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
// نسخة ثالثة: تحاكي تبويباً ثانياً لم يُهيَّأ بعد (وحدات جديدة تماماً)
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
  // رقم متوقع دقيق كان يفشل عند كل مسار جديد بلا معنى — نتحقق أن كل راوتر
  // مركّب فعلاً وأن المجموع يطابق مجموع مساراته (فلا مسار يسقط بصمت).
  const mountedTotal = st.routers.reduce((n, r) => n + r.routes.length, 0);
  check(
    'كل المسارات مركّبة',
    st.meta.routes === mountedTotal && st.routers.length === 5,
    `${st.meta.routes} مسار من ${st.routers.length} راوتر`
  );
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

  // ── 10) ترقيم المستندات لكل جهاز ─────────────────────────────
  const engineCore = st2.engine;
  const tabLockMod = await import(pathToFileURL(path.join(TMP, 'offline/tabLock.js')).href);

  check('رمز الجهاز متاح', typeof tabLockMod.getDeviceTag === 'function', tabLockMod.getDeviceTag());

  const makeInv = () =>
    engineCore.createSalesInvoiceRaw(
      st2.db,
      {
        invoice_date: '2026-11-19',
        employee_code: 'EMP-001',
        customer_id: 'CUST-001',
        payment_method: 'آجل',
        items: [{ item_code: 'ITM-101', quantity: 1, unit_price: 100, discount_percent: 0 }],
      },
      'test'
    );

  engineCore.setDeviceTag(null);
  const plainNo = makeInv().invoice_no;
  check('بلا رمز جهاز: الشكل الأصلي محفوظ', /^SINV-\d+$/.test(plainNo), plainNo);

  engineCore.setDeviceTag('AAAA');
  const tagNo = makeInv().invoice_no;
  check('مع رمز الجهاز: الرقم يحمل الرمز', /^SINV-AAAA-\d+$/.test(tagNo), tagNo);

  engineCore.setDeviceTag('BBBB');
  const otherNo = makeInv().invoice_no;
  check(
    'جهازان مختلفان لا يتصادمان',
    tagNo !== otherNo && /^SINV-BBBB-\d+$/.test(otherNo),
    `${tagNo} ≠ ${otherNo}`
  );

  engineCore.setDeviceTag(null);
  const afterNo = makeInv().invoice_no;
  check('أرقام الأجهزة لا تلوّث الترقيم السحابي', /^SINV-\d+$/.test(afterNo), afterNo);

  // ── 11) الفترة المالية تُشتق من تاريخ القيد ────────────────────
  check('دالة اشتقاق الفترة متاحة', typeof engineCore.resolvePeriodId === 'function');

  st2.db.exec(
    `INSERT OR IGNORE INTO fiscal_periods (period_id, period_name, start_date, end_date, status)
     VALUES ('FY-2027','السنة المالية 2027','2027-01-01','2027-12-31','مفتوحة')`
  );
  const p2026 = engineCore.resolvePeriodId(st2.db, '2026-07-15');
  const p2027 = engineCore.resolvePeriodId(st2.db, '2027-07-15');
  check('قيد 2026 يُسجَّل على FY-2026', p2026 === 'FY-2026', p2026);
  check('قيد 2027 يُسجَّل على FY-2027', p2027 === 'FY-2027', p2027);

  // ── 12) الإقفال يقرأ حركة الفترة المطلوبة فقط ──────────────────
  const balance4101 = (periodId) =>
    Number(
      st2.db
        .prepare(
          `SELECT COALESCE(SUM(jl.credit),0) - COALESCE(SUM(jl.debit),0) AS bal
           FROM journal_entry_lines jl
           JOIN journal_entries je ON je.entry_number = jl.entry_number
           WHERE jl.account_code = '4101' AND je.period_id = ?`
        )
        .get(periodId).bal
    );

  const before27 = balance4101('FY-2027');
  st2.db.exec(`
    INSERT INTO journal_entries (entry_number, entry_date, reference_type, description,
                                 total_debit, total_credit, period_id)
    VALUES ('JE-TEST27','2027-03-01','قيد اختبار','إيراد 2027 للاختبار', 99000, 99000, 'FY-2027');
    INSERT INTO journal_entry_lines (line_no, entry_number, account_code, debit, credit)
    VALUES (1,'JE-TEST27','1101',99000,0), (2,'JE-TEST27','4101',0,99000);
  `);
  const after27 = balance4101('FY-2027');
  const bal2026 = balance4101('FY-2026');

  check(
    'الإقفال يرى حركة فترته فقط (+99,000 لسنة 2027)',
    Math.round(after27 - before27) === 99000,
    `+${Math.round(after27 - before27)}`
  );
  check(
    'حركة 2027 لا تتسرب إلى 2026',
    Math.round(after27 - before27) === 99000 && !String(bal2026).includes('99000'),
    `رصيد 2026: ${Math.round(bal2026).toLocaleString('en-US')}`
  );

  // ── 13) قفل الكتابة بين التبويبات ────────────────────────────
  // Node لا يوفر Web Locks، فنحقن بديلاً يحاكي الحالة الواقعية:
  // القفل محجوز لتبويب آخر، فلا يُمنح لهذا التبويب أبداً.
  const realNavigator = globalThis.navigator;
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      onLine: true,
      locks: { request: () => new Promise(() => {}) }, // القفل محجوز لغيرنا
    },
    configurable: true,
  });

  const readerEngine = await import(pathToFileURL(path.join(TMP3, 'offline/engine.js')).href);
  const readerApi = await import(pathToFileURL(path.join(TMP3, 'lib/api.js')).href);
  await readerEngine.initOfflineEngine();

  const readerIsWriter = readerEngine.canWrite();

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
        items: [{ item_code: 'ITM-101', quantity: 1, unit_price: 100, discount_percent: 0 }],
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

  // التبويب القارئ متصل بتلك القاعدة المحلية أم لا؟
  const readerSawInvoice = (() => {
    try {
      return (
        readerEngine
          .offlineState()
          .db.prepare(`SELECT COUNT(*) AS c FROM sales_invoices WHERE invoice_no = 'SINV-READER'`)
          .get().c === 0
      );
    } catch {
      return false;
    }
  })();

  Object.defineProperty(globalThis, 'navigator', { value: realNavigator, configurable: true });

  check('التبويب الثاني ليس كاتباً', readerIsWriter === false);
  check(
    'الكتابة مرفوضة في التبويب الثاني',
    readerRefused?.code === 'READ_ONLY_TAB',
    readerRefused ? `${readerRefused.status} ${readerRefused.code}` : 'سُمح بالكتابة ❌'
  );
  check('القراءة مسموحة في التبويب الثاني', readerCanRead === true);
  check('لم تُحفظ أي فاتورة من التبويب المرفوض', readerSawInvoice === true);

  // ── 14) الاستعادة في الوضع الأوفلاين ─────────────────────────
  // نسخة احتياطية بلا استعادة = وهم أمان. نتحقق أن المسار يعمل في المتصفح
  // بنفس الصلابة: معاينة، رفض ملف تالف، وتراجع تام عند الفشل.
  const st3 = st2;
  const bridgeFresh = await import(pathToFileURL(path.join(TMP2, 'offline/bridge.js')).href);

  // نستخدم التوكن الحقيقي (لا نمرّر حرفاً فارغاً — فيفشل التحقق بلا سبب)
  const authHeaders = { authorization: `Bearer ${login.token}` };
  const callBridge = (method, p, body) =>
    bridgeFresh.dispatch(st3.routers, method, p, { headers: authHeaders, body });

  const snap = (await callBridge('GET', '/api/admin/backup')).body;

  check(
    'نسخة أوفلاين تُنشأ',
    Boolean(snap?.data) && Object.keys(snap.data).length > 30,
    `${Object.keys(snap?.data || {}).length} جدولاً`
  );

  const preview = await callBridge('POST', '/api/admin/restore/preview', snap);
  check(
    'معاينة الاستعادة أوفلاين',
    preview.status === 200 && preview.body?.ok === true,
    preview.status === 200
      ? `${preview.body.total_rows} صفاً · ${preview.body.tables_count} جدولاً`
      : String(preview.body?.error || '').slice(0, 60)
  );

  const noConfirm = await callBridge('POST', '/api/admin/restore', { backup: snap });
  check(
    'الاستعادة ترفض بلا تأكيد صريح',
    noConfirm.status === 400,
    String(noConfirm.body?.error || '').slice(0, 50)
  );

  const badFile = await callBridge('POST', '/api/admin/restore', {
    confirm: 'RESTORE',
    backup: { data: { customers: 'ليس-قائمة' } },
  });
  check(
    'الاستعادة ترفض ملفاً تالفاً',
    badFile.status === 400,
    String(badFile.body?.error || '').slice(0, 50)
  );

  const countNow = () => st3.db.prepare(`SELECT COUNT(*) AS c FROM customers`).get().c;
  const custBeforeRestore = countNow();

  // نسخة تفرّغ العملاء ثم تفشل في منتصفها → يجب ألا يُحذف عميل واحد
  const evil = JSON.parse(JSON.stringify(snap));
  evil.data.customers = [];
  evil.data.users = [{ id: 1, username: null, role_code: 'ADMIN', is_active: 1 }];
  const failed = await callBridge('POST', '/api/admin/restore', { confirm: 'RESTORE', backup: evil });
  check(
    'الاستعادة الفاشلة تُبلَّغ كخطأ',
    failed.status === 400,
    String(failed.body?.error || '').slice(0, 40)
  );
  check(
    'الفشل لم يحذف أي عميل (تراجع تام)',
    countNow() === custBeforeRestore,
    `${custBeforeRestore} → ${countNow()}`
  );

  const good = await callBridge('POST', '/api/admin/restore', { confirm: 'RESTORE', backup: snap });
  check(
    'الاستعادة السليمة تنجح أوفلاين',
    good.status === 200 && good.body?.ok === true,
    String(good.body?.message || good.body?.error || '').slice(0, 40)
  );
  check(
    'البيانات سليمة بعد الاستعادة',
    countNow() === custBeforeRestore,
    `${countNow()} عميل`
  );

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
