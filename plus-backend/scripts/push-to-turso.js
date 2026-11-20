/**
 * ترحيل البيانات من ملف SQLite المحلي إلى قاعدة Turso.
 *
 * متى تحتاج هذا السكربت؟
 *   مرة واحدة فقط، عند أول إعداد لـ Turso، إذا كان عندك بيانات محلية
 *   تريد رفعها (بيانات تجريبية أو فواتير أدخلتها مسبقاً).
 *   لو القاعدة السحابية فارغة، التطبيق يزرع البيانات الأولية تلقائياً
 *   عند أول تشغيل — ووقتها لا تحتاج هذا السكربت.
 *
 * الطريقة:
 *   يقرأ الجداول من الملف المحلي ويرفعها إلى Turso باستخدام واجهة libSQL
 *   نفسها (بدون أي تبعيات إضافية).
 *
 * التشغيل:
 *   TURSO_DATABASE_URL=libsql://... \\
 *   TURSO_AUTH_TOKEN=... \\
 *   node scripts/push-to-turso.js
 *
 * اختياري:
 *   PLUS_DB_PATH=./data/plus_erp.sqlite   مسار الملف المحلي
 */

const fs = require('node:fs');
const path = require('node:path');
const Database = require('libsql');

const LOCAL_PATH =
  process.env.PLUS_DB_PATH || path.join(__dirname, '..', 'data', 'plus_erp.sqlite');
const TURSO_URL = (process.env.TURSO_DATABASE_URL || '').trim();
const TURSO_TOKEN = (process.env.TURSO_AUTH_TOKEN || '').trim();

/** ترتيب الإدراج يتبع التبعيات: الجداول المرجعية أولاً ثم الحركات */
const TABLE_ORDER = [
  'roles',
  'fiscal_periods',
  'users',
  'account_main_groups',
  'account_sub_groups',
  'accounts',
  'departments',
  'item_groups',
  'items',
  'customers',
  'suppliers',
  'employees',
  'bank_accounts',
  'journal_entries',
  'journal_entry_lines',
  'treasury_vouchers',
  'sales_invoices',
  'sales_invoice_items',
  'sales_returns',
  'sales_return_items',
  'customer_transactions',
  'purchase_orders',
  'purchase_order_items',
  'purchase_invoices',
  'purchase_invoice_items',
  'purchase_returns',
  'purchase_return_items',
  'supplier_transactions',
  'stock_additions',
  'stock_addition_items',
  'stock_issues',
  'stock_issue_items',
  'item_movements',
  'attendance_records',
  'monthly_payrolls',
  'audit_logs',
];

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

async function main() {
  if (!TURSO_URL || !TURSO_TOKEN) {
    fail(
      'لازم تضبط TURSO_DATABASE_URL و TURSO_AUTH_TOKEN.\n' +
        '   تجيبهم من: turso db show <db-name> --url\n' +
        '             turso db tokens create <db-name>'
    );
  }

  if (!fs.existsSync(LOCAL_PATH)) {
    fail(`ملف SQLite المحلي غير موجود: ${LOCAL_PATH}\n   شغّل الخادم مرة واحدة أولاً لإنشائه.`);
  }

  console.log(`\n📤 ترحيل البيانات\n   من: ${LOCAL_PATH}\n   إلى: ${TURSO_URL}\n`);

  const local = new Database(LOCAL_PATH, { readonly: true });
  const remote = new Database(TURSO_URL, { authToken: TURSO_TOKEN });

  // 1) إنشاء الجداول على Turso
  const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
  console.log('1) إنشاء المخطط على Turso…');
  remote.exec(schemaSql);
  console.log('   ✔ تم\n');

  // 2) نسخ البيانات
  console.log('2) نسخ البيانات…');
  let totalRows = 0;

  for (const table of TABLE_ORDER) {
    let exists = false;
    try {
      local.prepare(`SELECT 1 FROM ${table} LIMIT 1`).get();
      exists = true;
    } catch {
      exists = false;
    }
    if (!exists) {
      console.log(`   - ${table}: (غير موجود محلياً، تخطي)`);
      continue;
    }

    const rows = local.prepare(`SELECT * FROM ${table}`).all();
    if (!rows.length) {
      console.log(`   - ${table}: 0 صف`);
      continue;
    }

    const clean = rows.map((r) => {
      const { _metadata, ...rest } = r; // libSQL يضيف هذا الحقل
      return rest;
    });

    const cols = Object.keys(clean[0]);
    const placeholders = cols.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
    const stmt = remote.prepare(sql);

    remote.exec('BEGIN');
    try {
      for (const row of clean) {
        stmt.run(...cols.map((c) => row[c]));
      }
      remote.exec('COMMIT');
    } catch (err) {
      remote.exec('ROLLBACK');
      fail(`فشل إدراج ${table}: ${err.message}`);
    }

    totalRows += clean.length;
    console.log(`   - ${table}: ${clean.length} صف ✔`);
  }

  // 3) التحقق
  console.log('\n3) التحقق من الأرصدة…');
  const counts = {
    accounts: remote.prepare('SELECT COUNT(*) AS c FROM accounts').get().c,
    journal_entries: remote.prepare('SELECT COUNT(*) AS c FROM journal_entries').get().c,
    customers: remote.prepare('SELECT COUNT(*) AS c FROM customers').get().c,
    items: remote.prepare('SELECT COUNT(*) AS c FROM items').get().c,
  };
  Object.entries(counts).forEach(([k, v]) => console.log(`   - ${k}: ${v}`));

  const balance = remote
    .prepare(
      `SELECT COALESCE(SUM(debit),0) AS d, COALESCE(SUM(credit),0) AS c FROM journal_entry_lines`
    )
    .get();
  const balanced = Math.abs(balance.d - balance.c) < 0.01;
  console.log(`\n   مدين: ${balance.d}  |  دائن: ${balance.c}  →  ${balanced ? '✅ متوازن' : '❌ غير متوازن'}`);

  local.close();
  remote.close();

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ تم ترحيل ${totalRows} صف بنجاح`);
  console.log(`${'═'.repeat(50)}\n`);
  console.log('الخطوة التالية: اضبط متغيّرات البيئة على Vercel:');
  console.log('   TURSO_DATABASE_URL  = ' + TURSO_URL);
  console.log('   TURSO_AUTH_TOKEN    = (التوكن الذي أنشأته)\n');

  if (!balanced) process.exit(1);
}

main().catch((err) => fail(err.message));
