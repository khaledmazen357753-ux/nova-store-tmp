/**
 * اختبار منطق Service Worker في بيئة محاكاة.
 *
 * السبب: العطل الذي منع النظام من فتح إطلاقاً كان *في* الـ SW لا في الكود
 * المحاسبي. رد SPA توجيه index.html لمسار الـ wasm، وخزّنه الـ SW بلا فحص
 * لأن حالته 200. فبقي الملف الفاسد يُقدَّم للأبد ولا شيء يشتكي.
 *
 * هذه الفحوصات تمنع عودة ذلك: لا يُخزَّن رد ليس WebAssembly، والكاش
 * التالف يُشفى ذاتياً بدل أن يحبس المستخدم للأبد.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(HERE, '..', 'public', 'sw.js'), 'utf8');
const WASM = new Uint8Array([0x00,0x61,0x73,0x6d,0x01,0x00,0x00,0x00,0x99]);
const HTML = new TextEncoder().encode('<!doctype html><html>spa fallback</html>');

let pass=0, fail=0;
const check=(n,c,d='')=>{ if(c){pass++;console.log(`  ✅ ${n}${d?` — ${d}`:''}`)}else{fail++;console.log(`  ❌ ${n}${d?` — ${d}`:''}`)} };

function makeEnv(network) {
  const store = new Map();
  // مفتاح موحّد: المسار فقط — مطابق لسلوك Cache API الحقيقي
  const keyOf = (req) => {
    const u = typeof req==='string'? req : req.url;
    try { return new URL(u, 'https://app.test').pathname; } catch { return u; }
  };
  const cache = {
    async put(req, res){ store.set(keyOf(req), {bytes:new Uint8Array(await res.clone().arrayBuffer()), ok:res.ok}); },
    async match(req){ const k=keyOf(req); const e=store.get(k);
      return e ? new Response(e.bytes, {status: e.ok?200:404}) : undefined; },
    async delete(req){ return store.delete(keyOf(req)); },
    async add(req){ const res=await networkFetch(req); if(res.ok) await this.put(req,res); }
  };
  const handlers = {};
  const self = {
    location: { origin: 'https://app.test' },
    addEventListener: (t,f)=>{ handlers[t]=f; },
    skipWaiting: async()=>{},
    clients: { claim: async()=>{} },
  };
  const networkFetch = async (req) => {
    const url = typeof req==='string'?req:req.url;
    const body = network(url);
    if (body === null) return new Response('nf',{status:404});
    return new Response(body, {status:200});
  };
  const ctx = vm.createContext({
    self, caches: { open: async()=>cache, keys: async()=>['plus-erp-v1-shell'], delete: async()=>true },
    fetch: networkFetch, Response, URL, Promise, console, Uint8Array, TextEncoder,
    Request: class { constructor(u){ this.url=u; this.method='GET'; } },
  });
  vm.runInContext(src, ctx);
  return { handlers, store, cache };
}

// ── ١) لو الشبكة ترجع HTML لمسار wasm (العطل الأصلي) لا يُخزَّن ──
{
  const net = (u) => u.includes('sql-wasm.wasm') ? HTML : '<html>ok</html>';
  const env = makeEnv(net);
  let waited;
  env.handlers.install({ waitUntil: (p) => { waited = p; } });
  await waited;
  const stored = env.store.get('/sql-wasm/sql-wasm.wasm');
  check('لا يُخزَّن HTML مكان الـ wasm', stored === undefined, stored ? 'خُزِّن ❌' : 'لم يُخزَّن');
}

// ── ٢) لو الشبكة ترجع wasm حقيقي يُخزَّن ──
{
  const net = (u) => u.includes('sql-wasm.wasm') ? WASM : '<html>ok</html>';
  const env = makeEnv(net);
  let waited;
  env.handlers.install({ waitUntil: (p) => { waited = p; } });
  await waited;
  const stored = env.store.get('/sql-wasm/sql-wasm.wasm');
  check('يُخزَّن الـ wasm السليم', stored && stored.bytes[0]===0x00 && stored.bytes[1]===0x61);
}

// ── ٣) الشفاء الذاتي: كاش تالف موجود → يُرمى ويُجلب الصحيح ──
{
  const env2 = makeEnv((u)=> u.includes('wasm') ? WASM : 'x');
  const env = makeEnv((u)=> u.includes('wasm') ? WASM : 'x');
  await env.cache.put('/sql-wasm/sql-wasm.wasm', new Response(HTML, {status:200})); // كاش فاسد
  let responded;
  env.handlers.fetch({
    request: { method:'GET', url:'https://app.test/sql-wasm/sql-wasm.wasm', mode:'cors' },
    respondWith: (p) => { responded = p; }
  });
  const res = await responded;
  const bytes = new Uint8Array(await res.arrayBuffer());
  check('الكاش التالف يُستبدل بملف wasm سليم',
    bytes[0]===0x00 && bytes[1]===0x61 && bytes[2]===0x73 && bytes[3]===0x6d,
    `أول بايت: ${bytes[0]}`);
}

// ── ٤) كاش سليم يبقى بلا شبكة (عمل أوفلاين) ──
{
  let netCalls = 0;
  const env = makeEnv((u)=>{ netCalls++; return WASM; });
  await env.cache.put('/sql-wasm/sql-wasm.wasm', new Response(WASM, {status:200}));
  netCalls = 0;
  let responded;
  env.handlers.fetch({
    request: { method:'GET', url:'https://app.test/sql-wasm/sql-wasm.wasm', mode:'cors' },
    respondWith: (p) => { responded = p; }
  });
  await responded;
  check('الكاش السليم يخدم بلا شبكة', netCalls === 0, `طلبات شبكة: ${netCalls}`);
}

// ── ٥) الإصدار تغيّر (وإلا الكاش القديم يبقى) ──
//
// لا نعلّق الفحص على رقم إصدار بعينه: كل رفع إصدار كان سيُفشل الفحص
// ويُجبر على تعديله — فيفقد الفحص معناه. الشرط الحقيقي هو أن الإصدار
// الحالي متقدّم على v1 الذي عانى منه المستخدم في عطل الـ wasm.
const versionMatch = src.match(/const VERSION = 'plus-erp-v(\d+)'/);
const currentVersion = Number(versionMatch?.[1] || 0);
check('إصدار الكاش رُفع فوق v1', currentVersion >= 2, `v${currentVersion}`);
check('لا نسخة v1 قديمة معلّقة في الملف', !/plus-erp-v1/.test(src));

console.log(`\nالنتيجة: ${pass} نجح | ${fail} فشل`);
process.exit(fail?1:0);
