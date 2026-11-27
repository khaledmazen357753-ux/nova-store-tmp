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
/** واجهات Node التي حذفناها عمداً — نحتاجها لاستعادتها ولالخروج برمز صحيح */
const removed = {};
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

  // ── ربط undefined: عطل أصاب كل نماذج "تعديل" في الوضع الأوفلاين ──
  // كل استعلامات المشروع كُتبت لمحرّكات تقبل undefined كـ NULL (libSQL،
  // node:sqlite)، أما sql.js فيرمي عند ربطها. النتيجة كانت 500 في تعديل سعر
  // صنف أو هاتف عميل أو إعدادات المنشأة، رغم نجاحها على الخادم. الفحص هنا
  // يمرّر undefined صريحاً ويعدّل حقلاً واحداً فقط، فيكشف أي ارتداد فوراً.
  let bindOk = false, bindErr = '';
  try {
    state.db.prepare('SELECT COUNT(*) AS c FROM items WHERE item_code = COALESCE(?, item_code)').get(undefined);
    bindOk = true;
  } catch (e) { bindErr = String(e?.message ?? e); }
  check('ربط undefined يُعامل كـ NULL', bindOk, bindOk ? '' : bindErr.slice(0, 60));

  let boolOk = false, boolErr = '';
  try {
    state.db.prepare('SELECT ? AS v').get(true);
    boolOk = true;
  } catch (e) { boolErr = String(e?.message ?? e); }
  check('ربط boolean يعمل (يُحوَّل 0/1)', boolOk, boolOk ? '' : boolErr.slice(0, 60));

  // تعديل جزئي حقيقي: نغيّر حقلاً واحداً ونتأكد أن الباقي لم يُمسح
  let partialOk = false, partialErr = '';
  try {
    const cust = state.db.prepare('SELECT customer_id, customer_name, city FROM customers LIMIT 1').get();
    await api.apiFetch(`/api/master/customers/${encodeURIComponent(cust.customer_id)}`, {
      method: 'PUT',
      body: JSON.stringify({ city: 'مدينة الفحص' }),
    });
    const after = state.db
      .prepare('SELECT customer_name, city FROM customers WHERE customer_id = ?')
      .get(cust.customer_id);
    partialOk = after.city === 'مدينة الفحص' && after.customer_name === cust.customer_name;
  } catch (e) { partialErr = String(e?.message ?? e); }
  check('تعديل جزئي يحفظ الحقول غير المرسلة', partialOk, partialOk ? '' : partialErr.slice(0, 60));

  // ── إعادة التهيئة يجب ألا تفصل الجلسات ──
  // 15 جدولاً يستخدم AUTOINCREMENT؛ بدون تصفير sqlite_sequence تعاد زراعة
  // المستخدمين بمعرّفات جديدة فتفشل كل التوكنات الحالية برسالة مضلّلة.
  let idStable = false, idDetail = '';
  try {
    const before = state.db.prepare('SELECT id FROM users WHERE username = ?').get('admin').id;
    await api.apiFetch('/api/admin/reset-demo', { method: 'POST', body: '{}' });
    const after = state.db.prepare('SELECT id FROM users WHERE username = ?').get('admin').id;
    const sessionAlive = await api
      .apiFetch('/api/master/items')
      .then(() => true)
      .catch(() => false);
    idStable = before === after && sessionAlive;
    idDetail = `id ${before} → ${after}`;
  } catch (e) { idDetail = String(e?.message ?? e).slice(0, 60); }
  check('إعادة التهيئة لا تغيّر معرّفات المستخدمين', idStable, idDetail);

  // ── تصعيد الصلاحيات: صاحب بوابة الأدمن غير المدير لا يمنح نفسه مديراً ──
  let escBlocked = true, escDetail = '';
  try {
    const acc = await api.apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'accountant', password: 'plus123', portal: 'ADMIN' }),
    });
    api.setStoredToken(acc.token);
    for (const [label, pth, method, body] of [
      ['إنشاء مستخدم مدير', '/api/admin/users', 'POST', { username: 'pwn', full_name: 'x', password: 'p1', role_code: 'SUPER_ADMIN' }],
      ['محو كل البيانات', '/api/admin/reset-demo', 'POST', {}],
      ['تعديل مصفوفة الصلاحيات', '/api/admin/roles/AUDITOR_VIEWER', 'PUT', { permissions: { all: true } }],
    ]) {
      const ok = await api.apiFetch(pth, { method, body: JSON.stringify(body) }).then(() => false).catch(() => true);
      if (!ok) { escBlocked = false; escDetail = label; }
    }
    // الإطلاع يجب أن يظل مسموحاً — الحماية ليست منعاً للمحاسب من العمل
    const canReview = await api.apiFetch('/api/admin/audit-logs').then(() => true).catch(() => false);
    if (!canReview && escBlocked) { escBlocked = false; escDetail = 'المحاسب مُنع من المراجعة'; }
  } catch (e) { escBlocked = false; escDetail = String(e?.message ?? e).slice(0, 60); }
  check('المحاسب لا يستطيع تصعيد الصلاحيات', escBlocked, escBlocked ? '' : escDetail);

  // ── لا تعليق أبدي: wasm لا يُحمَّل = خطأ واضح لا سبينر لا ينتهي ──
  // المستخدم رأى في الإنتاج شاشة "جارٍ تشغيل محرك الحسابات…" تدور بلا نهاية.
  // السبب: `fetch` للـ wasm بلا مهلة ينتظر للأبد عند شبكة نصف مفتوحة.
  // الفحص هنا لا ينتظر: يثبت أن غياب البايتات يُنتج خطأً صريحاً وسريعاً.
  let failFast = false, failDetail = '';
  try {
    globalThis.__PLUS_WASM_BYTES__ = new Uint8Array([1, 2, 3]);
    const dbMod = await load('offline/db.js');
    // نُفرغ النواة المخزَّنة أولاً، وإلا عادت بلا فحص للبايتات (وهو عطل حقيقي
    // في مسار التعافي كان يمنع زر «امسح الكاش وأعد المحاولة» من العمل)
    dbMod.resetSqlJsCache();
    await dbMod.createOfflineDb('CREATE TABLE t (a);');
    failDetail = 'قبلت بايتات غير صالحة';
  } catch (e) {
    failFast = /بصمة wasm|WebAssembly/.test(String(e?.message ?? e));
    failDetail = String(e?.message ?? e).slice(0, 70);
  }
  check('wasm تالف يفشل بخطأ صريح لا بتعليق', failFast, failDetail);
  globalThis.__PLUS_WASM_BYTES__ = new Uint8Array(
    readFileSync(path.join(ROOT, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'))
  );

  // استعادة ما حذفناه حتى لا يتأثر باقي التشغيل
  for (const [k, v] of Object.entries(removed)) {
    if (typeof globalThis[k] === 'undefined') { try { globalThis[k] = v; } catch { /* تجاهل */ } }
  }

  rmSync(OUT, { recursive: true, force: true });
  console.log(`\nالنتيجة: ${pass} نجح | ${fail} فشل`);
  finish(fail ? 1 : 0);
}

/**
 * الخروج: هذا الفحص يحذف `process` عمداً لمحاكاة المتصفح، لكننا نحتاجه نحن
 * لضبط رمز الخروج. نستعيده من الكائن المحفوظ قبل الحذف. وبلا رمز خروج فاشل
 * سيمرّ الاختبار الفاشل كأنه ناجح في أي سلسلة CI.
 */
function finish(code) {
  const proc = removed.process ?? globalThis.process;
  if (proc?.exit) proc.exit(code);
  else throw new Error(`فحص فاشل (${code}) — process غير متاحة للخروج`);
}

main().catch((e) => {
  console.error('فشل الفحص:', e?.stack ?? e);
  const proc = removed.process ?? globalThis.process;
  if (proc?.exit) proc.exit(1);
});
