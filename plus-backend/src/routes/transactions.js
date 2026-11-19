const express = require('express');
const { requirePermission, logAudit } = require('../auth');
const {
  round2,
  nextDocNumber,
  runInTransaction,
  getCustomerBalance,
  getSupplierBalance,
  postJournalEntryRaw,
  resolveSettlementAccount,
  createSalesInvoiceRaw,
  createPurchaseInvoiceRaw,
} = require('../accountingEngine');

module.exports = function createTransactionsRouter(db, authenticate) {
  const router = express.Router();
  router.use(authenticate);

  // =========================================================================
  // 1. قيود اليومية العامة + سندات الخزينة والشيكات
  // =========================================================================
  router.get('/journal-entries', requirePermission('finance', 'view'), (_req, res) => {
    const entries = db.prepare(`SELECT * FROM journal_entries ORDER BY entry_date DESC, entry_number DESC`).all();
    const linesStmt = db.prepare(`
      SELECT jl.*, a.account_name
      FROM journal_entry_lines jl
      JOIN accounts a ON a.account_code = jl.account_code
      WHERE jl.entry_number = ?
      ORDER BY jl.line_no ASC
    `);
    const result = entries.map((e) => ({ ...e, lines: linesStmt.all(e.entry_number) }));
    res.json({ entries: result });
  });

  router.post('/journal-entries', requirePermission('finance', 'add'), (req, res) => {
    const { entry_number, entry_date, description, lines } = req.body || {};
    if (!entry_date || !description) {
      return res.status(400).json({ error: 'تاريخ القيد وشرح القيد مطلوبان' });
    }
    try {
      const created = runInTransaction(db, () =>
        postJournalEntryRaw(db, {
          entry_number: entry_number || undefined,
          entry_date,
          reference_type: 'قيد يومية يدوي',
          description,
          lines,
          created_by: req.user.username,
        })
      );
      logAudit(db, {
        username: req.user.username,
        user_role: req.user.role_code,
        module: 'الإدارة المالية',
        action: 'تسجيل قيد يومية متوازن',
        entity_id: created.entry_number,
        details: `${description} — القيمة: ${created.total_debit}`,
      });
      res.status(201).json({ message: 'تم حفظ وترحيل قيد اليومية المتوازن بنجاح', entry: created });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.get('/treasury-vouchers', requirePermission('finance', 'view'), (_req, res) => {
    const vouchers = db.prepare(`
      SELECT tv.*, a.account_name, b.bank_name
      FROM treasury_vouchers tv
      JOIN accounts a ON a.account_code = tv.account_code
      LEFT JOIN bank_accounts b ON b.bank_account_number = tv.bank_account_number
      ORDER BY tv.voucher_date DESC, tv.voucher_no DESC
    `).all();
    res.json({ vouchers });
  });

  router.post('/treasury-vouchers', requirePermission('finance', 'add'), (req, res) => {
    const {
      voucher_type, // 'receipt' | 'payment'
      payment_method = 'نقدي',
      voucher_date,
      amount,
      account_code,
      bank_account_number = null,
      check_number = '',
      check_due_date = '',
      beneficiary_name = '',
      notes = '',
    } = req.body || {};

    const val = round2(Number(amount || 0));
    if (!voucher_date || val <= 0 || !account_code || !['receipt', 'payment'].includes(voucher_type)) {
      return res.status(400).json({ error: 'يرجى استكمال بيانات السند والمبلغ والحساب المقابل' });
    }

    try {
      const out = runInTransaction(db, () => {
        const prefix = voucher_type === 'receipt' ? 'RCV' : 'PAY';
        const voucherNo = nextDocNumber(db, 'treasury_vouchers', 'voucher_no', prefix);
        const { accountCode: cashOrBankAcc, bank } = resolveSettlementAccount(db, payment_method, bank_account_number);

        const lines = voucher_type === 'receipt'
          ? [
              { account_code: cashOrBankAcc, debit: val, credit: 0, notes: `تحصيل (${payment_method}) سند ${voucherNo}` },
              { account_code, debit: 0, credit: val, notes: notes || `متحصلات من ${beneficiary_name}` },
            ]
          : [
              { account_code, debit: val, credit: 0, notes: notes || `مدفوعات إلى ${beneficiary_name}` },
              { account_code: cashOrBankAcc, debit: 0, credit: val, notes: `صرف (${payment_method}) سند ${voucherNo}` },
            ];

        const je = postJournalEntryRaw(db, {
          entry_date: voucher_date,
          reference_type: voucher_type === 'receipt' ? 'سند قبض' : 'سند صرف',
          reference_no: voucherNo,
          description: `${voucher_type === 'receipt' ? 'إثبات متحصلات' : 'إثبات مدفوعات'} (${payment_method}) — ${beneficiary_name || notes}`,
          lines,
          created_by: req.user.username,
        });

        if (bank) {
          const delta = voucher_type === 'receipt' ? val : -val;
          db.prepare(`UPDATE bank_accounts SET balance = ROUND(balance + ?, 2) WHERE bank_account_number = ?`).run(delta, bank.bank_account_number);
        }

        db.prepare(`
          INSERT INTO treasury_vouchers (voucher_no, voucher_type, payment_method, voucher_date, amount, account_code, bank_account_number, check_number, check_due_date, beneficiary_name, notes, journal_entry_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(voucherNo, voucher_type, payment_method, voucher_date, val, account_code, bank_account_number || null, check_number, check_due_date, beneficiary_name, notes, je.entry_number);

        return { voucher_no: voucherNo, journal_entry_number: je.entry_number };
      });

      logAudit(db, {
        username: req.user.username,
        user_role: req.user.role_code,
        module: 'الخزينة والبنوك',
        action: voucher_type === 'receipt' ? 'سند قبض' : 'سند صرف',
        entity_id: out.voucher_no,
        details: `${payment_method} بقيمة ${val}`,
      });
      res.status(201).json({ message: 'تم حفظ السند وترحيل القيد المحاسبي تلقائياً', ...out });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  // =========================================================================
  // 2. المبيعات وحسابات العملاء
  // =========================================================================
  router.get('/sales-invoices', requirePermission('sales', 'view'), (_req, res) => {
    const invoices = db.prepare(`
      SELECT si.*, c.customer_name, e.employee_name
      FROM sales_invoices si
      JOIN customers c ON c.customer_id = si.customer_id
      JOIN employees e ON e.employee_code = si.employee_code
      ORDER BY si.invoice_date DESC, si.invoice_no DESC
    `).all();
    const itemStmt = db.prepare(`
      SELECT sii.*, i.item_name, i.unit_of_measure
      FROM sales_invoice_items sii
      JOIN items i ON i.item_code = sii.item_code
      WHERE sii.invoice_no = ?
      ORDER BY sii.line_no ASC
    `);
    res.json({ invoices: invoices.map((inv) => ({ ...inv, items: itemStmt.all(inv.invoice_no) })) });
  });

  router.post('/sales-invoices', requirePermission('sales', 'add'), (req, res) => {
    try {
      const result = runInTransaction(db, () => createSalesInvoiceRaw(db, req.body || {}, req.user.username));
      logAudit(db, {
        username: req.user.username,
        user_role: req.user.role_code,
        module: 'المبيعات والعملاء',
        action: 'إصدار فاتورة بيع',
        entity_id: result.invoice_no,
        details: `صافي الفاتورة: ${result.net_total} — قيد: ${result.journal_entry_number}`,
      });
      res.status(201).json({
        message: 'تم حفظ فاتورة البيع وتحديث المخزون وحساب العميل واليومية العامة تلقائياً',
        ...result,
      });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message, code: err.code });
    }
  });

  router.get('/sales-returns', requirePermission('sales', 'view'), (_req, res) => {
    const returns = db.prepare(`
      SELECT sr.*, c.customer_name
      FROM sales_returns sr
      JOIN customers c ON c.customer_id = sr.customer_id
      ORDER BY sr.return_date DESC, sr.return_no DESC
    `).all();
    const itemStmt = db.prepare(`
      SELECT sri.*, i.item_name
      FROM sales_return_items sri
      JOIN items i ON i.item_code = sri.item_code
      WHERE sri.return_no = ?
    `);
    res.json({ returns: returns.map((r) => ({ ...r, items: itemStmt.all(r.return_no) })) });
  });

  router.post('/sales-returns', requirePermission('sales', 'add'), (req, res) => {
    const { return_date, invoice_no = null, customer_id, refund_method = 'خصم من الحساب', reason = '', items } = req.body || {};
    if (!return_date || !customer_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'تاريخ الإشعار والعميل والأصناف المرتجعة مطلوبة' });
    }
    try {
      const result = runInTransaction(db, () => {
        const cust = getCustomerBalance(db, customer_id);
        const returnNo = nextDocNumber(db, 'sales_returns', 'return_no', 'SRET');
        let totalAmount = 0;
        let totalCost = 0;

        const cleanItems = items.map((row, idx) => {
          const item = db.prepare(`SELECT * FROM items WHERE item_code = ?`).get(row.item_code);
          if (!item) throw new Error(`الصنف (${row.item_code}) غير موجود`);
          const qty = Number(row.quantity || 0);
          const price = Number(row.unit_price ?? item.unit_price);
          const discPct = Number(row.discount_percent || 0);
          const net = round2(qty * price * (1 - discPct / 100));
          const cost = round2(qty * Number(item.cost_price || 0));
          totalAmount = round2(totalAmount + net);
          totalCost = round2(totalCost + cost);
          return { line_no: idx + 1, item_code: item.item_code, quantity: qty, unit_price: price, discount_percent: discPct, net_amount: net };
        });

        const creditAcc = refund_method === 'نقدي' ? '1101' : '1103';
        const jLines = [
          { account_code: '3204', debit: totalAmount, credit: 0, notes: `إشعار رد مبيعات رقم ${returnNo}` },
          { account_code: creditAcc, debit: 0, credit: totalAmount, notes: `تسوية مرتجع مبيعات للعميل ${cust.customer_name}` },
        ];
        if (totalCost > 0) {
          jLines.push({ account_code: '1104', debit: totalCost, credit: 0, notes: `إعادة البضاعة المرتجعة للمخزن ${returnNo}` });
          jLines.push({ account_code: '3101', debit: 0, credit: totalCost, notes: `تخفيض تكلفة البضاعة المباعة ${returnNo}` });
        }

        const je = postJournalEntryRaw(db, {
          entry_date: return_date,
          reference_type: 'إشعار رد مبيعات',
          reference_no: returnNo,
          description: `إشعار رد بضاعة مباعة رقم ${returnNo} من العميل ${cust.customer_name}`,
          lines: jLines,
          created_by: req.user.username,
        });

        db.prepare(`
          INSERT INTO sales_returns (return_no, return_date, invoice_no, customer_id, refund_method, total_amount, reason, journal_entry_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(returnNo, return_date, invoice_no || null, customer_id, refund_method, totalAmount, reason, je.entry_number);

        const insLine = db.prepare(`
          INSERT INTO sales_return_items (line_no, return_no, item_code, quantity, unit_price, discount_percent, net_amount)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const updStock = db.prepare(`UPDATE items SET current_balance = ROUND(current_balance + ?, 2) WHERE item_code = ?`);
        const insMove = db.prepare(`
          INSERT INTO item_movements (movement_date, item_code, movement_type, doc_no, qty_in, qty_out, unit_price, balance_after, notes)
          VALUES (?, ?, 'مردودات مبيعات', ?, ?, 0, ?, ?, ?)
        `);

        for (const r of cleanItems) {
          insLine.run(r.line_no, returnNo, r.item_code, r.quantity, r.unit_price, r.discount_percent, r.net_amount);
          updStock.run(r.quantity, r.item_code);
          const updated = db.prepare(`SELECT current_balance FROM items WHERE item_code = ?`).get(r.item_code);
          insMove.run(return_date, r.item_code, returnNo, r.quantity, r.unit_price, updated.current_balance, reason || `مرتجع من ${cust.customer_name}`);
        }

        if (refund_method === 'خصم من الحساب') {
          db.prepare(`
            INSERT INTO customer_transactions (doc_no, customer_id, tx_date, debit, credit, tx_type, collection_method, notes, journal_entry_number)
            VALUES (?, ?, ?, 0, ?, 'مردودات مبيعات', 'خصم إشعار دائن', ?, ?)
          `).run(returnNo, customer_id, return_date, totalAmount, reason || `رد مبيعات ${returnNo}`, je.entry_number);
        }

        return { return_no: returnNo, total_amount: totalAmount, journal_entry_number: je.entry_number };
      });

      res.status(201).json({ message: 'تم حفظ إشعار رد المبيعات وإعادة الأصناف للمخزن وتعديل حساب العميل', ...result });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.get('/customer-collections', requirePermission('sales', 'view'), (_req, res) => {
    const collections = db.prepare(`
      SELECT ct.*, c.customer_name
      FROM customer_transactions ct
      JOIN customers c ON c.customer_id = ct.customer_id
      WHERE ct.credit > 0
      ORDER BY ct.tx_date DESC, ct.id DESC
    `).all();
    res.json({ collections });
  });

  router.post('/customer-collections', requirePermission('sales', 'add'), (req, res) => {
    const { customer_id, tx_date, amount, collection_method = 'نقدي', bank_account_number = null, check_number = '', notes = '' } = req.body || {};
    const val = round2(Number(amount || 0));
    if (!customer_id || !tx_date || val <= 0) {
      return res.status(400).json({ error: 'العميل والتاريخ والمبلغ المحصل حقول إلزامية' });
    }
    try {
      const out = runInTransaction(db, () => {
        const cust = getCustomerBalance(db, customer_id);
        const docNo = nextDocNumber(db, 'treasury_vouchers', 'voucher_no', 'RCV');
        const { accountCode, bank } = resolveSettlementAccount(db, collection_method, bank_account_number);

        const je = postJournalEntryRaw(db, {
          entry_date: tx_date,
          reference_type: 'سند تحصيل عميل',
          reference_no: docNo,
          description: `تحصيل (${collection_method}) من العميل ${cust.customer_name}`,
          lines: [
            { account_code: accountCode, debit: val, credit: 0, notes: `تحصيل من العميل ${cust.customer_name}` },
            { account_code: '1103', debit: 0, credit: val, notes: notes || `تخفيض مديونية العميل سند ${docNo}` },
          ],
          created_by: req.user.username,
        });

        if (bank) {
          db.prepare(`UPDATE bank_accounts SET balance = ROUND(balance + ?, 2) WHERE bank_account_number = ?`).run(val, bank.bank_account_number);
        }

        db.prepare(`
          INSERT INTO customer_transactions (doc_no, customer_id, tx_date, debit, credit, tx_type, collection_method, bank_account_number, check_number, notes, journal_entry_number)
          VALUES (?, ?, ?, 0, ?, 'تحصيل من عميل', ?, ?, ?, ?, ?)
        `).run(docNo, customer_id, tx_date, val, collection_method, bank_account_number || null, check_number, notes || 'تحصيل نقدي/بنكي', je.entry_number);

        db.prepare(`
          INSERT INTO treasury_vouchers (voucher_no, voucher_type, payment_method, voucher_date, amount, account_code, bank_account_number, check_number, beneficiary_name, notes, journal_entry_number)
          VALUES (?, 'receipt', ?, ?, ?, '1103', ?, ?, ?, ?, ?)
        `).run(docNo, collection_method, tx_date, val, bank_account_number || null, check_number, cust.customer_name, notes, je.entry_number);

        const updatedBalance = getCustomerBalance(db, customer_id);
        return { doc_no: docNo, journal_entry_number: je.entry_number, new_customer_balance: updatedBalance.net_balance };
      });
      res.status(201).json({ message: 'تم إثبات التحصيل وتحديث رصيد العميل اللحظي بنجاح', ...out });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  // =========================================================================
  // 3. المشتريات وحسابات الموردين
  // =========================================================================
  router.get('/purchase-orders', requirePermission('purchases', 'view'), (_req, res) => {
    const orders = db.prepare(`
      SELECT po.*, s.supplier_name
      FROM purchase_orders po
      JOIN suppliers s ON s.supplier_id = po.supplier_id
      ORDER BY po.po_date DESC, po.po_no DESC
    `).all();
    const itemStmt = db.prepare(`
      SELECT poi.*, i.item_name, i.unit_of_measure
      FROM purchase_order_items poi
      JOIN items i ON i.item_code = poi.item_code
      WHERE poi.po_no = ?
    `);
    res.json({ orders: orders.map((o) => ({ ...o, items: itemStmt.all(o.po_no) })) });
  });

  router.post('/purchase-orders', requirePermission('purchases', 'add'), (req, res) => {
    const { po_date, supplier_id, expected_date = '', notes = '', items } = req.body || {};
    if (!po_date || !supplier_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'تاريخ أمر التوريد والمورد والأصناف مطلوبة' });
    }
    try {
      const out = runInTransaction(db, () => {
        const poNo = nextDocNumber(db, 'purchase_orders', 'po_no', 'PO');
        let total = 0;
        const rows = items.map((r, idx) => {
          const item = db.prepare(`SELECT * FROM items WHERE item_code = ?`).get(r.item_code);
          if (!item) throw new Error(`الصنف (${r.item_code}) غير موجود`);
          const qty = Number(r.quantity || item.eoq || 10);
          const price = Number(r.unit_price ?? item.cost_price);
          const net = round2(qty * price);
          total = round2(total + net);
          return { line_no: idx + 1, item_code: item.item_code, quantity: qty, unit_price: price, net_amount: net };
        });

        db.prepare(`
          INSERT INTO purchase_orders (po_no, po_date, supplier_id, expected_date, status, total_amount, notes)
          VALUES (?, ?, ?, ?, 'قيد التنفيذ', ?, ?)
        `).run(poNo, po_date, supplier_id, expected_date, total, notes);

        const ins = db.prepare(`
          INSERT INTO purchase_order_items (line_no, po_no, item_code, quantity, unit_price, net_amount)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const r of rows) ins.run(r.line_no, poNo, r.item_code, r.quantity, r.unit_price, r.net_amount);

        return { po_no: poNo, total_amount: total };
      });
      logAudit(db, { username: req.user.username, user_role: req.user.role_code, module: 'المشتريات', action: 'إصدار أمر توريد', entity_id: out.po_no, details: `بقيمة تقديرية ${out.total_amount}` });
      res.status(201).json({ message: 'تم إصدار أمر التوريد بنجاح', ...out });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/purchase-invoices', requirePermission('purchases', 'view'), (_req, res) => {
    const invoices = db.prepare(`
      SELECT pi.*, s.supplier_name
      FROM purchase_invoices pi
      JOIN suppliers s ON s.supplier_id = pi.supplier_id
      ORDER BY pi.invoice_date DESC, pi.invoice_no DESC
    `).all();
    const itemStmt = db.prepare(`
      SELECT pii.*, i.item_name, i.unit_of_measure
      FROM purchase_invoice_items pii
      JOIN items i ON i.item_code = pii.item_code
      WHERE pii.invoice_no = ?
    `);
    res.json({ invoices: invoices.map((inv) => ({ ...inv, items: itemStmt.all(inv.invoice_no) })) });
  });

  router.post('/purchase-invoices', requirePermission('purchases', 'add'), (req, res) => {
    try {
      const result = runInTransaction(db, () => createPurchaseInvoiceRaw(db, req.body || {}, req.user.username));
      logAudit(db, { username: req.user.username, user_role: req.user.role_code, module: 'المشتريات', action: 'تسجيل فاتورة شراء', entity_id: result.invoice_no, details: `صافي ${result.net_total}` });
      res.status(201).json({ message: 'تم حفظ فاتورة الشراء وإضافة الأصناف للمخزن وتحديث حساب المورد', ...result });
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  });

  router.get('/purchase-returns', requirePermission('purchases', 'view'), (_req, res) => {
    const returns = db.prepare(`
      SELECT pr.*, s.supplier_name
      FROM purchase_returns pr
      JOIN suppliers s ON s.supplier_id = pr.supplier_id
      ORDER BY pr.return_date DESC, pr.return_no DESC
    `).all();
    const itemStmt = db.prepare(`
      SELECT pri.*, i.item_name
      FROM purchase_return_items pri
      JOIN items i ON i.item_code = pri.item_code
      WHERE pri.return_no = ?
    `);
    res.json({ returns: returns.map((r) => ({ ...r, items: itemStmt.all(r.return_no) })) });
  });

  router.post('/purchase-returns', requirePermission('purchases', 'add'), (req, res) => {
    const { return_date, invoice_no = null, supplier_id, refund_method = 'خصم من الحساب', reason = '', items } = req.body || {};
    if (!return_date || !supplier_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'بيانات إشعار رد المشتريات غير مكتملة' });
    }
    try {
      const out = runInTransaction(db, () => {
        const supp = getSupplierBalance(db, supplier_id);
        const returnNo = nextDocNumber(db, 'purchase_returns', 'return_no', 'PRET');
        let total = 0;

        const clean = items.map((r, idx) => {
          const item = db.prepare(`SELECT * FROM items WHERE item_code = ?`).get(r.item_code);
          if (!item) throw new Error(`الصنف (${r.item_code}) غير موجود`);
          const qty = Number(r.quantity || 0);
          if (item.current_balance < qty) throw new Error(`الرصيد الحالي للصنف (${item.item_name}) أقل من الكمية المراد ردها`);
          const price = Number(r.unit_price ?? item.cost_price);
          const net = round2(qty * price);
          total = round2(total + net);
          return { line_no: idx + 1, item_code: item.item_code, quantity: qty, unit_price: price, net_amount: net };
        });

        const debitAcc = refund_method === 'نقدي' ? '1101' : '2101';
        const je = postJournalEntryRaw(db, {
          entry_date: return_date,
          reference_type: 'إشعار رد مشتريات',
          reference_no: returnNo,
          description: `رد مشتريات رقم ${returnNo} للمورد ${supp.supplier_name}`,
          lines: [
            { account_code: debitAcc, debit: total, credit: 0, notes: `تخفيض التزام المورد ${supp.supplier_name}` },
            { account_code: '1104', debit: 0, credit: total, notes: `صرف البضاعة المرتجعة للمورد ${returnNo}` },
          ],
          created_by: req.user.username,
        });

        db.prepare(`
          INSERT INTO purchase_returns (return_no, return_date, invoice_no, supplier_id, refund_method, total_amount, reason, journal_entry_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(returnNo, return_date, invoice_no, supplier_id, refund_method, total, reason, je.entry_number);

        const insLine = db.prepare(`INSERT INTO purchase_return_items (line_no, return_no, item_code, quantity, unit_price, net_amount) VALUES (?, ?, ?, ?, ?, ?)`);
        const updStock = db.prepare(`UPDATE items SET current_balance = ROUND(current_balance - ?, 2) WHERE item_code = ?`);
        const insMove = db.prepare(`
          INSERT INTO item_movements (movement_date, item_code, movement_type, doc_no, qty_in, qty_out, unit_price, balance_after, notes)
          VALUES (?, ?, 'مردودات مشتريات', ?, 0, ?, ?, ?, ?)
        `);

        for (const r of clean) {
          insLine.run(r.line_no, returnNo, r.item_code, r.quantity, r.unit_price, r.net_amount);
          updStock.run(r.quantity, r.item_code);
          const updated = db.prepare(`SELECT current_balance FROM items WHERE item_code = ?`).get(r.item_code);
          insMove.run(return_date, r.item_code, returnNo, r.quantity, r.unit_price, updated.current_balance, reason || `رد للمورد ${supp.supplier_name}`);
        }

        if (refund_method === 'خصم من الحساب') {
          db.prepare(`
            INSERT INTO supplier_transactions (doc_no, supplier_id, tx_date, debit, credit, tx_type, payment_method, notes, journal_entry_number)
            VALUES (?, ?, ?, ?, 0, 'مردودات مشتريات', 'خصم إشعار مدين', ?, ?)
          `).run(returnNo, supplier_id, return_date, total, reason || `رد مشتريات ${returnNo}`, je.entry_number);
        }

        return { return_no: returnNo, total_amount: total, journal_entry_number: je.entry_number };
      });
      res.status(201).json({ message: 'تم حفظ إشعار رد المشتريات وتحديث المخزون وحساب المورد', ...out });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/supplier-payments', requirePermission('purchases', 'view'), (_req, res) => {
    const payments = db.prepare(`
      SELECT st.*, s.supplier_name
      FROM supplier_transactions st
      JOIN suppliers s ON s.supplier_id = st.supplier_id
      WHERE st.debit > 0
      ORDER BY st.tx_date DESC, st.id DESC
    `).all();
    res.json({ payments });
  });

  router.post('/supplier-payments', requirePermission('purchases', 'add'), (req, res) => {
    const { supplier_id, tx_date, amount, payment_method = 'نقدي', bank_account_number = null, check_number = '', notes = '' } = req.body || {};
    const val = round2(Number(amount || 0));
    if (!supplier_id || !tx_date || val <= 0) {
      return res.status(400).json({ error: 'المورد والتاريخ والمبلغ المسدد حقول إلزامية' });
    }
    try {
      const out = runInTransaction(db, () => {
        const supp = getSupplierBalance(db, supplier_id);
        const docNo = nextDocNumber(db, 'treasury_vouchers', 'voucher_no', 'PAY');
        const { accountCode, bank } = resolveSettlementAccount(db, payment_method, bank_account_number);

        const je = postJournalEntryRaw(db, {
          entry_date: tx_date,
          reference_type: 'سند سداد مورد',
          reference_no: docNo,
          description: `سداد مستحقات للمورد ${supp.supplier_name} (${payment_method})`,
          lines: [
            { account_code: '2101', debit: val, credit: 0, notes: `سداد للمورد ${supp.supplier_name}` },
            { account_code: accountCode, debit: 0, credit: val, notes: notes || `صرف سداد مورد سند ${docNo}` },
          ],
          created_by: req.user.username,
        });

        if (bank) {
          db.prepare(`UPDATE bank_accounts SET balance = ROUND(balance - ?, 2) WHERE bank_account_number = ?`).run(val, bank.bank_account_number);
        }

        db.prepare(`
          INSERT INTO supplier_transactions (doc_no, supplier_id, tx_date, debit, credit, tx_type, payment_method, bank_account_number, check_number, notes, journal_entry_number)
          VALUES (?, ?, ?, ?, 0, 'سداد لمورد', ?, ?, ?, ?, ?)
        `).run(docNo, supplier_id, tx_date, val, payment_method, bank_account_number || null, check_number, notes || 'سداد لمورد', je.entry_number);

        db.prepare(`
          INSERT INTO treasury_vouchers (voucher_no, voucher_type, payment_method, voucher_date, amount, account_code, bank_account_number, check_number, beneficiary_name, notes, journal_entry_number)
          VALUES (?, 'payment', ?, ?, ?, '2101', ?, ?, ?, ?, ?)
        `).run(docNo, payment_method, tx_date, val, bank_account_number || null, check_number, supp.supplier_name, notes, je.entry_number);

        return { doc_no: docNo, journal_entry_number: je.entry_number, new_supplier_balance: getSupplierBalance(db, supplier_id).net_balance };
      });
      res.status(201).json({ message: 'تم إثبات السداد للمورد وتحديث رصيده اللحظي بنجاح', ...out });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // =========================================================================
  // 4. المخزون السلعي (أذون الإضافة + أذون الصرف + بطاقة الصنف)
  // =========================================================================
  router.get('/stock-additions', requirePermission('inventory', 'view'), (_req, res) => {
    const additions = db.prepare(`
      SELECT sa.*, s.supplier_name
      FROM stock_additions sa
      LEFT JOIN suppliers s ON s.supplier_id = sa.supplier_id
      ORDER BY sa.addition_date DESC, sa.addition_no DESC
    `).all();
    const itemStmt = db.prepare(`
      SELECT sai.*, i.item_name, i.unit_of_measure
      FROM stock_addition_items sai
      JOIN items i ON i.item_code = sai.item_code
      WHERE sai.addition_no = ?
    `);
    res.json({ additions: additions.map((a) => ({ ...a, items: itemStmt.all(a.addition_no) })) });
  });

  router.post('/stock-additions', requirePermission('inventory', 'add'), (req, res) => {
    const { addition_date, warehouse_name = 'المخزن الرئيسي', supplier_id = null, reference_doc = '', notes = '', items } = req.body || {};
    if (!addition_date || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'تاريخ الإذن والأصناف المضافة مطلوبة' });
    }
    try {
      const out = runInTransaction(db, () => {
        const addNo = nextDocNumber(db, 'stock_additions', 'addition_no', 'ADD');
        let totalVal = 0;

        const rows = items.map((r, idx) => {
          const item = db.prepare(`SELECT * FROM items WHERE item_code = ?`).get(r.item_code);
          if (!item) throw new Error(`الصنف (${r.item_code}) غير موجود`);
          const qty = Number(r.quantity || 0);
          if (qty <= 0) throw new Error('الكمية يجب أن تكون أكبر من الصفر');
          const cost = Number(r.unit_cost ?? item.cost_price);
          const total = round2(qty * cost);
          totalVal = round2(totalVal + total);
          return { line_no: idx + 1, item_code: item.item_code, quantity: qty, unit_cost: cost, total_cost: total };
        });

        db.prepare(`
          INSERT INTO stock_additions (addition_no, addition_date, warehouse_name, supplier_id, reference_doc, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(addNo, addition_date, warehouse_name, supplier_id || null, reference_doc, notes);

        const ins = db.prepare(`INSERT INTO stock_addition_items (line_no, addition_no, item_code, quantity, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?)`);
        const upd = db.prepare(`UPDATE items SET current_balance = ROUND(current_balance + ?, 2) WHERE item_code = ?`);
        const mov = db.prepare(`
          INSERT INTO item_movements (movement_date, item_code, movement_type, doc_no, qty_in, qty_out, unit_price, balance_after, notes)
          VALUES (?, ?, 'إذن إضافة مخزني', ?, ?, 0, ?, ?, ?)
        `);

        for (const r of rows) {
          ins.run(r.line_no, addNo, r.item_code, r.quantity, r.unit_cost, r.total_cost);
          upd.run(r.quantity, r.item_code);
          const cur = db.prepare(`SELECT current_balance FROM items WHERE item_code = ?`).get(r.item_code);
          mov.run(addition_date, r.item_code, addNo, r.quantity, r.unit_cost, cur.current_balance, notes || 'إذن إضافة للمخزن');
        }

        if (totalVal > 0) {
          postJournalEntryRaw(db, {
            entry_date: addition_date,
            reference_type: 'إذن إضافة مخزني',
            reference_no: addNo,
            description: `إثبات إذن إضافة أصناف للمخزن رقم ${addNo}`,
            lines: [
              { account_code: '1104', debit: totalVal, credit: 0, notes: `زيادة المخزون بموجب إذن إضافة ${addNo}` },
              { account_code: '4202', debit: 0, credit: totalVal, notes: `تسوية مخزنية / توريد داخلي ${addNo}` },
            ],
            created_by: req.user.username,
          });
        }

        return { addition_no: addNo, total_cost: totalVal };
      });
      res.status(201).json({ message: 'تم حفظ إذن الإضافة وتحديث بطاقات الأصناف بنجاح', ...out });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/stock-issues', requirePermission('inventory', 'view'), (_req, res) => {
    const issues = db.prepare(`
      SELECT si.*, d.dept_name
      FROM stock_issues si
      LEFT JOIN departments d ON d.dept_code = si.dept_code
      ORDER BY si.issue_date DESC, si.issue_no DESC
    `).all();
    const itemStmt = db.prepare(`
      SELECT sii.*, i.item_name, i.unit_of_measure
      FROM stock_issue_items sii
      JOIN items i ON i.item_code = sii.item_code
      WHERE sii.issue_no = ?
    `);
    res.json({ issues: issues.map((iss) => ({ ...iss, items: itemStmt.all(iss.issue_no) })) });
  });

  router.post('/stock-issues', requirePermission('inventory', 'add'), (req, res) => {
    const { issue_date, warehouse_name = 'المخزن الرئيسي', dept_code = null, reference_doc = '', notes = '', items } = req.body || {};
    if (!issue_date || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'تاريخ إذن الصرف والأصناف المنصرفة مطلوبة' });
    }
    try {
      const out = runInTransaction(db, () => {
        const issueNo = nextDocNumber(db, 'stock_issues', 'issue_no', 'ISS');
        let totalVal = 0;

        const rows = items.map((r, idx) => {
          const item = db.prepare(`SELECT * FROM items WHERE item_code = ?`).get(r.item_code);
          if (!item) throw new Error(`الصنف (${r.item_code}) غير موجود`);
          const qty = Number(r.quantity || 0);
          if (qty <= 0) throw new Error('الكمية يجب أن تكون أكبر من الصفر');
          if (item.current_balance < qty) {
            throw new Error(`الرصيد الحالي للصنف (${item.item_name}) هو ${item.current_balance} ولا يكفي للصرف`);
          }
          const cost = Number(item.cost_price || 0);
          const total = round2(qty * cost);
          totalVal = round2(totalVal + total);
          return { line_no: idx + 1, item_code: item.item_code, quantity: qty, unit_cost: cost, total_cost: total };
        });

        db.prepare(`
          INSERT INTO stock_issues (issue_no, issue_date, warehouse_name, dept_code, reference_doc, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(issueNo, issue_date, warehouse_name, dept_code || null, reference_doc, notes);

        const ins = db.prepare(`INSERT INTO stock_issue_items (line_no, issue_no, item_code, quantity, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?)`);
        const upd = db.prepare(`UPDATE items SET current_balance = ROUND(current_balance - ?, 2) WHERE item_code = ?`);
        const mov = db.prepare(`
          INSERT INTO item_movements (movement_date, item_code, movement_type, doc_no, qty_in, qty_out, unit_price, balance_after, notes)
          VALUES (?, ?, 'إذن صرف مخزني', ?, 0, ?, ?, ?, ?)
        `);

        for (const r of rows) {
          ins.run(r.line_no, issueNo, r.item_code, r.quantity, r.unit_cost, r.total_cost);
          upd.run(r.quantity, r.item_code);
          const cur = db.prepare(`SELECT current_balance FROM items WHERE item_code = ?`).get(r.item_code);
          mov.run(issue_date, r.item_code, issueNo, r.quantity, r.unit_cost, cur.current_balance, notes || 'إذن صرف من المخزن');
        }

        if (totalVal > 0) {
          postJournalEntryRaw(db, {
            entry_date: issue_date,
            reference_type: 'إذن صرف مخزني',
            reference_no: issueNo,
            description: `صرف مستلزمات/أصناف من المخزن بموجب إذن رقم ${issueNo}`,
            lines: [
              { account_code: '3102', debit: totalVal, credit: 0, notes: `مصروفات مستلزمات منصرفة إذن ${issueNo}` },
              { account_code: '1104', debit: 0, credit: totalVal, notes: `تخفيض المخزون بإذن صرف ${issueNo}` },
            ],
            created_by: req.user.username,
          });
        }

        return { issue_no: issueNo, total_cost: totalVal };
      });
      res.status(201).json({ message: 'تم حفظ إذن الصرف وتحديث الرصيد اللحظي للصنف', ...out });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // =========================================================================
  // 5. الموارد البشرية (الحضور والانصراف + احتساب المستحقات الشهرية)
  // =========================================================================
  router.get('/attendance', requirePermission('hr', 'view'), (_req, res) => {
    const records = db.prepare(`
      SELECT ar.*, e.employee_name, e.job_title, d.dept_name
      FROM attendance_records ar
      JOIN employees e ON e.employee_code = ar.employee_code
      LEFT JOIN departments d ON d.dept_code = e.dept_code
      ORDER BY ar.att_date DESC, ar.id DESC
    `).all();
    res.json({ records });
  });

  router.post('/attendance', requirePermission('hr', 'add'), (req, res) => {
    const { employee_code, att_date, check_in = '08:30', check_out = '16:30', status = 'حاضر', late_minutes = 0, overtime_hours = 0, notes = '' } = req.body || {};
    if (!employee_code || !att_date) {
      return res.status(400).json({ error: 'كود الموظف والتاريخ حقول إلزامية' });
    }
    db.prepare(`
      INSERT INTO attendance_records (employee_code, att_date, check_in, check_out, status, late_minutes, overtime_hours, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(employee_code, att_date, check_in, check_out, status, Number(late_minutes || 0), Number(overtime_hours || 0), notes);
    res.status(201).json({ message: 'تم تسجيل حركة الحضور والانصراف بنجاح' });
  });

  router.get('/payrolls', requirePermission('hr', 'view'), (req, res) => {
    const { month, year } = req.query;
    let sql = `
      SELECT mp.*, e.employee_name, e.job_title, d.dept_name
      FROM monthly_payrolls mp
      JOIN employees e ON e.employee_code = mp.employee_code
      LEFT JOIN departments d ON d.dept_code = e.dept_code
    `;
    const params = [];
    if (month && year) {
      sql += ` WHERE mp.month = ? AND mp.year = ?`;
      params.push(Number(month), Number(year));
    }
    sql += ` ORDER BY mp.year DESC, mp.month DESC, mp.employee_code ASC`;
    res.json({ payrolls: db.prepare(sql).all(...params) });
  });

  router.post('/payrolls/generate', requirePermission('hr', 'add'), (req, res) => {
    const {
      month,
      year,
      employee_code = null, // إذا تُرك فارغاً يتم احتساب جميع العاملين النشطين
      incentives = 0,
      extra_deductions = 0,
      payment_method = 'نقدي',
      bank_account_number = null,
    } = req.body || {};

    const m = Number(month);
    const y = Number(year);
    if (!m || !y || m < 1 || m > 12) {
      return res.status(400).json({ error: 'يرجى تحديد الشهر والسنة بشكل صحيح' });
    }

    try {
      const out = runInTransaction(db, () => {
        const emps = employee_code
          ? db.prepare(`SELECT * FROM employees WHERE employee_code = ? AND status = 'نشط'`).all(employee_code)
          : db.prepare(`SELECT * FROM employees WHERE status = 'نشط'`).all();

        if (emps.length === 0) throw new Error('لا يوجد موظفون نشطون مطابقون للاحتساب');

        const monthPrefix = `${y}-${String(m).padStart(2, '0')}`;
        let batchNetTotal = 0;
        const calculated = [];

        for (const emp of emps) {
          const exists = db.prepare(`SELECT id FROM monthly_payrolls WHERE employee_code = ? AND month = ? AND year = ?`).get(emp.employee_code, m, y);
          if (exists) continue;

          // احتساب تلقائي للغياب والتأخير والإضافي من سجل الحضور والانصراف للشهر
          const attStats = db.prepare(`
            SELECT
              SUM(CASE WHEN status = 'غائب' THEN 1 ELSE 0 END) AS absent_days,
              COALESCE(SUM(late_minutes), 0) AS total_late_mins,
              COALESCE(SUM(overtime_hours), 0) AS total_overtime_hrs
            FROM attendance_records
            WHERE employee_code = ? AND att_date LIKE ?
          `).get(emp.employee_code, `${monthPrefix}%`);

          const dailyRate = emp.basic_salary / 30;
          const hourlyRate = dailyRate / 8;
          const allowances = round2(emp.housing_allowance + emp.transport_allowance + emp.meal_allowance + emp.other_allowances);
          const overtimePay = round2(Number(attStats.total_overtime_hrs || 0) * hourlyRate * 1.5);
          const attDeduction = round2(
            Number(attStats.absent_days || 0) * dailyRate +
            (Number(attStats.total_late_mins || 0) / 60) * hourlyRate
          );
          const totalDeductions = round2(attDeduction + Number(extra_deductions || 0));
          const empIncentives = round2(Number(incentives || 0));
          const netSalary = round2(emp.basic_salary + allowances + empIncentives + overtimePay - totalDeductions);

          batchNetTotal = round2(batchNetTotal + netSalary);
          calculated.push({
            employee_code: emp.employee_code,
            employee_name: emp.employee_name,
            basic_salary: emp.basic_salary,
            allowances,
            incentives: empIncentives,
            overtime_pay: overtimePay,
            deductions: totalDeductions,
            net_salary: netSalary,
          });
        }

        if (calculated.length === 0) {
          throw new Error(`تم احتساب وصرف مستحقات الشهر (${m}/${y}) مسبقاً لهؤلاء العاملين`);
        }

        const { accountCode, bank } = resolveSettlementAccount(db, payment_method, bank_account_number);
        const je = postJournalEntryRaw(db, {
          entry_date: `${monthPrefix}-28`,
          reference_type: 'مسير رواتب وأجور',
          reference_no: `PAYROLL-${y}-${String(m).padStart(2, '0')}`,
          description: `إثبات وصرف المستحقات الشهرية للعاملين عن شهر ${m}/${y}`,
          lines: [
            { account_code: '3201', debit: batchNetTotal, credit: 0, notes: `صافي رواتب ومستحقات شهر ${m}/${y}` },
            { account_code: accountCode, debit: 0, credit: batchNetTotal, notes: `سداد الرواتب (${payment_method})` },
          ],
          created_by: req.user.username,
        });

        if (bank) {
          db.prepare(`UPDATE bank_accounts SET balance = ROUND(balance - ?, 2) WHERE bank_account_number = ?`).run(batchNetTotal, bank.bank_account_number);
        }

        const ins = db.prepare(`
          INSERT INTO monthly_payrolls (employee_code, month, year, basic_salary, allowances, incentives, overtime_pay, deductions, net_salary, is_paid, journal_entry_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        `);
        for (const c of calculated) {
          ins.run(c.employee_code, m, y, c.basic_salary, c.allowances, c.incentives, c.overtime_pay, c.deductions, c.net_salary, je.entry_number);
        }

        return { count: calculated.length, total_net: batchNetTotal, journal_entry_number: je.entry_number };
      });

      logAudit(db, {
        username: req.user.username,
        user_role: req.user.role_code,
        module: 'الموارد البشرية',
        action: 'احتساب وصرف مسير رواتب',
        entity_id: `${m}/${y}`,
        details: `عدد العاملين: ${out.count} — الإجمالي: ${out.total_net}`,
      });
      res.status(201).json({ message: 'تم احتساب المستحقات الشهرية وترحيل قيد الأجور تلقائياً', ...out });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
};
