const express = require('express');
const { round2 } = require('../accountingEngine');

module.exports = function createReportsRouter(db, authenticate) {
  const router = express.Router();
  router.use(authenticate);

  function getAccountsSummary() {
    return db.prepare(`
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
    `).all().map((r) => {
      const sumDebit = round2(r.opening_debit + r.mov_debit);
      const sumCredit = round2(r.opening_credit + r.mov_credit);
      const diff = round2(sumDebit - sumCredit);
      return {
        ...r,
        mov_debit: round2(r.mov_debit),
        mov_credit: round2(r.mov_credit),
        sum_debit: sumDebit,
        sum_credit: sumCredit,
        closing_debit: diff > 0 ? diff : 0,
        closing_credit: diff < 0 ? Math.abs(diff) : 0,
        natural_balance: r.account_nature === 'debit' ? round2(sumDebit - sumCredit) : round2(sumCredit - sumDebit),
      };
    });
  }

  // =========================================================================
  // لوحة التحكم الرئيسية + الاستعلامات الذكية والرقابية
  // =========================================================================
  router.get('/dashboard', (_req, res) => {
    const accs = getAccountsSummary();
    const byCode = Object.fromEntries(accs.map((a) => [a.account_code, a]));

    const cashAndBanks = round2((byCode['1101']?.natural_balance || 0) + (byCode['1102']?.natural_balance || 0));
    const totalReceivables = round2(byCode['1103']?.natural_balance || 0);
    const totalPayables = round2(byCode['2101']?.natural_balance || 0);
    const inventoryValue = round2(
      db.prepare(`SELECT COALESCE(SUM(current_balance * cost_price), 0) AS val FROM items`).get().val
    );

    const revenues = accs
      .filter((a) => a.main_group_code === '4')
      .reduce((s, a) => s + a.natural_balance, 0);
    const expenses = accs
      .filter((a) => a.main_group_code === '3')
      .reduce((s, a) => s + a.natural_balance, 0);
    const netProfit = round2(revenues - expenses);

    // تنبيهات نقطة إعادة الطلب ومخزون الأمان
    const defaultSupplier = db.prepare(`SELECT supplier_id, supplier_name FROM suppliers ORDER BY supplier_id LIMIT 1`).get();
    const reorderAlerts = db.prepare(`
      SELECT i.*, ig.group_name
      FROM items i
      JOIN item_groups ig ON ig.group_code = i.group_code
      WHERE i.current_balance <= i.reorder_point
      ORDER BY (i.current_balance - i.safety_stock) ASC
    `).all().map((it) => ({
      ...it,
      shortage: round2(Math.max(0, it.reorder_point - it.current_balance)),
      recommended_order_qty: it.eoq > 0 ? it.eoq : Math.max(10, it.reorder_point * 2),
      suggested_supplier_id: defaultSupplier?.supplier_id || 'SUP-001',
      suggested_supplier_name: defaultSupplier?.supplier_name || '',
    }));

    // تحقق التوازن المحاسبي ومطابقة أرصدة الأصناف
    const jeTotals = db.prepare(`
      SELECT COALESCE(SUM(debit), 0) AS d, COALESCE(SUM(credit), 0) AS c FROM journal_entry_lines
    `).get();
    const openTotals = db.prepare(`
      SELECT COALESCE(SUM(opening_debit), 0) AS d, COALESCE(SUM(opening_credit), 0) AS c FROM accounts
    `).get();

    const stockMismatchCount = db.prepare(`
      SELECT COUNT(*) AS cnt FROM (
        SELECT i.item_code, i.current_balance,
               COALESCE(SUM(im.qty_in - im.qty_out), 0) AS card_balance
        FROM items i
        LEFT JOIN item_movements im ON im.item_code = i.item_code
        GROUP BY i.item_code
        HAVING ABS(i.current_balance - card_balance) >= 0.01
      )
    `).get().cnt;

    const monthlySales = db.prepare(`
      SELECT SUBSTR(invoice_date, 1, 7) AS month,
             COUNT(*) AS invoice_count,
             ROUND(SUM(net_total), 2) AS total_sales
      FROM sales_invoices
      GROUP BY SUBSTR(invoice_date, 1, 7)
      ORDER BY month ASC
    `).all();

    const recentEntries = db.prepare(`
      SELECT * FROM journal_entries ORDER BY entry_date DESC, entry_number DESC LIMIT 6
    `).all();

    const counts = {
      customers: db.prepare(`SELECT COUNT(*) AS c FROM customers`).get().c,
      suppliers: db.prepare(`SELECT COUNT(*) AS c FROM suppliers`).get().c,
      items: db.prepare(`SELECT COUNT(*) AS c FROM items`).get().c,
      employees: db.prepare(`SELECT COUNT(*) AS c FROM employees WHERE status = 'نشط'`).get().c,
      sales_invoices: db.prepare(`SELECT COUNT(*) AS c FROM sales_invoices`).get().c,
      purchase_orders_open: db.prepare(`SELECT COUNT(*) AS c FROM purchase_orders WHERE status = 'قيد التنفيذ'`).get().c,
    };

    res.json({
      kpis: {
        cash_and_banks: cashAndBanks,
        total_receivables: totalReceivables,
        total_payables: totalPayables,
        inventory_value: inventoryValue,
        total_revenues: round2(revenues),
        total_expenses: round2(expenses),
        net_profit: netProfit,
      },
      counts,
      reorderAlerts,
      integrity: {
        journal_debit: round2(jeTotals.d),
        journal_credit: round2(jeTotals.c),
        journal_balanced: Math.abs(jeTotals.d - jeTotals.c) < 0.01,
        opening_debit: round2(openTotals.d),
        opening_credit: round2(openTotals.c),
        opening_balanced: Math.abs(openTotals.d - openTotals.c) < 0.01,
        stock_reconciled: stockMismatchCount === 0,
        stock_mismatch_count: stockMismatchCount,
      },
      monthlySales,
      recentEntries,
    });
  });

  // =========================================================================
  // أولاً: التقارير المالية
  // =========================================================================
  router.get('/financial', (req, res) => {
    const { type = 'trial-balance', account_code, from, to } = req.query;

    if (type === 'general-journal') {
      let sql = `SELECT * FROM journal_entries WHERE 1=1`;
      const params = [];
      if (from) { sql += ` AND entry_date >= ?`; params.push(from); }
      if (to) { sql += ` AND entry_date <= ?`; params.push(to); }
      sql += ` ORDER BY entry_date ASC, entry_number ASC`;

      const entries = db.prepare(sql).all(...params);
      const lineStmt = db.prepare(`
        SELECT jl.*, a.account_name
        FROM journal_entry_lines jl
        JOIN accounts a ON a.account_code = jl.account_code
        WHERE jl.entry_number = ?
        ORDER BY jl.line_no ASC
      `);
      const detailed = entries.map((e) => ({ ...e, lines: lineStmt.all(e.entry_number) }));
      const grandDebit = round2(detailed.reduce((s, e) => s + e.total_debit, 0));
      const grandCredit = round2(detailed.reduce((s, e) => s + e.total_credit, 0));
      return res.json({ entries: detailed, grandDebit, grandCredit });
    }

    if (type === 'general-ledger') {
      const targetCode = account_code || '1101';
      const acc = db.prepare(`
        SELECT a.*, sg.sub_group_name, mg.group_name AS main_group_name, mg.account_nature
        FROM accounts a
        JOIN account_sub_groups sg ON sg.sub_group_code = a.sub_group_code
        JOIN account_main_groups mg ON mg.main_group_code = sg.main_group_code
        WHERE a.account_code = ?
      `).get(targetCode);
      if (!acc) return res.status(404).json({ error: 'الحساب غير موجود' });

      const lines = db.prepare(`
        SELECT jl.*, je.entry_date, je.reference_type, je.reference_no, je.description
        FROM journal_entry_lines jl
        JOIN journal_entries je ON je.entry_number = jl.entry_number
        WHERE jl.account_code = ?
        ORDER BY je.entry_date ASC, je.entry_number ASC, jl.line_no ASC
      `).all(targetCode);

      let running = acc.account_nature === 'debit'
        ? round2(acc.opening_debit - acc.opening_credit)
        : round2(acc.opening_credit - acc.opening_debit);

      const ledgerRows = lines.map((l) => {
        running = acc.account_nature === 'debit'
          ? round2(running + l.debit - l.credit)
          : round2(running + l.credit - l.debit);
        return { ...l, running_balance: running };
      });

      return res.json({
        account: acc,
        opening_balance: acc.account_nature === 'debit'
          ? round2(acc.opening_debit - acc.opening_credit)
          : round2(acc.opening_credit - acc.opening_debit),
        rows: ledgerRows,
        closing_balance: running,
      });
    }

    const summary = getAccountsSummary();

    if (type === 'trial-balance') {
      const totals = summary.reduce((acc, r) => ({
        opening_debit: round2(acc.opening_debit + r.opening_debit),
        opening_credit: round2(acc.opening_credit + r.opening_credit),
        mov_debit: round2(acc.mov_debit + r.mov_debit),
        mov_credit: round2(acc.mov_credit + r.mov_credit),
        sum_debit: round2(acc.sum_debit + r.sum_debit),
        sum_credit: round2(acc.sum_credit + r.sum_credit),
        closing_debit: round2(acc.closing_debit + r.closing_debit),
        closing_credit: round2(acc.closing_credit + r.closing_credit),
      }), {
        opening_debit: 0, opening_credit: 0, mov_debit: 0, mov_credit: 0,
        sum_debit: 0, sum_credit: 0, closing_debit: 0, closing_credit: 0,
      });
      return res.json({ rows: summary, totals });
    }

    if (type === 'income-statement') {
      const salesAcc = summary.find((a) => a.account_code === '4101')?.natural_balance || 0;
      const salesReturnsDisc = summary.find((a) => a.account_code === '3204')?.natural_balance || 0;
      const netSales = round2(salesAcc - salesReturnsDisc);
      const cogs = summary.find((a) => a.account_code === '3101')?.natural_balance || 0;
      const grossProfit = round2(netSales - cogs);

      const otherRevenues = summary.filter((a) => a.main_group_code === '4' && a.account_code !== '4101');
      const totalOtherRev = round2(otherRevenues.reduce((s, a) => s + a.natural_balance, 0));

      const operatingExpenses = summary.filter(
        (a) => a.main_group_code === '3' && !['3101', '3204'].includes(a.account_code) && a.natural_balance !== 0
      );
      const totalOpEx = round2(operatingExpenses.reduce((s, a) => s + a.natural_balance, 0));
      const netIncome = round2(grossProfit + totalOtherRev - totalOpEx);

      return res.json({
        gross_sales: round2(salesAcc),
        sales_returns_and_discounts: round2(salesReturnsDisc),
        net_sales: netSales,
        cost_of_goods_sold: round2(cogs),
        gross_profit: grossProfit,
        other_revenues: otherRevenues,
        total_other_revenues: totalOtherRev,
        operating_expenses: operatingExpenses,
        total_operating_expenses: totalOpEx,
        net_income: netIncome,
      });
    }

    if (type === 'balance-sheet') {
      const currentAssets = summary.filter((a) => a.sub_group_code === '11');
      const fixedAssets = summary.filter((a) => a.sub_group_code === '12');
      const currentLiabilities = summary.filter((a) => a.sub_group_code === '21');
      const longTermLiabilities = summary.filter((a) => a.sub_group_code === '22');
      const equityAccounts = summary.filter((a) => a.sub_group_code === '23');

      const revenues = summary.filter((a) => a.main_group_code === '4').reduce((s, a) => s + a.natural_balance, 0);
      const expenses = summary.filter((a) => a.main_group_code === '3').reduce((s, a) => s + a.natural_balance, 0);
      const currentPeriodNetIncome = round2(revenues - expenses);

      const totalCurrentAssets = round2(currentAssets.reduce((s, a) => s + a.natural_balance, 0));
      const totalFixedAssets = round2(fixedAssets.reduce((s, a) => s + a.natural_balance, 0));
      const totalAssets = round2(totalCurrentAssets + totalFixedAssets);

      const totalCurrentLiab = round2(currentLiabilities.reduce((s, a) => s + a.natural_balance, 0));
      const totalLongLiab = round2(longTermLiabilities.reduce((s, a) => s + a.natural_balance, 0));
      const totalEquityBase = round2(equityAccounts.reduce((s, a) => s + a.natural_balance, 0));
      const totalEquityWithProfit = round2(totalEquityBase + currentPeriodNetIncome);
      const totalLiabilitiesAndEquity = round2(totalCurrentLiab + totalLongLiab + totalEquityWithProfit);

      return res.json({
        currentAssets,
        fixedAssets,
        totalCurrentAssets,
        totalFixedAssets,
        totalAssets,
        currentLiabilities,
        longTermLiabilities,
        equityAccounts,
        currentPeriodNetIncome,
        totalCurrentLiab,
        totalLongLiab,
        totalEquityWithProfit,
        totalLiabilitiesAndEquity,
        is_balanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
      });
    }

    if (type === 'cash-flow') {
      const cashAccounts = summary.filter((a) => ['1101', '1102'].includes(a.account_code));
      const openingCash = round2(cashAccounts.reduce((s, a) => s + a.opening_debit - a.opening_credit, 0));
      const closingCash = round2(cashAccounts.reduce((s, a) => s + a.natural_balance, 0));

      // تصنيف الحركات النقدية والبنكية الفعلية من قيود اليومية
      const cashEntries = db.prepare(`
        SELECT je.entry_number, je.entry_date, je.reference_type, je.description,
               SUM(CASE WHEN jl.account_code IN ('1101','1102') THEN jl.debit ELSE 0 END) AS cash_in,
               SUM(CASE WHEN jl.account_code IN ('1101','1102') THEN jl.credit ELSE 0 END) AS cash_out
        FROM journal_entries je
        JOIN journal_entry_lines jl ON jl.entry_number = je.entry_number
        GROUP BY je.entry_number
        HAVING cash_in > 0 OR cash_out > 0
        ORDER BY je.entry_date ASC, je.entry_number ASC
      `).all().map((e) => ({
        ...e,
        net_cash: round2(e.cash_in - e.cash_out),
      }));

      const totalCashIn = round2(cashEntries.reduce((s, e) => s + e.cash_in, 0));
      const totalCashOut = round2(cashEntries.reduce((s, e) => s + e.cash_out, 0));
      const netChange = round2(totalCashIn - totalCashOut);

      return res.json({
        opening_cash: openingCash,
        total_cash_in: totalCashIn,
        total_cash_out: totalCashOut,
        net_change: netChange,
        closing_cash: closingCash,
        operating_flows: cashEntries,
      });
    }

    res.status(400).json({ error: 'نوع التقرير المالي غير معروف' });
  });

  // =========================================================================
  // ثانياً: تقارير المبيعات والعملاء
  // =========================================================================
  router.get('/sales', (req, res) => {
    const { type = 'customer-balances', customer_id } = req.query;

    if (type === 'customer-balances') {
      const rows = db.prepare(`
        SELECT c.*,
               COALESCE(SUM(ct.debit), 0) AS total_debit,
               COALESCE(SUM(ct.credit), 0) AS total_credit
        FROM customers c
        LEFT JOIN customer_transactions ct ON ct.customer_id = c.customer_id
        GROUP BY c.customer_id
        ORDER BY c.customer_id
      `).all().map((c) => {
        const net = round2(c.opening_balance + c.total_debit - c.total_credit);
        return {
          ...c,
          total_debit: round2(c.total_debit),
          total_credit: round2(c.total_credit),
          net_balance: net,
          credit_utilization_pct: c.credit_limit > 0 ? round2((net / c.credit_limit) * 100) : 0,
        };
      });
      const grandBalance = round2(rows.reduce((s, r) => s + r.net_balance, 0));
      return res.json({ rows, grandBalance });
    }

    if (type === 'customer-ledger') {
      const cid = customer_id || 'CUST-001';
      const customer = db.prepare(`SELECT * FROM customers WHERE customer_id = ?`).get(cid);
      if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });

      const txs = db.prepare(`
        SELECT * FROM customer_transactions WHERE customer_id = ? ORDER BY tx_date ASC, id ASC
      `).all(cid);
      let running = round2(customer.opening_balance);
      const rows = txs.map((t) => {
        running = round2(running + t.debit - t.credit);
        return { ...t, running_balance: running };
      });
      return res.json({ customer, opening_balance: customer.opening_balance, rows, closing_balance: running });
    }

    if (type === 'sales-analysis') {
      const byItem = db.prepare(`
        SELECT i.item_code, i.item_name, i.unit_of_measure,
               COALESCE(SUM(sii.quantity), 0) AS total_qty,
               ROUND(COALESCE(SUM(sii.discount_amount), 0), 2) AS total_discount,
               ROUND(COALESCE(SUM(sii.net_amount), 0), 2) AS total_sales
        FROM sales_invoice_items sii
        JOIN items i ON i.item_code = sii.item_code
        GROUP BY i.item_code
        ORDER BY total_sales DESC
      `).all();

      const byCustomer = db.prepare(`
        SELECT c.customer_id, c.customer_name, c.city,
               COUNT(si.invoice_no) AS invoice_count,
               ROUND(COALESCE(SUM(si.net_total), 0), 2) AS total_sales
        FROM sales_invoices si
        JOIN customers c ON c.customer_id = si.customer_id
        GROUP BY c.customer_id
        ORDER BY total_sales DESC
      `).all();

      const bySalesperson = db.prepare(`
        SELECT e.employee_code, e.employee_name, e.job_title,
               COUNT(si.invoice_no) AS invoice_count,
               ROUND(COALESCE(SUM(si.net_total), 0), 2) AS total_sales
        FROM sales_invoices si
        JOIN employees e ON e.employee_code = si.employee_code
        GROUP BY e.employee_code
        ORDER BY total_sales DESC
      `).all();

      const byMonth = db.prepare(`
        SELECT SUBSTR(invoice_date, 1, 7) AS month,
               COUNT(*) AS invoice_count,
               ROUND(SUM(gross_total), 2) AS gross_total,
               ROUND(SUM(discount_total), 2) AS discount_total,
               ROUND(SUM(net_total), 2) AS net_total
        FROM sales_invoices
        GROUP BY SUBSTR(invoice_date, 1, 7)
        ORDER BY month ASC
      `).all();

      return res.json({ byItem, byCustomer, bySalesperson, byMonth });
    }

    if (type === 'sales-returns') {
      const rows = db.prepare(`
        SELECT sr.*, c.customer_name
        FROM sales_returns sr
        JOIN customers c ON c.customer_id = sr.customer_id
        ORDER BY sr.return_date DESC
      `).all();
      return res.json({ rows, totalReturns: round2(rows.reduce((s, r) => s + r.total_amount, 0)) });
    }

    res.status(400).json({ error: 'نوع تقرير المبيعات غير معروف' });
  });

  // =========================================================================
  // ثالثاً: تقارير المشتريات والموردين
  // =========================================================================
  router.get('/purchases', (req, res) => {
    const { type = 'supplier-balances', supplier_id } = req.query;

    if (type === 'supplier-balances') {
      const rows = db.prepare(`
        SELECT s.*,
               COALESCE(SUM(st.debit), 0) AS total_debit,
               COALESCE(SUM(st.credit), 0) AS total_credit
        FROM suppliers s
        LEFT JOIN supplier_transactions st ON st.supplier_id = s.supplier_id
        GROUP BY s.supplier_id
        ORDER BY s.supplier_id
      `).all().map((s) => ({
        ...s,
        total_debit: round2(s.total_debit),
        total_credit: round2(s.total_credit),
        net_balance: round2(s.opening_balance + s.total_credit - s.total_debit),
      }));
      return res.json({ rows, grandBalance: round2(rows.reduce((s, r) => s + r.net_balance, 0)) });
    }

    if (type === 'supplier-ledger') {
      const sid = supplier_id || 'SUP-001';
      const supplier = db.prepare(`SELECT * FROM suppliers WHERE supplier_id = ?`).get(sid);
      if (!supplier) return res.status(404).json({ error: 'المورد غير موجود' });

      const txs = db.prepare(`SELECT * FROM supplier_transactions WHERE supplier_id = ? ORDER BY tx_date ASC, id ASC`).all(sid);
      let running = round2(supplier.opening_balance);
      const rows = txs.map((t) => {
        running = round2(running + t.credit - t.debit);
        return { ...t, running_balance: running };
      });
      return res.json({ supplier, opening_balance: supplier.opening_balance, rows, closing_balance: running });
    }

    if (type === 'purchases-journal') {
      const rows = db.prepare(`
        SELECT pi.*, s.supplier_name
        FROM purchase_invoices pi
        JOIN suppliers s ON s.supplier_id = pi.supplier_id
        ORDER BY pi.invoice_date DESC
      `).all();
      return res.json({ rows, totalPurchases: round2(rows.reduce((s, r) => s + r.net_total, 0)) });
    }

    if (type === 'supplier-payments') {
      const rows = db.prepare(`
        SELECT st.*, s.supplier_name
        FROM supplier_transactions st
        JOIN suppliers s ON s.supplier_id = st.supplier_id
        WHERE st.tx_type LIKE '%سداد%'
        ORDER BY st.tx_date DESC
      `).all();
      return res.json({ rows, totalPayments: round2(rows.reduce((s, r) => s + r.debit, 0)) });
    }

    if (type === 'purchase-returns') {
      const rows = db.prepare(`
        SELECT pr.*, s.supplier_name
        FROM purchase_returns pr
        JOIN suppliers s ON s.supplier_id = pr.supplier_id
        ORDER BY pr.return_date DESC
      `).all();
      return res.json({ rows, totalReturns: round2(rows.reduce((s, r) => s + r.total_amount, 0)) });
    }

    res.status(400).json({ error: 'نوع تقرير المشتريات غير معروف' });
  });

  // =========================================================================
  // رابعاً: تقارير المخازن
  // =========================================================================
  router.get('/inventory', (req, res) => {
    const { type = 'stock-balances', item_code } = req.query;

    if (type === 'stock-balances') {
      const rows = db.prepare(`
        SELECT i.*, ig.group_name,
               ROUND(i.current_balance * i.cost_price, 2) AS total_cost_value,
               ROUND(i.current_balance * i.unit_price, 2) AS total_market_value,
               CASE
                 WHEN i.current_balance <= i.safety_stock THEN 'حرج - تحت مخزون الأمان'
                 WHEN i.current_balance <= i.reorder_point THEN 'وصل لحد إعادة الطلب'
                 ELSE 'رصيد آمن'
               END AS status_label
        FROM items i
        JOIN item_groups ig ON ig.group_code = i.group_code
        ORDER BY i.item_code
      `).all();
      return res.json({
        rows,
        totalCostValue: round2(rows.reduce((s, r) => s + r.total_cost_value, 0)),
        totalMarketValue: round2(rows.reduce((s, r) => s + r.total_market_value, 0)),
      });
    }

    if (type === 'item-card') {
      const code = item_code || 'ITM-102';
      const item = db.prepare(`
        SELECT i.*, ig.group_name
        FROM items i
        JOIN item_groups ig ON ig.group_code = i.group_code
        WHERE i.item_code = ?
      `).get(code);
      if (!item) return res.status(404).json({ error: 'الصنف غير موجود' });

      const movements = db.prepare(`
        SELECT * FROM item_movements WHERE item_code = ? ORDER BY movement_date ASC, id ASC
      `).all(code);
      return res.json({ item, movements });
    }

    if (type === 'stock-reconciliation') {
      const rows = db.prepare(`
        SELECT i.item_code, i.item_name, i.unit_of_measure,
               i.current_balance AS master_balance,
               ROUND(COALESCE(SUM(im.qty_in), 0), 2) AS total_in,
               ROUND(COALESCE(SUM(im.qty_out), 0), 2) AS total_out,
               ROUND(COALESCE(SUM(im.qty_in - im.qty_out), 0), 2) AS movements_balance
        FROM items i
        LEFT JOIN item_movements im ON im.item_code = i.item_code
        GROUP BY i.item_code
        ORDER BY i.item_code
      `).all().map((r) => ({
        ...r,
        variance: round2(r.master_balance - r.movements_balance),
        is_matched: Math.abs(r.master_balance - r.movements_balance) < 0.01,
      }));
      return res.json({ rows, all_matched: rows.every((r) => r.is_matched) });
    }

    if (type === 'stagnant-items') {
      const rows = db.prepare(`
        SELECT i.item_code, i.item_name, ig.group_name, i.unit_of_measure,
               i.current_balance, i.cost_price,
               ROUND(i.current_balance * i.cost_price, 2) AS tied_capital,
               COALESCE(SUM(CASE WHEN im.movement_type = 'فاتورة بيع' THEN im.qty_out ELSE 0 END), 0) AS sold_qty,
               MAX(CASE WHEN im.movement_type = 'فاتورة بيع' THEN im.movement_date ELSE NULL END) AS last_sale_date
        FROM items i
        JOIN item_groups ig ON ig.group_code = i.group_code
        LEFT JOIN item_movements im ON im.item_code = i.item_code
        GROUP BY i.item_code
        ORDER BY sold_qty ASC, tied_capital DESC
      `).all().map((r) => ({
        ...r,
        movement_classification: r.sold_qty === 0 ? 'صنف راكد تماماً' : r.sold_qty <= 3 ? 'بطيء الحركة' : 'سريع الدوران',
      }));
      return res.json({ rows });
    }

    res.status(400).json({ error: 'نوع تقرير المخازن غير معروف' });
  });

  // =========================================================================
  // خامساً: تقارير الموارد البشرية
  // =========================================================================
  router.get('/hr', (req, res) => {
    const { type = 'payroll-sheet', month, year } = req.query;

    if (type === 'payroll-sheet') {
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
      const rows = db.prepare(sql).all(...params);
      return res.json({
        rows,
        totals: {
          basic: round2(rows.reduce((s, r) => s + r.basic_salary, 0)),
          allowances: round2(rows.reduce((s, r) => s + r.allowances, 0)),
          incentives: round2(rows.reduce((s, r) => s + r.incentives + r.overtime_pay, 0)),
          deductions: round2(rows.reduce((s, r) => s + r.deductions, 0)),
          net: round2(rows.reduce((s, r) => s + r.net_salary, 0)),
        },
      });
    }

    if (type === 'attendance-compliance') {
      const rows = db.prepare(`
        SELECT e.employee_code, e.employee_name, e.job_title, d.dept_name,
               COUNT(ar.id) AS total_recorded_days,
               SUM(CASE WHEN ar.status = 'حاضر' THEN 1 ELSE 0 END) AS present_days,
               SUM(CASE WHEN ar.status = 'تأخير' THEN 1 ELSE 0 END) AS late_days,
               SUM(CASE WHEN ar.status = 'غائب' THEN 1 ELSE 0 END) AS absent_days,
               SUM(CASE WHEN ar.status = 'إجازة' THEN 1 ELSE 0 END) AS leave_days,
               COALESCE(SUM(ar.late_minutes), 0) AS total_late_minutes,
               COALESCE(SUM(ar.overtime_hours), 0) AS total_overtime_hours
        FROM employees e
        LEFT JOIN departments d ON d.dept_code = e.dept_code
        LEFT JOIN attendance_records ar ON ar.employee_code = e.employee_code
        GROUP BY e.employee_code
        ORDER BY e.employee_code
      `).all().map((r) => {
        const total = Number(r.total_recorded_days || 0);
        const committed = Number(r.present_days || 0) + Number(r.leave_days || 0);
        const compliancePct = total > 0 ? round2((committed / total) * 100) : 100;
        return { ...r, compliance_pct: compliancePct };
      });
      return res.json({ rows });
    }

    res.status(400).json({ error: 'نوع تقرير الموارد البشرية غير معروف' });
  });

  return router;
};
