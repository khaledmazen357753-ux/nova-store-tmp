/**
 * فحص ترقية المخطط — قاعدة موجودة تستقبل جداول جديدة
 * ═══════════════════════════════════════════════════════════════════
 *
 * العطل الذي وُلد هذا الملف بسببه:
 *
 *   if (isNew) {
 *     db.exec(schemaSql);      // ← المخطط يُنفَّذ على قاعدة جديدة فقط
 *     if (seedFn) seedFn(db);
 *   }
 *
 * `isNew` يكون false لكل مستخدم عنده قاعدة محفوظة. فالنتيجة أن **أي جدول
 * يُضاف في إصدار جديد لا يصل إلى أي قاعدة موجودة**. المستخدم يرى:
 *
 *   no such table: change_requests
 *
 * وهذا ليس عطلاً في جدول واحد، بل في **طريقة إضافة أي جدول** إلى النظام
 * بعد اليوم. الجدول القادم سيواجه نفس المصير حرفياً.
 *
 * ─ لماذا لم تكشفه الفحوص السابقة؟ ──────────────────────────────────
 *
 * لأن كل فحوص هذا المشروع تبدأ من `fake-indexeddb` فارغ: `isNew` يكون
 * true دائماً، فيُنفَّذ المخطط، فتنجح الفحوص. اختبرنا المسار الذي يعمل،
 * لا المسار الذي يفشل. هذا الملف يبدأ من قاعدة **قديمة** عمداً.
 *
 * التشغيل: npm run verify:migration
 */

import { execSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import 'fake-indexeddb/auto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const OUT = path.join(ROOT, 'node_modules', '.migration-verify');

rmSync(OUT, { recursive: true, force: true });
execSync(
  `npx esbuild src/offline/db.ts --format=cjs --platform=node --outdir=${JSON.stringify(OUT)} --loader:.ts=ts --log-level=error`,
  { cwd: ROOT }
);

globalThis.__PLUS_WASM_BYTES__ = new Uint8Array(
  readFileSync(path.join(ROOT, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'))
);

const dbModule = await import(pathToFileURL(path.join(OUT, 'db.js')).href);
const REAL_SCHEMA = readFileSync(path.join(ROOT, '..', 'plus-backend', 'sql', 'schema.sql'), 'utf8');

let pass = 0;
let fail = 0;
const check = (name, ok, extra = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
  ok ? pass++ : fail++;
};

const tableNames = (db) =>
  db.sqlite
    .exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0]
    .values.map((r) => String(r[0]));

const count = (db, table) => Number(db.sqlite.exec(`SELECT COUNT(*) FROM "${table}"`)[0].values[0][0]);

async function main() {
  console.log('فحص ترقية المخطط من قاعدة قديمة إلى إصدار جديد\n');

  // ═══════════════════════════════════════════════════════════════
  // 1) قاعدة "قديمة" — كما كانت قبل إضافة جدول طلبات التعديل
  // ═══════════════════════════════════════════════════════════════
  const OLD_SCHEMA = `
    CREATE TABLE IF NOT EXISTS items (item_code TEXT PRIMARY KEY, item_name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS customers (customer_id TEXT PRIMARY KEY, customer_name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT);
  `;

  const { db: oldDb, isNew: oldIsNew } = await dbModule.createOfflineDb(OLD_SCHEMA, (d) => {
    d.exec("INSERT INTO items VALUES ('ITM-1','صنف موجود'),('ITM-2','صنف آخر')");
    d.exec("INSERT INTO customers VALUES ('CUST-1','عميل موجود')");
    d.exec("INSERT INTO audit_logs (action) VALUES ('قيد تدقيق قديم')");
  });
  await oldDb.persist();

  check('قاعدة قديمة أُنشئت', oldIsNew === true && tableNames(oldDb).length === 3, tableNames(oldDb).join(', '));

  const itemsBefore = count(oldDb, 'items');
  const customersBefore = count(oldDb, 'customers');
  const logsBefore = count(oldDb, 'audit_logs');

  // ═══════════════════════════════════════════════════════════════
  // 2) الترقية — نفس القاعدة على "القرص"، مخطط أحدث
  //    نحاكي إعادة تحميل الصفحة بوحدة جديدة تماماً
  // ═══════════════════════════════════════════════════════════════
  await dbModule.resetSqlJsCache();
  const reopened = await import(pathToFileURL(path.join(OUT, 'db.js')).href + '?fresh=1');

  const { db: upgraded, isNew: upgradedIsNew } = await reopened.createOfflineDb(REAL_SCHEMA, (d) => {
    d.exec("INSERT INTO items VALUES ('ITM-NEW','صنف من الزراعة')");
  });

  check('القاعدة عُرفت كموجودة لا كجديدة', upgradedIsNew === false, `isNew=${upgradedIsNew}`);

  const names = tableNames(upgraded);

  // هذا هو الفحص الذي كان يفشل
  check(
    'جدول change_requests وصل للقاعدة الموجودة',
    names.includes('change_requests'),
    names.includes('change_requests')
      ? ''
      : `غياب: لا يمكن قراءة/كتابة طلبات التعديل — وهذا نص الخطأ الذي رآه المستخدم`
  );

  const expectedTables = (REAL_SCHEMA.match(/CREATE TABLE IF NOT EXISTS (\w+)/gi) || []).length;
  check(
    'كل جداول المخطط الحالي موجودة بعد الترقية',
    names.length === expectedTables,
    `${names.length} من ${expectedTables}`
  );

  const expectedIndexes = (REAL_SCHEMA.match(/CREATE INDEX IF NOT EXISTS (\w+)/gi) || []).length;
  const indexCount = Number(
    upgraded.sqlite.exec("SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")[0]
      .values[0][0]
  );
  check('الفهارس أُنشئت', indexCount >= expectedIndexes, `${indexCount} من ${expectedIndexes}`);

  // ═══════════════════════════════════════════════════════════════
  // 3) بيانات المستخدم لم تُمس — هذا أهم من وجود الجداول
  // ═══════════════════════════════════════════════════════════════
  check('بيانات الأصناف القديمة سليمة', count(upgraded, 'items') === itemsBefore, String(itemsBefore));
  check('بيانات العملاء القديمة سليمة', count(upgraded, 'customers') === customersBefore, String(customersBefore));
  check('سجل التدقيق القديم سليم', count(upgraded, 'audit_logs') === logsBefore, String(logsBefore));

  // ═══════════════════════════════════════════════════════════════
  // 4) الزراعة لم تتكرر — أخطر من عدم وصول الجداول
  //    لو نُفِّذت الزراعة على قاعدة موجودة، لأُضيفت بيانات تجريبية فوق
  //    بيانات حقيقية، وصار المستخدم يرى حركات لم يفعلها.
  // ═══════════════════════════════════════════════════════════════
  check(
    'الزراعة لم تُنفَّذ على قاعدة موجودة',
    count(upgraded, 'items') === itemsBefore,
    `كان يجب أن تبقى ${itemsBefore}؛ الزراعة كانت ستضيف صفاً`
  );

  // ═══════════════════════════════════════════════════════════════
  // 5) الترقية idempotent — تُنفَّذ مرتين بلا ضرر
  // ═══════════════════════════════════════════════════════════════
  await upgraded.persist();
  await reopened.resetSqlJsCache();
  const third = await import(pathToFileURL(path.join(OUT, 'db.js')).href + '?fresh=2');
  const { db: twice } = await third.createOfflineDb(REAL_SCHEMA, () => {
    throw new Error('الزراعة نُفِّذت ثانيةً — يجب ألا يحدث');
  });
  check(
    'ترقية ثانية لا تُكرّر شيئاً ولا تُشغّل الزراعة',
    tableNames(twice).length === names.length && count(twice, 'items') === itemsBefore,
    `${tableNames(twice).length} جدولاً`
  );

  // ═══════════════════════════════════════════════════════════════
  // 6) الجدول الجديد قابل للاستخدام فعلاً
  // ═══════════════════════════════════════════════════════════════
  try {
    twice.exec(
      `INSERT INTO change_requests (change_id, entity_type, entity_id, payload_json, reason, requested_by)
       VALUES ('CR-TEST','items','ITM-1','{}','فحص الترقية','tester')`
    );
    const ok = count(twice, 'change_requests') === 1;
    check('يمكن الكتابة في الجدول الجديد', ok);
    twice.exec("DELETE FROM change_requests WHERE change_id='CR-TEST'");
  } catch (err) {
    check('يمكن الكتابة في الجدول الجديد', false, err.message);
  }

  console.log(`\nالنتيجة: ${pass} نجح | ${fail} فشل`);
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error('فشل الفحص:', err);
  process.exit(1);
});
