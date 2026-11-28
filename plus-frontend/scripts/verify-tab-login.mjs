/**
 * فحص «التبويب الثاني» — العطل الذي رآه المستخدم على الشاشة الحقيقية.
 *
 * ═══ ما رأيناه ═══════════════════════════════════════════════════════
 *
 * المستخدم فتح الموقع في تبويبين. التبويب الثاني عرض صندوقاً أحمر عند
 * محاولة الدخول:
 *
 *   «النظام مفتوح في تبويب آخر وهو التبويب النشط للكتابة. اعمل من ذلك
 *    التبويب، أو أغلقه ثم أعد تحميل هذه الصفحة.»
 *
 * ثم — وهذا الأسوأ — لم يجد في الصفحة أي وسيلة لإعادة التحميل التي
 * تنصحه الرسالة بها. النص يطلب عملاً، والواجهة لا تعطي أداة تنفيذه.
 *
 * ═══ لماذا هذا عطل لا حماية ═════════════════════════════════════════
 *
 * قفل الكتابة بين التبويبات موجود لسبب حقيقي: تبويبان يكتبان في نفس
 * القاعدة المحلية يحفظ كلٌّ منهما صورته الكاملة فوق الأخرى. لكن
 * تسجيل الدخول ليس كتابة في بيانات الأعمال — إنه قراءة مستخدم + تعديل
 * `last_login` + كتابة سجل تدقيق. منعُه لا يحمي شيئاً، بل يترك المستخدم
 * عالقاً بلا مخرج: كل محاولة دخول تُرفض، ولا زر للخروج من الحالة.
 *
 * ═══ ما يفحصه هذا الملف ═════════════════════════════════════════════
 *
 *   ١) التبويب القارئ يستطيع الدخول (لا 409 على /api/auth/login)
 *   ٢) بعد الدخول، الكتابة في بيانات الأعمال ما زالت مرفوضة (الحماية باقية)
 *   ٣) القراءة تعمل في التبويب الثاني
 *   ٤) الصفحة تعرض زرّ إعادة التحميل حين لا تكون كاتباً
 *
 * التشغيل: npm run verify:tab
 */
import { execSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

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

// داخل node_modules حتى يجد Node حزمة sql.js كما في بقية الفحوص
const OUT = path.join(ROOT, 'node_modules', '.tab-login-verify');

async function main() {
  await import('fake-indexeddb/auto');

  // نفس بيئة بقية الفحوص: لا window، فيجب تزويد التخزين ومسار الـ wasm
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
  globalThis.__PLUS_WASM_BASE__ = pathToFileURL(path.join(ROOT, 'node_modules', 'sql.js', 'dist')).href + '/';
  globalThis.__PLUS_WASM_BYTES__ = new Uint8Array(
    readFileSync(path.join(ROOT, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'))
  );

  execSync(
    `npx esbuild src/offline/bridge.ts src/offline/db.ts src/offline/engine.ts src/offline/sha256.ts ` +
      `src/offline/tabLock.ts src/offline/sqliteFile.ts src/lib/api.ts src/generated/engineBundle.ts ` +
      `--format=cjs --platform=node --outbase=src --outdir=${JSON.stringify(OUT)} --loader:.ts=ts --log-level=error`,
    { cwd: ROOT }
  );

  // المتصفح لا يوفّر Buffer — نُزيله قبل تحميل المحرك كما في الإنتاج
  const savedBuffer = globalThis.Buffer;
  delete globalThis.Buffer;

  // Web Locks محجوز لتبويب آخر: طلب القفل لا يُحسم أبداً → هذا التبويب قارئ
  const realNavigator = globalThis.navigator;
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: true, locks: { request: () => new Promise(() => {}) } },
    configurable: true,
  });

  const engine = await import(pathToFileURL(path.join(OUT, 'offline/engine.js')).href);
  const api = await import(pathToFileURL(path.join(OUT, 'lib/api.js')).href);

  await engine.initOfflineEngine({});
  check('المحرك يعمل بلا Buffer عالمية', true);

  const isWriter = engine.canWrite();
  check('هذا التبويب ليس الكاتب (المحاكاة صحيحة)', isWriter === false);

  // ══════════════════════════════════════════════════════════════════
  console.log('\n١) تسجيل الدخول من التبويب الثاني');
  // ══════════════════════════════════════════════════════════════════
  let loginErr = null;
  let session = null;
  try {
    session = await api.apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'admin123', portal: 'ERP' }),
    });
  } catch (e) {
    loginErr = e;
  }

  check(
    'الدخول يعمل في التبويب الثاني',
    Boolean(session?.token),
    loginErr ? `${loginErr.status} ${loginErr.code}: ${String(loginErr.message).slice(0, 60)}` : 'توكن صادر'
  );
  if (session?.token) api.setStoredToken(session.token);

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٢) الحماية الحقيقية باقية — الكتابة في الأعمال مرفوضة');
  // ══════════════════════════════════════════════════════════════════
  let writeErr = null;
  try {
    await api.apiFetch('/api/transactions/purchase-invoices', {
      method: 'POST',
      body: JSON.stringify({
        invoice_no: 'PINV-TABTEST',
        invoice_date: '2026-11-19',
        supplier_code: 'SUP-001',
        payment_method: 'آجل',
        items: [{ item_code: 'ITM-201', quantity: 1, unit_price: 100, discount_percent: 0 }],
      }),
    });
  } catch (e) {
    writeErr = e;
  }

  check(
    'الكتابة في بيانات الأعمال ما زالت مرفوضة',
    writeErr?.code === 'READ_ONLY_TAB',
    writeErr ? `${writeErr.status} ${writeErr.code}` : 'سُمح بالكتابة ❌ — الحماية سقطت'
  );

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٣) القراءة تعمل');
  // ══════════════════════════════════════════════════════════════════
  let canRead = false;
  try {
    const dash = await api.apiFetch('/api/reports/dashboard');
    canRead = Boolean(dash);
  } catch {
    canRead = false;
  }
  check('التقارير تُقرأ في التبويب الثاني', canRead);

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٤) الفاتورة المرفوضة لم تُحفظ');
  // ══════════════════════════════════════════════════════════════════
  let notSaved = false;
  try {
    const st = engine.offlineState();
    notSaved =
      st.db.prepare(`SELECT COUNT(*) AS c FROM purchase_invoices WHERE invoice_no = 'PINV-TABTEST'`).get().c === 0;
  } catch {
    notSaved = false;
  }
  check('لا أثر للفاتورة المرفوضة في القاعدة', notSaved);

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٥) الواجهة تعطي مخرجاً — زر إعادة التحميل');
  // ══════════════════════════════════════════════════════════════════
  const fs = await import('node:fs');
  const readOnlyBanner = fs.readFileSync(path.join(ROOT, 'src/components/ReadOnlyTabBanner.tsx'), 'utf8');
  check(
    'شريط «تبويب آخر يكتب» يعرض زر إعادة تحميل',
    /reload|location\.reload|إعادة تحميل/.test(readOnlyBanner),
    'الشريط يحتوي وسيلة خروج'
  );

  const procApp = fs.readFileSync(path.join(ROOT, 'src/procurement/App.tsx'), 'utf8');
  check(
    'موقع المشتريات يعرض زر إعادة تحميل عند القراءة فقط',
    /إعادة تحميل|reload/.test(procApp),
    'لا يترك المستخدم عالقاً'
  );

  Object.defineProperty(globalThis, 'navigator', { value: realNavigator, configurable: true });
  globalThis.Buffer = savedBuffer;
  rmSync(OUT, { recursive: true, force: true });

  console.log('\n' + '─'.repeat(64));
  console.log(`  ${fail === 0 ? '✅' : '❌'}  نجح ${pass} · فشل ${fail}`);
  console.log('─'.repeat(64));
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ توقف الفحص بخطأ:', err?.message || err);
  rmSync(OUT, { recursive: true, force: true });
  process.exit(1);
});
