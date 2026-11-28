const express = require('express');
const cors = require('cors');
const { openDatabase, IS_SERVERLESS } = require('./db');
const { driverName } = require('./libsql-adapter');
const { createAuthMiddleware } = require('./auth');
const { landingPage } = require('./landing');

const createAuthRouter = require('./routes/auth');
const createMasterRouter = require('./routes/master');
const createTransactionsRouter = require('./routes/transactions');
const createReportsRouter = require('./routes/reports');
const createAdminRouter = require('./routes/admin');
const createChangeRequestRouter = require('./changeRequests');

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';

const db = openDatabase();
const authenticate = createAuthMiddleware(db);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));

// بعض بيئات الاستضافة (Vercel Serverless) تعيد كتابة المسار إلى مسار ملف الدالة
// (مثل /api/index.js) بدلاً من المسار الأصلي. نُعيد المسار الأصلي حتى تعمل كل المسارات.
app.use((req, _res, next) => {
  const prefixes = ['/api/index.js', '/api/index', '/index.js'];
  for (const prefix of prefixes) {
    if (req.url === prefix || req.url.startsWith(`${prefix}?`)) {
      req.url = '/' + (req.url.slice(prefix.length) || '');
      break;
    }
    if (req.url.startsWith(`${prefix}/`)) {
      req.url = req.url.slice(prefix.length);
      break;
    }
  }
  if (!req.url.startsWith('/')) req.url = `/${req.url}`;
  next();
});

// الصفحة التعريفية لخادم الـ API المستقل (واجهة HTML سوداء وذهبية)
app.get('/', (_req, res) => {
  const company = db.prepare(`SELECT company_name, fiscal_year, frontend_domain, admin_domain, api_domain FROM company_settings WHERE id = 1`).get();
  res.type('html').send(landingPage({ company, health: { ok: true } }));
});

// بيانات الخدمة بصيغة JSON (للاستخدام البرمجي والمراقبة)
app.get('/api/info', (_req, res) => {
  const company = db.prepare(`SELECT company_name, fiscal_year, frontend_domain, admin_domain, api_domain FROM company_settings WHERE id = 1`).get();
  res.json({
    service: 'Plus Accounting ERP — Standalone Backend API',
    brand: 'المحاسبي Plus',
    status: 'online',
    version: '1.0.0',
    company,
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      master_files: '/api/master/*',
      transactions: '/api/transactions/*',
      reports: '/api/reports/*',
      administrator: '/api/admin/*',
    },
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'plus-erp-backend',
    storage: db.isRemote ? 'turso' : 'local-sqlite',
    driver: driverName,
    persistent: db.isRemote || !IS_SERVERLESS,
    timestamp: new Date().toISOString(),
  });
});

/**
 * دفع التغييرات إلى Turso فوراً بعد أي عملية كتابة.
 *
 * السبب: كل قراءة وكتابة تحصل على الملف المحلي (سريع ومتزامن كما هو الكود)،
 * ثم ننسخ النسخة إلى السحابة بعد انتهاء رد الطلب — فيبقى الرد سريعاً
 * والبيانات مقيمة على Turso حتى لو أُعيد تشغيل السيرفر أو تبدّلت النسخة.
 *
 * الفشل هنا لا يُفشل الطلب: التغيير محفوظ محلياً على أي حال.
 */
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' || !db.isRemote) return next();
  res.on('finish', () => {
    if (res.statusCode < 400) {
      db.sync().catch(() => {});
    }
  });
  next();
});

app.use('/api/auth', createAuthRouter(db, authenticate));
app.use('/api/master', createMasterRouter(db, authenticate));
app.use('/api/transactions', createTransactionsRouter(db, authenticate));
app.use('/api/reports', createReportsRouter(db, authenticate));
app.use('/api/admin', createAdminRouter(db, authenticate));

// طلبات التعديل على البيانات الرئيسية — (ج) تعديلات بموافقة المدير.
//
// البيانات الرئيسية تُعدَّل عبر طلب يراجعه مدير النظام، لا مباشرة. السبب:
// تعديل سعر تكلفة صنف أو حدّ ائتمان عميل يؤثر بأثر رجعي في كل تقرير لاحق،
// ولا يُنتج قيداً محاسبياً — أي أنه يحدث صامتاً بلا أثر في ميزان المراجعة.
//
// requireSuperAdmin يُحقن من هنا لأن admin.js يحتفظ بنسخته الخاصة؛ نستخدم
// نفس الشرط بالحرف حتى لا ينحرف تعريف "مدير" بين الوحدتين.
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role_code !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'اعتماد أو رفض طلبات التعديل يقتصر على مدير النظام الأعلى (SUPER_ADMIN).',
    });
  }
  next();
};
app.use(
  '/api/change-requests',
  createChangeRequestRouter(db, authenticate, {
    requirePermission: require('./auth').requirePermission,
    requireSuperAdmin,
  })
);

app.use((err, _req, res, _next) => {
  console.error('Unhandled API error:', err);
  res.status(err.status || 500).json({ error: err.message || 'حدث خطأ غير متوقع في الخادم' });
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`[Plus ERP Backend] Listening on http://${HOST}:${PORT}`);
  });
}

module.exports = app;
