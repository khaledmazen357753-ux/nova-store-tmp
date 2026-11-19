const express = require('express');
const cors = require('cors');
const { openDatabase } = require('./db');
const { createAuthMiddleware } = require('./auth');

const createAuthRouter = require('./routes/auth');
const createMasterRouter = require('./routes/master');
const createTransactionsRouter = require('./routes/transactions');
const createReportsRouter = require('./routes/reports');
const createAdminRouter = require('./routes/admin');

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

// الصفحة التعريفية لخادم الـ API المستقل
app.get('/', (_req, res) => {
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
    timestamp: new Date().toISOString(),
  });
});

// نقطة تشخيص مؤقتة لتتبع المسارات على بيئات الاستضافة
app.get('/api/_debug', (req, res) => {
  res.json({
    url: req.url,
    originalUrl: req.originalUrl,
    path: req.path,
    host: req.headers.host,
    vercel: Boolean(process.env.VERCEL),
  });
});

app.use('/api/auth', createAuthRouter(db, authenticate));
app.use('/api/master', createMasterRouter(db, authenticate));
app.use('/api/transactions', createTransactionsRouter(db, authenticate));
app.use('/api/reports', createReportsRouter(db, authenticate));
app.use('/api/admin', createAdminRouter(db, authenticate));

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
