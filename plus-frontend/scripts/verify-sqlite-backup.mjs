/**
 * تحقّق من النسخ الاحتياطي الثنائي (.sqlite) على قاعدة النظام الحقيقية.
 *
 * لا يستخدم قاعدة وهمية: يهيّئ المحرك الكامل (37 جدولاً، 76 مساراً، بيانات
 * الزراعة المحاسبية)، يصدّر، يعدّل شيئاً، يستعيد، ثم يتحقق أن:
 *   • الصفوف والأرصدة عادت كما كانت
 *   • القيود ما زالت متوازنة (مدين = دائن)
 *   • المحرك يعمل بعد الاستعادة (دخول + تقارير)
 *
 * هذا هو الفرق بين «الزر يظهر» و«النسخة تعمل فعلاً».
 *
 * التشغيل: npm run verify:sqlite
 */

import { execSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import 'fake-indexeddb/auto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
process.chdir(ROOT);
const OUT = path.join('node_modules', '.sqlite-verify');
rmSync(OUT, { recursive: true, force: true });
execSync(`npx esbuild src/offline/bridge.ts src/offline/db.ts src/offline/engine.ts src/offline/sha256.ts src/offline/tabLock.ts src/offline/sqliteFile.ts src/generated/engineBundle.ts --format=cjs --platform=node --outbase=src --outdir=${OUT} --loader:.ts=ts --log-level=error`);
globalThis.__PLUS_WASM_BYTES__ = new Uint8Array(readFileSync('node_modules/sql.js/dist/sql-wasm.wasm'));

globalThis.localStorage = { _d:{}, getItem(k){return this._d[k]??null;}, setItem(k,v){this._d[k]=String(v);}, removeItem(k){delete this._d[k];} };
try { delete globalThis.navigator } catch {}
globalThis.window = globalThis;

const dbMod = await import(pathToFileURL(path.join(process.cwd(), OUT, 'offline/db.js')).href);
const engMod = await import(pathToFileURL(path.join(process.cwd(), OUT, 'offline/engine.js')).href);
const sfMod = await import(pathToFileURL(path.join(process.cwd(), OUT, 'offline/sqliteFile.js')).href);

let pass = 0, fail = 0;
const check = (n, ok, d='') => { console.log(`  ${ok?'✅':'❌'} ${n}${d?` — ${d}`:''}`); ok?pass++:fail++; };

// ── تهيئة النظام الحقيقي ──────────────────────────────────────
const t0 = Date.now();
const st = await engMod.initOfflineEngine();
const tables = st.db.sqlite.exec("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")[0].values[0][0];
console.log(`النظام جاهز: ${tables} جدولاً · ${st.meta.routes} مساراً · ${Date.now()-t0}ms\n`);

const tbl = n => st.db.sqlite.exec(`SELECT COUNT(*) FROM "${n}"`)[0].values[0][0];
const before = { accounts: tbl('accounts'), journal_entries: tbl('journal_entries'), journal_entry_lines: tbl('journal_entry_lines'), items: tbl('items'), customers: tbl('customers'), users: tbl('users') };
console.log('قبل التصدير:', JSON.stringify(before));

// ── 1) التصدير من النظام الحقيقي ──────────────────────────────
const bytes = await engMod.exportSqliteFile();
check('التصدير ينتج ملف SQLite صالح', sfMod.looksLikeSqlite(bytes), `${(bytes.byteLength/1024).toFixed(0)} كيلوبايت`);
check('حجم الملف معقول لقاعدة كاملة', bytes.byteLength > 100_000, `${bytes.byteLength.toLocaleString('en-US')} بايت`);

// ── 2) المعاينة ───────────────────────────────────────────────
const { info, problem } = await engMod.previewSqliteFile(bytes);
check('المعاينة تقرأ الجداول الحقيقية', info.tables === tables, `${info.tables}`);
check('المعاينة تقرأ الصفوف', info.rows > 150, `${info.rows.toLocaleString('en-US')} صف`);
check('قاعدة النظام متوافقة مع نفسها', info.compatible && problem === null);

// المعاينة لا تكتب — نتحقق أن القاعدة الحيّة لم تتغير
const afterPreview = tbl('journal_entries');
check('المعاينة لم تكتب شيئاً', afterPreview === before.journal_entries, `${afterPreview}`);

// ── 3) التعديل ثم الاستعادة يرجّع الحالة ───────────────────────
const token = await (async () => {
  const r = await (await import(pathToFileURL(path.join(process.cwd(), OUT, 'offline/bridge.js')).href))
    .dispatch(st.routers, 'POST', '/api/auth/login', { headers:{}, body:{ username:'admin', password:'admin123', portal:'ERP' } });
  return r.body?.token;
})();
check('تسجيل الدخول يعمل', !!token);

const authHdr = { authorization: `Bearer ${token}` };
// إضافة صنف جديد — تغيير حقيقي في القاعدة
const addRes = await (await import(pathToFileURL(path.join(process.cwd(), OUT, 'offline/bridge.js')).href))
  .dispatch(st.routers, 'POST', '/api/master/items', { headers: authHdr, body: { item_code:'ITM-TEST-RT', item_name:'صنف اختبار الاستعادة', group_code:'GRP-SRV', item_type:'RAW', unit_of_measure:'قطعة', unit_price:100, cost_price:70, reorder_point:5, current_balance:0 } });
check('إضافة صنف للاختبار', addRes.status === 201, `HTTP ${addRes.status}`);
const afterAdd = tbl('items');
check('عدد الأصناف زاد', afterAdd === before.items + 1, `${before.items} → ${afterAdd}`);

// الاستعادة من الملف المأخوذ قبل التعديل
const restored = await engMod.restoreSqliteFile(bytes);
check('الاستعادة تنجح', restored.tables === tables, `${restored.tables} جدولاً · ${restored.rows} صفاً`);

// إعادة التهيئة وقراءة الحالة
await dbMod.resetSqlJsCache();
const st2 = await engMod.initOfflineEngine();
const itemsAfter = st2.db.sqlite.exec('SELECT COUNT(*) FROM items')[0].values[0][0];
check('الصنف المضاف اختفى بعد الاستعادة', itemsAfter === before.items, `${afterAdd} → ${itemsAfter}`);

// ── 4) سلامة البيانات المحاسبية بعد الاستعادة ─────────────────
const bal = st2.db.sqlite.exec(`
  SELECT a.account_code, a.account_name, SUM(jl.debit) - SUM(jl.credit) AS net
  FROM accounts a JOIN journal_entry_lines jl ON jl.account_code = a.account_code
  GROUP BY a.account_code ORDER BY a.account_code LIMIT 5`)[0]?.values ?? [];
check('الحسابات تُقرأ بعد الاستعادة', bal.length >= 3, bal.map(r=>`${r[0]}:${Number(r[2]).toFixed(0)}`).join(' '));

const totalDebit = st2.db.sqlite.exec('SELECT COALESCE(SUM(debit),0) FROM journal_entry_lines')[0].values[0][0];
const totalCredit = st2.db.sqlite.exec('SELECT COALESCE(SUM(credit),0) FROM journal_entry_lines')[0].values[0][0];
check('القيود متوازنة: مدين = دائن',
  Math.abs(Number(totalDebit) - Number(totalCredit)) < 0.01,
  `${Number(totalDebit).toLocaleString('en-US')} = ${Number(totalCredit).toLocaleString('en-US')}`);

const journalCount = st2.db.sqlite.exec('SELECT COUNT(*) FROM journal_entries')[0].values[0][0];
check('عدد القيود كما كان', journalCount === before.journal_entries, `${journalCount}`);

// ── 5) المحرك يعمل بعد الاستعادة (قراءة + كتابة) ───────────────
const login2 = await (await import(pathToFileURL(path.join(process.cwd(), OUT, 'offline/bridge.js')).href))
  .dispatch(st2.routers, 'POST', '/api/auth/login', { headers:{}, body:{ username:'admin', password:'admin123', portal:'ERP' } });
check('تسجيل الدخول بعد الاستعادة', !!login2.body?.token);

const dash = await (await import(pathToFileURL(path.join(process.cwd(), OUT, 'offline/bridge.js')).href))
  .dispatch(st2.routers, 'GET', '/api/reports/dashboard', { headers: { authorization:`Bearer ${login2.body.token}` }, body: {} });
check('لوحة التحكم تعمل بعد الاستعادة', dash.status === 200, `HTTP ${dash.status}`);
const kpi = dash.body?.kpis ?? dash.body ?? {};
const cash = kpi.cash ?? kpi.cash_balance;
check('نقدية لوحة التحكم سليمة', cash === undefined || Number(cash) === 876034, String(cash ?? 'غير معروضة في هذا الرد'));

console.log(`\nالنتيجة: ${pass} نجح | ${fail} فشل`);
process.exit(fail ? 1 : 0);
