/**
 * ترقية المخطط على النظام الحقيقي — بأرقام محاسبية فعلية
 * ═══════════════════════════════════════════════════════════════════
 *
 * الفحص السابق (verify-migration) يثبت أن الجداول تصل. هذا يثبت أن
 * **الأرقام** تصل: مستخدم صدر فاتورة بيع حقيقية (قيد + بنود + رصيد عميل
 * + حركة مخزون)، ثم استلم إصداراً جديداً، ونحن نتحقق أن:
 *
 *   • عدد القيود والبنود كما هو بالضبط
 *   • مجموع المدين ومجموع الدائن كما هما بالضبط
 *   • القيود ما زالت متوازنة
 *   • الزراعة **لم** تتكرر (وإلا لأُضيفت 6 أصناف تجريبية فوق بياناته)
 *   • جدول طلبات التعديل يعمل على القاعدة القديمة بعد الترقية
 *
 * ─ الخطأ الذي وقعت فيه أثناء كتابة هذا الفحص ──────────────────────
 * قارنت "بعد الترقية" بـ"قبل الفاتورة". فظهر فرق 27→31 بنداً و894,650→
 * 979,650 وبدا كعطل. لكن الفرق كان **مشروعاً**: الفاتورة أضافت قيداً.
 * المرجع الصحيح هو لقطة **قبل الترقية مباشرة**. الفحص الخاطئ يخلق عطلاً
 * من لا شيء، وهو أسوأ من عدم الفحص.
 *
 * التشغيل: npm run verify:migration:real
 */
import { execSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import 'fake-indexeddb/auto';

const ROOT = '/home/user/nova-store-tmp/plus-frontend';
process.chdir(ROOT);
const OUT = path.join(ROOT, 'node_modules', '.mig2');
rmSync(OUT, { recursive: true, force: true });
execSync(`npx esbuild src/offline/bridge.ts src/offline/db.ts src/offline/engine.ts src/offline/sha256.ts src/offline/tabLock.ts src/offline/sqliteFile.ts src/generated/engineBundle.ts --format=cjs --platform=node --outbase=src --outdir=${JSON.stringify(OUT)} --loader:.ts=ts --log-level=error`);
globalThis.__PLUS_WASM_BYTES__ = new Uint8Array(readFileSync('node_modules/sql.js/dist/sql-wasm.wasm'));
globalThis.localStorage = { _d:{}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];} };
try { delete globalThis.navigator; } catch {}

const load = (m, q='') => import(pathToFileURL(path.join(OUT, m)).href + q);
let pass=0, fail=0;
const check=(n,ok,d='')=>{console.log(`  ${ok?'✅':'❌'} ${n}${d?` — ${d}`:''}`); ok?pass++:fail++;};

// ── 1) المستخدم يفتح النظام (قاعدة جديدة) ويعمل دورة محاسبية ──
const eng = await load('offline/engine.js');
const br  = await load('offline/bridge.js');
const st = await eng.initOfflineEngine({});
const call = (m,p,b,t) => br.dispatch(st.routers, m, p, { headers: t?{authorization:`Bearer ${t}`}:{}, body: b||{} });
const tok = (await call('POST','/api/auth/login',{username:'accountant',password:'plus123',portal:'ERP'})).body.token;

const before = {
  accounts: st.db.sqlite.exec('SELECT COUNT(*) FROM accounts')[0].values[0][0],
  journals: st.db.sqlite.exec('SELECT COUNT(*) FROM journal_entries')[0].values[0][0],
  lines:    st.db.sqlite.exec('SELECT COUNT(*) FROM journal_entry_lines')[0].values[0][0],
  items:    st.db.sqlite.exec('SELECT COUNT(*) FROM items')[0].values[0][0],
  dr:       st.db.sqlite.exec('SELECT COALESCE(SUM(debit),0) FROM journal_entry_lines')[0].values[0][0],
};
console.log('قبل الترقية:', JSON.stringify(before));

// دورة محاسبية حقيقية: فاتورة بيع
const inv = await call('POST','/api/transactions/sales-invoices', {
  customer_id:'CUST-001', employee_code:'EMP-001', invoice_date:'2026-11-19',
  items:[{ item_code:'ITM-101', quantity:2, unit_price:24500 }],
}, tok);
check('فاتورة بيع صادرة (بيانات مستخدم حقيقية)', inv.status===201 || inv.status===200, `HTTP ${inv.status}${inv.body.error?`: ${inv.body.error}`:''}`);
await eng.persistNow();

// لقطة كاملة **قبل الترقية مباشرة** — هي المرجع الصحيح. المقارنة مع ما
// قبل الفاتورة كانت خطأ في الفحص نفسه: الفاتورة أضافت قيداً و4 بنود
// مشروعة، فظهور الفرق كان صحيحاً وليس عطلاً.
const snapshotBeforeUpgrade = {
  accounts: st.db.sqlite.exec('SELECT COUNT(*) FROM accounts')[0].values[0][0],
  journals: st.db.sqlite.exec('SELECT COUNT(*) FROM journal_entries')[0].values[0][0],
  lines:    st.db.sqlite.exec('SELECT COUNT(*) FROM journal_entry_lines')[0].values[0][0],
  items:    st.db.sqlite.exec('SELECT COUNT(*) FROM items')[0].values[0][0],
  dr:       st.db.sqlite.exec('SELECT COALESCE(SUM(debit),0) FROM journal_entry_lines')[0].values[0][0],
  cr:       st.db.sqlite.exec('SELECT COALESCE(SUM(credit),0) FROM journal_entry_lines')[0].values[0][0],
};
console.log('قبل الترقية مباشرة:', JSON.stringify(snapshotBeforeUpgrade));

// ── 2) محاكاة إعادة تحميل الصفحة بعد نشر إصدار جديد ──
await load('offline/db.js').then(m=>m.resetSqlJsCache());
const eng2 = await load('offline/engine.js', '?r=2');
const st2 = await eng2.initOfflineEngine({});
const br2 = await load('offline/bridge.js');

check('القاعدة عُرفت كموجودة', st2.db.sqlite.exec("SELECT name FROM sqlite_master WHERE name='change_requests'")[0] !== undefined ? true : false);

const tables = st2.db.sqlite.exec("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")[0].values[0][0];
check('جدول طلبات التعديل موجود بعد الترقية', st2.db.sqlite.exec("SELECT COUNT(*) FROM sqlite_master WHERE name='change_requests'")[0].values[0][0]===1, `${tables} جدولاً`);

const after = {
  accounts: st2.db.sqlite.exec('SELECT COUNT(*) FROM accounts')[0].values[0][0],
  journals: st2.db.sqlite.exec('SELECT COUNT(*) FROM journal_entries')[0].values[0][0],
  lines:    st2.db.sqlite.exec('SELECT COUNT(*) FROM journal_entry_lines')[0].values[0][0],
  items:    st2.db.sqlite.exec('SELECT COUNT(*) FROM items')[0].values[0][0],
  dr:       st2.db.sqlite.exec('SELECT COALESCE(SUM(debit),0) FROM journal_entry_lines')[0].values[0][0],
  cr:       st2.db.sqlite.exec('SELECT COALESCE(SUM(credit),0) FROM journal_entry_lines')[0].values[0][0],
};
console.log('بعد الترقية:', JSON.stringify(after));

check('الحسابات لم تُمس', after.accounts===snapshotBeforeUpgrade.accounts, `${snapshotBeforeUpgrade.accounts} → ${after.accounts}`);
const snap = snapshotBeforeUpgrade;
check('القيود لم تُمس', after.journals===snap.journals, `${snap.journals} → ${after.journals}`);
check('بنود القيود سليمة', after.lines===snap.lines, `${snap.lines} → ${after.lines}`);
check('الأصناف لم تتضاعف (الزراعة لم تتكرر)', after.items===snap.items, `${snap.items} → ${after.items} (الزراعة كانت ستضيف 6)`);
check('مجموع المدين سليم', Number(after.dr)===Number(snap.dr), `${snap.dr} → ${after.dr}`);
check('مجموع الدائن سليم', Number(after.cr)===Number(snap.cr), `${snap.cr} → ${after.cr}`);

const crc = st2.db.sqlite.exec('SELECT COALESCE(SUM(credit),0) FROM journal_entry_lines')[0].values[0][0];
check('القيود متوازنة بعد الترقية', Math.abs(Number(after.dr)-Number(crc))<0.01, `${Number(after.dr).toLocaleString('en-US')} = ${Number(crc).toLocaleString('en-US')}`);

// ── 3) الميزة الجديدة تعمل على قاعدة قديمة ──
const tok2 = (await br2.dispatch(st2.routers,'POST','/api/auth/login',{headers:{},body:{username:'accountant',password:'plus123',portal:'ERP'}})).body?.token;
const cr = await br2.dispatch(st2.routers,'POST','/api/change-requests',{headers:{authorization:`Bearer ${tok2}`},body:{entity_type:'items',entity_id:'ITM-101',payload:{unit_price:99000},reason:'فحص الترقية على قاعدة موجودة'}});
check('طلب التعديل يعمل على قاعدة مُرقّاة', cr.status===201, `HTTP ${cr.status}${cr.body.error?`: ${cr.body.error}`:''}`);

const list = await br2.dispatch(st2.routers,'GET','/api/change-requests',{headers:{authorization:`Bearer ${tok2}`},body:{}});
check('الطلب يظهر في القائمة', (list.body.requests?.length||0)>=1, `${list.body.requests?.length} طلب`);

console.log(`\nالنتيجة: ${pass} نجح | ${fail} فشل`);
process.exit(fail?1:0);
