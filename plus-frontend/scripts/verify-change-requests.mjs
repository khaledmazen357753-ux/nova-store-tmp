/**
 * تحقّق من نظام طلبات التعديل — (ج) تعديلات بموافقة المدير
 * ═══════════════════════════════════════════════════════════════════
 *
 * يعمل على المحرك الكامل (37+ جدولاً، 76+ مساراً، نفس كود الخادم) في
 * وضع الأوفلاين. هذا مهم: النظام يعمل أساساً في المتصفح، ولو اختبرنا
 * الخادم فقط لما أثبتنا أن الميزة تعمل حيث يستخدمها الناس فعلاً.
 *
 * محور الاختبار: **لا شيء يُكتب قبل الموافقة.** كل فحص آخر يخدم هذا.
 *
 * التشغيل: npm run verify:changes
 */
import { execSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import 'fake-indexeddb/auto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const OUT = path.join(ROOT, 'node_modules', '.changes-verify');

rmSync(OUT, { recursive: true, force: true });
execSync(
  `npx esbuild src/offline/bridge.ts src/offline/db.ts src/offline/engine.ts src/offline/sha256.ts src/offline/tabLock.ts src/offline/sqliteFile.ts src/generated/engineBundle.ts --format=cjs --platform=node --outbase=src --outdir=${JSON.stringify(OUT)} --loader:.ts=ts --log-level=error`,
  { cwd: ROOT }
);

globalThis.__PLUS_WASM_BYTES__ = new Uint8Array(
  readFileSync(path.join(ROOT, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'))
);
globalThis.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] ?? null; },
  setItem(k, v) { this._d[k] = String(v); },
  removeItem(k) { delete this._d[k]; },
};
try { delete globalThis.navigator; } catch { /* getter فقط */ }

const load = (m) => import(pathToFileURL(path.join(OUT, m)).href);

let pass = 0;
let fail = 0;
const check = (name, ok, extra = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
  ok ? pass++ : fail++;
};

async function main() {
  const engine = await load('offline/engine.js');
  const bridge = await load('offline/bridge.js');

  const state = await engine.initOfflineEngine();
  const call = async (method, p, body, token) =>
    bridge.dispatch(state.routers, method, p, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: body || {},
    });
  const login = async (u, pw) =>
    (await call('POST', '/api/auth/login', { username: u, password: pw, portal: 'ERP' })).body?.token;

  const adminTok = await login('admin', 'admin123');
  const accTok = await login('accountant', 'plus123');
  const salesTok = await login('sales', 'plus123');

  check('دخول المدير والمحاسب', !!adminTok && !!accTok);

  const one = (sql) => state.db.sqlite.exec(sql)[0]?.values?.[0]?.[0];

  check(
    'جدول الطلبات موجود في المحرك الأوفلاين',
    one("SELECT COUNT(*) FROM sqlite_master WHERE name='change_requests'") === 1
  );

  // ═══ 1) الطلب لا يكتب ═══
  console.log('\n── الطلب يُسجَّل ولا يُطبَّق ──');
  const priceBefore = one("SELECT unit_price FROM items WHERE item_code='ITM-101'");
  const created = await call(
    'POST',
    '/api/change-requests',
    { entity_type: 'items', entity_id: 'ITM-101', payload: { unit_price: 31000 }, reason: 'زيادة أسعار الموردين 20%' },
    accTok
  );
  check('المحاسب ينشئ طلباً', created.status === 201, `HTTP ${created.status}`);
  const crId = created.body.request?.change_id;
  check('رقم الطلب بصيغة CR-', /^CR-\d{6}$/.test(crId || ''), crId);
  check(
    'سعر الصنف لم يتغيّر إطلاقاً',
    one("SELECT unit_price FROM items WHERE item_code='ITM-101'") === priceBefore,
    String(priceBefore)
  );

  // ═══ 2) المعاينة بلا كتابة ═══
  console.log('\n── المعاينة تحسب على الحالة الحالية بلا كتابة ──');
  const detail = await call('GET', `/api/change-requests/${crId}`, {}, adminTok);
  check('المدير يقرأ التفاصيل', detail.status === 200);
  check('المعاينة تُظهر فرقاً واحداً', detail.body.changes?.length === 1, JSON.stringify(detail.body.changes));
  check(
    'الفرق هو السعر القديم → الجديد',
    detail.body.changes?.[0]?.from === priceBefore && detail.body.changes?.[0]?.to === 31000,
    `${detail.body.changes?.[0]?.from} → ${detail.body.changes?.[0]?.to}`
  );
  check(
    'المعاينة لم تكتب شيئاً',
    one("SELECT unit_price FROM items WHERE item_code='ITM-101'") === priceBefore
  );

  // ═══ 3) المحاسب لا يعتمد ═══
  console.log('\n── الصلاحيات ──');
  check(
    'المحاسب لا يعتمد',
    (await call('POST', `/api/change-requests/${crId}/approve`, {}, accTok)).status === 403
  );
  check(
    'المحاسب لا يرفض',
    (await call('POST', `/api/change-requests/${crId}/reject`, { note: 'محاولة' }, accTok)).status === 403
  );
  check(
    'المبيعات لا ترى طلبات غيرها',
    (await call('GET', '/api/change-requests', {}, salesTok)).body.requests?.length === 0
  );
  check(
    'المدير يرى الكل',
    (await call('GET', '/api/change-requests', {}, adminTok)).body.requests?.length >= 1
  );

  // ═══ 4) الاعتماد يُطبّق ═══
  console.log('\n── الاعتماد يُطبّق فعلاً ──');
  const approved = await call('POST', `/api/change-requests/${crId}/approve`, { note: 'مطابق لعروض الموردين' }, adminTok);
  check('المدير يعتمد', approved.status === 200, approved.body.error || `HTTP ${approved.status}`);
  check(
    'السعر تغيّر بعد الاعتماد',
    one("SELECT unit_price FROM items WHERE item_code='ITM-101'") === 31000,
    `${priceBefore} → 31000`
  );
  check(
    'لا اعتماد مزدوج',
    (await call('POST', `/api/change-requests/${crId}/approve`, {}, adminTok)).status === 409
  );

  // ═══ 5) الأعمدة المحظورة ═══
  console.log('\n── الأعمدة الحسّاسة لا يمكن طلبها ──');
  const restricted = await call(
    'POST',
    '/api/change-requests',
    { entity_type: 'items', entity_id: 'ITM-102', payload: { current_balance: 99999, unit_price: 12000 }, reason: 'محاولة تعديل الرصيد' },
    accTok
  );
  check('الطلب يُقبل', restricted.status === 201, `HTTP ${restricted.status}`);
  check(
    'current_balance في المتجاهَل',
    (restricted.body.ignored_fields || []).includes('current_balance'),
    JSON.stringify(restricted.body.ignored_fields)
  );
  const balBefore = one("SELECT current_balance FROM items WHERE item_code='ITM-102'");
  const rId = restricted.body.request?.change_id;
  if (rId) await call('POST', `/api/change-requests/${rId}/approve`, {}, adminTok);
  check(
    'الرصيد لم يُمس حتى بعد الاعتماد',
    one("SELECT current_balance FROM items WHERE item_code='ITM-102'") === balBefore,
    String(balBefore)
  );

  // ═══ 6) التحقق ═══
  console.log('\n── التحقق من المدخلات ──');
  check(
    'قيمة غير رقمية مرفوضة',
    (await call('POST', '/api/change-requests', { entity_type: 'items', entity_id: 'ITM-103', payload: { unit_price: 'غير رقم' }, reason: 'اختبار' }, accTok)).status === 400
  );
  check(
    'سبب قصير مرفوض',
    (await call('POST', '/api/change-requests', { entity_type: 'items', entity_id: 'ITM-103', payload: { unit_price: 5000 }, reason: 'خ' }, accTok)).status === 400
  );
  check(
    'عنصر غير موجود مرفوض',
    (await call('POST', '/api/change-requests', { entity_type: 'items', entity_id: 'NOPE-999', payload: { unit_price: 1 }, reason: 'غير موجود' }, accTok)).status === 404
  );
  const cur = one("SELECT unit_price FROM items WHERE item_code='ITM-103'");
  check(
    'طلب بلا تغيير مرفوض',
    (await call('POST', '/api/change-requests', { entity_type: 'items', entity_id: 'ITM-103', payload: { unit_price: cur }, reason: 'نفس القيمة' }, accTok)).status === 400
  );
  check(
    'كيان غير مدعوم مرفوض',
    (await call('POST', '/api/change-requests', { entity_type: 'users', entity_id: '1', payload: { role_code: 'SUPER_ADMIN' }, reason: 'تصعيد' }, accTok)).status === 400
  );

  // ═══ 7) الرفض والإلغاء ═══
  console.log('\n── الرفض والإلغاء ──');
  const toReject = await call('POST', '/api/change-requests', { entity_type: 'customers', entity_id: 'CUST-001', payload: { credit_limit: 999999 }, reason: 'طلب رفع ائتمان كبير' }, accTok);
  const rjId = toReject.body.request?.change_id;
  const limitBefore = one("SELECT credit_limit FROM customers WHERE customer_id='CUST-001'");
  if (rjId) {
    check(
      'رفض بلا سبب مرفوض',
      (await call('POST', `/api/change-requests/${rjId}/reject`, {}, adminTok)).status === 400
    );
    check(
      'رفض بسبب ينجح',
      (await call('POST', `/api/change-requests/${rjId}/reject`, { note: 'الائتمان الحالي كافٍ' }, adminTok)).status === 200
    );
    check(
      'حد الائتمان لم يتغيّر بعد الرفض',
      one("SELECT credit_limit FROM customers WHERE customer_id='CUST-001'") === limitBefore,
      String(limitBefore)
    );
    check(
      'لا اعتماد لطلب مرفوض',
      (await call('POST', `/api/change-requests/${rjId}/approve`, {}, adminTok)).status === 409
    );
  }

  const toCancel = await call('POST', '/api/change-requests', { entity_type: 'suppliers', entity_id: 'SUP-001', payload: { phone: '01111111111' }, reason: 'تحديث هاتف المورد' }, accTok);
  const cnId = toCancel.body.request?.change_id;
  if (cnId) {
    check(
      'لا يُلغي طلب غيره',
      (await call('POST', `/api/change-requests/${cnId}/cancel`, {}, adminTok)).status === 403
    );
    check(
      'صاحب الطلب يلغي طلبه',
      (await call('POST', `/api/change-requests/${cnId}/cancel`, {}, accTok)).status === 200
    );
    check(
      'لا اعتماد لطلب ملغى',
      (await call('POST', `/api/change-requests/${cnId}/approve`, {}, adminTok)).status === 409
    );
  }

  // ═══ 8) التعديل المباشر محجوب ═══
  console.log('\n── التعديل المباشر محجوب على الخادم ──');
  const direct = await call('PUT', '/api/master/items/ITM-104', { unit_price: 1 }, accTok);
  check('PUT مباشر من المحاسب مرفوض', direct.status === 403, `HTTP ${direct.status} · ${direct.body.code || ''}`);
  const directAdmin = await call('PUT', '/api/master/items/ITM-104', { unit_price: 26000 }, adminTok);
  check('PUT مباشر من المدير مسموح', directAdmin.status === 200, `HTTP ${directAdmin.status}`);

  // ═══ 9) الثبات بعد إعادة التشغيل ═══
  console.log('\n── الثبات ──');
  await engine.persistNow();
  const engine2 = await load('offline/engine.js');
  const state2 = await engine2.initOfflineEngine();
  const bridge2 = await load('offline/bridge.js');
  const adminTok2 = (await bridge2.dispatch(state2.routers, 'POST', '/api/auth/login', { headers: {}, body: { username: 'admin', password: 'admin123', portal: 'ERP' } })).body?.token;
  const list2 = await bridge2.dispatch(state2.routers, 'GET', '/api/change-requests?status=approved', { headers: { authorization: `Bearer ${adminTok2}` }, body: {} });
  check('الطلبات المعتمدة تبقى بعد إعادة التحميل', list2.body.requests?.length >= 1, `${list2.body.requests?.length} معتمد`);
  check(
    'السعر المعتمد بقي بعد إعادة التحميل',
    state2.db.sqlite.exec("SELECT unit_price FROM items WHERE item_code='ITM-101'")[0].values[0][0] === 31000
  );

  // ═══ 10) المحاسبة سليمة ═══
  console.log('\n── المحاسبة لم تتأثر ──');
  const dr = one('SELECT COALESCE(SUM(debit),0) FROM journal_entry_lines');
  const crTotal = one('SELECT COALESCE(SUM(credit),0) FROM journal_entry_lines');
  check(
    'القيود متوازنة: مدين = دائن',
    Math.abs(Number(dr) - Number(crTotal)) < 0.01,
    `${Number(dr).toLocaleString('en-US')} = ${Number(crTotal).toLocaleString('en-US')}`
  );

  console.log(`\nالنتيجة: ${pass} نجح | ${fail} فشل`);
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error('فشل الفحص:', err);
  process.exit(1);
});
