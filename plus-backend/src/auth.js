const crypto = require('node:crypto');

const SECRET = process.env.PLUS_JWT_SECRET || 'plus-erp-royal-gold-secret-2026-x99';

function hashPassword(password) {
  return crypto.createHmac('sha256', SECRET).update(String(password)).digest('hex');
}

function signToken(payload) {
  const data = {
    ...payload,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function createAuthMiddleware(db) {
  return function authenticate(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'يرجى تسجيل الدخول أولاً للوصول إلى النظام' });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول' });
    }
    const user = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.email, u.role_code, u.is_admin_portal_allowed, u.is_active,
             r.role_name, r.permissions_json
      FROM users u
      JOIN roles r ON r.role_code = u.role_code
      WHERE u.id = ?
    `).get(decoded.id);

    if (!user || !user.is_active) {
      return res.status(403).json({ error: 'هذا الحساب غير نشط أو تم إيقافه من قبل مدير النظام' });
    }
    user.permissions = JSON.parse(user.permissions_json || '{}');
    req.user = user;
    next();
  };
}

function requirePermission(moduleKey, actionKey = 'view') {
  return function checkPerm(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    if (req.user.role_code === 'SUPER_ADMIN') {
      return next();
    }
    const modPerms = req.user.permissions?.[moduleKey];
    if (!modPerms || !modPerms[actionKey]) {
      return res.status(403).json({
        error: `ليس لديك صلاحية (${actionKey}) على وحدة (${moduleKey}). يرجى مراجعة مدير النظام.`,
      });
    }
    next();
  };
}

function requireAdminPortal(req, res, next) {
  if (!req.user || (!req.user.is_admin_portal_allowed && req.user.role_code !== 'SUPER_ADMIN')) {
    return res.status(403).json({
      error: 'هذه البوابة مخصصة لمديري النظام (Plus Administrator) فقط',
    });
  }
  next();
}

function logAudit(db, { username = 'النظام', user_role = '', portal = 'ERP', module, action, entity_id = '', details = '' }) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (username, user_role, portal, module, action, entity_id, details)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(username, user_role, portal, module, action, String(entity_id || ''), String(details || ''));
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = {
  hashPassword,
  signToken,
  verifyToken,
  createAuthMiddleware,
  requirePermission,
  requireAdminPortal,
  logAudit,
};
