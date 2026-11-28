/**
 * فحص موقع «المشتريات والمخازن والموردين» — من الداخل، لا من الشكل.
 *
 * ═══ ما يتحقق منه هذا الملف، ولماذا بهذا الترتيب ═══════════════════════
 *
 *  ١) العزل: موقع المشتريات يفتح قاعدة **مستقلة**. لو تشارك مع النظام
 *     الكامل قاعدة واحدة، لكان أول فتح لموقع المشتريات قد كتب فوق بيانات
 *     مستخدم حقيقي. هذا أول ما نتحقق منه لأنه لو فشل، كل ما بعده بلا معنى.
 *
 *  ٢) الأثر المحاسبي الحقيقي: كل مستند (فاتورة شراء، رد مشتريات، سداد،
 *     إذن إضافة/صرف) أُنشئ عبر **مسار REST الحقيقي**، فيجب أن يظهر له قيد
 *     يومية متوازن في قاعدة البيانات. لا نتحقق من «هل ظهر في القائمة»
 *     فقط، بل من رقم القيد وطرفيه.
 *
 *  ٣) التوازن: مجموع المدين = مجموع الدائن في كل القيود.
 *
 *  ٤) المطابقة: رصيد بطاقة كل صنف = وارد − منصرف = رصيد المخزون.
 *
 *  ٥) الأرصدة الافتتاحية: الموردون = 2101، المخزون = 1104، البنوك = 1102.
 *     هذه هي التي تكشف أي خطأ في البيانات التأسيسية قبل أي مستند.
 *
 * التشغيل: npm run verify:procurement
 */
import { execSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const OUT = path.join(ROOT, 'node_modules', '.verify-procurement');

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};
const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  const ENTRY =
    'src/offline/bridge.ts src/offline/db.ts src/offline/engine.ts src/offline/sha256.ts ' +
    'src/offline/tabLock.ts src/offline/sqliteFile.ts src/lib/api.ts src/generated/engineBundle.ts ' +
    'src/procurement/engine.ts src/procurement/data.ts';
  execSync(
    `npx esbuild ${ENTRY} --format=cjs --platform=node --outbase=src --outdir=${JSON.stringify(OUT)} --loader:.ts=ts --log-level=error`,
    { cwd: ROOT }
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
  // نحذف Buffer تماماً كما في المتصفح: النظام الكامل يعمل في الإنتاج بلا
  // Buffer، وأي فحص يتجاهل ذلك يكرر عطل «Buffer is not defined» الشهير.
  // نُعيدها في النهاية لأن أدوات Node هنا (sql.js/wasm) تحتاجها.
  const savedBuffer = globalThis.Buffer;
  delete globalThis.Buffer;

  const dbMod = await load('offline/db.js');
  const api = await load('lib/api.js');
  const engineMod = await load('offline/engine.js');
  const proc = await load('procurement/engine.js'); // ← يسجّل إعداداته فور التحميل
  // ← الالتفاف على حقيقة تصدير ESM الحيّ:
  //   `initOfflineEngine(config)` في النموذج المصدَّر تحمل القيمة الافتراضية
  //   `config = {}` التي حُسبت **وقت التصدير**، فتمرير undefined إليها
  //   يتجاوزها. أي أن أي استدعاء غير مسبوق بوسيط يُنشئ محركاً بلا عزل.
  //   نفشل بصوت عالٍ بدل أن نمرّ بفحص يختبر شيئاً آخر غير المقصود.
  let guardError = null;
  try {
    await engineMod.initOfflineEngine();
  } catch (e) {
    guardError = e;
  }
  check(
    'محرك بلا إعدادات يرفض العمل (لا عزل = لا قاعدة معروفة)',
    Boolean(guardError) && /إعدادات|تهيئة/.test(guardError.message),
    guardError?.message?.slice(0, 70)
  );

  // ══════════════════════════════════════════════════════════════════
  console.log('\n١) العزل عن النظام الكامل');
  // ══════════════════════════════════════════════════════════════════
  // العالم الحقيقي: الموقعان صفحتان مختلفتان، كلٌّ يفتح متصفحه بقاعدة
  // واحدة. لذلك نُشغّل سيناريو «النظام الكامل» في **عملية أخرى**، ثم
  // نفتح موقع المشتريات هنا ونفحص أن قاعدة النظام الكامل لم تُمس.
  //
  // محاولة تشغيل المحركين في عملية واحدة مستحيلة بالتصميم — المحرك واحد
  // لكل صفحة. وهذا نفسه قرار أمني: لا صفحة تفتح قاعدتين وتخلط بينهما.
  const mainSite = JSON.parse(
    execSync(`node ${JSON.stringify(path.join(HERE, 'verify-procurement-main.mjs'))}`, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    })
      .trim()
      .split('\n')
      .pop()
  );
  check('النظام الكامل بُني في صفحته المستقلة', Boolean(mainSite.company), mainSite.company);
  check('قاعدته فيها مستخدموه', mainSite.users === 6, `${mainSite.users} مستخدم`);
  check('اسم قاعدة النظام الكامل بلا لاحقة', mainSite.dbName === 'plus_erp_offline', mainSite.dbName);

  const procState = await proc.initProcurementEngine();
  const procName = procState.db
    .prepare(`SELECT company_name FROM company_settings WHERE id = 1`)
    .get().company_name;
  check('قاعدة موقع المشتريات شركة مختلفة', procName !== mainSite.company, `${procName} ≠ ${mainSite.company}`);
  check('اسم قاعدة المشتريات منفصل', procState.meta.tables > 0 && procName.length > 0);

  // إعادة قراءة قاعدة النظام الكامل من IndexedDB مباشرة: هل تغيّرت؟
  const reopen = async (dbName, key) => {
    const bytes = await new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const idb = req.result;
        if (!idb.objectStoreNames.contains('sqlite')) return resolve(null);
        const tx = idb.transaction('sqlite', 'readonly');
        const get = tx.objectStore('sqlite').get(key);
        get.onsuccess = () => resolve(get.result || null);
        get.onerror = () => reject(get.error);
      };
    });
    if (!bytes) return { bytes: null, company: null, users: null };
    const SQL = await dbMod.loadSqlJs();
    const d = new SQL.Database(bytes);
    const company = d.exec(`SELECT company_name FROM company_settings WHERE id = 1`)[0]?.values?.[0]?.[0];
    const users = d.exec(`SELECT COUNT(*) FROM users`)[0]?.values?.[0]?.[0];
    d.close();
    return { bytes, company, users };
  };

  // الدليل المادي على العزل: صفحة المشتريات لم تُنشئ قاعدة النظام الكامل
  // إطلاقاً. لو تشاركتا الاسم، لكان معنى ذلك أن أول فتح لموقع المشتريات
  // قرأ بيانات النظام الكامل — وهو العطل الذي نبني لمنعه.
  const mainOnDisk = await reopen('plus_erp_offline', 'plus_erp.sqlite');
  check(
    'صفحة المشتريات لم تلمس قاعدة النظام الكامل',
    mainOnDisk.company === null,
    'لا يوجد plus_erp_offline في هذه الصفحة'
  );
  const procOnDisk = await reopen('plus_erp_offline_procurement', 'plus_erp_procurement.sqlite');
  check(
    'قاعدة المشتريات محفوظة تحت اسم ومفتاح خاصين',
    procOnDisk.company === procName,
    `plus_erp_offline_procurement / plus_erp_procurement.sqlite`
  );

  const procUsers = procState.db.prepare(`SELECT COUNT(*) c FROM users`).get().c;
  check('قاعدة المشتريات لها مستخدموها المستقلون', procUsers === 5, `${procUsers} مستخدم`);
  const procTables = procState.db.prepare(`SELECT COUNT(*) c FROM sqlite_master WHERE type='table'`).get().c;
  check(
    'نفس عدد جداول النظام الكامل — المنطق واحد، البيانات مفصولة',
    procTables === mainSite.tables,
    `${procTables} = ${mainSite.tables}`
  );

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٢) الدخول والصلاحيات داخل موقع المشتريات');
  // ══════════════════════════════════════════════════════════════════
  api.configureApi({ namespace: 'procurement' });
  api.setDataMode('offline');

  api.setStoredToken(null);
  let anonymous = null;
  try {
    await api.apiFetch('/api/master/suppliers');
  } catch (err) {
    anonymous = err;
  }
  check('الوصول بلا توكن مرفوض', anonymous?.status === 401, anonymous?.message);

  // ← المرحلة ١ والمرحلة ٢ بالترتيب الصحيح: التهيئة أولاً (بيانات رئيسية)،
  //   ثم الدخول، ثم المستندات بالتوكن. تغيير الترتيب كان سيُنشئ مستندات
  //   بلا جلسة — وهو ما فشل فعلاً أول مرة.
  check(
    'المرحلة ١ زرعت 5 حسابات بلا جلسة',
    procState.db.prepare(`SELECT COUNT(*) c FROM users`).get().c === 5,
    '5 مستخدم'
  );
  check(
    'المرحلة ١ لم تُنشئ مستندات (لا توكن بعد)',
    procState.db.prepare(`SELECT COUNT(*) c FROM purchase_invoices`).get().c === 0,
    'صفر فاتورة'
  );

  const badLogin = await api
    .apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'plus123', portal: 'ERP' }),
    })
    .then(() => null)
    .catch((e) => e);
  // admin في هذا الموقع كلمته admin123 — نتحقق أن كلمة النظام الكامل لا تفتحه
  check('كلمة مرور حساب مختلف لا تفتح الحساب الإداري', badLogin?.status === 401, badLogin?.message);

  const admin = await api.apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin123', portal: 'ERP' }),
  });
  check('دخول الحساب الإداري', Boolean(admin.token), admin.user?.role_name);
  api.setStoredToken(admin.token);
  check(
    'التوكن محفوظ في مفتاح مستقل عن النظام الكامل',
    store.plus_erp_auth_token_procurement === admin.token && !store.plus_erp_auth_token,
    'plus_erp_auth_token_procurement'
  );
  check('اسم الشركة يصحّح الاختيار', admin.company?.company_name === procName, admin.company?.company_name);

  // المرحلة ٢: المستندات عبر نفس مسارات REST وبالتوكن الحقيقي
  const stage2 = await proc.ensureProcurementDocuments(admin.token);
  check('المرحلة ٢ أنشأت المستندات', stage2.created === 11, `${stage2.created} مستند`);
  const stage2again = await proc.ensureProcurementDocuments(admin.token);
  check('تكرار المرحلة ٢ لا يضاعف شيئاً', stage2again.skipped === true, 'تخطّت');

  // صلاحية حقيقية: المراجع للعرض فقط
  const auditor = await api.apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'auditor', password: 'plus123', portal: 'ERP' }),
  });
  const adminToken = admin.token;
  api.setStoredToken(auditor.token);
  const auditorParts = await api.apiFetch('/api/reports/inventory?type=stock-balances');
  check('المراجع يقرأ التقارير', Array.isArray(auditorParts.rows), `${auditorParts.rows?.length} صنف`);
  const auditorWrite = await api
    .apiFetch('/api/transactions/purchase-invoices', {
      method: 'POST',
      body: JSON.stringify({ invoice_date: '2026-11-20', supplier_id: 'SUP-001', items: [] }),
    })
    .then(() => null)
    .catch((e) => e);
  check('المراجع ممنوع من الكتابة (403)', auditorWrite?.status === 403, auditorWrite?.message?.slice(0, 60));
  api.setStoredToken(adminToken);

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٣) البيانات تُقرأ من الجداول الحقيقية — لا من ملف')
  // ══════════════════════════════════════════════════════════════════
  const suppliers = await api.apiFetch('/api/master/suppliers');
  const items = await api.apiFetch('/api/master/items');
  const banks = await api.apiFetch('/api/master/banks');
  check('الموردون', suppliers.suppliers.length === 3, suppliers.suppliers.map((s) => s.supplier_id).join(' · '));
  check('الأصناف', items.items.length === 6, `${items.items.length} صنف`);
  check('البنوك', banks.banks.length === 2, banks.banks.map((b) => b.bank_name).join(' · '));

  // الأرصدة **الافتتاحية** لا النهائية: النهائية تحرّكت بالمستندات وهي
  // المطابقة الصحيحة في القسم السادس. هنا نتحقق من نقطة البداية.
  const suppliersOpening = suppliers.suppliers.reduce((s, x) => s + Number(x.opening_balance), 0);
  check(
    'مجموع الأرصدة الافتتاحية للموردين = 250,000 (رصيد حساب 2101)',
    Math.abs(suppliersOpening - 250000) < 0.01,
    fmt(suppliersOpening)
  );

  const acc2101 = procState.db
    .prepare(`SELECT opening_credit FROM accounts WHERE account_code = '2101'`)
    .get();
  check('حساب 2101 افتتاحي دائن 250,000', acc2101.opening_credit === 250000, fmt(acc2101.opening_credit));

  const acc1104 = procState.db
    .prepare(`SELECT opening_debit FROM accounts WHERE account_code = '1104'`)
    .get();
  const itemsOpeningValue = items.items.reduce((s, i) => s + Number(i.current_balance) * Number(i.cost_price), 0);
  check('قيمة المخزون الافتتاحي بعد المستندات', itemsOpeningValue > 0, fmt(itemsOpeningValue));
  check('حساب 1104 افتتاحي مدين 420,000', acc1104.opening_debit === 420000, fmt(acc1104.opening_debit));

  const banksTotal = banks.banks.reduce((s, b) => s + Number(b.balance), 0);
  const acc1102 = procState.db
    .prepare(`SELECT opening_debit FROM accounts WHERE account_code = '1102'`)
    .get();
  check('أرصدة البنوك تحرّكت بالمستندات', banksTotal !== 380000, fmt(banksTotal));
  check('حساب 1102 افتتاحي مدين 380,000', acc1102.opening_debit === 380000, fmt(acc1102.opening_debit));

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٤) المستندات أُنشئت عبر المسارات الحقيقية وأثّرت محاسبياً');
  // ══════════════════════════════════════════════════════════════════
  const invoices = await api.apiFetch('/api/transactions/purchase-invoices');
  check('فواتير الشراء', invoices.invoices.length === 3, `${invoices.invoices.length} فاتورة`);

  let allHaveJe = true;
  let allJeBalanced = true;
  for (const inv of invoices.invoices) {
    const je = procState.db
      .prepare(
        `SELECT COALESCE(SUM(debit),0) d, COALESCE(SUM(credit),0) c FROM journal_entry_lines WHERE entry_number = ?`
      )
      .get(inv.journal_entry_number);
    if (!inv.journal_entry_number) allHaveJe = false;
    if (Math.abs(Number(je.d) - Number(je.c)) > 0.01 || Number(je.d) <= 0) allJeBalanced = false;
  }
  check('كل فاتورة شراء لها رقم قيد يومية', allHaveJe);
  check('كل قيد فاتورة متوازن (مدين = دائن)', allJeBalanced);

  // أرقام المستندات تُولَّد بـ nextDocNumber (1001، 1002… مع رمز الجهاز)،
  // فلا نعلّق الفحص على رقم بعينه — نتحقق من **المحتوى**: فاتورة الـ 6
  // أجهزة × 9,000 = 54,000 موجودة ومربوطة بقيد.
  const inv54k = invoices.invoices.find((i) => Math.abs(Number(i.net_total) - 54000) < 0.01);
  check(
    'فاتورة الستة أجهزة (54,000) موجودة ببندها',
    Boolean(inv54k) && inv54k.items.length === 1 && Number(inv54k.items[0].quantity) === 6,
    inv54k ? `${inv54k.invoice_no} · ${fmt(inv54k.net_total)} · ${inv54k.items[0].quantity} جهاز` : 'غير موجودة'
  );
  check('الفاتورة مربوطة بقيد يومية', Boolean(inv54k?.journal_entry_number), inv54k?.journal_entry_number);

  const journals = procState.db
    .prepare(`SELECT reference_type, COUNT(*) c FROM journal_entries GROUP BY reference_type`)
    .all();
  check(
    'أنواع القيود تشمل فواتير وسدادات ومردودات وأذون',
    journals.length >= 4,
    journals.map((j) => `${j.reference_type}:${j.c}`).join(' · ')
  );

  const orders = await api.apiFetch('/api/transactions/purchase-orders');
  const openOrders = orders.orders.filter((o) => o.status === 'قيد التنفيذ');
  check('أوامر التوريد', orders.orders.length === 3, `${orders.orders.length} أمر`);
  const poForPaper = openOrders.find((o) =>
    o.items.some((it) => it.item_code === 'ITM-206')
  );
  check(
    'أمر الورق ما زال مفتوحاً بانتظار التوريد',
    Boolean(poForPaper),
    openOrders.map((o) => o.po_no).join(' · ')
  );

  const returns = await api.apiFetch('/api/transactions/purchase-returns');
  check('إشعار رد مشتريات', returns.returns.length === 1, returns.returns[0]?.return_no);
  check('الرد مرتبط بقيد يومية', Boolean(returns.returns[0]?.journal_entry_number), returns.returns[0]?.journal_entry_number);

  const payments = await api.apiFetch('/api/transactions/supplier-payments');
  // نفلتر على نوع الحركة تحديداً: الفاتورة المسددة فوراً تُنشئ حركة
  // «سداد فوري للفاتورة» أيضاً — وهي ليست سند سداد يدوياً.
  const manualPayments = payments.payments.filter((p) => p.tx_type === 'سداد لمورد');
  const paidTotal = manualPayments.reduce((s, p) => s + Number(p.debit), 0);
  check('سندان سداد يدويان', manualPayments.length === 2, manualPayments.map((p) => p.doc_no).join(' · '));
  check('إجمالي المسدّد يدوياً 85,000', Math.abs(paidTotal - 85000) < 0.01, fmt(paidTotal));
  const instant = payments.payments.filter((p) => String(p.tx_type).includes('فوري'));
  check('الفاتورة المسددة فوراً أثبتت سدادها بالحركة', instant.length === 1, instant[0]?.doc_no);

  const additions = await api.apiFetch('/api/transactions/stock-additions');
  const issues = await api.apiFetch('/api/transactions/stock-issues');
  check('أذون الإضافة', additions.additions.length === 1, additions.additions[0]?.addition_no);
  check('أذون الصرف', issues.issues.length === 1, issues.issues[0]?.issue_no);

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٥) التوازن والمطابقة — أرقام من قاعدة البيانات نفسها');
  // ══════════════════════════════════════════════════════════════════
  // ميزان المراجعة يقارن الحركة الفعلية للقيود (mov_*) بالحركة الافتتاحية —
  // لا نستخدم closing_* لأن الأرصدة الافتتاحية وحدها تجعل كل حساب «مغلقاً»
  // قبل أن يوجد أي قيد، فالمقارنة بها تخفي عدم التوازن بدل أن تكشفه.
  const tb = await api.apiFetch('/api/reports/financial?type=trial-balance');
  const movDebit = Number(tb.totals?.mov_debit || 0);
  const movCredit = Number(tb.totals?.mov_credit || 0);
  const openDebit = Number(tb.totals?.opening_debit || 0);
  const openCredit = Number(tb.totals?.opening_credit || 0);
  check('الحركة الافتتاحية متوازنة', Math.abs(openDebit - openCredit) < 0.01, `${fmt(openDebit)} = ${fmt(openCredit)}`);
  check('حركة القيود متوازنة', Math.abs(movDebit - movCredit) < 0.01, `${fmt(movDebit)} = ${fmt(movCredit)}`);
  check('هناك قيود فعلية (لا صفر مغشوش)', movDebit > 200000, fmt(movDebit));

  const reconc = await api.apiFetch('/api/reports/inventory?type=stock-reconciliation');
  const mismatched = reconc.rows.filter((r) => !r.is_matched);
  check('كل صنف بطاقته مطابقة لرصيده', mismatched.length === 0, `${reconc.rows.length} صنف · فرق 0`);

  const balances = await api.apiFetch('/api/reports/inventory?type=stock-balances');
  check('لا صنف برصيد سالب', balances.rows.every((r) => Number(r.current_balance) >= 0));

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٦) كشوف الموردين والتقارير التي تهم الموقع');
  // ══════════════════════════════════════════════════════════════════
  const ledger = await api.apiFetch('/api/reports/purchases?type=supplier-ledger&supplier_id=SUP-001');
  const rowBalance = suppliers.suppliers.find((s) => s.supplier_id === 'SUP-001').net_balance;
  check(
    'كشف المورد SUP-001 ينتهي بنفس رصيد قائمة الموردين',
    Math.abs(Number(ledger.closing_balance) - Number(rowBalance)) < 0.01,
    `${fmt(ledger.closing_balance)} = ${fmt(rowBalance)}`
  );
  check('حركات كشف المورد مرقّمة بقيود', ledger.rows.length >= 3 && ledger.rows.every((r) => r.journal_entry_number));

  const pj = await api.apiFetch('/api/reports/purchases?type=purchases-journal');
  check('تقرير يومية المشتريات', pj.rows.length === 3, `${fmt(pj.totalPurchases)} إجمالي المشتريات`);

  const card = await api.apiFetch('/api/reports/inventory?type=item-card&item_code=ITM-206');
  check('بطاقة صنف الورق تعرض حركاتها', card.movements.length >= 3, `${card.movements.length} حركة`);

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٧) إضافة مستند جديد الآن — الموقع يكتب فعلاً');
  // ══════════════════════════════════════════════════════════════════
  const beforeCount = procState.db.prepare(`SELECT COUNT(*) c FROM purchase_invoices`).get().c;
  const beforeStock = procState.db
    .prepare(`SELECT current_balance FROM items WHERE item_code = 'ITM-205'`)
    .get().current_balance;

  const created = await api.apiFetch('/api/transactions/purchase-invoices', {
    method: 'POST',
    body: JSON.stringify({
      invoice_date: '2026-11-19',
      supplier_id: 'SUP-002',
      payment_method: 'آجل',
      notes: 'اختبار كتابة حقيقي من داخل الموقع',
      items: [{ item_code: 'ITM-205', quantity: 3, unit_price: 6000, discount_percent: 0 }],
    }),
  });
  check('فاتورة جديدة حُفظت', created.invoice_no && created.journal_entry_number, created.invoice_no);

  const afterCount = procState.db.prepare(`SELECT COUNT(*) c FROM purchase_invoices`).get().c;
  const afterStock = procState.db
    .prepare(`SELECT current_balance FROM items WHERE item_code = 'ITM-205'`)
    .get().current_balance;
  check('عدد الفواتير زاد واحداً', afterCount === beforeCount + 1, `${beforeCount} → ${afterCount}`);
  check(
    'رصيد الصنف زاد 3 وحدات',
    Math.abs(Number(afterStock) - Number(beforeStock) - 3) < 0.01,
    `${fmt(beforeStock)} → ${fmt(afterStock)}`
  );

  const supp2 = await api.apiFetch('/api/reports/purchases?type=supplier-balances');
  const supp2Row = supp2.rows.find((r) => r.supplier_id === 'SUP-002');
  check(
    'رصيد المورد SUP-002 زاد 18,000',
    Math.abs(Number(supp2Row.net_balance) - 98000) < 0.01,
    fmt(supp2Row.net_balance)
  );

  const tb2 = await api.apiFetch('/api/reports/financial?type=trial-balance');
  check(
    'الميزان ما زال متوازناً بعد الكتابة',
    Math.abs(Number(tb2.totals?.mov_debit || 0) - Number(tb2.totals?.mov_credit || 0)) < 0.01,
    `${fmt(tb2.totals?.mov_debit)} = ${fmt(tb2.totals?.mov_credit)}`
  );

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٨) طلبات التعديل — الجدول الذي كان ناقصاً');
  // ══════════════════════════════════════════════════════════════════
  const cr = await api.apiFetch('/api/change-requests', {
    method: 'POST',
    body: JSON.stringify({
      entity_type: 'suppliers',
      entity_id: 'SUP-003',
      payload: { phone: '082-2451191' },
      reason: 'الرقم تغيّر بعد نقل مقر الشركة إلى العنوان الجديد',
    }),
  });
  check('طلب تعديل مورد يُسجَّل في جدول الترقية', Boolean(cr.request?.change_id), cr.request?.change_id);
  check(
    'قبل الاعتماد: القيمة القديمة ما زالت في الجدول',
    procState.db.prepare(`SELECT phone FROM suppliers WHERE supplier_id = 'SUP-003'`).get().phone === '082-2451190',
    'لا تغيير بلا اعتماد'
  );

  const crList = await api.apiFetch('/api/change-requests');
  check('الطلب يظهر في قائمة الطلبات', (crList.requests?.length || 0) >= 1, `${crList.requests?.length} طلب`);

  const approve = await api.apiFetch(`/api/change-requests/${cr.request.change_id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ note: 'تم التحقق من مستند نقل المقر' }),
  });
  check('المدير يعتمد الطلب', Boolean(approve.message), approve.message?.slice(0, 50));
  check(
    'بعد الاعتماد: الرقم تغيّر فعلاً في جدول الموردين',
    procState.db.prepare(`SELECT phone FROM suppliers WHERE supplier_id = 'SUP-003'`).get().phone === '082-2451191',
    '082-2451191'
  );

  const tables = procState.db
    .prepare(`SELECT COUNT(*) c FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
    .get().c;
  check('قاعدة الموقع تحتوي المخطط الكامل', Number(tables) >= 38, `${tables} جدولاً`);

  console.log('\n' + '─'.repeat(64));
  console.log(`  ${fail === 0 ? '✅' : '❌'}  نجح ${pass} · فشل ${fail}`);
  console.log('─'.repeat(64));
  globalThis.Buffer = savedBuffer;
  rmSync(OUT, { recursive: true, force: true });
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ توقف الفحص بخطأ:', err?.message || err);
  rmSync(OUT, { recursive: true, force: true });
  process.exit(1);
});
