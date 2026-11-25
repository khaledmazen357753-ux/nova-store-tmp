/**
 * يبني حزمة «العقل المحاسبي» للمتصفح من **ملفات الخادم نفسها**.
 *
 * ماذا يفعل:
 *   1. يأخذ `plus-backend/src/db.js` ويستبدل فيه `openDatabase` فقط (تحتاج
 *      fs + libsql وهما غير متاحين في المتصفح). **`seedDatabase` تُحزَّم كما
 *      هي بالحرف** — نفس بيانات الخادم.
 *   2. يحزّم `auth.js` + الراوترات الخمسة + `accountingEngine.js` مع بدائل
 *      مصغّرة لـ express و node:crypto و node:fs و node:path.
 *   3. يضمّن `sql/schema.sql` نصاً ويكتب كل شيء في
 *      `src/generated/engineBundle.ts`.
 *
 * التشغيل: node scripts/build-offline-engine.mjs
 * (يُشغَّل تلقائياً عبر predev و prebuild)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.join(HERE, '..');
const BACKEND = path.join(FRONTEND, '..', 'plus-backend');
const OUT_DIR = path.join(FRONTEND, 'src', 'generated');
const OUT_FILE = path.join(OUT_DIR, 'engineBundle.ts');

const REQUIRED = [
  'src/db.js',
  'src/auth.js',
  'src/accountingEngine.js',
  'src/routes/auth.js',
  'src/routes/master.js',
  'src/routes/transactions.js',
  'src/routes/reports.js',
  'src/routes/admin.js',
  'sql/schema.sql',
];

/* ── بديل node:crypto — نفس ناتج node:crypto بالبايت ────────────── */
const CRYPTO_SHIM = `
const api = globalThis.__PLUS_CRYPTO__;
if (!api) throw new Error('دوال التشفير لم تُحقن قبل تحميل الحزمة');

function digestOf(keyBytes, data) {
  return api.hmacSha256(keyBytes, api.utf8(String(data)));
}

export function createHmac(alg, key) {
  if (alg !== 'sha256') throw new Error('خوارزمية غير مدعومة: ' + alg);
  const keyBytes = api.utf8(String(key));
  return {
    update(data) {
      const digest = digestOf(keyBytes, data);
      return {
        digest(enc) {
          if (enc === 'hex') return api.toHex(digest);
          if (enc === 'base64url') return api.toBase64Url(digest);
          throw new Error('ترميز غير مدعوم: ' + enc);
        },
        update: () => { throw new Error('غير مدعوم'); },
      };
    },
  };
}

export function createHash(alg) {
  if (alg !== 'sha256') throw new Error('خوارزمية غير مدعومة: ' + alg);
  return {
    update(data) {
      const digest = api.sha256(api.utf8(String(data)));
      return {
        digest: (enc) => (enc === 'hex' ? api.toHex(digest) : api.toBase64Url(digest)),
      };
    },
  };
}

export function randomBytes(n) {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

export default { createHmac, createHash, randomBytes };
`;

/* ── بديل node:fs — المخطط مضمّن في الحزمة ─────────────────────── */
const FS_SHIM = `
export function readFileSync() {
  return globalThis.__PLUS_SCHEMA_SQL__ || '';
}
export function existsSync() { return true; }
export function mkdirSync() {}
export function writeFileSync() {}
export default { readFileSync, existsSync, mkdirSync, writeFileSync };
`;

/* ── بديل node:path ────────────────────────────────────────────── */
const PATH_SHIM = `
export function join(...parts) {
  return parts
    .filter((p) => p !== '' && p !== undefined && p !== null)
    .join('/')
    .replace(/\\/{2,}/g, '/');
}
export function dirname(p) {
  const s = String(p);
  const i = s.lastIndexOf('/');
  return i <= 0 ? '.' : s.slice(0, i);
}
export const sep = '/';
export default { join, dirname, sep };
`;

/* ── بديل libsql — غير قابل للاستخدام في المتصفح ───────────────── */
const LIBSQL_SHIM = `
export function createDatabase() {
  throw new Error('libsql غير متاح في المتصفح — استخدم createOfflineDb()');
}
export default { createDatabase };
`;

/** openDatabase تُستبدل: في المتصفح تُفتح القاعدة عبر sql.js */
const OPEN_DATABASE_STUB = `function openDatabase() {
  throw new Error('openDatabase() الخاصة بالخادم غير متاحة في المتصفح');
}`;

/**
 * نقطة الدخول: db.js المعدّل + وحدات الخادم المتبقية، كلها عبر require
 * الحقيقي حتى يُحزّمها esbuild من المصدر الأصلي.
 */
function entrySource(patchedDb) {
  return `
const __dbModule = (function () {
  const module = { exports: {} };
  const exports = module.exports;
${patchedDb}
  return module.exports;
})();

module.exports = {
  seedDatabase: __dbModule.seedDatabase,
  auth: require('./auth.js'),
  createAuthRouter: require('./routes/auth.js'),
  createMasterRouter: require('./routes/master.js'),
  createTransactionsRouter: require('./routes/transactions.js'),
  createReportsRouter: require('./routes/reports.js'),
  createAdminRouter: require('./routes/admin.js'),
};
`;
}

/** يعدّل db.js: يستبدل openDatabase فقط ويحول node: إلى اسم قابل للاستبدال */
function patchDbSource() {
  const src = readFileSync(path.join(BACKEND, 'src', 'db.js'), 'utf8');

  const start = src.indexOf('function openDatabase()');
  if (start === -1) throw new Error('لم أجد openDatabase في db.js');
  const end = src.indexOf('\n}\n', start);
  if (end === -1) throw new Error('لم أجد نهاية openDatabase في db.js');

  const patched = src.slice(0, start) + OPEN_DATABASE_STUB + src.slice(end + 3);

  const untouched = patched.includes('function seedDatabase(db)');
  if (!untouched) throw new Error('seedDatabase اختفت أثناء التعديل — توقف البناء');

  return patched;
}

function shimPlugin() {
  return {
    name: 'browser-shims',
    setup(b) {
      const map = [
        [/^express$/, 'express', () => 'module.exports = globalThis.__PLUS_EXPRESS__;'],
        [/^node:crypto$|^crypto$/, 'crypto', () => CRYPTO_SHIM],
        [/^node:fs$|^fs$/, 'fs', () => FS_SHIM],
        [/^node:path$|^path$/, 'path', () => PATH_SHIM],
        [/^\.\/libsql-adapter$|^libsql$/, 'libsql', () => LIBSQL_SHIM],
      ];

      for (const [filter, name] of map) {
        b.onResolve({ filter }, () => ({ path: name, namespace: 'shim' }));
      }

      b.onLoad({ filter: /.*/, namespace: 'shim' }, (args) => {
        const found = map.find(([, name]) => name === args.path);
        if (found) return { contents: found[2](), loader: 'js' };
        return {
          contents: `module.exports = new Proxy({}, { get: () => () => { throw new Error('واجهة Node غير متاحة في المتصفح'); } });`,
          loader: 'js',
        };
      });
    },
  };
}

async function main() {
  for (const rel of REQUIRED) {
    if (!existsSync(path.join(BACKEND, rel))) {
      throw new Error(`ملف مطلوب غير موجود: plus-backend/${rel}`);
    }
  }

  const schemaSql = readFileSync(path.join(BACKEND, 'sql', 'schema.sql'), 'utf8');
  const engineSrc = readFileSync(path.join(BACKEND, 'src', 'accountingEngine.js'), 'utf8');
  const patchedDb = patchDbSource();

  const result = await build({
    stdin: {
      contents: entrySource(patchedDb),
      resolveDir: path.join(BACKEND, 'src'),
      sourcefile: 'server-entry.js',
      loader: 'js',
    },
    bundle: true,
    // CJS: نغلّفه بأنفسنا في المتصفح عبر new Function('module','exports',...) 
    format: 'cjs',
    platform: 'browser',
    target: ['es2020'],
    write: false,
    legalComments: 'none',
    logLevel: 'silent',
    define: {
      'process.env.VERCEL': 'undefined',
      'process.env.AWS_LAMBDA_FUNCTION_NAME': 'undefined',
      'process.env.PLUS_DB_PATH': 'undefined',
      'process.env.PLUS_JWT_SECRET': 'undefined',
      'process.env.TURSO_DATABASE_URL': '"__OFFLINE__"',
      'process.env.TURSO_AUTH_TOKEN': '"__OFFLINE__"',
      'process.env.NODE_ENV': '"production"',
      // db.js يحسب مسار المخطط من __dirname — المخطط مضمّن، فالمسار رمزي فقط
      __dirname: '"/offline/plus-backend/src"',
      __filename: '"/offline/plus-backend/src/db.js"',
    },
    plugins: [shimPlugin()],
  });

  const bundleJs = result.outputFiles[0].text;

  const tables = (schemaSql.match(/CREATE TABLE/gi) || []).length;
  mkdirSync(OUT_DIR, { recursive: true });

  writeFileSync(
    OUT_FILE,
    `/* ═══════════════════════════════════════════════════════════════════
 * ملف مُولَّد تلقائياً — لا تعدّله يدوياً.
 *
 * المصدر: plus-backend/src/{db.js,auth.js,accountingEngine.js,routes/*.js}
 *         plus-backend/sql/schema.sql
 * التوليد: node scripts/build-offline-engine.mjs
 *
 * كل ما هنا منقول من كود الخادم الحقيقي — هذه هي الطريقة التي يعمل بها
 * «العقل المحاسبي» داخل المتصفح بلا إعادة كتابة.
 * ═══════════════════════════════════════════════════════════════════ */

/** plus-backend/sql/schema.sql — ${tables} جدول */
export const SCHEMA_SQL = ${JSON.stringify(schemaSql)};

/** plus-backend/src/accountingEngine.js — نص أصلي يُحمَّل كما هو */
export const ACCOUNTING_ENGINE_SOURCE = ${JSON.stringify(engineSrc)};

/** db.js + auth.js + الراوترات الخمسة، مبنية للمتصفح */
export const SERVER_BUNDLE = ${JSON.stringify(bundleJs)};

export const BUNDLE_META = ${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        tables,
        schemaBytes: schemaSql.length,
        engineBytes: engineSrc.length,
        bundleBytes: bundleJs.length,
      },
      null,
      2
    )};
`,
    'utf8'
  );

  const kb = (n) => `${(n / 1024).toFixed(1)} kb`;
  console.log('✅ حزمة العقل المحاسبي جاهزة');
  console.log(`   المخطط:  ${kb(schemaSql.length).padStart(9)} — ${tables} جدول`);
  console.log(`   المحرك:  ${kb(engineSrc.length).padStart(9)} (نص أصلي بلا تعديل)`);
  console.log(`   الخادم:  ${kb(bundleJs.length).padStart(9)} (db + auth + 5 راوترات)`);
  console.log(`   الناتج:  src/generated/engineBundle.ts`);
}

main().catch((err) => {
  console.error('❌ فشل بناء حزمة العقل المحاسبي:', err.message);
  process.exit(1);
});
