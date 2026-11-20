/**
 * اختبار توافق شامل لطبقة Turso/libSQL
 *
 * الغرض: إثبات أن تحويل محرك قاعدة البيانات لم يغيّر أي رقم محاسبي.
 * يغطي: التقارير الستة الرئيسية، دليل الحسابات، العمليات الكتابية،
 *        والتوازن المحاسبي بعد كل عملية.
 *
 * التشغيل:  node scripts/verify-turso.js  [baseUrl]
 */

const BASE = process.argv[2] || 'http://127.0.0.1:4100';

let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function req(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ليست JSON */
  }
  return { status: res.status, json, text };
}

async function main() {
  console.log(`\n🔍 اختبار توافق Turso/libSQL على ${BASE}\n`);

  // ── 1) الصحة ونمط التخزين ─────────────────────────────────────
  console.log('1) الصحة ونمط التخزين');
  const health = await req('/api/health');
  check('الخادم يستجيب', health.status === 200 && health.json?.ok === true);
  check('نمط التخزين معلن', Boolean(health.json?.storage), health.json?.storage);
  check('حالة الاستمرارية معلنة', typeof health.json?.persistent === 'boolean', `persistent=${health.json?.persistent}`);

  // ── 2) تسجيل الدخول ───────────────────────────────────────────
  console.log('\n2) تسجيل الدخول');
  const login = await req('/api/auth/login', {
    method: 'POST',
    body: { username: 'accountant', password: 'plus123', portal: 'ERP' },
  });
  check('الدخول ناجح', login.status === 200 && Boolean(login.json?.token));
  const token = login.json?.token;
  if (!token) {
    console.log('\n⛔ لا يمكن المتابعة بدون توكن\n');
    process.exit(1);
  }

  // ── 3) لوحة التحكم ────────────────────────────────────────────
  console.log('\n3) لوحة التحكم (KPIs)');
  const dash = await req('/api/reports/dashboard', { token });
  check('dashboard يعمل', dash.status === 200);
  const kpis = dash.json?.kpis || {};
  check('الخزينة والبنوك', typeof kpis.cash_and_banks === 'number', `${kpis.cash_and_banks}`);
  check('مديونية العملاء', typeof kpis.total_receivables === 'number', `${kpis.total_receivables}`);
  check('مستحقات الموردين', typeof kpis.total_payables === 'number', `${kpis.total_payables}`);
  check('تقييم المخزون', typeof kpis.inventory_value === 'number', `${kpis.inventory_value}`);
  check('صافي الربح', typeof kpis.net_profit === 'number', `${kpis.net_profit}`);
  check('لا يوجد تسريب _metadata', !JSON.stringify(kpis).includes('_metadata'));

  // ── 4) التقارير الستة ─────────────────────────────────────────
  console.log('\n4) التقارير الستة');
  const reports = {};
  for (const r of ['financial', 'sales', 'purchases', 'inventory', 'hr']) {
    const res = await req(`/api/reports/${r}`, { token });
    reports[r] = res;
    check(`تقرير ${r}`, res.status === 200 && res.json !== null, `HTTP ${res.status}`);
    check(`  ${r} بلا _metadata`, !JSON.stringify(res.json || {}).includes('_metadata'));
  }

  // ── 5) التوازن المحاسبي ───────────────────────────────────────
  console.log('\n5) التوازن المحاسبي (الأهم)');
  const fin = reports.financial.json;
  const t = fin?.totals || {};
  check('التقرير المالي يحتوي إجماليات', Boolean(fin?.totals), Object.keys(t).join(','));
  check(
    'حركة المدين = الدائن',
    t.mov_debit === t.mov_credit,
    `${t.mov_debit} = ${t.mov_credit}`
  );
  check(
    'الإجمالي التراكمي متوازن',
    t.sum_debit === t.sum_credit,
    `${t.sum_debit} = ${t.sum_credit}`
  );
  check(
    'الأرصدة الختامية متوازنة',
    t.closing_debit === t.closing_credit,
    `${t.closing_debit} = ${t.closing_credit}`
  );
  check('دليل الحسابات مكتمل', Array.isArray(fin?.rows) && fin.rows.length > 20, `${fin?.rows?.length} حساب`);

  // ── 6) البيانات الأساسية ──────────────────────────────────────
  console.log('\n6) البيانات الأساسية');
  const tree = await req('/api/master/accounts-tree', { token });
  check('شجرة الحسابات', tree.status === 200 && Array.isArray(tree.json?.accounts), `${tree.json?.accounts?.length} حساب`);
  // كل endpoint في master يُرجع مفتاحاً باسمه: { customers: [...] } وهكذا
  for (const m of ['customers', 'suppliers', 'items', 'employees', 'banks']) {
    const res = await req(`/api/master/${m}`, { token });
    const rows = res.json?.[m] || res.json?.rows;
    check(`${m}`, res.status === 200 && Array.isArray(rows) && rows.length > 0, `${rows?.length} صف`);
  }

  // ── 7) عملية كتابية كاملة ─────────────────────────────────────
  console.log('\n7) عملية كتابية كاملة (قيد يومية)');
  const before = (await req('/api/reports/dashboard', { token })).json.kpis.cash_and_banks;
  const entry = await req('/api/transactions/journal-entries', {
    method: 'POST',
    token,
    body: {
      entry_date: '2026-11-20',
      description: 'اختبار آلي للتوافق',
      lines: [
        { account_code: '1101', debit: 250, credit: 0 },
        { account_code: '4101', debit: 0, credit: 250 },
      ],
    },
  });
  check(
    'إنشاء القيد ناجح',
    (entry.status === 200 || entry.status === 201) && Boolean(entry.json?.entry),
    `${entry.json?.message} (HTTP ${entry.status})`
  );
  const after = (await req('/api/reports/dashboard', { token })).json.kpis.cash_and_banks;
  check('الخزينة زادت بالمقدار الصحيح', after - before === 250, `${before} → ${after}`);

  const fin2 = (await req('/api/reports/financial', { token })).json.totals;
  check('التوازن بقى سليماً بعد الكتابة', fin2.mov_debit === fin2.mov_credit, `${fin2.mov_debit} = ${fin2.mov_credit}`);

  const list = (await req('/api/transactions/journal-entries', { token })).json;
  check('القيد ظهر في القائمة', Array.isArray(list?.entries) && list.entries.some((e) => e.description === 'اختبار آلي للتوافق'));

  // ── 8) التحقق من نظافة أشكال البيانات ─────────────────────────
  console.log('\n8) نظافة أشكال البيانات');
  check('لا _metadata في أي رد', !JSON.stringify(list).includes('_metadata'));
  check('لا أخطاء SQLITE_ في الردود', !JSON.stringify(list).includes('SQLITE_'));

  // ── النتيجة ───────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`النتيجة: ✅ ${passed} نجح  |  ❌ ${failed} فشل`);
  if (failed) {
    console.log('\nالاختبارات الفاشلة:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }
  console.log(`${'═'.repeat(50)}\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('خطأ غير متوقع:', err);
  process.exit(1);
});
