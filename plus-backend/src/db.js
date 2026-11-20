const fs = require('node:fs');
const path = require('node:path');
const { createDatabase } = require('./libsql-adapter');
const { hashPassword, logAudit } = require('./auth');
const {
  computeReorderPoint,
  postJournalEntryRaw,
  createSalesInvoiceRaw,
  createPurchaseInvoiceRaw,
} = require('./accountingEngine');

/**
 * إعداد قاعدة البيانات — تعمل في ثلاثة أنماط:
 *
 *  1) محلي فقط (افتراضي في التطوير)
 *     ملف SQLite على القرص. لا يحتاج أي إعداد.
 *
 *  2) Turso — النسخة السحابية الدائمة (المطلوب في الإنتاج)
 *     عند وجود TURSO_DATABASE_URL + TURSO_AUTH_TOKEN يعمل التطبيق بنمط
 *     embedded replica: كل القراءة والكتابة تحصل على الملف المحلي فوراً،
 *     ثم تُدفع التغييرات إلى Turso في الخلفية. النتيجة:
 *       - البيانات دائمة (لم تعد تُفقد مع إعادة تشغيل السيرفر)
 *       - الاستعلامات تبقى متزامنة وسريعة كما هي (لم تُلمس)
 *       - النظام يستمر بالعمل محلياً لو انقطعت الشبكة لحظياً
 *
 *  3) Vercel Serverless
 *     نظام ملفات Vercel للقراءة فقط، ولا يسمح إلا بالكتابة في /tmp.
 *     لذلك نستخدم /tmp كنسخة عمل، وTurso هو مصدر الحقيقة الدائم.
 *     بدون Turso على Vercel تعود البيانات للبيانات الأولية عند كل إعادة تشغيل.
 */
const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

const TURSO_URL = (process.env.TURSO_DATABASE_URL || '').trim();
const TURSO_TOKEN = (process.env.TURSO_AUTH_TOKEN || '').trim();
const USE_TURSO = Boolean(TURSO_URL && TURSO_TOKEN);

const DB_PATH =
  process.env.PLUS_DB_PATH ||
  (IS_SERVERLESS ? '/tmp/plus_erp_replica.sqlite' : path.join(__dirname, '..', 'data', 'plus_erp.sqlite'));
const SCHEMA_PATH = path.join(__dirname, '..', 'sql', 'schema.sql');

function openDatabase() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = createDatabase({
    path: DB_PATH,
    syncUrl: USE_TURSO ? TURSO_URL : undefined,
    authToken: USE_TURSO ? TURSO_TOKEN : undefined,
  });

  db.exec('PRAGMA foreign_keys = ON;');

  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schemaSql);

  // الزراعة تحدث مرة واحدة فقط في عمر قاعدة البيانات؛
  // على Turso ستجد البيانات موجودة بالفعل وتتخطى هذه الخطوة.
  const countRoles = db.prepare(`SELECT COUNT(*) AS cnt FROM roles`).get().cnt;
  if (countRoles === 0) {
    seedDatabase(db);
  }
  return db;
}

function seedDatabase(db) {
  db.exec('PRAGMA foreign_keys = OFF;');
  const tablesToClear = [
    'audit_logs',
    'monthly_payrolls',
    'attendance_records',
    'item_movements',
    'stock_issue_items',
    'stock_issues',
    'stock_addition_items',
    'stock_additions',
    'supplier_transactions',
    'purchase_return_items',
    'purchase_returns',
    'purchase_invoice_items',
    'purchase_invoices',
    'purchase_order_items',
    'purchase_orders',
    'customer_transactions',
    'sales_return_items',
    'sales_returns',
    'sales_invoice_items',
    'sales_invoices',
    'treasury_vouchers',
    'journal_entry_lines',
    'journal_entries',
    'fiscal_periods',
    'bank_accounts',
    'employees',
    'suppliers',
    'customers',
    'items',
    'item_groups',
    'accounts',
    'account_sub_groups',
    'account_main_groups',
    'departments',
    'company_settings',
    'users',
    'roles',
  ];
  for (const tbl of tablesToClear) {
    db.exec(`DELETE FROM ${tbl};`);
  }
  db.exec('PRAGMA foreign_keys = ON;');

  // 0. إعدادات المنشأة
  db.prepare(`
    INSERT INTO company_settings (id, company_name, commercial_reg, tax_number, address, city, phone, email, currency, fiscal_year, frontend_domain, admin_domain, api_domain)
    VALUES (1, 'مجموعة بلس المتكاملة للتجارة والتقنية ش.م.م', 'CR-2026-88410', '310-994-821', 'برج بلس الإداري - الحي المالي - القاهرة', 'القاهرة', '+20 2 2794 5500', 'finance@plus-accounting.app', 'ج.م', 2026, 'https://app.plus-accounting.app', 'https://admin.plus-accounting.app', 'https://api.plus-accounting.app')
  `).run();

  // الفترات المالية
  db.prepare(`
    INSERT INTO fiscal_periods (period_id, period_name, start_date, end_date, status)
    VALUES ('FY-2026', 'السنة المالية 2026', '2026-01-01', '2026-12-31', 'مفتوحة')
  `).run();

  // الأدوار والصلاحيات (RBAC)
  const fullPerms = {
    master: { view: true, add: true, edit: true, delete: true, reports: true },
    finance: { view: true, add: true, edit: true, delete: true, reports: true },
    sales: { view: true, add: true, edit: true, delete: true, reports: true },
    purchases: { view: true, add: true, edit: true, delete: true, reports: true },
    inventory: { view: true, add: true, edit: true, delete: true, reports: true },
    hr: { view: true, add: true, edit: true, delete: true, reports: true },
    reports: { view: true, export: true, print: true },
  };

  const rolesData = [
    ['SUPER_ADMIN', 'مدير النظام العام (Administrator)', 'صلاحيات كاملة لإدارة النظام والمستخدمين والفترات المالية وجميع الوحدات', fullPerms],
    ['CHIEF_ACCOUNTANT', 'رئيس الحسابات والمدير المالي', 'إدارة كاملة للدليل المحاسبي والقيود والتقارير وكافة الوحدات المالية', fullPerms],
    ['SALES_ACCOUNTANT', 'محاسب المبيعات والعملاء', 'إصدار فواتير البيع ومردوداتها والتحصيل وكشوف حسابات العملاء', {
      master: { view: true, add: true, edit: false, delete: false, reports: true },
      finance: { view: true, add: false, edit: false, delete: false, reports: true },
      sales: { view: true, add: true, edit: true, delete: false, reports: true },
      purchases: { view: false, add: false, edit: false, delete: false, reports: false },
      inventory: { view: true, add: false, edit: false, delete: false, reports: true },
      hr: { view: false, add: false, edit: false, delete: false, reports: false },
      reports: { view: true, export: true, print: true },
    }],
    ['WAREHOUSE_KEEPER', 'أمين المخازن والرقابة السلعية', 'إدارة أذون الإضافة والصرف وبطاقات الأصناف وأوامر التوريد', {
      master: { view: true, add: true, edit: true, delete: false, reports: true },
      finance: { view: false, add: false, edit: false, delete: false, reports: false },
      sales: { view: false, add: false, edit: false, delete: false, reports: false },
      purchases: { view: true, add: true, edit: false, delete: false, reports: true },
      inventory: { view: true, add: true, edit: true, delete: false, reports: true },
      hr: { view: false, add: false, edit: false, delete: false, reports: false },
      reports: { view: true, export: true, print: true },
    }],
    ['HR_SPECIALIST', 'أخصائي الموارد البشرية والأجور', 'تسجيل الحضور والانصراف واحتساب الرواتب والمستحقات الشهرية', {
      master: { view: true, add: true, edit: true, delete: false, reports: true },
      finance: { view: false, add: false, edit: false, delete: false, reports: false },
      sales: { view: false, add: false, edit: false, delete: false, reports: false },
      purchases: { view: false, add: false, edit: false, delete: false, reports: false },
      inventory: { view: false, add: false, edit: false, delete: false, reports: false },
      hr: { view: true, add: true, edit: true, delete: false, reports: true },
      reports: { view: true, export: true, print: true },
    }],
    ['AUDITOR_VIEWER', 'مراجع مالي (عرض تقارير فقط)', 'صلاحية استعراض ومراجعة السجلات والتقارير الختامية دون تعديل', {
      master: { view: true, add: false, edit: false, delete: false, reports: true },
      finance: { view: true, add: false, edit: false, delete: false, reports: true },
      sales: { view: true, add: false, edit: false, delete: false, reports: true },
      purchases: { view: true, add: false, edit: false, delete: false, reports: true },
      inventory: { view: true, add: false, edit: false, delete: false, reports: true },
      hr: { view: true, add: false, edit: false, delete: false, reports: true },
      reports: { view: true, export: true, print: true },
    }],
  ];

  const insertRole = db.prepare(`INSERT INTO roles (role_code, role_name, description, permissions_json) VALUES (?, ?, ?, ?)`);
  for (const [code, name, desc, perms] of rolesData) {
    insertRole.run(code, name, desc, JSON.stringify(perms));
  }

  const insertUser = db.prepare(`
    INSERT INTO users (username, full_name, email, password_hash, role_code, is_admin_portal_allowed, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  insertUser.run('admin', 'د. خالد مازن - مدير النظام', 'admin@plus-accounting.app', hashPassword('admin123'), 'SUPER_ADMIN', 1);
  insertUser.run('accountant', 'أ. أحمد طارق - رئيس الحسابات', 'cfo@plus-accounting.app', hashPassword('plus123'), 'CHIEF_ACCOUNTANT', 1);
  insertUser.run('sales', 'أ. سارة محمود - محاسب المبيعات', 'sales@plus-accounting.app', hashPassword('plus123'), 'SALES_ACCOUNTANT', 0);
  insertUser.run('store', 'أ. مصطفى حسن - أمين المخزن', 'store@plus-accounting.app', hashPassword('plus123'), 'WAREHOUSE_KEEPER', 0);
  insertUser.run('hr', 'أ. نهى عادل - الموارد البشرية', 'hr@plus-accounting.app', hashPassword('plus123'), 'HR_SPECIALIST', 0);
  insertUser.run('auditor', 'أ. كريم سامي - المراجع المالي', 'audit@plus-accounting.app', hashPassword('plus123'), 'AUDITOR_VIEWER', 0);

  // 1. الإدارات والأقسام
  const depts = [
    ['DEPT-FIN', 'الإدارة المالية والمحاسبة', 'أ. أحمد طارق', 'إدارة الحسابات العامة والموازنات والخزينة'],
    ['DEPT-SLS', 'إدارة المبيعات وخدمة العملاء', 'أ. عمرو الشناوي', 'إدارة المبيعات والتعاقدات والتحصيل'],
    ['DEPT-PUR', 'إدارة المشتريات وسلاسل الإمداد', 'أ. وليد فؤاد', 'التوريدات المحلية والخارجية وعلاقات الموردين'],
    ['DEPT-INV', 'إدارة المخازن والرقابة السلعية', 'أ. مصطفى حسن', 'تخزين ومراقبة الأرصدة ونقاط إعادة الطلب'],
    ['DEPT-HR', 'إدارة الموارد البشرية والشؤون الإدارية', 'أ. نهى عادل', 'شؤون العاملين والحضور والأجور'],
  ];
  const insDept = db.prepare(`INSERT INTO departments VALUES (?, ?, ?, ?)`);
  for (const d of depts) insDept.run(...d);

  // 2. دليل الحسابات الشجري (3 مستويات)
  const mainGroups = [
    ['1', 'الأصول', 'debit', 'balance_sheet'],
    ['2', 'الخصوم وحقوق الملكية', 'credit', 'balance_sheet'],
    ['3', 'المصروفات والتكاليف', 'debit', 'income_statement'],
    ['4', 'الإيرادات', 'credit', 'income_statement'],
  ];
  const insMain = db.prepare(`INSERT INTO account_main_groups VALUES (?, ?, ?, ?)`);
  for (const mg of mainGroups) insMain.run(...mg);

  const subGroups = [
    ['11', 'الأصول المتداولة', '1'],
    ['12', 'الأصول الثابتة (غير المتداولة)', '1'],
    ['21', 'الخصوم المتداولة (قصيرة الأجل)', '2'],
    ['22', 'الخصوم طويلة الأجل', '2'],
    ['23', 'حقوق الملكية ورأس المال', '2'],
    ['31', 'تكلفة المبيعات والنشاط', '3'],
    ['32', 'المصروفات الإدارية والعمومية والتسويقية', '3'],
    ['41', 'إيرادات النشاط الرئيسي (المبيعات)', '4'],
    ['42', 'الإيرادات المتنوعة الأخرى', '4'],
  ];
  const insSub = db.prepare(`INSERT INTO account_sub_groups VALUES (?, ?, ?)`);
  for (const sg of subGroups) insSub.run(...sg);

  // الأرصدة الافتتاحية المتوازنة بدقة: إجمالي المدين = 2,900,000 | إجمالي الدائن = 2,900,000
  const accountsData = [
    ['1101', 'الخزينة النقدية الرئيسية', '11', 250000, 0, 1],
    ['1102', 'البنوك والحسابات الجارية', '11', 600000, 0, 1],
    ['1103', 'العملاء (المدينون التجاريون)', '11', 120000, 0, 0],
    ['1104', 'المخزون السلعي بالمعارض والمخازن', '11', 600000, 0, 0],
    ['1105', 'أوراق القبض وشيكات برسم التحصيل', '11', 0, 0, 0],
    ['1201', 'العقارات والمباني الإدارية', '12', 850000, 0, 0],
    ['1202', 'الأثاث والتجهيزات المكتبية', '12', 180000, 0, 0],
    ['1203', 'السيارات ووسائل النقل', '12', 300000, 0, 0],
    ['2101', 'الموردون (الدائنون التجاريون)', '21', 0, 150000, 0],
    ['2102', 'أوراق الدفع وشيكات مستحقة', '21', 0, 100000, 0],
    ['2103', 'مصروفات وأجور مستحقة', '21', 0, 50000, 0],
    ['2201', 'قروض وتسهيلات بنكية طويلة الأجل', '22', 0, 400000, 0],
    ['2301', 'رأس المال المدفوع', '23', 0, 1850000, 0],
    ['2302', 'الاحتياطي القانوني والأرباح المحتجزة', '23', 0, 350000, 0],
    ['3101', 'تكلفة البضاعة المباعة', '31', 0, 0, 0],
    ['3102', 'مشتريات ومستلزمات تشغيل منصرفة', '31', 0, 0, 0],
    ['3201', 'الأجور والمرتبات والبدلات', '32', 0, 0, 0],
    ['3202', 'الإيجارات والمرافق والكهرباء', '32', 0, 0, 0],
    ['3203', 'مصروفات تسويق ودعاية وإعلان', '32', 0, 0, 0],
    ['3204', 'خصم مسموح به ومردودات مبيعات', '32', 0, 0, 0],
    ['4101', 'إيرادات المبيعات', '41', 0, 0, 0],
    ['4201', 'إيرادات استشارات وخدمات صيانة', '42', 0, 0, 0],
    ['4202', 'خصم مكتسب وإيرادات أخرى', '42', 0, 0, 0],
  ];
  const insAcc = db.prepare(`INSERT INTO accounts (account_code, account_name, sub_group_code, opening_debit, opening_credit, is_cash_account, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)`);
  for (const a of accountsData) insAcc.run(...a);

  // 3. حسابات البنوك (مجموع أرصدتها 600,000 مطابق لحساب 1102)
  const banks = [
    ['EG89000300125008891', 'البنك الأهلي المصري', 'فرع برج القاهرة المالي', 'ج.م', 380000, 380000, '1102'],
    ['EG44000200994001120', 'بنك مصر', 'فرع التجمع الخامس', 'ج.م', 220000, 220000, '1102'],
  ];
  const insBank = db.prepare(`INSERT INTO bank_accounts VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const b of banks) insBank.run(...b);

  // 4. مجموعات الأصناف والأصناف (مجموع تكلفة الرصيد الافتتاحي = 600,000 مطابق لحساب 1104)
  const itemGroups = [
    ['GRP-SRV', 'خوادم وحاسبات الأعمال', 'أجهزة خوادم وحاسبات محمولة للشركات'],
    ['GRP-POS', 'أنظمة نقاط البيع والطابعات', 'تجهيزات المحاسبة والباركود والطابعات الشبكية'],
    ['GRP-NET', 'وحدات التخزين والشبكات', 'أنظمة التخزين الاحتياطي ومستلزمات الشبكات'],
  ];
  const insIG = db.prepare(`INSERT INTO item_groups VALUES (?, ?, ?)`);
  for (const ig of itemGroups) insIG.run(...ig);

  const itemsSeed = [
    {
      code: 'ITM-101',
      name: 'خادم أعمال Dell PowerEdge R550',
      group: 'GRP-SRV',
      type: 'بضاعة تامة الصنع',
      uom: 'جهاز',
      cost: 18000,
      price: 24500,
      annual: 120,
      safety: 3,
      lead: 10,
      eoq: 15,
      qty: 12,
    },
    {
      code: 'ITM-102',
      name: 'حاسب محمول Lenovo ThinkPad X1 Carbon',
      group: 'GRP-SRV',
      type: 'بضاعة تامة الصنع',
      uom: 'جهاز',
      cost: 12000,
      price: 16800,
      annual: 365,
      safety: 6,
      lead: 8,
      eoq: 25,
      qty: 10, // reorder_point = (1*8)+6 = 14 -> سينخفض بالبيع ويُظهر تنبيه إعادة طلب فوري!
    },
    {
      code: 'ITM-103',
      name: 'طابعة ليزر شبكية HP LaserJet Enterprise',
      group: 'GRP-POS',
      type: 'بضاعة تامة الصنع',
      uom: 'طابعة',
      cost: 5500,
      price: 7900,
      annual: 220,
      safety: 5,
      lead: 9,
      eoq: 20,
      qty: 8, // reorder_point = ceil(0.602*9 + 5) = 11 -> تحت حد الطلب!
    },
    {
      code: 'ITM-104',
      name: 'منظومة كاشير ونقاط بيع ذكية Plus POS Pro',
      group: 'GRP-POS',
      type: 'بضاعة تامة الصنع',
      uom: 'منظومة',
      cost: 4000,
      price: 6200,
      annual: 300,
      safety: 6,
      lead: 7,
      eoq: 30,
      qty: 25,
    },
    {
      code: 'ITM-105',
      name: 'وحدة تخزين شبكي Synology NAS 8-Bay',
      group: 'GRP-NET',
      type: 'بضاعة تامة الصنع',
      uom: 'وحدة',
      cost: 6000,
      price: 8900,
      annual: 140,
      safety: 4,
      lead: 10,
      eoq: 18,
      qty: 15,
    },
    {
      code: 'ITM-106',
      name: 'حزمة كابلات ألياف ضوئية قياسية (صنف راكد)',
      group: 'GRP-NET',
      type: 'مستلزمات شبكات',
      uom: 'كرتونة',
      cost: 1000,
      price: 1550,
      annual: 40,
      safety: 5,
      lead: 5,
      eoq: 15,
      qty: 30, // بلا مبيعات ليظهر في تقرير الأصناف الراكدة!
    },
  ];

  const insItem = db.prepare(`
    INSERT INTO items (item_code, item_name, group_code, item_type, unit_of_measure, cost_price, unit_price, annual_demand, safety_stock, lead_time_days, eoq, reorder_point, current_balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insInitMove = db.prepare(`
    INSERT INTO item_movements (movement_date, item_code, movement_type, doc_no, qty_in, qty_out, unit_price, balance_after, notes)
    VALUES ('2026-01-01', ?, 'رصيد افتتاحي', 'OPEN-2026', ?, 0, ?, ?, 'رصيد أول المدة المعتمد')
  `);
  for (const it of itemsSeed) {
    const rop = computeReorderPoint(it.annual, it.lead, it.safety);
    insItem.run(it.code, it.name, it.group, it.type, it.uom, it.cost, it.price, it.annual, it.safety, it.lead, it.eoq, rop, it.qty);
    insInitMove.run(it.code, it.qty, it.cost, it.qty);
  }

  // 5. العملاء (مجموع الأرصدة الافتتاحية = 120,000 مطابق لحساب 1103)
  const customers = [
    ['CUST-001', 'شركة النيل الذهبية للتوزيع', '14 شارع التسعين الشمالي', 'القاهرة', '01002458890', 'accounts@nilegold.eg', 250000, 45000],
    ['CUST-002', 'مؤسسة الأهرام للحلول المتكاملة', 'برج السلام الإداري - سموحة', 'الإسكندرية', '01228841900', 'fin@ahram-sol.eg', 200000, 50000],
    ['CUST-003', 'شركة الصعيد الحديثة للتجارة', 'شارع الجمهورية الرئيسي', 'المنيا', '01119402210', 'info@saeedtrade.eg', 120000, 25000],
    ['CUST-004', 'مجموعة الرواد للمراكز التجارية', 'المنطقة الصناعية الثالثة', 'العاشر من رمضان', '01099114422', 'purchasing@rowad.eg', 300000, 0],
  ];
  const insCust = db.prepare(`INSERT INTO customers VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const c of customers) insCust.run(...c);

  // 6. الموردون (مجموع الأرصدة الافتتاحية = 150,000 مطابق لحساب 2101)
  const suppliers = [
    ['SUP-001', 'التوكيل العربي لتقنية المعلومات', 'القرية الذكية - مبنى B4', 'الجيزة', '0235390100', 'sales@arabtech-dist.eg', 70000],
    ['SUP-002', 'الشركة الدولية للأنظمة الرقمية', 'مكرم عبيد - مدينة نصر', 'القاهرة', '0222749900', 'orders@intl-digital.eg', 50000],
    ['SUP-003', 'مصنع الدلتا لمستلزمات الشبكات', 'المنطقة الحرة العامرية', 'الإسكندرية', '034489120', 'export@deltanet.eg', 30000],
  ];
  const insSupp = db.prepare(`INSERT INTO suppliers VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const s of suppliers) insSupp.run(...s);

  // 7. الموظفون (الموارد البشرية)
  const employees = [
    ['EMP-001', 'أحمد طارق عبد الرحمن', 'مدير الإدارة المالية', 'DEPT-FIN', 'محاسبة ومراجعة', 'ماجستير محاسبة وتمويل', '1987-04-15', '2020-01-10', 'متزوج', 18500, 2500, 1500, 800, 700, 'نشط'],
    ['EMP-002', 'عمرو محمد الشناوي', 'مسؤول مبيعات أول', 'DEPT-SLS', 'إدارة أعمال وتسويق', 'بكالوريوس تجارة', '1991-09-22', '2021-03-01', 'متزوج', 12000, 1800, 1400, 600, 500, 'نشط'],
    ['EMP-003', 'سارة محمود الجندي', 'محاسب عملاء ومبيعات', 'DEPT-SLS', 'نظم معلومات محاسبية', 'بكالوريوس تجارة إنجليزي', '1995-11-05', '2022-06-15', 'أعزب', 10500, 1500, 1100, 600, 300, 'نشط'],
    ['EMP-004', 'مصطفى حسن عبد الله', 'أمين المخازن الرئيسي', 'DEPT-INV', 'إدارة لوجستيات ومخازن', 'بكالوريوس نظم ومعلومات', '1990-02-18', '2021-09-01', 'متزوج', 9800, 1400, 1000, 600, 200, 'نشط'],
    ['EMP-005', 'نهى عادل الكيلاني', 'أخصائي أول موارد بشرية', 'DEPT-HR', 'إدارة موارد بشرية', 'بكالوريوس إدارة أعمال', '1993-07-30', '2022-02-01', 'متزوج', 11000, 1500, 1100, 600, 400, 'نشط'],
  ];
  const insEmp = db.prepare(`INSERT INTO employees VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const e of employees) insEmp.run(...e);

  // =========================================================================
  // تسجيل حركات فعلية مترابطة لإثراء كافة الشاشات والتقارير
  // =========================================================================

  // أ) أمر توريد مفتوح + أمر توريد مستلم
  db.prepare(`
    INSERT INTO purchase_orders (po_no, po_date, supplier_id, expected_date, status, total_amount, notes)
    VALUES ('PO-1001', '2026-09-10', 'SUP-001', '2026-09-18', 'تم الاستلام', 96000, 'أمر توريد أجهزة حاسب محمول وخوادم')
  `).run();
  db.prepare(`
    INSERT INTO purchase_order_items (line_no, po_no, item_code, quantity, unit_price, net_amount)
    VALUES (1, 'PO-1001', 'ITM-102', 5, 12000, 60000), (2, 'PO-1001', 'ITM-101', 2, 18000, 36000)
  `).run();

  db.prepare(`
    INSERT INTO purchase_orders (po_no, po_date, supplier_id, expected_date, status, total_amount, notes)
    VALUES ('PO-1002', '2026-11-12', 'SUP-002', '2026-11-25', 'قيد التنفيذ', 110000, 'تعزيز مخزون الطابعات الشبكية تحت حد الطلب')
  `).run();
  db.prepare(`
    INSERT INTO purchase_order_items (line_no, po_no, item_code, quantity, unit_price, net_amount)
    VALUES (1, 'PO-1002', 'ITM-103', 20, 5500, 110000)
  `).run();

  // ب) فاتورة شراء رقم PINV-1001 مرتبطة بأمر التوريد PO-1001
  createPurchaseInvoiceRaw(db, {
    invoice_no: 'PINV-1001',
    invoice_date: '2026-09-16',
    supplier_id: 'SUP-001',
    po_no: 'PO-1001',
    payment_method: 'آجل',
    items: [
      { item_code: 'ITM-102', quantity: 5, unit_price: 12000, discount_percent: 0 },
      { item_code: 'ITM-101', quantity: 2, unit_price: 18000, discount_percent: 0 },
    ],
    notes: 'استلام بضاعة أمر التوريد PO-1001 بالمخزن الرئيسي',
  }, 'admin');

  // ج) فواتير بيع متعددة عبر الشهور والمندوبين والعملاء لتحليل المبيعات الرباعي
  createSalesInvoiceRaw(db, {
    invoice_no: 'SINV-1001',
    invoice_date: '2026-09-22',
    employee_code: 'EMP-002',
    customer_id: 'CUST-001',
    payment_method: 'آجل',
    items: [
      { item_code: 'ITM-101', quantity: 3, unit_price: 24500, discount_percent: 5 },
      { item_code: 'ITM-104', quantity: 5, unit_price: 6200, discount_percent: 0 },
    ],
    notes: 'تجهيز البنية التحتية لفرع شركة النيل الذهبية',
  }, 'sales');

  createSalesInvoiceRaw(db, {
    invoice_no: 'SINV-1002',
    invoice_date: '2026-10-14',
    employee_code: 'EMP-003',
    customer_id: 'CUST-002',
    payment_method: 'تحويل بنكي',
    bank_account_number: 'EG89000300125008891',
    items: [
      { item_code: 'ITM-102', quantity: 6, unit_price: 16800, discount_percent: 2 },
      { item_code: 'ITM-105', quantity: 3, unit_price: 8900, discount_percent: 0 },
    ],
    notes: 'توريد أجهزة محمولة ووحدات تخزين شبكية - سداد بنكي فوري',
  }, 'sales');

  createSalesInvoiceRaw(db, {
    invoice_no: 'SINV-1003',
    invoice_date: '2026-11-08',
    employee_code: 'EMP-002',
    customer_id: 'CUST-003',
    payment_method: 'آجل',
    items: [
      { item_code: 'ITM-102', quantity: 3, unit_price: 16800, discount_percent: 0 },
      { item_code: 'ITM-103', quantity: 2, unit_price: 7900, discount_percent: 0 },
    ],
    notes: 'توريد أجهزة لمنطقة الصعيد - فاتورة آجلة',
  }, 'sales');

  // د) تحصيل نقدي من عميل CUST-001
  const collJe = postJournalEntryRaw(db, {
    entry_date: '2026-10-28',
    reference_type: 'سند تحصيل عميل',
    reference_no: 'RCV-1001',
    description: 'تحصيل دفعة نقدية من شركة النيل الذهبية للتوزيع',
    lines: [
      { account_code: '1101', debit: 60000, credit: 0, notes: 'توريد نقدي للخزينة الرئيسية' },
      { account_code: '1103', debit: 0, credit: 60000, notes: 'سداد جزء من مديونية العميل CUST-001' },
    ],
    created_by: 'sales',
  });
  db.prepare(`
    INSERT INTO customer_transactions (doc_no, customer_id, tx_date, debit, credit, tx_type, collection_method, notes, journal_entry_number)
    VALUES ('RCV-1001', 'CUST-001', '2026-10-28', 0, 60000, 'تحصيل من عميل', 'نقدي', 'تحصيل دفعة من الحساب الجاري للعميل', ?)
  `).run(collJe.entry_number);
  db.prepare(`
    INSERT INTO treasury_vouchers (voucher_no, voucher_type, payment_method, voucher_date, amount, account_code, beneficiary_name, notes, journal_entry_number)
    VALUES ('RCV-1001', 'receipt', 'نقدي', '2026-10-28', 60000, '1103', 'شركة النيل الذهبية للتوزيع', 'تحصيل نقدي من عميل', ?)
  `).run(collJe.entry_number);

  // هـ) سداد لمورد SUP-001 بشيك بنكي
  const payJe = postJournalEntryRaw(db, {
    entry_date: '2026-10-30',
    reference_type: 'سند سداد مورد',
    reference_no: 'PAY-1001',
    description: 'سداد بشيك للتوكيل العربي لتقنية المعلومات',
    lines: [
      { account_code: '2101', debit: 80000, credit: 0, notes: 'سداد دفعة للمورد SUP-001' },
      { account_code: '1102', debit: 0, credit: 80000, notes: 'شيك مسحوب على البنك الأهلي المصري' },
    ],
    created_by: 'accountant',
  });
  db.prepare(`UPDATE bank_accounts SET balance = ROUND(balance - 80000, 2) WHERE bank_account_number = 'EG89000300125008891'`).run();
  db.prepare(`
    INSERT INTO supplier_transactions (doc_no, supplier_id, tx_date, debit, credit, tx_type, payment_method, bank_account_number, check_number, notes, journal_entry_number)
    VALUES ('PAY-1001', 'SUP-001', '2026-10-30', 80000, 0, 'سداد لمورد', 'شيك', 'EG89000300125008891', 'CHK-774901', 'شيك بنكي لصالح المورد', ?)
  `).run(payJe.entry_number);
  db.prepare(`
    INSERT INTO treasury_vouchers (voucher_no, voucher_type, payment_method, voucher_date, amount, account_code, bank_account_number, check_number, check_due_date, beneficiary_name, notes, journal_entry_number)
    VALUES ('PAY-1001', 'payment', 'شيك', '2026-10-30', 80000, '2101', 'EG89000300125008891', 'CHK-774901', '2026-11-05', 'التوكيل العربي لتقنية المعلومات', 'سداد مستحقات مورد بشيك', ?)
  `).run(payJe.entry_number);

  // و) قيد مصروفات تشغيلية وإيراد خدمات استشارية
  postJournalEntryRaw(db, {
    entry_date: '2026-11-02',
    reference_type: 'قيد يومية يدوي',
    reference_no: 'EXP-1101',
    description: 'سداد إيجار المقر الإداري ومرافق وحملة تسويقية لشهر نوفمبر',
    lines: [
      { account_code: '3202', debit: 18000, credit: 0, notes: 'إيجار ومرافق وكهرباء المقر الرئيسي' },
      { account_code: '3203', debit: 9500, credit: 0, notes: 'حملة إعلانية رقمية لمنتجات Plus POS' },
      { account_code: '1101', debit: 0, credit: 27500, notes: 'صرف نقدي من الخزينة الرئيسية' },
    ],
    created_by: 'accountant',
  });

  postJournalEntryRaw(db, {
    entry_date: '2026-11-10',
    reference_type: 'قيد إيراد خدمات',
    reference_no: 'SRV-1102',
    description: 'تحصيل إيراد عقد صيانة ودعم فني سنوي',
    lines: [
      { account_code: '1102', debit: 35000, credit: 0, notes: 'إيداع بحساب بنك مصر' },
      { account_code: '4201', debit: 0, credit: 35000, notes: 'إيراد عقد صيانة ودعم فني' },
    ],
    created_by: 'accountant',
  });
  db.prepare(`UPDATE bank_accounts SET balance = ROUND(balance + 35000, 2) WHERE bank_account_number = 'EG44000200994001120'`).run();

  // ز) سجلات الحضور والانصراف وكشف أجور شهر أكتوبر 2026
  const attSeed = [
    ['EMP-001', '2026-11-17', '08:25', '16:40', 'حاضر', 0, 1.0, 'انضباط تام'],
    ['EMP-002', '2026-11-17', '08:30', '17:30', 'حاضر', 0, 2.0, 'مأمورية مبيعات خارجية'],
    ['EMP-003', '2026-11-17', '08:50', '16:30', 'تأخير', 20, 0, 'تأخير صباحي 20 دقيقة'],
    ['EMP-004', '2026-11-17', '08:20', '16:35', 'حاضر', 0, 0.5, 'جرد مخزني صباحي'],
    ['EMP-005', '2026-11-17', '08:30', '16:30', 'حاضر', 0, 0, 'حضور منتظم'],
    ['EMP-001', '2026-11-18', '08:28', '16:35', 'حاضر', 0, 0, 'حضور منتظم'],
    ['EMP-002', '2026-11-18', '08:30', '17:00', 'حاضر', 0, 1.0, 'متابعة عملاء'],
    ['EMP-003', '2026-11-18', '08:30', '16:30', 'حاضر', 0, 0, 'حضور منتظم'],
    ['EMP-004', '2026-11-18', '--:--', '--:--', 'إجازة', 0, 0, 'إجازة اعتيادية معتمدة'],
    ['EMP-005', '2026-11-18', '08:30', '16:30', 'حاضر', 0, 0, 'حضور منتظم'],
  ];
  const insAtt = db.prepare(`
    INSERT INTO attendance_records (employee_code, att_date, check_in, check_out, status, late_minutes, overtime_hours, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const a of attSeed) insAtt.run(...a);

  // احتساب وصرف رواتب شهر أكتوبر 2026
  const allEmps = db.prepare(`SELECT * FROM employees`).all();
  let totalPayrollNet = 0;
  const payrollRows = allEmps.map((emp) => {
    const allowances = emp.housing_allowance + emp.transport_allowance + emp.meal_allowance + emp.other_allowances;
    const incentives = emp.employee_code === 'EMP-002' ? 1500 : 500;
    const overtimePay = emp.employee_code === 'EMP-001' ? 600 : 300;
    const deductions = emp.employee_code === 'EMP-003' ? 250 : 0;
    const net = emp.basic_salary + allowances + incentives + overtimePay - deductions;
    totalPayrollNet += net;
    return { emp, allowances, incentives, overtimePay, deductions, net };
  });

  const payRollJe = postJournalEntryRaw(db, {
    entry_date: '2026-10-31',
    reference_type: 'مسير رواتب وأجور',
    reference_no: 'PAYROLL-2026-10',
    description: 'إثبات وصرف مستحقات وأجور العاملين عن شهر أكتوبر 2026',
    lines: [
      { account_code: '3201', debit: totalPayrollNet, credit: 0, notes: 'إجمالي صافي الأجور والبدلات والحوافز لشهر 10/2026' },
      { account_code: '1102', debit: 0, credit: totalPayrollNet, notes: 'تحويل الرواتب عبر البنك الأهلي المصري' },
    ],
    created_by: 'hr',
  });
  db.prepare(`UPDATE bank_accounts SET balance = ROUND(balance - ?, 2) WHERE bank_account_number = 'EG89000300125008891'`).run(totalPayrollNet);

  const insPay = db.prepare(`
    INSERT INTO monthly_payrolls (employee_code, month, year, basic_salary, allowances, incentives, overtime_pay, deductions, net_salary, is_paid, journal_entry_number)
    VALUES (?, 10, 2026, ?, ?, ?, ?, ?, ?, 1, ?)
  `);
  for (const r of payrollRows) {
    insPay.run(r.emp.employee_code, r.emp.basic_salary, r.allowances, r.incentives, r.overtimePay, r.deductions, r.net, payRollJe.entry_number);
  }

  logAudit(db, {
    username: 'admin',
    user_role: 'SUPER_ADMIN',
    portal: 'ADMIN',
    module: 'قاعدة البيانات',
    action: 'تهيئة البيانات التأسيسية',
    entity_id: 'FY-2026',
    details: 'تم بناء الجداول الرئيسية وجداول الحركة وتغذية الأرصدة الافتتاحية المتوازنة بنجاح',
  });
}

module.exports = {
  openDatabase,
  seedDatabase,
  DB_PATH,
  SCHEMA_PATH,
  IS_SERVERLESS,
  USE_TURSO,
  TURSO_URL,
};
