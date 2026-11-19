const express = require('express');
const { requirePermission, logAudit } = require('../auth');
const { computeReorderPoint, round2, runInTransaction } = require('../accountingEngine');

module.exports = function createMasterRouter(db, authenticate) {
  const router = express.Router();
  router.use(authenticate);

  // 1. بيانات الشركة
  router.get('/company', (_req, res) => {
    const company = db.prepare(`SELECT * FROM company_settings WHERE id = 1`).get();
    res.json({ company });
  });

  router.put('/company', requirePermission('master', 'edit'), (req, res) => {
    const { company_name, commercial_reg, tax_number, address, city, phone, email, currency, fiscal_year } = req.body || {};
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
          updated_at = datetime('now')
      WHERE id = 1
    `).run(company_name, commercial_reg, tax_number, address, city, phone, email, currency, fiscal_year);

    logAudit(db, {
      username: req.user.username,
      user_role: req.user.role_code,
      module: 'البيانات الأساسية',
      action: 'تحديث بيانات الشركة',
      entity_id: 'COMPANY-1',
      details: company_name || 'تعديل بيانات المنشأة',
    });
    res.json({ company: db.prepare(`SELECT * FROM company_settings WHERE id = 1`).get() });
  });

  // 2. الإدارات والأقسام
  router.get('/departments', (_req, res) => {
    const departments = db.prepare(`
      SELECT d.*, (SELECT COUNT(*) FROM employees e WHERE e.dept_code = d.dept_code) AS employee_count
      FROM departments d ORDER BY d.dept_code
    `).all();
    res.json({ departments });
  });

  router.post('/departments', requirePermission('master', 'add'), (req, res) => {
    const { dept_code, dept_name, manager_name = '', description = '' } = req.body || {};
    if (!dept_code || !dept_name) return res.status(400).json({ error: 'كود واسم الإدارة مطلوبان' });
    try {
      db.prepare(`INSERT INTO departments VALUES (?, ?, ?, ?)`).run(dept_code.trim(), dept_name.trim(), manager_name, description);
      logAudit(db, { username: req.user.username, user_role: req.user.role_code, module: 'البيانات الأساسية', action: 'إضافة إدارة', entity_id: dept_code, details: dept_name });
      res.status(201).json({ message: 'تمت إضافة الإدارة بنجاح' });
    } catch (err) {
      res.status(400).json({ error: err.message.includes('UNIQUE') ? 'كود الإدارة مسجل مسبقاً' : err.message });
    }
  });

  router.put('/departments/:code', requirePermission('master', 'edit'), (req, res) => {
    const { dept_name, manager_name = '', description = '' } = req.body || {};
    db.prepare(`UPDATE departments SET dept_name = ?, manager_name = ?, description = ? WHERE dept_code = ?`)
      .run(dept_name, manager_name, description, req.params.code);
    res.json({ message: 'تم تحديث الإدارة بنجاح' });
  });

  // 3. دليل الحسابات الشجري (3 مستويات)
  router.get('/accounts-tree', (_req, res) => {
    const mainGroups = db.prepare(`SELECT * FROM account_main_groups ORDER BY main_group_code`).all();
    const subGroups = db.prepare(`SELECT * FROM account_sub_groups ORDER BY sub_group_code`).all();
    const accounts = db.prepare(`
      SELECT a.*,
             sg.sub_group_name,
             sg.main_group_code,
             mg.group_name AS main_group_name,
             mg.account_nature,
             mg.statement_type,
             COALESCE(SUM(jl.debit), 0) AS mov_debit,
             COALESCE(SUM(jl.credit), 0) AS mov_credit
      FROM accounts a
      JOIN account_sub_groups sg ON sg.sub_group_code = a.sub_group_code
      JOIN account_main_groups mg ON mg.main_group_code = sg.main_group_code
      LEFT JOIN journal_entry_lines jl ON jl.account_code = a.account_code
      GROUP BY a.account_code
      ORDER BY a.account_code
    `).all().map((acc) => {
      const totalDebit = round2(acc.opening_debit + acc.mov_debit);
      const totalCredit = round2(acc.opening_credit + acc.mov_credit);
      const net = acc.account_nature === 'debit'
        ? round2(totalDebit - totalCredit)
        : round2(totalCredit - totalDebit);
      return { ...acc, total_debit: totalDebit, total_credit: totalCredit, net_balance: net };
    });

    const tree = mainGroups.map((mg) => {
      const subs = subGroups
        .filter((sg) => sg.main_group_code === mg.main_group_code)
        .map((sg) => {
          const accs = accounts.filter((a) => a.sub_group_code === sg.sub_group_code);
          const subBalance = round2(accs.reduce((s, x) => s + x.net_balance, 0));
          return { ...sg, sub_balance: subBalance, accounts: accs };
        });
      const mainBalance = round2(subs.reduce((s, x) => s + x.sub_balance, 0));
      return { ...mg, main_balance: mainBalance, sub_groups: subs };
    });

    res.json({ mainGroups, subGroups, accounts, tree });
  });

  router.post('/account-main-groups', requirePermission('finance', 'add'), (req, res) => {
    const { main_group_code, group_name, account_nature = 'debit', statement_type = 'balance_sheet' } = req.body || {};
    if (!main_group_code || !group_name) return res.status(400).json({ error: 'كود واسم المجموعة الرئيسية مطلوبان' });
    try {
      db.prepare(`INSERT INTO account_main_groups VALUES (?, ?, ?, ?)`).run(main_group_code.trim(), group_name.trim(), account_nature, statement_type);
      res.status(201).json({ message: 'تمت إضافة المجموعة الرئيسية للحسابات' });
    } catch (err) {
      res.status(400).json({ error: err.message.includes('UNIQUE') ? 'كود المجموعة الرئيسية موجود مسبقاً' : err.message });
    }
  });

  router.post('/account-sub-groups', requirePermission('finance', 'add'), (req, res) => {
    const { sub_group_code, sub_group_name, main_group_code } = req.body || {};
    if (!sub_group_code || !sub_group_name || !main_group_code) {
      return res.status(400).json({ error: 'كود واسم المجموعة الفرعية والمجموعة الرئيسية مطلوبة' });
    }
    try {
      db.prepare(`INSERT INTO account_sub_groups VALUES (?, ?, ?)`).run(sub_group_code.trim(), sub_group_name.trim(), main_group_code);
      res.status(201).json({ message: 'تمت إضافة المجموعة الفرعية بنجاح' });
    } catch (err) {
      res.status(400).json({ error: err.message.includes('UNIQUE') ? 'كود المجموعة الفرعية موجود مسبقاً' : err.message });
    }
  });

  router.post('/accounts', requirePermission('finance', 'add'), (req, res) => {
    const { account_code, account_name, sub_group_code, opening_debit = 0, opening_credit = 0, is_cash_account = 0 } = req.body || {};
    if (!account_code || !account_name || !sub_group_code) {
      return res.status(400).json({ error: 'كود الحساب واسم الحساب والمجموعة الفرعية مطلوبة' });
    }
    try {
      db.prepare(`
        INSERT INTO accounts (account_code, account_name, sub_group_code, opening_debit, opening_credit, is_cash_account, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(account_code.trim(), account_name.trim(), sub_group_code, Number(opening_debit || 0), Number(opening_credit || 0), is_cash_account ? 1 : 0);
      logAudit(db, { username: req.user.username, user_role: req.user.role_code, module: 'دليل الحسابات', action: 'إضافة حساب جديد', entity_id: account_code, details: account_name });
      res.status(201).json({ message: 'تمت إضافة الحساب بنجاح في دليل الحسابات الشجري' });
    } catch (err) {
      res.status(400).json({ error: err.message.includes('UNIQUE') ? 'كود الحساب مسجل بالفعل' : err.message });
    }
  });

  // 4. مجموعات الأصناف والأصناف
  router.get('/item-groups', (_req, res) => {
    const itemGroups = db.prepare(`SELECT * FROM item_groups ORDER BY group_code`).all();
    res.json({ itemGroups });
  });

  router.post('/item-groups', requirePermission('master', 'add'), (req, res) => {
    const { group_code, group_name, description = '' } = req.body || {};
    if (!group_code || !group_name) return res.status(400).json({ error: 'كود واسم مجموعة الأصناف مطلوبان' });
    try {
      db.prepare(`INSERT INTO item_groups VALUES (?, ?, ?)`).run(group_code.trim(), group_name.trim(), description);
      res.status(201).json({ message: 'تمت إضافة مجموعة الأصناف بنجاح' });
    } catch (err) {
      res.status(400).json({ error: err.message.includes('UNIQUE') ? 'كود المجموعة مسجل مسبقاً' : err.message });
    }
  });

  router.get('/items', (_req, res) => {
    const items = db.prepare(`
      SELECT i.*, ig.group_name,
             ROUND(i.current_balance * i.cost_price, 2) AS stock_value,
             CASE
               WHEN i.current_balance <= i.safety_stock THEN 'خطر نفاد (تحت حد الأمان)'
               WHEN i.current_balance <= i.reorder_point THEN 'وصل لنقطة إعادة الطلب'
               ELSE 'آمن ومتوفر'
             END AS stock_status
      FROM items i
      JOIN item_groups ig ON ig.group_code = i.group_code
      ORDER BY i.item_code
    `).all();
    res.json({ items });
  });

  router.post('/items', requirePermission('master', 'add'), (req, res) => {
    const {
      item_code,
      item_name,
      group_code,
      item_type = 'بضاعة تامة الصنع',
      unit_of_measure = 'وحدة',
      cost_price = 0,
      unit_price = 0,
      annual_demand = 0,
      safety_stock = 0,
      lead_time_days = 7,
      eoq = 0,
      current_balance = 0,
    } = req.body || {};

    if (!item_code || !item_name || !group_code) {
      return res.status(400).json({ error: 'كود الصنف واسمه ومجموعته حقول إلزامية' });
    }
    const rop = computeReorderPoint(annual_demand, lead_time_days, safety_stock);
    const calcEoq = Number(eoq) > 0 ? Number(eoq) : Math.max(10, Math.round(Math.sqrt((2 * Number(annual_demand || 100) * 250) / Math.max(1, Number(cost_price || 100) * 0.15))));

    try {
      runInTransaction(db, () => {
        db.prepare(`
          INSERT INTO items (item_code, item_name, group_code, item_type, unit_of_measure, cost_price, unit_price, annual_demand, safety_stock, lead_time_days, eoq, reorder_point, current_balance)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          item_code.trim(),
          item_name.trim(),
          group_code,
          item_type,
          unit_of_measure,
          Number(cost_price),
          Number(unit_price),
          Number(annual_demand),
          Number(safety_stock),
          Number(lead_time_days),
          calcEoq,
          rop,
          Number(current_balance)
        );

        if (Number(current_balance) > 0) {
          db.prepare(`
            INSERT INTO item_movements (movement_date, item_code, movement_type, doc_no, qty_in, qty_out, unit_price, balance_after, notes)
            VALUES (date('now'), ?, 'رصيد افتتاحي', 'OPEN-NEW', ?, 0, ?, ?, 'رصيد تأسيسي للصنف عند الإدراج')
          `).run(item_code.trim(), Number(current_balance), Number(cost_price), Number(current_balance));
        }
      });
      logAudit(db, { username: req.user.username, user_role: req.user.role_code, module: 'الأصناف والمخزون', action: 'إضافة صنف جديد', entity_id: item_code, details: item_name });
      res.status(201).json({ message: 'تم حفظ الصنف وحساب نقطة إعادة الطلب تلقائياً' });
    } catch (err) {
      res.status(400).json({ error: err.message.includes('UNIQUE') ? 'كود الصنف مسجل بالفعل' : err.message });
    }
  });

  router.put('/items/:code', requirePermission('master', 'edit'), (req, res) => {
    const {
      item_name,
      group_code,
      item_type,
      unit_of_measure,
      cost_price,
      unit_price,
      annual_demand,
      safety_stock,
      lead_time_days,
      eoq,
    } = req.body || {};
    const existing = db.prepare(`SELECT * FROM items WHERE item_code = ?`).get(req.params.code);
    if (!existing) return res.status(404).json({ error: 'الصنف غير موجود' });

    const finalAnnual = annual_demand !== undefined ? Number(annual_demand) : existing.annual_demand;
    const finalLead = lead_time_days !== undefined ? Number(lead_time_days) : existing.lead_time_days;
    const finalSafety = safety_stock !== undefined ? Number(safety_stock) : existing.safety_stock;
    const rop = computeReorderPoint(finalAnnual, finalLead, finalSafety);

    db.prepare(`
      UPDATE items
      SET item_name = COALESCE(?, item_name),
          group_code = COALESCE(?, group_code),
          item_type = COALESCE(?, item_type),
          unit_of_measure = COALESCE(?, unit_of_measure),
          cost_price = COALESCE(?, cost_price),
          unit_price = COALESCE(?, unit_price),
          annual_demand = ?,
          safety_stock = ?,
          lead_time_days = ?,
          eoq = COALESCE(?, eoq),
          reorder_point = ?
      WHERE item_code = ?
    `).run(item_name, group_code, item_type, unit_of_measure, cost_price, unit_price, finalAnnual, finalSafety, finalLead, eoq, rop, req.params.code);

    res.json({ message: 'تم تحديث بيانات الصنف ونقطة إعادة الطلب بنجاح' });
  });

  // 5. العملاء مع الرصيد اللحظي
  router.get('/customers', (_req, res) => {
    const customers = db.prepare(`
      SELECT c.*,
             COALESCE(SUM(ct.debit), 0) AS mov_debit,
             COALESCE(SUM(ct.credit), 0) AS mov_credit
      FROM customers c
      LEFT JOIN customer_transactions ct ON ct.customer_id = c.customer_id
      GROUP BY c.customer_id
      ORDER BY c.customer_id
    `).all().map((c) => {
      const netBalance = round2(c.opening_balance + c.mov_debit - c.mov_credit);
      return {
        ...c,
        net_balance: netBalance,
        available_credit: round2(c.credit_limit - netBalance),
      };
    });
    res.json({ customers });
  });

  router.post('/customers', requirePermission('master', 'add'), (req, res) => {
    const { customer_id, customer_name, address = '', city = '', phone = '', email = '', credit_limit = 50000, opening_balance = 0 } = req.body || {};
    if (!customer_id || !customer_name) return res.status(400).json({ error: 'رقم واسم العميل مطلوبان' });
    try {
      db.prepare(`INSERT INTO customers VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        customer_id.trim(), customer_name.trim(), address, city, phone, email, Number(credit_limit), Number(opening_balance)
      );
      logAudit(db, { username: req.user.username, user_role: req.user.role_code, module: 'العملاء', action: 'إضافة عميل', entity_id: customer_id, details: customer_name });
      res.status(201).json({ message: 'تمت إضافة العميل بنجاح' });
    } catch (err) {
      res.status(400).json({ error: err.message.includes('UNIQUE') ? 'رقم العميل موجود مسبقاً' : err.message });
    }
  });

  router.put('/customers/:id', requirePermission('master', 'edit'), (req, res) => {
    const { customer_name, address, city, phone, email, credit_limit } = req.body || {};
    db.prepare(`
      UPDATE customers
      SET customer_name = COALESCE(?, customer_name),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          credit_limit = COALESCE(?, credit_limit)
      WHERE customer_id = ?
    `).run(customer_name, address, city, phone, email, credit_limit, req.params.id);
    res.json({ message: 'تم تحديث بيانات العميل بنجاح' });
  });

  // 6. الموردون مع الرصيد اللحظي
  router.get('/suppliers', (_req, res) => {
    const suppliers = db.prepare(`
      SELECT s.*,
             COALESCE(SUM(st.debit), 0) AS mov_debit,
             COALESCE(SUM(st.credit), 0) AS mov_credit
      FROM suppliers s
      LEFT JOIN supplier_transactions st ON st.supplier_id = s.supplier_id
      GROUP BY s.supplier_id
      ORDER BY s.supplier_id
    `).all().map((s) => ({
      ...s,
      net_balance: round2(s.opening_balance + s.mov_credit - s.mov_debit),
    }));
    res.json({ suppliers });
  });

  router.post('/suppliers', requirePermission('master', 'add'), (req, res) => {
    const { supplier_id, supplier_name, address = '', city = '', phone = '', email = '', opening_balance = 0 } = req.body || {};
    if (!supplier_id || !supplier_name) return res.status(400).json({ error: 'رقم واسم المورد مطلوبان' });
    try {
      db.prepare(`INSERT INTO suppliers VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        supplier_id.trim(), supplier_name.trim(), address, city, phone, email, Number(opening_balance)
      );
      logAudit(db, { username: req.user.username, user_role: req.user.role_code, module: 'الموردون', action: 'إضافة مورد', entity_id: supplier_id, details: supplier_name });
      res.status(201).json({ message: 'تمت إضافة المورد بنجاح' });
    } catch (err) {
      res.status(400).json({ error: err.message.includes('UNIQUE') ? 'رقم المورد موجود مسبقاً' : err.message });
    }
  });

  router.put('/suppliers/:id', requirePermission('master', 'edit'), (req, res) => {
    const { supplier_name, address, city, phone, email } = req.body || {};
    db.prepare(`
      UPDATE suppliers
      SET supplier_name = COALESCE(?, supplier_name),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email)
      WHERE supplier_id = ?
    `).run(supplier_name, address, city, phone, email, req.params.id);
    res.json({ message: 'تم تحديث بيانات المورد بنجاح' });
  });

  // 7. الموظفون
  router.get('/employees', (_req, res) => {
    const employees = db.prepare(`
      SELECT e.*, d.dept_name,
             ROUND(e.housing_allowance + e.transport_allowance + e.meal_allowance + e.other_allowances, 2) AS total_allowances,
             ROUND(e.basic_salary + e.housing_allowance + e.transport_allowance + e.meal_allowance + e.other_allowances, 2) AS gross_package
      FROM employees e
      LEFT JOIN departments d ON d.dept_code = e.dept_code
      ORDER BY e.employee_code
    `).all();
    res.json({ employees });
  });

  router.post('/employees', requirePermission('master', 'add'), (req, res) => {
    const {
      employee_code, employee_name, job_title, dept_code,
      specialization = '', qualification = '', birth_date = '', hire_date = '',
      marital_status = 'أعزب', basic_salary = 0, housing_allowance = 0,
      transport_allowance = 0, meal_allowance = 0, other_allowances = 0,
    } = req.body || {};
    if (!employee_code || !employee_name || !job_title || !dept_code) {
      return res.status(400).json({ error: 'كود واسم الموظف والوظيفة والإدارة حقول إلزامية' });
    }
    try {
      db.prepare(`
        INSERT INTO employees VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'نشط')
      `).run(
        employee_code.trim(), employee_name.trim(), job_title, dept_code,
        specialization, qualification, birth_date, hire_date, marital_status,
        Number(basic_salary), Number(housing_allowance), Number(transport_allowance),
        Number(meal_allowance), Number(other_allowances)
      );
      logAudit(db, { username: req.user.username, user_role: req.user.role_code, module: 'الموارد البشرية', action: 'إضافة موظف', entity_id: employee_code, details: employee_name });
      res.status(201).json({ message: 'تم حفظ بيانات الموظف بنجاح' });
    } catch (err) {
      res.status(400).json({ error: err.message.includes('UNIQUE') ? 'كود الموظف مسجل مسبقاً' : err.message });
    }
  });

  router.put('/employees/:code', requirePermission('master', 'edit'), (req, res) => {
    const {
      employee_name, job_title, dept_code, specialization, qualification,
      marital_status, basic_salary, housing_allowance, transport_allowance, meal_allowance, other_allowances, status,
    } = req.body || {};
    db.prepare(`
      UPDATE employees
      SET employee_name = COALESCE(?, employee_name),
          job_title = COALESCE(?, job_title),
          dept_code = COALESCE(?, dept_code),
          specialization = COALESCE(?, specialization),
          qualification = COALESCE(?, qualification),
          marital_status = COALESCE(?, marital_status),
          basic_salary = COALESCE(?, basic_salary),
          housing_allowance = COALESCE(?, housing_allowance),
          transport_allowance = COALESCE(?, transport_allowance),
          meal_allowance = COALESCE(?, meal_allowance),
          other_allowances = COALESCE(?, other_allowances),
          status = COALESCE(?, status)
      WHERE employee_code = ?
    `).run(
      employee_name, job_title, dept_code, specialization, qualification,
      marital_status, basic_salary, housing_allowance, transport_allowance, meal_allowance, other_allowances, status, req.params.code
    );
    res.json({ message: 'تم تحديث بيانات الموظف بنجاح' });
  });

  // 8. حسابات البنوك
  router.get('/banks', (_req, res) => {
    const banks = db.prepare(`
      SELECT b.*, a.account_name AS gl_account_name
      FROM bank_accounts b
      LEFT JOIN accounts a ON a.account_code = b.gl_account_code
      ORDER BY b.bank_name
    `).all();
    res.json({ banks });
  });

  router.post('/banks', requirePermission('master', 'add'), (req, res) => {
    const { bank_account_number, bank_name, branch, currency = 'ج.م', opening_balance = 0, gl_account_code = '1102' } = req.body || {};
    if (!bank_account_number || !bank_name || !branch) {
      return res.status(400).json({ error: 'رقم الحساب واسم البنك والفرع حقول إلزامية' });
    }
    try {
      const bal = Number(opening_balance || 0);
      db.prepare(`INSERT INTO bank_accounts VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        bank_account_number.trim(), bank_name.trim(), branch.trim(), currency, bal, bal, gl_account_code
      );
      res.status(201).json({ message: 'تمت إضافة الحساب البنكي بنجاح' });
    } catch (err) {
      res.status(400).json({ error: err.message.includes('UNIQUE') ? 'رقم الحساب البنكي مسجل بالفعل' : err.message });
    }
  });

  return router;
};
