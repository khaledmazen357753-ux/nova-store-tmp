const round2 = (num) => Math.round((Number(num) + Number.EPSILON) * 100) / 100;

function computeReorderPoint(annualDemand, leadTimeDays, safetyStock) {
  const daily = Number(annualDemand || 0) / 365;
  return Math.ceil(daily * Number(leadTimeDays || 0) + Number(safetyStock || 0));
}

/**
 * يكتب رمز الجهاز — يُضاف إلى أرقام المستندات في النسخة الأوفلاين فقط.
 *
 * السبب: كل جهاز أوفلاين له قاعدته المستقلة، فكلها كانت تبدأ الترقيم من
 * 1001 وتنتج نفس الأرقام (SINV-1001 على كل جهاز). عند المزامنة تتصادم
 * المفاتيح الأساسية وتفشل عملية النقل.
 *
 * بادئة جهاز قصيرة وفريدة لكل متصفح تجعل التضارب مستحيلاً بدل أن نضطر
 * إلى "حل تعارض" بعد حدوثه.
 *
 * على الخادم/السحابي تبقى القيمة null فلا يتغيّر شكل الأرقام إطلاقاً.
 */
let deviceTag = null;
function setDeviceTag(tag) {
  const clean = tag == null ? null : String(tag).trim().toUpperCase();
  deviceTag = clean && /^[A-Z0-9]{1,8}$/.test(clean) ? clean : null;
}
function getDeviceTag() {
  return deviceTag;
}

/**
 * يولّد رقم المستند التالي.
 * الشكل الافتراضي (خادم/سحابي):  PREFIX-1001
 * الشكل الأوفلاين (بجهاز):      PREFIX-XXXX-1001
 * حيث XXXX رمز الجهاز، ويُحسب الحد الأقصى داخل نطاق الجهاز نفسه فقط.
 */
function nextDocNumber(db, table, column, prefix) {
  const tag = deviceTag;
  const scopePrefix = tag ? `${prefix}-${tag}-` : `${prefix}-`;

  const rows = db.prepare(`SELECT ${column} AS code FROM ${table} WHERE ${column} LIKE ?`).all(
    `${scopePrefix}%`
  );

  let maxNum = 1000;
  for (const r of rows) {
    const parts = String(r.code).split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    if (!Number.isNaN(num) && num > maxNum) maxNum = num;
  }
  return `${scopePrefix}${maxNum + 1}`;
}

function runInTransaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore rollback error
    }
    throw err;
  }
}

function getCustomerBalance(db, customerId) {
  const cust = db.prepare(`SELECT opening_balance, credit_limit, customer_name FROM customers WHERE customer_id = ?`).get(customerId);
  if (!cust) {
    const err = new Error('العميل غير موجود في قاعدة البيانات');
    err.status = 404;
    throw err;
  }
  const agg = db.prepare(`
    SELECT COALESCE(SUM(debit), 0) AS total_debit, COALESCE(SUM(credit), 0) AS total_credit
    FROM customer_transactions WHERE customer_id = ?
  `).get(customerId);
  const netBalance = round2(Number(cust.opening_balance || 0) + Number(agg.total_debit || 0) - Number(agg.total_credit || 0));
  return {
    ...cust,
    total_debit: round2(agg.total_debit),
    total_credit: round2(agg.total_credit),
    net_balance: netBalance,
  };
}

function getSupplierBalance(db, supplierId) {
  const supp = db.prepare(`SELECT opening_balance, supplier_name FROM suppliers WHERE supplier_id = ?`).get(supplierId);
  if (!supp) {
    const err = new Error('المورد غير موجود في قاعدة البيانات');
    err.status = 404;
    throw err;
  }
  const agg = db.prepare(`
    SELECT COALESCE(SUM(debit), 0) AS total_debit, COALESCE(SUM(credit), 0) AS total_credit
    FROM supplier_transactions WHERE supplier_id = ?
  `).get(supplierId);
  // Supplier nature is credit: opening_balance + credit (invoices) - debit (payments/returns)
  const netBalance = round2(Number(supp.opening_balance || 0) + Number(agg.total_credit || 0) - Number(agg.total_debit || 0));
  return {
    ...supp,
    total_debit: round2(agg.total_debit),
    total_credit: round2(agg.total_credit),
    net_balance: netBalance,
  };
}

/**
 * يحدد الفترة المالية التي يقع فيها تاريخ معيّن.
 *
 * لولا هذا، كانت كل القيود تُسجَّل على 'FY-2026' افتراضياً حتى لو كان
 * تاريخها في 2027 — فيختلط إقفال الفترات وتصبح تقارير كل سنة غير دقيقة.
 * الترتيب: أولاً الفترة التي يقع التاريخ داخل نطاقها فعلاً، وإلا أحدث
 * فترة مفتوحة، وإلا القيمة الافتراضية.
 */
function resolvePeriodId(db, entryDate) {
  if (!entryDate) return 'FY-2026';
  try {
    const byDate = db.prepare(`
      SELECT period_id FROM fiscal_periods
      WHERE ? BETWEEN start_date AND end_date
      ORDER BY start_date DESC LIMIT 1
    `).get(entryDate);
    if (byDate) return byDate.period_id;

    // تاريخ خارج كل الفترات المعرّفة: نستخدم أحدث فترة مفتوحة
    const open = db.prepare(`
      SELECT period_id FROM fiscal_periods
      WHERE status = 'مفتوحة'
      ORDER BY start_date DESC LIMIT 1
    `).get();
    if (open) return open.period_id;
  } catch {
    /* إن لم يوجد الجدول لأي سبب نعود للافتراضي */
  }
  return 'FY-2026';
}

function postJournalEntryRaw(db, {
  entry_number,
  entry_date,
  reference_type = 'قيد يومية يدوي',
  reference_no = null,
  description,
  lines,
  period_id,
  created_by = 'النظام',
}) {

  // الفترة تُشتق من تاريخ القيد إن لم تُمرَّر صراحةً
  const resolvedPeriodId = period_id || resolvePeriodId(db, entry_date);
  if (!Array.isArray(lines) || lines.length < 2) {
    const err = new Error('يجب أن يحتوي القيد المحاسبي على طرفين على الأقل (مدين ودائن)');
    err.status = 400;
    throw err;
  }

  let totalDebit = 0;
  let totalCredit = 0;
  const cleanLines = [];

  lines.forEach((line, idx) => {
    const debit = round2(Number(line.debit || 0));
    const credit = round2(Number(line.credit || 0));
    if (debit < 0 || credit < 0) {
      const err = new Error(`القيم السالبة غير مسموح بها في السطر رقم ${idx + 1}`);
      err.status = 400;
      throw err;
    }
    if (debit > 0 && credit > 0) {
      const err = new Error(`لا يمكن أن يكون الحساب مديناً ودائناً في نفس السطر (${idx + 1})`);
      err.status = 400;
      throw err;
    }
    if (debit === 0 && credit === 0) return;

    const acc = db.prepare(`SELECT account_code, account_name FROM accounts WHERE account_code = ?`).get(line.account_code);
    if (!acc) {
      const err = new Error(`كود الحساب (${line.account_code}) غير مسجل في دليل الحسابات`);
      err.status = 400;
      throw err;
    }
    totalDebit = round2(totalDebit + debit);
    totalCredit = round2(totalCredit + credit);
    cleanLines.push({
      line_no: cleanLines.length + 1,
      account_code: line.account_code,
      debit,
      credit,
      notes: line.notes || description || '',
    });
  });

  if (cleanLines.length < 2 || totalDebit <= 0) {
    const err = new Error('قيمة القيد يجب أن تكون أكبر من الصفر مع وجود طرف مدين وطرف دائن');
    err.status = 400;
    throw err;
  }

  if (Math.abs(totalDebit - totalCredit) >= 0.01) {
    const err = new Error(
      `تحذير التوازن المحاسبي: إجمالي المدين (${totalDebit.toFixed(2)}) لا يساوي إجمالي الدائن (${totalCredit.toFixed(2)}) — الفارق (${Math.abs(totalDebit - totalCredit).toFixed(2)}). يمنع النظام حفظ القيود غير المتوازنة.`
    );
    err.status = 400;
    throw err;
  }

  const finalNo = entry_number || nextDocNumber(db, 'journal_entries', 'entry_number', 'JE');

  db.prepare(`
    INSERT INTO journal_entries (entry_number, entry_date, reference_type, reference_no, description, total_debit, total_credit, period_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(finalNo, entry_date, reference_type, reference_no, description, totalDebit, totalCredit, resolvedPeriodId, created_by);

  const insertLine = db.prepare(`
    INSERT INTO journal_entry_lines (line_no, entry_number, account_code, debit, credit, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const l of cleanLines) {
    insertLine.run(l.line_no, finalNo, l.account_code, l.debit, l.credit, l.notes);
  }

  return { entry_number: finalNo, total_debit: totalDebit, total_credit: totalCredit };
}

function resolveSettlementAccount(db, paymentMethod, bankAccountNumber) {
  if (paymentMethod === 'شيك' || paymentMethod === 'تحويل بنكي') {
    if (bankAccountNumber) {
      const bank = db.prepare(`SELECT * FROM bank_accounts WHERE bank_account_number = ?`).get(bankAccountNumber);
      if (bank && bank.gl_account_code) {
        return { accountCode: bank.gl_account_code, bank };
      }
    }
    return { accountCode: '1102', bank: null }; // البنوك والحسابات الجارية
  }
  return { accountCode: '1101', bank: null }; // الخزينة النقدية الرئيسية
}

function createSalesInvoiceRaw(db, payload, createdBy = 'النظام') {
  const {
    invoice_no,
    invoice_date,
    employee_code,
    customer_id,
    payment_method = 'آجل',
    bank_account_number = null,
    items,
    notes = '',
    allow_exceed_credit = false,
  } = payload;

  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('يجب إدراج صنف واحد على الأقل في فاتورة البيع');
    err.status = 400;
    throw err;
  }

  const custStatus = getCustomerBalance(db, customer_id);
  const finalInvoiceNo = invoice_no || nextDocNumber(db, 'sales_invoices', 'invoice_no', 'SINV');

  let grossTotal = 0;
  let discountTotal = 0;
  let netTotal = 0;
  let totalCostOfGoods = 0;

  const processedItems = items.map((row, index) => {
    const item = db.prepare(`SELECT * FROM items WHERE item_code = ?`).get(row.item_code);
    if (!item) {
      const err = new Error(`الصنف (${row.item_code}) غير موجود`);
      err.status = 400;
      throw err;
    }
    const qty = Number(row.quantity || 0);
    if (qty <= 0) {
      const err = new Error(`الكمية للصنف (${item.item_name}) يجب أن تكون أكبر من صفر`);
      err.status = 400;
      throw err;
    }
    if (Number(item.current_balance) < qty) {
      const err = new Error(
        `الرصيد بالمخزن غير كافٍ للصنف (${item.item_name}) — المتاح حالياً: ${item.current_balance} ${item.unit_of_measure}`
      );
      err.status = 400;
      throw err;
    }
    const unitPrice = Number(row.unit_price ?? item.unit_price);
    const discPct = Number(row.discount_percent || 0);
    const lineGross = round2(qty * unitPrice);
    const lineDisc = round2(lineGross * (discPct / 100));
    // معادلة صافي الفاتورة حسب المنهج: (عدد الوحدات × سعر الوحدة) - قيمة الخصم
    const lineNet = round2(lineGross - lineDisc);
    const lineCost = round2(qty * Number(item.cost_price || 0));

    grossTotal = round2(grossTotal + lineGross);
    discountTotal = round2(discountTotal + lineDisc);
    netTotal = round2(netTotal + lineNet);
    totalCostOfGoods = round2(totalCostOfGoods + lineCost);

    return {
      line_no: index + 1,
      item,
      item_code: item.item_code,
      quantity: qty,
      unit_price: unitPrice,
      discount_percent: discPct,
      discount_amount: lineDisc,
      net_amount: lineNet,
      line_cost: lineCost,
    };
  });

  if (payment_method === 'آجل' && !allow_exceed_credit) {
    const projectedBalance = round2(custStatus.net_balance + netTotal);
    if (projectedBalance > Number(custStatus.credit_limit)) {
      const err = new Error(
        `تنبيه ائتماني: هذه الفاتورة ترفع مديونية العميل (${custStatus.customer_name}) إلى ${projectedBalance.toFixed(2)} وهو ما يتجاوز الحد الأقصى للائتمان (${custStatus.credit_limit.toFixed(2)}).`
      );
      err.status = 400;
      err.code = 'CREDIT_LIMIT_EXCEEDED';
      throw err;
    }
  }

  // القيد المحاسبي التلقائي لفاتورة البيع + تكلفة البضاعة المباعة
  const journalLines = [];
  if (payment_method === 'آجل') {
    journalLines.push({ account_code: '1103', debit: netTotal, credit: 0, notes: `فاتورة بيع آجل ${finalInvoiceNo} - ${custStatus.customer_name}` });
  } else {
    const { accountCode, bank } = resolveSettlementAccount(db, payment_method, bank_account_number);
    journalLines.push({ account_code: accountCode, debit: netTotal, credit: 0, notes: `تحصيل فاتورة بيع ${finalInvoiceNo} (${payment_method})` });
    if (bank) {
      db.prepare(`UPDATE bank_accounts SET balance = ROUND(balance + ?, 2) WHERE bank_account_number = ?`).run(netTotal, bank.bank_account_number);
    }
  }

  if (discountTotal > 0) {
    journalLines.push({ account_code: '3204', debit: discountTotal, credit: 0, notes: `خصم مسموح به على فاتورة ${finalInvoiceNo}` });
    journalLines.push({ account_code: '4101', debit: 0, credit: grossTotal, notes: `إجمالي مبيعات فاتورة ${finalInvoiceNo}` });
  } else {
    journalLines.push({ account_code: '4101', debit: 0, credit: netTotal, notes: `إيراد مبيعات فاتورة ${finalInvoiceNo}` });
  }

  if (totalCostOfGoods > 0) {
    journalLines.push({ account_code: '3101', debit: totalCostOfGoods, credit: 0, notes: `تكلفة البضاعة المباعة لفاتورة ${finalInvoiceNo}` });
    journalLines.push({ account_code: '1104', debit: 0, credit: totalCostOfGoods, notes: `تخفيض المخزون السلعي لفاتورة ${finalInvoiceNo}` });
  }

  const je = postJournalEntryRaw(db, {
    entry_date: invoice_date,
    reference_type: 'فاتورة بيع',
    reference_no: finalInvoiceNo,
    description: `إثبات فاتورة بيع رقم ${finalInvoiceNo} للعميل ${custStatus.customer_name}`,
    lines: journalLines,
    created_by: createdBy,
  });

  // حفظ رأس الفاتورة
  db.prepare(`
    INSERT INTO sales_invoices (invoice_no, invoice_date, employee_code, customer_id, payment_method, bank_account_number, gross_total, discount_total, net_total, notes, journal_entry_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(finalInvoiceNo, invoice_date, employee_code, customer_id, payment_method, bank_account_number, grossTotal, discountTotal, netTotal, notes, je.entry_number);

  // حفظ تفاصيل الفاتورة وتحديث رصيد المخزن وبطاقة الصنف
  const insertItem = db.prepare(`
    INSERT INTO sales_invoice_items (line_no, invoice_no, item_code, quantity, unit_price, discount_percent, discount_amount, net_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateStock = db.prepare(`UPDATE items SET current_balance = ROUND(current_balance - ?, 2) WHERE item_code = ?`);
  const insertMove = db.prepare(`
    INSERT INTO item_movements (movement_date, item_code, movement_type, doc_no, qty_in, qty_out, unit_price, balance_after, notes)
    VALUES (?, ?, 'فاتورة بيع', ?, 0, ?, ?, ?, ?)
  `);

  const reorderAlerts = [];
  for (const row of processedItems) {
    insertItem.run(row.line_no, finalInvoiceNo, row.item_code, row.quantity, row.unit_price, row.discount_percent, row.discount_amount, row.net_amount);
    updateStock.run(row.quantity, row.item_code);
    const updatedItem = db.prepare(`SELECT current_balance, reorder_point, item_name FROM items WHERE item_code = ?`).get(row.item_code);
    insertMove.run(invoice_date, row.item_code, finalInvoiceNo, row.quantity, row.unit_price, updatedItem.current_balance, `بيع للعميل ${custStatus.customer_name}`);
    if (updatedItem.current_balance <= updatedItem.reorder_point) {
      reorderAlerts.push({
        item_code: row.item_code,
        item_name: updatedItem.item_name,
        current_balance: updatedItem.current_balance,
        reorder_point: updatedItem.reorder_point,
      });
    }
  }

  // تسجيل حركة العميل في الأستاذ المساعد للعملاء
  db.prepare(`
    INSERT INTO customer_transactions (doc_no, customer_id, tx_date, debit, credit, tx_type, collection_method, bank_account_number, notes, journal_entry_number)
    VALUES (?, ?, ?, ?, 0, 'فاتورة بيع', ?, ?, ?, ?)
  `).run(finalInvoiceNo, customer_id, invoice_date, netTotal, payment_method, bank_account_number, notes || `فاتورة بيع رقم ${finalInvoiceNo}`, je.entry_number);

  if (payment_method !== 'آجل') {
    db.prepare(`
      INSERT INTO customer_transactions (doc_no, customer_id, tx_date, debit, credit, tx_type, collection_method, bank_account_number, notes, journal_entry_number)
      VALUES (?, ?, ?, 0, ?, 'تحصيل فوري للفاتورة', ?, ?, ?, ?)
    `).run(finalInvoiceNo, customer_id, invoice_date, netTotal, payment_method, bank_account_number, `سداد فوري لفاتورة ${finalInvoiceNo}`, je.entry_number);
  }

  return {
    invoice_no: finalInvoiceNo,
    net_total: netTotal,
    journal_entry_number: je.entry_number,
    reorder_alerts: reorderAlerts,
  };
}

function createPurchaseInvoiceRaw(db, payload, createdBy = 'النظام') {
  const {
    invoice_no,
    invoice_date,
    supplier_id,
    po_no = null,
    payment_method = 'آجل',
    bank_account_number = null,
    items,
    notes = '',
  } = payload;

  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('يجب إدراج صنف واحد على الأقل في فاتورة الشراء');
    err.status = 400;
    throw err;
  }

  const suppStatus = getSupplierBalance(db, supplier_id);
  const finalInvoiceNo = invoice_no || nextDocNumber(db, 'purchase_invoices', 'invoice_no', 'PINV');

  let grossTotal = 0;
  let discountTotal = 0;
  let netTotal = 0;

  const processedItems = items.map((row, index) => {
    const item = db.prepare(`SELECT * FROM items WHERE item_code = ?`).get(row.item_code);
    if (!item) {
      const err = new Error(`الصنف (${row.item_code}) غير موجود`);
      err.status = 400;
      throw err;
    }
    const qty = Number(row.quantity || 0);
    if (qty <= 0) {
      const err = new Error(`الكمية للصنف (${item.item_name}) يجب أن تكون أكبر من صفر`);
      err.status = 400;
      throw err;
    }
    const unitPrice = Number(row.unit_price ?? item.cost_price);
    const discPct = Number(row.discount_percent || 0);
    const lineGross = round2(qty * unitPrice);
    const lineDisc = round2(lineGross * (discPct / 100));
    const lineNet = round2(lineGross - lineDisc);

    grossTotal = round2(grossTotal + lineGross);
    discountTotal = round2(discountTotal + lineDisc);
    netTotal = round2(netTotal + lineNet);

    return {
      line_no: index + 1,
      item,
      item_code: item.item_code,
      quantity: qty,
      unit_price: unitPrice,
      discount_percent: discPct,
      discount_amount: lineDisc,
      net_amount: lineNet,
    };
  });

  const journalLines = [
    { account_code: '1104', debit: netTotal, credit: 0, notes: `إضافة مشتريات للمخزن فاتورة ${finalInvoiceNo}` },
  ];

  if (payment_method === 'آجل') {
    journalLines.push({ account_code: '2101', debit: 0, credit: netTotal, notes: `استحقاق للمورد ${suppStatus.supplier_name} - فاتورة ${finalInvoiceNo}` });
  } else {
    const { accountCode, bank } = resolveSettlementAccount(db, payment_method, bank_account_number);
    journalLines.push({ account_code: accountCode, debit: 0, credit: netTotal, notes: `سداد فاتورة شراء ${finalInvoiceNo} (${payment_method})` });
    if (bank) {
      db.prepare(`UPDATE bank_accounts SET balance = ROUND(balance - ?, 2) WHERE bank_account_number = ?`).run(netTotal, bank.bank_account_number);
    }
  }

  const je = postJournalEntryRaw(db, {
    entry_date: invoice_date,
    reference_type: 'فاتورة شراء',
    reference_no: finalInvoiceNo,
    description: `إثبات فاتورة شراء رقم ${finalInvoiceNo} من المورد ${suppStatus.supplier_name}`,
    lines: journalLines,
    created_by: createdBy,
  });

  db.prepare(`
    INSERT INTO purchase_invoices (invoice_no, invoice_date, supplier_id, po_no, payment_method, bank_account_number, gross_total, discount_total, net_total, notes, journal_entry_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(finalInvoiceNo, invoice_date, supplier_id, po_no, payment_method, bank_account_number, grossTotal, discountTotal, netTotal, notes, je.entry_number);

  if (po_no) {
    db.prepare(`UPDATE purchase_orders SET status = 'تم الاستلام' WHERE po_no = ?`).run(po_no);
  }

  const insertItem = db.prepare(`
    INSERT INTO purchase_invoice_items (line_no, invoice_no, item_code, quantity, unit_price, discount_percent, discount_amount, net_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateStock = db.prepare(`UPDATE items SET current_balance = ROUND(current_balance + ?, 2), cost_price = ? WHERE item_code = ?`);
  const insertMove = db.prepare(`
    INSERT INTO item_movements (movement_date, item_code, movement_type, doc_no, qty_in, qty_out, unit_price, balance_after, notes)
    VALUES (?, ?, 'فاتورة شراء', ?, ?, 0, ?, ?, ?)
  `);

  for (const row of processedItems) {
    insertItem.run(row.line_no, finalInvoiceNo, row.item_code, row.quantity, row.unit_price, row.discount_percent, row.discount_amount, row.net_amount);
    const effectiveCost = round2(row.net_amount / row.quantity);
    updateStock.run(row.quantity, effectiveCost, row.item_code);
    const updated = db.prepare(`SELECT current_balance FROM items WHERE item_code = ?`).get(row.item_code);
    insertMove.run(invoice_date, row.item_code, finalInvoiceNo, row.quantity, effectiveCost, updated.current_balance, `شراء من ${suppStatus.supplier_name}`);
  }

  db.prepare(`
    INSERT INTO supplier_transactions (doc_no, supplier_id, tx_date, debit, credit, tx_type, payment_method, bank_account_number, notes, journal_entry_number)
    VALUES (?, ?, ?, 0, ?, 'فاتورة شراء', ?, ?, ?, ?)
  `).run(finalInvoiceNo, supplier_id, invoice_date, netTotal, payment_method, bank_account_number, notes || `فاتورة شراء رقم ${finalInvoiceNo}`, je.entry_number);

  if (payment_method !== 'آجل') {
    db.prepare(`
      INSERT INTO supplier_transactions (doc_no, supplier_id, tx_date, debit, credit, tx_type, payment_method, bank_account_number, notes, journal_entry_number)
      VALUES (?, ?, ?, ?, 0, 'سداد فوري للفاتورة', ?, ?, ?, ?)
    `).run(finalInvoiceNo, supplier_id, invoice_date, netTotal, payment_method, bank_account_number, `سداد فوري لفاتورة شراء ${finalInvoiceNo}`, je.entry_number);
  }

  return {
    invoice_no: finalInvoiceNo,
    net_total: netTotal,
    journal_entry_number: je.entry_number,
  };
}

module.exports = {
  round2,
  computeReorderPoint,
  nextDocNumber,
  resolvePeriodId,
  setDeviceTag,
  getDeviceTag,
  runInTransaction,
  getCustomerBalance,
  getSupplierBalance,
  postJournalEntryRaw,
  resolveSettlementAccount,
  createSalesInvoiceRaw,
  createPurchaseInvoiceRaw,
};
