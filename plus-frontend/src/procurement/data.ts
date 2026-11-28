/**
 * بيانات التشغيل الأولى لموقع «المشتريات والمخازن والموردين».
 *
 * ═══ المبدأ الذي بُني عليه هذا الملف ═══════════════════════════════════
 *
 * البيانات الرئيسية (دليل الحسابات، الأصناف، الموردون، البنوك) تُدخَل هنا
 * كصفوف — لأنها بيانات لا حسابات.
 *
 * أما المستندات (أوامر التوريد، فواتير الشراء، المردودات، السدادات، أذون
 * الإضافة والصرف) فلا تُكتب بجمل SQL هنا إطلاقاً. تُرسَل كطلبات HTTP إلى
 * **نفس المسارات الحقيقية** التي تضغط عليها الواجهة عندك:
 *
 *     POST /api/transactions/purchase-invoices
 *     POST /api/transactions/supplier-payments
 *     ...
 *
 * السبب: لو كتبت منطق القيد هنا مرة ثانية، لصار عندنا مصدران للحقيقة
 * يختلفان مع أول تعديل على المحرك. البيانات التجريبية كانت ستبدو صحيحة
 * بينما النظام الحقيقي يفعل شيئاً آخر. هنا لا يوجد إلا مسار واحد.
 *
 * ═══ الالتزامات المحاسبية المثبتة في هذا الملف ═══════════════════════
 *
 *   ١) ميزان المراجعة متوازن: مجموع المدين = مجموع الدائن.
 *   ٢) أرصدة الموردين الافتتاحية = رصيد حساب 2101.
 *   ٣) قيمة المخزون الافتتاحي (كمية × تكلفة) = رصيد حساب 1104.
 *   ٤) أرصدة البنوك = رصيد حساب 1102.
 *   ٥) كل صنف: رصيد بطاقة الصنف = حركة الأذون (وارد − منصرف).
 *
 * كل بند من هذه الخمسة يتحقق منه `scripts/verify-procurement.mjs` رقماً
 * برقم من داخل النظام بعد تحميله — لا من هذا الملف.
 */

/** الحسابات: كود → [الاسم، المجموعة الفرعية، افتتاحي مدين، افتتاحي دائن، نقدي] */
const ACCOUNTS: [string, string, string, number, number, 0 | 1][] = [
  ['1101', 'الخزينة النقدية الرئيسية', '11', 150000, 0, 1],
  ['1102', 'البنوك والحسابات الجارية', '11', 380000, 0, 1],
  ['1103', 'العملاء (المدينون التجاريون)', '11', 0, 0, 0],
  ['1104', 'المخزون السلعي بالمخازن', '11', 420000, 0, 0],
  ['1201', 'الأثاث والتجهيزات والمعدات المخزنية', '12', 310000, 0, 0],
  ['2101', 'الموردون (الدائنون التجاريون)', '21', 0, 250000, 0],
  ['2301', 'رأس المال المدفوع', '23', 0, 1010000, 0],
  ['3101', 'تكلفة النشاط', '31', 0, 0, 0],
  ['3102', 'مشتريات ومستلزمات تشغيل منصرفة', '31', 0, 0, 0],
  ['3201', 'مصروفات إدارية وعمومية', '32', 0, 0, 0],
  ['4101', 'إيرادات النشاط', '41', 0, 0, 0],
  ['4202', 'خصم مكتسب وإيرادات أخرى', '42', 0, 0, 0],
];

/** الموردون: مجموع الأرصدة الافتتاحية = 250,000 (رصيد 2101 بالحرف) */
const SUPPLIERS: [string, string, string, string, string, string, number][] = [
  ['SUP-001', 'الشركة المصرية لتوريد الأجهزة المكتبية', '١٢ شارع الجلاء — وسط البلد', 'المنيا', '086-2364471', 'sales@egy-office.eg', 120000],
  ['SUP-002', 'مصنع الدلتا للأثاث المعدني', 'المنطقة الصناعية الأولى — block 7', 'المنصورة', '050-2219877', 'orders@delta-metal.eg', 80000],
  ['SUP-003', 'شركة النور للتغليف والورقيات', 'طريق مصر أسيوط الزراعي — ك ٤', 'بني سويف', '082-2451190', 'info@alnoor-paper.eg', 50000],
];

/** مجموعات الأصناف */
const ITEM_GROUPS: [string, string, string][] = [
  ['GRP-OFF', 'أجهزة ومستلزمات مكتبية', 'حاسبات وطابعات وشاشات ومستلزمات تشغيل'],
  ['GRP-FUR', 'أثاث وتجهيزات', 'مكاتب وكراسي ووحدات تنظيم'],
  ['GRP-PKG', 'مواد تغليف وورقيات', 'ورق تصوير ومواد تعبئة ومستهلكات'],
];

/**
 * الأصناف: الكمية × التكلفة يجب أن يساوي رصيد المخزون (420,000).
 *   126,000 + 126,000 + 60,000 + 60,000 + 24,000 + 24,000
 */
const ITEMS: {
  code: string;
  name: string;
  group: string;
  unit: string;
  cost: number;
  price: number;
  qty: number;
  demand: number;
  safety: number;
  lead: number;
  eoq: number;
  rop: number;
}[] = [
  { code: 'ITM-201', name: 'طابعة ليزر مكتبية HP LaserJet Pro M404', group: 'GRP-OFF', unit: 'جهاز', cost: 4200, price: 5900, qty: 30, demand: 180, safety: 8, lead: 7, eoq: 25, rop: 14 },
  { code: 'ITM-202', name: 'حاسب مكتبي Dell OptiPlex 7010', group: 'GRP-OFF', unit: 'جهاز', cost: 9000, price: 12500, qty: 14, demand: 90, safety: 4, lead: 10, eoq: 12, rop: 8 },
  { code: 'ITM-203', name: 'شاشة عرض 27 بوصة LG IPS', group: 'GRP-OFF', unit: 'شاشة', cost: 3000, price: 4200, qty: 20, demand: 120, safety: 6, lead: 8, eoq: 20, rop: 12 },
  { code: 'ITM-204', name: 'كرسي مكتبي طبي بدعامة قطنية', group: 'GRP-FUR', unit: 'كرسي', cost: 2500, price: 3600, qty: 24, demand: 150, safety: 10, lead: 12, eoq: 30, rop: 20 },
  { code: 'ITM-205', name: 'مكتب تنفيذي خشبي ١٨٠ سم', group: 'GRP-FUR', unit: 'قطعة', cost: 6000, price: 8900, qty: 4, demand: 24, safety: 2, lead: 15, eoq: 6, rop: 5 },
  { code: 'ITM-206', name: 'ورق تصوير A4 — كرتونة ٥ رزم', group: 'GRP-PKG', unit: 'كرتونة', cost: 600, price: 830, qty: 40, demand: 900, safety: 25, lead: 5, eoq: 60, rop: 40 },
];

const BANKS: [string, string, string, number][] = [
  ['EG100002000123440077', 'البنك التجاري الدولي — CIB', 'فرع المنيا الرئيسي', 200000],
  ['EG380003000985220044', 'بنك مصر', 'فرع كورنيش النيل', 180000],
];

/** مستخدمو الموقع — كل واحد بدوره الحقيقي وصلاحياته */
const USERS: [string, string, string, string, string][] = [
  ['admin', 'م. خالد مازن — مدير النظام', 'admin@nile-gold.eg', 'admin123', 'SUPER_ADMIN'],
  ['chief', 'أ. أحمد طارق — رئيس الحسابات', 'cfo@nile-gold.eg', 'plus123', 'CHIEF_ACCOUNTANT'],
  ['buyer', 'أ. منى صبري — مسؤول المشتريات', 'buyer@nile-gold.eg', 'plus123', 'PURCHASING_OFFICER'],
  ['store', 'أ. مصطفى حسن — أمين المخازن', 'store@nile-gold.eg', 'plus123', 'WAREHOUSE_KEEPER'],
  ['auditor', 'أ. هالة فؤاد — مراجع داخلي', 'audit@nile-gold.eg', 'plus123', 'AUDITOR_VIEWER'],
];

const ROLES: [string, string, string, unknown][] = [
  ['SUPER_ADMIN', 'مدير النظام العام', 'صلاحيات كاملة على موقع المشتريات والمخازن', {
    master: { view: true, add: true, edit: true, delete: true, reports: true },
    finance: { view: true, add: true, edit: true, delete: false, reports: true },
    sales: { view: false, add: false, edit: false, delete: false, reports: false },
    purchases: { view: true, add: true, edit: true, delete: true, reports: true },
    inventory: { view: true, add: true, edit: true, delete: true, reports: true },
    hr: { view: false, add: false, edit: false, delete: false, reports: false },
    reports: { view: true, export: true, print: true },
  }],
  ['CHIEF_ACCOUNTANT', 'رئيس الحسابات', 'مراجعة واعتماد حركات المشتريات والمخازن', {
    master: { view: true, add: true, edit: true, delete: false, reports: true },
    finance: { view: true, add: true, edit: true, delete: false, reports: true },
    sales: { view: false, add: false, edit: false, delete: false, reports: false },
    purchases: { view: true, add: true, edit: true, delete: false, reports: true },
    inventory: { view: true, add: true, edit: true, delete: false, reports: true },
    hr: { view: false, add: false, edit: false, delete: false, reports: false },
    reports: { view: true, export: true, print: true },
  }],
  ['PURCHASING_OFFICER', 'مسؤول مشتريات', 'إصدار أوامر التوريد وفواتير الشراء والمردودات والسداد', {
    master: { view: true, add: false, edit: false, delete: false, reports: true },
    finance: { view: false, add: false, edit: false, delete: false, reports: false },
    sales: { view: false, add: false, edit: false, delete: false, reports: false },
    purchases: { view: true, add: true, edit: false, delete: false, reports: true },
    inventory: { view: true, add: false, edit: false, delete: false, reports: true },
    hr: { view: false, add: false, edit: false, delete: false, reports: false },
    reports: { view: true, export: true, print: true },
  }],
  ['WAREHOUSE_KEEPER', 'أمين المخازن', 'أذون الإضافة والصرف والجرد السلعي', {
    master: { view: true, add: true, edit: true, delete: false, reports: true },
    finance: { view: false, add: false, edit: false, delete: false, reports: false },
    sales: { view: false, add: false, edit: false, delete: false, reports: false },
    purchases: { view: true, add: false, edit: false, delete: false, reports: true },
    inventory: { view: true, add: true, edit: true, delete: false, reports: true },
    hr: { view: false, add: false, edit: false, delete: false, reports: false },
    reports: { view: true, export: true, print: true },
  }],
  ['AUDITOR_VIEWER', 'مراجع (عرض فقط)', 'استعراض الأرصدة والتقارير دون أي إضافة', {
    master: { view: true, add: false, edit: false, delete: false, reports: true },
    finance: { view: true, add: false, edit: false, delete: false, reports: true },
    sales: { view: false, add: false, edit: false, delete: false, reports: false },
    purchases: { view: true, add: false, edit: false, delete: false, reports: true },
    inventory: { view: true, add: false, edit: false, delete: false, reports: true },
    hr: { view: false, add: false, edit: false, delete: false, reports: false },
    reports: { view: true, export: true, print: true },
  }],
];

type Db = {
  prepare(sql: string): {
    run(...p: unknown[]): unknown;
    get(...p: unknown[]): Record<string, any> | undefined;
    all(...p: unknown[]): Record<string, any>[];
  };
};

export interface BootstrapState {
  db: Db & { persist(): Promise<void> };
  routers: unknown[];
}

export interface BootstrapDeps {
  dispatch: (
    routers: unknown[],
    method: string,
    path: string,
    options: { headers?: Record<string, string>; body?: Record<string, unknown> }
  ) => Promise<{ status: number; body: any }>;
  hashPassword: (password: string) => string;
}

/** المستندات التي تُنشأ عبر المسارات الحقيقية بالترتيب الزمني */
const DOCS = [
  {
    label: 'أمر توريد PO-2001',
    path: '/api/transactions/purchase-orders',
    body: {
      po_date: '2026-09-12',
      supplier_id: 'SUP-001',
      expected_date: '2026-09-20',
      notes: 'توريد ٦ حاسبات مكتبية لمكتب خدمة العملاء',
      items: [{ item_code: 'ITM-202', quantity: 6, unit_price: 9000 }],
    },
  },
  {
    label: 'فاتورة شراء PINV-2001',
    path: '/api/transactions/purchase-invoices',
    body: {
      invoice_date: '2026-09-18',
      supplier_id: 'SUP-001',
      payment_method: 'آجل',
      notes: 'استلام توريد الحاسبات بمخزن الإدارة العامة',
      items: [{ item_code: 'ITM-202', quantity: 6, unit_price: 9000, discount_percent: 0 }],
    },
  },
  {
    label: 'أمر توريد PO-2002',
    path: '/api/transactions/purchase-orders',
    body: {
      po_date: '2026-10-08',
      supplier_id: 'SUP-003',
      expected_date: '2026-10-18',
      notes: 'ورق تصوير لتعزيز مخزون المستهلكات',
      items: [{ item_code: 'ITM-206', quantity: 60, unit_price: 600 }],
    },
  },
  {
    label: 'فاتورة شراء PINV-2002',
    path: '/api/transactions/purchase-invoices',
    body: {
      invoice_date: '2026-10-16',
      supplier_id: 'SUP-003',
      payment_method: 'آجل',
      notes: 'استلام ورق التصوير دفعة الربع الأخير',
      items: [{ item_code: 'ITM-206', quantity: 60, unit_price: 600, discount_percent: 0 }],
    },
  },
  {
    label: 'سداد شيك للمورد SUP-001',
    path: '/api/transactions/supplier-payments',
    body: {
      supplier_id: 'SUP-001',
      tx_date: '2026-10-28',
      amount: 60000,
      payment_method: 'شيك',
      bank_account_number: 'EG100002000123440077',
      check_number: 'CHQ-118402',
      notes: 'سداد مشروط بشيك على البنك التجاري الدولي',
    },
  },
  {
    label: 'فاتورة شراء PINV-2003 سداد فوري',
    path: '/api/transactions/purchase-invoices',
    body: {
      invoice_date: '2026-11-05',
      supplier_id: 'SUP-001',
      payment_method: 'تحويل بنكي',
      bank_account_number: 'EG380003000985220044',
      notes: 'شراء طابعات وشاشات بتحويل بنكي مباشر',
      items: [
        { item_code: 'ITM-201', quantity: 8, unit_price: 4200, discount_percent: 0 },
        { item_code: 'ITM-203', quantity: 6, unit_price: 3000, discount_percent: 0 },
      ],
    },
  },
  {
    label: 'إشعار رد مشتريات PRET-2001',
    path: '/api/transactions/purchase-returns',
    body: {
      return_date: '2026-11-09',
      supplier_id: 'SUP-003',
      refund_method: 'خصم من الحساب',
      reason: 'كراتين وصلت مبتلة وغير صالحة للاستخدام',
      items: [{ item_code: 'ITM-206', quantity: 10, unit_price: 600 }],
    },
  },
  {
    label: 'سداد نقدي للمورد SUP-003',
    path: '/api/transactions/supplier-payments',
    body: {
      supplier_id: 'SUP-003',
      tx_date: '2026-11-12',
      amount: 25000,
      payment_method: 'نقدي',
      notes: 'سداد جزئي من الخزينة',
    },
  },
  {
    label: 'أمر توريد PO-2003 مفتوح',
    path: '/api/transactions/purchase-orders',
    body: {
      po_date: '2026-11-15',
      supplier_id: 'SUP-002',
      expected_date: '2026-11-30',
      notes: 'كراسي مكتبية لتجهيز الإدارة الجديدة — بانتظار التوريد',
      items: [{ item_code: 'ITM-204', quantity: 30, unit_price: 2500 }],
    },
  },
  {
    label: 'إذن إضافة مخزني ADD-2001',
    path: '/api/transactions/stock-additions',
    body: {
      addition_date: '2026-11-18',
      warehouse_name: 'المخزن الرئيسي — المنيا',
      supplier_id: 'SUP-002',
      reference_doc: 'PO-2003-ج٦',
      notes: 'استلام جزئي: ٦ كراسي من أمر التوريد المفتوح',
      items: [{ item_code: 'ITM-204', quantity: 6, unit_cost: 2500 }],
    },
  },
  {
    label: 'إذن صرف مخزني ISS-2001',
    path: '/api/transactions/stock-issues',
    body: {
      issue_date: '2026-11-19',
      warehouse_name: 'المخزن الرئيسي — المنيا',
      dept_code: 'DEPT-PUR',
      reference_doc: 'REQ-881',
      notes: 'صرف مستلزمات طباعة لإدارة المشتريات',
      items: [{ item_code: 'ITM-206', quantity: 5 }],
    },
  },
];

/**
 * المرحلة الأولى — البيانات الرئيسية فقط، بلا أي طلب REST.
 *
 * تُنفَّذ أثناء تهيئة المحرك، قبل أن يوجد مستخدم أو توكن. لهذا لا تلمس
 * المستندات: إسنادها هنا كان سيتطلب تسجيل دخول داخل التهيئة نفسها —
 * انتظارٌ دائري (التهيئة تنتظر الدخول، والدخول ينتظر التهيئة).
 *
 * آمنة للاستدعاء مراراً: تخرج فوراً لو كان المستخدمون موجودين.
 */
export async function seedProcurementMaster(
  state: BootstrapState,
  deps: BootstrapDeps
): Promise<{ skipped: boolean }> {
  const { db } = state;
  const existing = db.prepare(`SELECT COUNT(*) AS c FROM users`).get();
  if (Number(existing?.c || 0) > 0) return { skipped: true };

  // ═══ ١) الإعدادات والفترة المالية ══════════════════════════════════
  db.prepare(`
    INSERT INTO company_settings (id, company_name, commercial_reg, tax_number, address, city,
      phone, email, currency, fiscal_year, frontend_domain, admin_domain, api_domain)
    VALUES (1, 'شركة النيل للتوريدات الهندسية', 'CR-2026-339817', 'TAX-204-771-963',
      'برج النيل الإداري — كورنيش النيل', 'المنيا', '086-2348899', 'procurement@nile-supply.eg',
      'ج.م', 2026, '', '', '')
  `).run();

  db.prepare(`
    INSERT INTO fiscal_periods (period_id, period_name, start_date, end_date, status)
    VALUES ('FY-2026', 'السنة المالية 2026', '2026-01-01', '2026-12-31', 'مفتوحة')
  `).run();

  // ═══ ٢) الإدارات ═══════════════════════════════════════════════════
  const insDept = db.prepare(
    `INSERT INTO departments (dept_code, dept_name, manager_name, description) VALUES (?, ?, ?, ?)`
  );
  insDept.run('DEPT-PUR', 'إدارة المشتريات والتوريدات', 'أ. منى صبري', 'المفاوضات وأوامر التوريد والموردون');
  insDept.run('DEPT-INV', 'إدارة المخازن والرقابة السلعية', 'أ. مصطفى حسن', 'الأذون والجرد وبطاقات الأصناف');
  insDept.run('DEPT-FIN', 'الإدارة المالية', 'أ. أحمد طارق', 'السدادات والمراجعة والتقارير المالية');

  // ═══ ٣) دليل الحسابات ══════════════════════════════════════════════
  const insMain = db.prepare(
    `INSERT INTO account_main_groups (main_group_code, group_name, account_nature, statement_type) VALUES (?, ?, ?, ?)`
  );
  insMain.run('1', 'الأصول', 'debit', 'balance_sheet');
  insMain.run('2', 'الخصوم وحقوق الملكية', 'credit', 'balance_sheet');
  insMain.run('3', 'المصروفات والتكاليف', 'debit', 'income_statement');
  insMain.run('4', 'الإيرادات', 'credit', 'income_statement');

  const insSub = db.prepare(
    `INSERT INTO account_sub_groups (sub_group_code, sub_group_name, main_group_code) VALUES (?, ?, ?)`
  );
  insSub.run('11', 'الأصول المتداولة', '1');
  insSub.run('12', 'الأصول الثابتة', '1');
  insSub.run('21', 'الخصوم المتداولة', '2');
  insSub.run('23', 'حقوق الملكية', '2');
  insSub.run('31', 'تكلفة النشاط', '3');
  insSub.run('32', 'المصروفات الإدارية', '3');
  insSub.run('41', 'إيرادات النشاط', '4');
  insSub.run('42', 'إيرادات متنوعة', '4');

  const insAcc = db.prepare(`
    INSERT INTO accounts (account_code, account_name, sub_group_code, opening_debit, opening_credit, is_cash_account)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const a of ACCOUNTS) insAcc.run(...a);

  // ═══ ٤) البنوك ═════════════════════════════════════════════════════
  const insBank = db.prepare(`
    INSERT INTO bank_accounts (bank_account_number, bank_name, branch, currency, opening_balance, balance, gl_account_code)
    VALUES (?, ?, ?, 'ج.م', ?, ?, '1102')
  `);
  // الرصيد الحالي = الافتتاحي عند التأسيس؛ الحركات هي التي تحرّكه بعدها.
  for (const [num, name, branch, opening] of BANKS) insBank.run(num, name, branch, opening, opening);

  // ═══ ٥) الموردون ═══════════════════════════════════════════════════
  const insSupp = db.prepare(`
    INSERT INTO suppliers (supplier_id, supplier_name, address, city, phone, email, opening_balance)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of SUPPLIERS) insSupp.run(...s);

  // ═══ ٦) مجموعات الأصناف والأصناف ══════════════════════════════════
  const insGroup = db.prepare(`INSERT INTO item_groups (group_code, group_name, description) VALUES (?, ?, ?)`);
  for (const g of ITEM_GROUPS) insGroup.run(...g);

  const insItem = db.prepare(`
    INSERT INTO items (item_code, item_name, group_code, item_type, unit_of_measure, cost_price, unit_price,
      annual_demand, safety_stock, lead_time_days, eoq, reorder_point, current_balance)
    VALUES (?, ?, ?, 'بضاعة تامة الصنع', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insOpeningMove = db.prepare(`
    INSERT INTO item_movements (movement_date, item_code, movement_type, doc_no, qty_in, qty_out, unit_price, balance_after, notes)
    VALUES ('2026-01-01', ?, 'رصيد افتتاحي', 'OPEN-2026', ?, 0, ?, ?, 'رصيد أول المدة المعتمد بعد الجرد')
  `);
  for (const it of ITEMS) {
    insItem.run(it.code, it.name, it.group, it.unit, it.cost, it.price, it.demand, it.safety, it.lead, it.eoq, it.rop, it.qty);
    // بطاقة الصنف تبدأ متطابقة مع الرصيد — وإلا ظهر فرق في تقرير المطابقة
    insOpeningMove.run(it.code, it.qty, it.cost, it.qty);
  }

  // ═══ ٧) الأدوار والمستخدمون ════════════════════════════════════════
  const insRole = db.prepare(
    `INSERT INTO roles (role_code, role_name, description, permissions_json) VALUES (?, ?, ?, ?)`
  );
  for (const [code, name, desc, perms] of ROLES) insRole.run(code, name, desc, JSON.stringify(perms));

  const insUser = db.prepare(`
    INSERT INTO users (username, full_name, email, password_hash, role_code, is_admin_portal_allowed, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  for (const [username, fullName, email, password, role] of USERS) {
    insUser.run(username, fullName, email, deps.hashPassword(password), role, role === 'SUPER_ADMIN' ? 1 : 0);
  }

  await db.persist();
  return { skipped: false };
}

/**
 * المرحلة الثانية — المستندات، بعد وجود جلسة.
 *
 * تُستدعى من الواجهة بعد نجاح تسجيل الدخول، بالتوكن الحقيقي. كل مستند
 * يُرسَل إلى **نفس مسار REST** الذي تستخدمه شاشة الإدخال يدوياً، فالمسار
 * المحاسبي واحد لا نسختان.
 *
 * آمنة للتكرار: لو كانت هناك فاتورة شراء واحدة على الأقل، تُعدّ البيانات
 * منشأة ولا يُضاف شيء. (تشغيلها مرتين كان سيضاعف المخزون وحساب المورد.)
 */
export async function createProcurementDocuments(
  state: BootstrapState,
  deps: Omit<BootstrapDeps, 'hashPassword'>,
  token: string
): Promise<{ created: number; skipped: boolean }> {
  const existing = state.db.prepare(`SELECT COUNT(*) AS c FROM purchase_invoices`).get();
  if (Number(existing?.c || 0) > 0) return { created: 0, skipped: true };

  const headers = { authorization: `Bearer ${token}` };
  let created = 0;
  for (const doc of DOCS) {
    const res = await deps.dispatch(state.routers, 'POST', doc.path, { headers, body: doc.body });
    if (res.status >= 400) {
      // لا نكمل بعد فشل: مستندات نصف مكتملة تبدو صحيحة وهي ليست كذلك.
      throw new Error(`فشل إنشاء (${doc.label}): ${res.body?.error || `HTTP ${res.status}`}`);
    }
    created += 1;
  }

  await state.db.persist();
  return { created, skipped: false };
}

export const PROCUREMENT_DATA = { ACCOUNTS, SUPPLIERS, ITEMS, ITEM_GROUPS, BANKS, ROLES, USERS, DOCS };
