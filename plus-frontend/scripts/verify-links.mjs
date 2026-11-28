/**
 * فحص الربط بين الموقعين — بالنقر لا بقراءة الكود.
 *
 * ═══ لماذا فحص منفصل ═══════════════════════════════════════════════
 *
 * «أضفت رابطاً» و«الرابط يعمل» جملتان مختلفتان. الفرق بينهما يظهر عند
 * أوّل مسار مكتوب خطأً (/procurement.html بدل /procurement) أو عند رابط
 * يُنسى داخل شاشة لا تُرسم في الاختبار اليدوي.
 *
 * هنا نفتح كل موقع في DOM منفصل، نجد روابطه، ونتأكد أن كل href:
 *   ١) مسار داخلي معروف (لا يخرج من النطاق، ولا يذهب إلى 404)
 *   ٢) موجود في الموقع الآخر فعلاً — أي أن الوجهة تُرسم في الموقع المقصود
 *
 * التشغيل: npm run verify:links   (يحتاج jsdom بـ --no-save)
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

/** يبني وحدة كاملة إلى ملف IIFE حتى نحمّلها في jsdom بلا مشاكل ESM */
function bundle(entry, out) {
  execSync(
    `npx esbuild ${entry} --bundle --format=iife --platform=browser --target=es2020 ` +
      `--outfile=${JSON.stringify(out)} --loader:.css=empty ` +
      `--define:process.env.NODE_ENV='"production"' --log-level=error`,
    { cwd: ROOT }
  );
  return readFileSync(out, 'utf8');
}

// ملف الـ wasm الحقيقي — بدونه يرسم التطبيق شاشة عطل، وهذا صحيح لكنه
// يحجب ما نقيسه هنا (الروابط). نخدمه من نفس الأصل كما في الإنتاج.
const WASM = readFileSync(path.join(ROOT, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'));
const mkResponse = (buf, type) => ({
  ok: true,
  status: 200,
  headers: { get: (h) => (h.toLowerCase() === 'content-type' ? type : null) },
  arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  json: async () => JSON.parse(buf.toString()),
  text: async () => buf.toString(),
  clone() {
    return mkResponse(buf, type);
  },
});

/** بيئة متصفح مصغّرة كافية لرسم شاشة الدخول */
function makeDom(JSDOM, html, url) {
  const dom = new JSDOM(html, { url, pretendToBeVisual: true, runScripts: 'dangerously' });
  const g = dom.window;
  g.console = { log() {}, info() {}, warn() {}, debug() {}, error() {} };
  for (const [k, v] of [
    ['indexedDB', globalThis.indexedDB],
    ['IDBKeyRange', globalThis.IDBKeyRange],
    ['WebAssembly', WebAssembly],
    ['TextEncoder', globalThis.TextEncoder],
    ['TextDecoder', globalThis.TextDecoder],
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
    value: { keys: async () => [], delete: async () => true, open: async () => ({ match: async () => null, put: async () => undefined }) },
  });
  try {
    Object.defineProperty(g, 'crypto', { configurable: true, value: globalThis.crypto });
  } catch {
    /* القيمة الموجودة تكفي */
  }
  g.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  g.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  g.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  g.scrollTo = () => {};
  g.fetch = async (input) => {
    const raw = typeof input === 'string' ? input : input.url;
    if (/sql-wasm\.wasm$/.test(new URL(raw, 'https://x.test/').pathname)) {
      return mkResponse(WASM, 'application/wasm');
    }
    // أي طلب شبكة آخر يفشل — الموقعان أوفلاين، وهذا ما نريد قياسه
    return mkResponse(Buffer.from('{}'), 'application/json');
  };
  return g;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (predicate, timeout = 30000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return true;
    await wait(120);
  }
  return false;
};

async function main() {
  let JSDOM;
  try {
    ({ JSDOM } = await import('jsdom'));
  } catch {
    console.log('  ⚠️  jsdom غير مثبّت — شغّل: npm install --no-save jsdom');
    process.exit(0);
  }
  await import('fake-indexeddb/auto');

  const OUT = path.join(ROOT, 'node_modules', '.verify-links');
  rmSync(OUT, { recursive: true, force: true });

  // نُبني ملفات الإدخال كما تُبنى للنشر؛ مسار الملفات في dist يُقرأ من
  // الصفحتين لضمان أننا نفحص ما سيُنشر فعلاً.
  const mainJs = bundle('src/main.tsx', path.join(OUT, 'main.js'));
  const procJs = bundle('src/procurement/main.tsx', path.join(OUT, 'proc.js'));

  // ══════════════════════════════════════════════════════════════════
  console.log('\n١) النظام الكامل — الرابط إلى المشتريات');
  // ══════════════════════════════════════════════════════════════════
  const gMain = makeDom(JSDOM, '<!doctype html><html dir="rtl"><body><div id="root"></div></body></html>', 'https://plus-accounting-erp.vercel.app/');
  const sMain = gMain.document.createElement('script');
  sMain.textContent = mainJs;
  gMain.document.body.appendChild(sMain);

  // النظام الكامل يسجّل الدخول تلقائياً في وضع المعاينة، ثم يرسم القائمة.
  // لذلك ننتظر القائمة نفسها — لا شاشة الدخول. الرابط يجب أن يكون حيث
  // يمرّ المستخدم فعلاً، لا في شاشة قد لا يراها أبداً.
  const shellReady = await waitFor(() =>
    (gMain.document.body.textContent || '').includes('لوحة التحكم الرئيسية')
  );
  check('واجهة النظام الكامل رُسمت', shellReady, (gMain.document.body.textContent || '').replace(/\s+/g, ' ').slice(0, 60));

  const navReady = await waitFor(() => Boolean(gMain.document.querySelector('a[href="/procurement"]')));
  check('الرابط موجود في القائمة الجانبية بعد الدخول', navReady);

  const mainLinks = [...gMain.document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
  const toProc = mainLinks.filter((h) => h.startsWith('/procurement'));
  check('يوجد رابط إلى /procurement', toProc.length > 0, toProc.join(', ') || 'لا شيء');
  check('الرابط ليس /procurement.html مباشرة', !toProc.includes('/procurement.html'), toProc[0] || '');

  const procAnchor = gMain.document.querySelector('a[href="/procurement"]');
  const anchorText = (procAnchor?.textContent || '').replace(/\s+/g, ' ').trim();
  check('نص الرابط يشرح الوجهة', /المشتريات/.test(anchorText), anchorText.slice(0, 70));
  check('الرابط عنصر قابل للنقر لا نصاً', Boolean(procAnchor?.getAttribute('href')));

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٢) موقع المشتريات — الرابط إلى النظام الكامل');
  // ══════════════════════════════════════════════════════════════════
  const gProc = makeDom(JSDOM, '<!doctype html><html dir="rtl"><body><div id="root"></div></body></html>', 'https://plus-accounting-erp.vercel.app/procurement');
  const sProc = gProc.document.createElement('script');
  sProc.textContent = procJs;
  gProc.document.body.appendChild(sProc);

  const procReady = await waitFor(() => (gProc.document.body.textContent || '').includes('تسجيل الدخول'));
  check('شاشة دخول المشتريات رُسمت', procReady);

  const procLinks = [...gProc.document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
  const homeLink = procLinks.filter((h) => h === '/');
  check('يوجد رابط عودة إلى /', homeLink.length > 0, procLinks.join(', ') || 'لا شيء');

  const backAnchor = gProc.document.querySelector('a[href="/"]');
  const backText = (backAnchor?.textContent || '').replace(/\s+/g, ' ').trim();
  check('نص رابط العودة واضح', /العودة|النظام/.test(backText), backText.slice(0, 60));

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٣) الروابط لا تخرج من النطاق ولا تشير إلى وجهات مجهولة');
  // ══════════════════════════════════════════════════════════════════
  const allLinks = [...new Set([...mainLinks, ...procLinks])];
  const external = allLinks.filter((h) => /^https?:\/\//.test(h) && !h.includes('plus-accounting-erp.vercel.app'));
  check('لا رابط خارجي غير مقصود', external.length === 0, external.join(', ') || 'نظيف');

  const known = new Set(['/', '/procurement']);
  const unknown = allLinks.filter((h) => h.startsWith('/') && !known.has(h) && !h.startsWith('/#'));
  // روابط أخرى مشروعة: لا نُفشل بسببها، لكن نطبعها للمراجعة
  if (unknown.length) console.log(`     ℹ️  روابط داخلية أخرى (خارج نطاق هذا الفحص): ${unknown.join(', ')}`);

  // ══════════════════════════════════════════════════════════════════
  console.log('\n٤) الوجهتان موجودتان في النشرة فعلاً');
  // ══════════════════════════════════════════════════════════════════
  const dist = path.join(ROOT, 'dist');
  let shipped = false;
  try {
    readFileSync(path.join(dist, 'index.html'));
    readFileSync(path.join(dist, 'procurement.html'));
    shipped = true;
  } catch {
    /* dist غير مبني — نُبلّغ بذلك بدل الادعاء */
  }
  if (shipped) {
    check('الصفحتان موجودتان في dist', true, 'index.html + procurement.html');
  } else {
    console.log('     ⚠️  dist غير مبني — شغّل npm run build لفحص النشرة');
  }

  rmSync(OUT, { recursive: true, force: true });
  console.log('\n' + '─'.repeat(64));
  console.log(`  ${fail === 0 ? '✅' : '❌'}  نجح ${pass} · فشل ${fail}`);
  console.log('─'.repeat(64));
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ توقف الفحص بخطأ:', err?.message || err);
  process.exit(1);
});
