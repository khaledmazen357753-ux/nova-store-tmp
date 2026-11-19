const express = require('express');
const { hashPassword, signToken, logAudit } = require('../auth');

module.exports = function createAuthRouter(db, authenticate) {
  const router = express.Router();

  router.get('/demo-accounts', (_req, res) => {
    const users = db.prepare(`
      SELECT u.username, u.full_name, u.role_code, u.is_admin_portal_allowed, r.role_name, r.description
      FROM users u
      JOIN roles r ON r.role_code = u.role_code
      WHERE u.is_active = 1
      ORDER BY u.id ASC
    `).all();
    res.json({
      accounts: users.map((u) => ({
        ...u,
        demo_hint: u.username === 'admin' ? 'admin123' : 'plus123',
      })),
    });
  });

  router.post('/login', (req, res) => {
    const { username, password, portal = 'ERP' } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
    }
    const user = db.prepare(`
      SELECT u.*, r.role_name, r.permissions_json
      FROM users u
      JOIN roles r ON r.role_code = u.role_code
      WHERE LOWER(u.username) = LOWER(?)
    `).get(String(username).trim());

    if (!user || user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة، يرجى التحقق والمحاولة مرة أخرى' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'هذا الحساب موقوف حالياً من قبل إدارة النظام' });
    }
    if (portal === 'ADMIN' && !user.is_admin_portal_allowed && user.role_code !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'ليس لديك صلاحية الدخول إلى بوابة مدير النظام المستقلة (Plus Administrator)' });
    }

    db.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`).run(user.id);

    const token = signToken({ id: user.id, username: user.username, role_code: user.role_code });
    logAudit(db, {
      username: user.username,
      user_role: user.role_code,
      portal,
      module: 'المصادقة والأمان',
      action: 'تسجيل دخول ناجح',
      entity_id: user.username,
      details: `تسجيل الدخول عبر بوابة ${portal === 'ADMIN' ? 'مدير النظام (Administrator)' : 'النظام المحاسبي (ERP)'}`,
    });

    const company = db.prepare(`SELECT * FROM company_settings WHERE id = 1`).get();

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        email: user.email,
        role_code: user.role_code,
        role_name: user.role_name,
        is_admin_portal_allowed: Boolean(user.is_admin_portal_allowed),
        permissions: JSON.parse(user.permissions_json || '{}'),
      },
      company,
    });
  });

  router.get('/me', authenticate, (req, res) => {
    const company = db.prepare(`SELECT * FROM company_settings WHERE id = 1`).get();
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        full_name: req.user.full_name,
        email: req.user.email,
        role_code: req.user.role_code,
        role_name: req.user.role_name,
        is_admin_portal_allowed: Boolean(req.user.is_admin_portal_allowed),
        permissions: req.user.permissions,
      },
      company,
    });
  });

  return router;
};
