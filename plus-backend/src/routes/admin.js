const fs = require('node:fs');
const express = require('express');
const { hashPassword, requireAdminPortal, logAudit } = require('../auth');
const { SCHEMA_PATH, seedDatabase } = require('../db');
const { round2, runInTransaction, postJournalEntryRaw } = require('../accountingEngine');

module.exports = function createAdminRouter(db, authenticate) {
  const router = express.Router();
  router.use(authenticate);
  router.use(requireAdminPortal);

  router.get('/overview', (_req, res) => {
    const tableMeta = [
      { table: 'account_main_groups', label: 'المجموعات الرئيسية للحسابات', category: 'Master' },
      { table: 'account_sub_groups', label: 'المجموعات الفرعية للحسابات', category: 'Master' },
      { table: 'accounts', label: 'دليل الحسابات (المستوى 3)', category: 'Master' },
      { table: 'item_groups', label: 'مجموعات الأصناف', category: 'Master' },
      { table: 'items', label: 'البيانات الأساسية للأصناف', category: 'Master' },
      { table: 'customers', label: 'البيانات الأساسية للعملاء', category: 'Master' },
      { table: 'suppliers', label: 'البيانات الأساسية للموردين', category: 'Master' },
      { table: 'departments', label: 'الإدارات والأقسام', category: 'Master' },
      { table: 'employees', label: 'بيانات العاملين (HR)', category: 'Master' },
      { table: 'bank_accounts', label: 'حسابات البنوك', category: 'Master' },
      { table: 'journal_entries', label: 'رأس قيود اليومية', category: 'Transaction' },
      { table: 'journal_entry_lines', label: 'تفاصيل قيود اليومية', category: 'Transaction' },
      { table: 'treasury_vouchers', label: 'سندات القبض والصرف والشيكات', category: 'Transaction' },
      { table: 'sales_invoices', label: 'فواتير البيع', category: 'Transaction' },
      { table: 'sales_invoice_items', label: 'تفاصيل فواتير البيع', category: 'Transaction' },
      { table: 'sales_returns', label: 'إشعارات رد المبيعات', category: 'Transaction' },
      { table: 'customer_transactions', label: 'حركة العملاء والمتحصلات', category: 'Transaction' },
      { table: 'purchase_orders', label: 'أوامر التوريد', category: 'Transaction' },
      { table: 'purchase_invoices', label: 'فواتير الشراء', category: 'Transaction' },
      { table: 'purchase_returns', label: 'إشعارات رد المشتريات', category: 'Transaction' },
      { table: 'supplier_transactions', label: 'حركة الموردين والمدفوعات', category: 'Transaction' },
      { table: 'stock_additions', label: 'أذون الإضافة للمخزن', category: 'Transaction' },
      { table: 'stock_issues', label: 'أذون الصرف من المخزن', category: 'Transaction' },
      { table: 'item_movements', label: 'بطاقات حركة الأصناف', category: 'Transaction' },
      { table: 'attendance_records', label: 'الحضور والانصراف اليومي', category: 'Transaction' },
      { table: 'monthly_payrolls', label: 'المستحقات الشهرية للأجور', category: 'Transaction' },
      { table: 'users', label: 'مستخدمو النظام', category: 'Governance' },
      { table: 'roles', label: 'الأدوار والصلاحيات', category: 'Governance' },
      { table: 'fiscal_periods', label: 'الفترات المالية', category: 'Governance' },
      { table: 'audit_logs', label: 'سجل الرقابة والمراجعة', category: 'Governance' },
    ].map((t) => ({
      ...t,
      row_count: db.prepare(`SELECT COUNT(*) AS c FROM ${t.table}`).get().c,
    }));

    const je = db.prepare(`SELECT COALESCE(SUM(debit), 0) AS d, COALESCE(SUM(credit), 0) AS c FROM journal_entry_lines`).get();
    const company = db.prepare(`SELECT * FROM company_settings WHERE id = 1`).get();
    const activeUsers = db.prepare(`SELECT COUNT(*) AS c FROM users WHERE is_active = 1`).get().c;
    const totalUsers = db.prepare(`SELECT COUNT(*) AS c FROM users`).get().c;
    const openPeriods = db.prepare(`SELECT COUNT(*) AS c FROM fiscal_periods WHERE status = 'مفتوحة'`).get().c;
    const recentLogs = db.prepare(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT 10`).all();

    res.json({
      company,
      stats: {
        total_tables: tableMeta.length,
        total_records: tableMeta.reduce((s, x) => s + x.row_count, 0),
        active_users: activeUsers,
        total_users: totalUsers,
        open_periods: openPeriods,
        journal_balanced: Math.abs(je.d - je.c) < 0.01,
        total_journal_volume: round2(je.d),
      },
      tableMeta,
      recentLogs,
    });
  });

  // المستخدمون
  router.get('/users', (_req, res) => {
    const users = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.email, u.role_code, u.is_admin_portal_allowed,
             u.is_active, u.last_login, u.created_at, r.role_name
      FROM users u
      JOIN roles r ON r.role_code = u.role_code
      ORDER BY u.id ASC
    `).all();
    res.json({ users });
  });

  router.post('/users', (req, res) => {
    const { username, full_name, email, password, role_code, is_admin_portal_allowed = false } = req.body || {};
    if (!username || !full_name || !password || !role_code) {
      return res.status(400).json({ error: 'اسم المستخدم والاسم الكامل وكلمة المرور والدور الوظيفي مطلوبة' });
    }
    try {
      db.prepare(`
        INSERT INTO users (username, full_name, email, password_hash, role_code, is_admin_portal_allowed, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(username.trim(), full_name.trim(), email || `${username}@plus-accounting.app`, hashPassword(password), role_code, is_admin_portal_allowed ? 1 : 0);

      logAudit(db, {
        username: req.user.username,
        user_role: req.user.role_code,
        portal: 'ADMIN',
        module: 'إدارة المستخدمين',
        action: 'إنشاء حساب مستخدم',
        entity_id: username,
        details: `${full_name} (${role_code})`,
      });
      res.status(201).json({ message: 'تم إنشاء حساب المستخدم بنجاح' });
    } catch (err) {
      res.status(400).json({ error: err.message.includes('UNIQUE') ? 'اسم المستخدم مسجل بالفعل' : err.message });
    }
  });

  router.put('/users/:id', (req, res) => {
    const { full_name, email, role_code, is_admin_portal_allowed, is_active, new_password } = req.body || {};
    const target = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id);
    if (!target) return res.status(404).json({ error: 'المستخدم غير موجود' });

    if (target.username === 'admin' && is_active === false) {
      return res.status(400).json({ error: 'لا يمكن تعطيل الحساب الرئيسي لمدير النظام (admin)' });
    }

    db.prepare(`
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          email = COALESCE(?, email),
          role_code = COALESCE(?, role_code),
          is_admin_portal_allowed = COALESCE(?, is_admin_portal_allowed),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      full_name,
      email,
      role_code,
      is_admin_portal_allowed !== undefined ? (is_admin_portal_allowed ? 1 : 0) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      req.params.id
    );

    if (new_password && String(new_password).trim().length >= 4) {
      db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashPassword(new_password), req.params.id);
    }

    logAudit(db, {
      username: req.user.username,
      user_role: req.user.role_code,
      portal: 'ADMIN',
      module: 'إدارة المستخدمين',
      action: 'تحديث صلاحيات/حالة مستخدم',
      entity_id: target.username,
      details: `الدور: ${role_code || target.role_code}`,
    });
    res.json({ message: 'تم تحديث بيانات وصلاحيات المستخدم بنجاح' });
  });

  // الأدوار ومصفوفة الصلاحيات
  router.get('/roles', (_req, res) => {
    const roles = db.prepare(`SELECT * FROM roles ORDER BY role_code`).all().map((r) => ({
      ...r,
      permissions: JSON.parse(r.permissions_json || '{}'),
    }));
    res.json({ roles });
  });

  router.post('/roles', (req, res) => {
    const { role_code, role_name, description = '', permissions = {} } = req.body || {};
    if (!role_code || !role_name) return res.status(400).json({ error: 'كود واسم الدور مطلوبان' });
    try {
      db.prepare(`INSERT INTO roles VALUES (?, ?, ?, ?)`).run(
        role_code.trim().toUpperCase(),
        role_name.trim(),
        description,
        JSON.stringify(permissions)
      );
      res.status(201).json({ message: 'تمت إضافة الدور الوظيفي بنجاح' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.put('/roles/:code', (req, res) => {
    const { role_name, description, permissions } = req.body || {};
    const existing = db.prepare(`SELECT * FROM roles WHERE role_code = ?`).get(req.params.code);
    if (!existing) return res.status(404).json({ error: 'الدور غير موجود' });

    db.prepare(`
      UPDATE roles
      SET role_name = COALESCE(?, role_name),
          description = COALESCE(?, description),
          permissions_json = COALESCE(?, permissions_json)
      WHERE role_code = ?
    `).run(
      role_name,
      description,
      permissions ? JSON.stringify(permissions) : null,
      req.params.code
    );

    logAudit(db, {
      username: req.user.username,
      user_role: req.user.role_code,
      portal: 'ADMIN',
      module: 'مصفوفة الصلاحيات',
      action: 'تعديل صلاحيات دور وظيفي',
      entity_id: req.params.code,
      details: role_name || existing.role_name,
    });
    res.json({ message: 'تم حفظ مصفوفة الصلاحيات الجديدة بنجاح' });
  });

  // إعدادات المنشأة والنطاقات المستقلة (Domains)
  router.put('/company-domains', (req, res) => {
    const {
      company_name, commercial_reg, tax_number, address, city, phone, email,
      currency, fiscal_year, frontend_domain, admin_domain, api_domain,
    } = req.body || {};

    db.prepare(`
      UPDATE company_settings
      SET company_name = COALESCE(?, company_name),
          commercial_reg = COALESCE(?, commercial_reg),
          tax_number = COALESCE(?, tax_number),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          currency = COALESCE(?, currency),
          fiscal_year = COALESCE(?, fiscal_year),
          frontend_domain = COALESCE(?, frontend_domain),
          admin_domain = COALESCE(?, admin_domain),
          api_domain = COALESCE(?, api_domain),
          updated_at = datetime('now')
      WHERE id = 1
    `).run(
      company_name, commercial_reg, tax_number, address, city, phone, email,
      currency, fiscal_year, frontend_domain, admin_domain, api_domain
    );

    logAudit(db, {
      username: req.user.username,
      user_role: req.user.role_code,
      portal: 'ADMIN',
      module: 'إعدادات النطاقات والمنشأة',
      action: 'تحديث إعدادات الدومين والمنشأة',
      entity_id: 'DOMAINS',
      details: `${frontend_domain || ''} | ${admin_domain || ''}`,
    });

    res.json({
      message: 'تم حفظ إعدادات المنشأة والنطاقات المستقلة بنجاح',
      company: db.prepare(`SELECT * FROM company_settings WHERE id = 1`).get(),
    });
  });

  // الفترات المالية وإقفال وترحيل الأرصدة الختامية إلى أرصدة افتتاحية
  router.get('/fiscal-periods', (_req, res) => {
    const periods = db.prepare(`SELECT * FROM fiscal_periods ORDER BY period_id DESC`).all();
    res.json({ periods });
  });

  router.post('/fiscal-periods/close-rollover', (req, res) => {
    const { period_id = 'FY-2026', next_period_id = 'FY-2027', next_period_name = 'السنة المالية 2027' } = req.body || {};

    try {
      const result = runInTransaction(db, () => {
        const period = db.prepare(`SELECT * FROM fiscal_periods WHERE period_id = ?`).get(period_id);
        if (!period) throw new Error('الفترة المالية المحددة غير موجودة');
        if (period.status === 'مقفلة') throw new Error('هذه الفترة المالية مقفلة ومرحّلة مسبقاً');

        // حساب صافي حركة حسابات الإيرادات والمصروفات لإقفالها في الأرباح المحتجزة (2302)
        const incomeExpenseAccs = db.prepare(`
          SELECT a.account_code, a.account_name, mg.main_group_code,
                 COALESCE(SUM(jl.debit), 0) AS d,
                 COALESCE(SUM(jl.credit), 0) AS c
          FROM accounts a
          JOIN account_sub_groups sg ON sg.sub_group_code = a.sub_group_code
          JOIN account_main_groups mg ON mg.main_group_code = sg.main_group_code
          LEFT JOIN journal_entry_lines jl ON jl.account_code = a.account_code
          WHERE mg.main_group_code IN ('3', '4')
          GROUP BY a.account_code
        `).all();

        const closingLines = [];
        let totalRev = 0;
        let totalExp = 0;

        for (const acc of incomeExpenseAccs) {
          const net = round2(acc.c - acc.d); // موجب = رصيد دائن (إيراد)، سالب = رصيد مدين (مصروف)
          if (Math.abs(net) < 0.01) continue;
          if (net > 0) {
            totalRev = round2(totalRev + net);
            closingLines.push({ account_code: acc.account_code, debit: net, credit: 0, notes: `إقفال حساب ${acc.account_name}` });
          } else {
            const absExp = Math.abs(net);
            totalExp = round2(totalExp + absExp);
            closingLines.push({ account_code: acc.account_code, debit: 0, credit: absExp, notes: `إقفال حساب ${acc.account_name}` });
          }
        }

        const netIncome = round2(totalRev - totalExp);
        let closingEntryNo = 'NO-MOVEMENT';

        if (closingLines.length > 0) {
          if (netIncome > 0) {
            closingLines.push({ account_code: '2302', debit: 0, credit: netIncome, notes: `ترحيل صافي ربح الفترة (${period_id}) إلى الأرباح المحتجزة` });
          } else if (netIncome < 0) {
            closingLines.push({ account_code: '2302', debit: Math.abs(netIncome), credit: 0, notes: `ترحيل صافي خسارة الفترة (${period_id})` });
          }

          const je = postJournalEntryRaw(db, {
            entry_date: period.end_date,
            reference_type: 'قيد إقفال وترحيل ختامي',
            reference_no: period_id,
            description: `قيد إقفال حسابات النتيجة وترحيل الأرصدة الختامية للفترة ${period.period_name}`,
            lines: closingLines,
            period_id,
            created_by: req.user.username,
          });
          closingEntryNo = je.entry_number;
        }

        db.prepare(`
          UPDATE fiscal_periods
          SET status = 'مقفلة', closed_at = datetime('now'), closed_by = ?, closing_entry_no = ?, net_income = ?
          WHERE period_id = ?
        `).run(req.user.username, closingEntryNo, netIncome, period_id);

        const nextYear = parseInt(String(next_period_id).replace(/\D/g, ''), 10) || 2027;
        const existsNext = db.prepare(`SELECT period_id FROM fiscal_periods WHERE period_id = ?`).get(next_period_id);
        if (!existsNext) {
          db.prepare(`
            INSERT INTO fiscal_periods (period_id, period_name, start_date, end_date, status)
            VALUES (?, ?, ?, ?, 'مفتوحة')
          `).run(next_period_id, next_period_name, `${nextYear}-01-01`, `${nextYear}-12-31`);
        }

        db.prepare(`UPDATE company_settings SET fiscal_year = ? WHERE id = 1`).run(nextYear);

        return { closed_period: period_id, next_period: next_period_id, closing_entry_no: closingEntryNo, net_income: netIncome };
      });

      logAudit(db, {
        username: req.user.username,
        user_role: req.user.role_code,
        portal: 'ADMIN',
        module: 'إقفال الفترات المالية',
        action: 'إقفال وترحيل فترة مالية',
        entity_id: period_id,
        details: `قيد الإقفال: ${result.closing_entry_no} — صافي النتيجة المرحلة: ${result.net_income}`,
      });

      res.json({
        message: 'تم إقفال الفترة المالية وترحيل صافي النتيجة والأرصدة الختامية بنجاح',
        ...result,
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // مستكشف مخطط قاعدة البيانات (SQL Schema & ER Relationships)
  router.get('/schema', (_req, res) => {
    const sqlText = fs.readFileSync(SCHEMA_PATH, 'utf8');
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name
    `).all().map((t) => {
      const columns = db.prepare(`PRAGMA table_info(${t.name})`).all();
      const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${t.name})`).all();
      const rowCount = db.prepare(`SELECT COUNT(*) AS c FROM ${t.name}`).get().c;
      return { name: t.name, row_count: rowCount, columns, foreignKeys };
    });

    res.json({ sql: sqlText, tables });
  });

  // النسخ الاحتياطي وإعادة الضبط التجريبي
  router.get('/backup', (req, res) => {
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name
    `).all();
    const snapshot = {};
    for (const t of tables) {
      snapshot[t.name] = db.prepare(`SELECT * FROM ${t.name}`).all();
    }
    logAudit(db, {
      username: req.user.username,
      user_role: req.user.role_code,
      portal: 'ADMIN',
      module: 'النسخ الاحتياطي',
      action: 'تصدير نسخة احتياطية كاملة',
      entity_id: new Date().toISOString().slice(0, 10),
      details: `شملت ${tables.length} جدولاً`,
    });
    res.json({
      exported_at: new Date().toISOString(),
      application: 'Plus Accounting ERP',
      tables_count: tables.length,
      data: snapshot,
    });
  });

  router.post('/reset-demo', (req, res) => {
    seedDatabase(db);
    logAudit(db, {
      username: req.user.username,
      user_role: req.user.role_code,
      portal: 'ADMIN',
      module: 'قاعدة البيانات',
      action: 'إعادة تهيئة البيانات التأسيسية',
      entity_id: 'SEED-RESET',
      details: 'تمت استعادة البيانات القياسية المتوازنة للنظام',
    });
    res.json({ message: 'تمت إعادة تهيئة قاعدة البيانات بالبيانات القياسية المتوازنة بنجاح' });
  });

  router.get('/audit-logs', (req, res) => {
    const { portal } = req.query;
    let sql = `SELECT * FROM audit_logs`;
    const params = [];
    if (portal && ['ERP', 'ADMIN'].includes(portal)) {
      sql += ` WHERE portal = ?`;
      params.push(portal);
    }
    sql += ` ORDER BY id DESC LIMIT 150`;
    res.json({ logs: db.prepare(sql).all(...params) });
  });

  return router;
};
