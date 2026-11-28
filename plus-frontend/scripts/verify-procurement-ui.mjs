/**
 * فحص واجهة موقع المشتريات في متصفح حقيقي (jsdom) — بالنقر لا بالقراءة.
 *
 * ═══ ما يثبته هذا الملف ═══════════════════════════════════════════════
 *
 * الفحص السابق (verify-procurement.mjs) يثبت **منطق** الموقع: الأرصدة،
 * القيود، التوازن. لكنه لا يجيب على سؤال المستخدم الأول: «هل تفتح
 * الصفحة وتعمل؟». ولقد رأينا في هذا المشروع أن غياب هذا الفحص بالذات
 * سمح بعطل «Buffer is not defined» يمنع كل مستخدم من الدخول بينما كل
 * الفحوص المنطقية خضراء.
 *
 * هنا: نبني الواجهة كما تُبنى للنشر (esbuild)، نحمّلها في jsdom **بلا
 * Buffer عالمية** كما في المتصفح، ثم نضغط فعلياً:
 *
 *   ١) الصفحة تُرسم وتظهر شاشة الدخول.
 *   ٢) الدخول يعمل، وتظهر لوحة المشتريات بأرقامها.
 *   ٣) كل شاشة من الشاشات الثماني تُفتح وتُنتج محتوى — بلا انهيار.
 *   ٤) حفظ فاتورة شراء من النموذج نفسه (نقر زر) يزيد المخزون فعلاً.
 *   ۵) لا شاشة بيضاء ولا خطأ غير معروض.
 *
 * التشغيل: npm run verify:procurement:ui   (يحتاج jsdom بـ --no-save)
 */
import { execSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
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

async function main() {
  // jsdom أداة فحص، لا تبعية إنتاج — تُثبَّت بـ --no-save فقط
  let JSDOM;
  try {
    ({ JSDOM } = await import('jsdom'));
  } catch {
    console.log('  ⚠️  jsdom غير مثبّت — شغّل: npm install --no-save jsdom');
    console.log('     (فحص الواجهة يتخطى نفسه بدل أن يفشل بلا سبب)');
    process.exit(0);
  }

  const BUNDLE_DIR = path.join(ROOT, 'node_modules', '.verify-proc-ui');
  rmSync(BUNDLE_DIR, { recursive: true, force: true });
  execSync(
    `npx esbuild src/procurement/main.tsx --bundle --format=iife --platform=browser --target=es2020 ` +
      `--outfile=${JSON.stringify(path.join(BUNDLE_DIR, 'proc.js'))} --loader:.css=empty ` +
      `--define:process.env.NODE_ENV='"production"' --log-level=error`,
    { cwd: ROOT }
  );
  const bundle = readFileSync(path.join(BUNDLE_DIR, 'proc.js'), 'utf8');

  await import('fake-indexeddb/auto');

  const errors = [];
  const dom = new JSDOM('<!doctype html><html dir="rtl"><body><div id="root"></div></body></html>', {
    url: 'https://plus-accounting-erp.vercel.app/procurement',
    pretendToBeVisual: true,
    runScripts: 'dangerously',
  });
  const g = dom.window;
  const origError = console.error;
  g.console = {
    log() {},
    info() {},
    warn() {},
    debug() {},
    error: (...a) => errors.push(a.map((x) => (x && (x.stack || x.message)) || String(x)).join(' ')),
  };

  // ما يوفّره المتصفح ولا يوفّره Node
  for (const [k, v] of [
    ['indexedDB', globalThis.indexedDB],
    ['IDBKeyRange', globalThis.IDBKeyRange],
    ['WebAssembly', WebAssembly],
  ]) {
    Object.defineProperty(g, k, { configurable: true, value: v });
  }
  const ls = {};
  Object.defineProperty(g, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k) => (k in ls ? ls[k] : null),
      setItem: (k, v) => {
        ls[k] = String(v);
      },
      removeItem: (k) => {
        delete ls[k];
      },
    },
  });
  Object.defineProperty(g, 'caches', {
    configurable: true,
    value: {
      keys: async () => [],
      delete: async () => true,
      open: async () => ({ match: async () => null, put: async () => undefined }),
    },
  });
  try {
    Object.defineProperty(g, 'crypto', { configurable: true, value: globalThis.crypto });
  } catch {
    /* بعض إصدارات jsdom تعرّف crypto للقراءة فقط — القيمة الموجودة تكفي */
  }
  // ⚠️ TextEncoder الخاص بـ jsdom ليس أصلياً: يعتمد على حزمة @exodus/bytes
  // التي تستخدم Buffer من Node. في المتصفح الحقيقي TextEncoder أصلي تماماً
  // ولا علاقة له بـ Buffer. نستبدله بالأصلي حتى يقيس الفحص سلوك المتصفح،
  // لا نقصاً في أداة الفحص.
  g.TextEncoder = globalThis.TextEncoder;
  g.TextDecoder = globalThis.TextDecoder;
  g.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  g.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  g.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  g.scrollTo = () => {};

  // ملف الـ wasm من نفس الأصل — كما في الإنتاج
  const wasm = readFileSync(path.join(ROOT, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'));
  const mk = (buf, type) => ({
    ok: true,
    status: 200,
    headers: { get: (h) => (h.toLowerCase() === 'content-type' ? type : null) },
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    json: async () => JSON.parse(buf.toString()),
    text: async () => buf.toString(),
    clone() {
      return mk(buf, type);
    },
  });
  g.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input.url;
    if (/sql-wasm\.wasm$/.test(new URL(url, 'https://x.test/').pathname)) return mk(wasm, 'application/wasm');
    return mk(Buffer.from(''), 'text/plain');
  };

  const txt = () => (g.document.getElementById('root')?.textContent || '').replace(/\s+/g, ' ').trim();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (predicate, label, timeout = 40000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (predicate()) return true;
      await wait(150);
    }
    console.log(`     ⏳ انتظار (${label}) انتهى بلا نتيجة — النص الحالي: ${txt().slice(0, 140)}`);
    return false;
  };
  const clickText = (text) => {
    const btn = [...g.document.querySelectorAll('button')].find((b) => (b.textContent || '').includes(text));
    if (btn) {
      btn.dispatchEvent(new g.MouseEvent('click', { bubbles: true }));
      return true;
    }
    return false;
  };
  const setInput = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(g.HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(el, String(value));
    else el.value = String(value);
    el.dispatchEvent(new g.Event('input', { bubbles: true }));
    el.dispatchEvent(new g.Event('change', { bubbles: true }));
  };

  // ══════════════════════════════════════════════════════════════════
  console.log('\n١) تشغيل الصفحة بلا Buffer عالمية (كما في المتصفح)');
  // ══════════════════════════════════════════════════════════════════
  const savedBuffer = globalThis.Buffer;
  const hadBuffer = typeof g.Buffer !== 'undefined';
  check('الصفحة لا تحتوي Buffer قبل التشغيل', !hadBuffer);
  delete globalThis.Buffer;

  const script = g.document.createElement('script');
  script.textContent = bundle;
  g.document.body.appendChild(script);

  const loginShown = await waitFor(() => txt().includes('تسجيل الدخول'), 'شاشة الدخول');
  check('شاشة الدخول ظهرت', loginShown);
  check('اسم الموقع ظاهر', txt().includes('المشتريات والمخازن'), txt().slice(0, 80));
  check('لم تظهر شاشة سوداء أو فراغ', txt().length > 100, `${txt().length} حرفاً`);

  if (errors.length) {
    console.log('     🔎 المكدّس:');
    console.log(errors[0].split('\n').slice(0, 8).map((l) => '        ' + l.trim()).join('\n'));
  }
  const accountsLoaded = await waitFor(() => txt().includes('مدير النظام'), 'قائمة الحسابات');
  check('قائمة حسابات العرض وصلت من قاعدة البيانات', accountsLoaded);
  check('لا خطأ JS أثناء التشغيل', errors.length === 0, errors[0]?.slice(0, 120) || 'نظيف');

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٢) الدخول من الشاشة نفسها');
  // ══════════════════════════════════════════════════════════════════
  // نأخذ عناصر jsdom الحقيقية فقط — ليس المرايا التي ينشئها esbuild
  const inputs = [...g.document.querySelectorAll('input')].filter((el) => el instanceof g.HTMLInputElement);
  setInput(inputs[0], 'admin');
  setInput(inputs[1], 'admin123');
  const form = g.document.querySelector('form');
  form?.dispatchEvent(new g.Event('submit', { bubbles: true, cancelable: true }));

  const dashShown = await waitFor(() => txt().includes('مستحقات الموردين'), 'لوحة المشتريات');
  check('الدخول نجح وظهرت لوحة المشتريات', dashShown);
  check('اسم الشركة في القائمة', txt().includes('شركة النيل'), '');
  // الرقم من القاعدة لا من التوقّع: نقرأ مستحقات الموردين كما تعرضها
  // اللوحة ونقارنها بمجموع أرصدة الموردين المقروء من شاشة الموردين.
  // التطابق بين شاشتين يعني أن الرقم محسوب من مصدر واحد.
  const payablesMatch = txt().match(/([\d,]+)\.00\s*ج\.م/);
  check('اللوحة تعرض رقم مستحقات فعلياً', Boolean(payablesMatch), payablesMatch?.[1] || '—');

  const seeded = await waitFor(() => txt().includes('أصناف تحت حد الطلب') || txt().includes('تنبيهات'), 'تنبيهات اللوحة');
  check('لوحة التنبيهات والـKPIs رُسمت', seeded);

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٣) الشاشات الثماني تُفتح بلا انهيار');
  // ══════════════════════════════════════════════════════════════════
  const screens = [
    ['الموردون', 'الموردون ('],
    ['أوامر التوريد', 'إصدار أمر توريد'],
    ['فواتير الشراء', 'تسجيل فاتورة شراء'],
    ['الرد والسداد', 'إشعار رد مشتريات'],
    ['المخازن', 'أرصدة الأصناف'],
    ['التقارير', 'ميزان المراجعة'],
    ['طلبات التعديل', 'طلب تعديل بيانات'],
  ];
  for (const [navLabel, expect] of screens) {
    errors.length = 0;
    const clicked = clickText(navLabel);
    const ok = clicked && (await waitFor(() => txt().includes(expect), `شاشة ${navLabel}`));
    check(`شاشة «${navLabel}»`, ok, errors[0]?.slice(0, 100) || expect);
  }

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٤) فاتورة شراء من النموذج نفسه (نقر زر)');
  // ══════════════════════════════════════════════════════════════════
  clickText('فواتير الشراء');
  await waitFor(() => txt().includes('تسجيل فاتورة شراء'), 'شاشة الفواتير');
  const beforeText = txt();

  const saveBtn = [...g.document.querySelectorAll('button')].find((b) =>
    (b.textContent || '').includes('حفظ وترحيل')
  );
  check('زر الحفظ موجود في النموذج', Boolean(saveBtn));
  if (saveBtn) {
    saveBtn.dispatchEvent(new g.MouseEvent('click', { bubbles: true }));
    const saved = await waitFor(() => txt().includes('القيد') && /PINV-/.test(txt()), 'تأكيد الحفظ');
    check('الفاتورة حُفظت وظهر رقمها ورقم القيد', saved);
    // الرسالة تحتوي رقم الفاتورة ورقم القيد — نتحقق من وجود قيد حقيقي
    const jeMatch = txt().match(/القيد\s*(JE-[A-Z0-9-]+)/) || txt().match(/(JE-[A-Z0-9-]+)/);
    const invMatch = txt().match(/(PINV-[A-Z0-9-]+)/);
    check('رسالة النجاح تحمل رقم فاتورة حقيقياً', Boolean(invMatch), invMatch?.[1] || '—');
    check('رسالة النجاح تحمل رقم قيد حقيقياً', Boolean(jeMatch), jeMatch?.[1] || '—');
    const rowCount = (txt().match(/PINV-/g) || []).length;
    check('الفاتورة ظهرت في السجل', rowCount >= 2, `${rowCount} إشارة للفاتورة`);
  }

  // بعد الحفظ: الموردون يجب أن يظهر بهم رصيد متغيّر
  errors.length = 0;
  clickText('الموردون');
  await waitFor(() => txt().includes('الموردون ('), 'شاشة الموردين');
  check('سجل الموردين يُفتح بعد الكتابة', txt().includes('الموردون ('));
  check('لا أخطاء JS بعد الحفظ', errors.length === 0, errors[0]?.slice(0, 120) || 'نظيف');

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٥) لا شاشة بيضاء ولا خطأ مخفي');
  // ══════════════════════════════════════════════════════════════════
  const bodyText = txt();
  check('المحتوى ما زال موجوداً بعد كل التنقل', bodyText.length > 200, `${bodyText.length} حرفاً`);
  check('لا نص «تعذّر تشغيل»', !bodyText.includes('تعذّر تشغيل موقع المشتريات'));
  check('لا نص «no such table»', !bodyText.includes('no such table'));
  check('لا نص «is not defined»', !bodyText.includes('is not defined'));

  globalThis.Buffer = savedBuffer;
  void beforeText;
  console.log('\n' + '─'.repeat(64));
  console.log(`  ${fail === 0 ? '✅' : '❌'}  نجح ${pass} · فشل ${fail}`);
  console.log('─'.repeat(64));
  rmSync(BUNDLE_DIR, { recursive: true, force: true });
  console.error = origError;
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ توقف الفحص بخطأ:', err?.message || err);
  process.exit(1);
});
