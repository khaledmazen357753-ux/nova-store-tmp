-- =================================================================================
-- المحاسبي Plus (Plus Accounting ERP)
-- المخطط الكامل لقاعدة البيانات العلائقية (Complete Relational SQL Schema)
-- مصمم وفق منهج نظم المعلومات المحاسبية (الفصلان الخامس والسادس)
-- علاقات واحد لكثير (One-to-Many) لمنع ازدواج البيانات وضمان التكامل المرجعي
-- =================================================================================

PRAGMA foreign_keys = ON;

-- =================================================================================
-- أولاً: الجداول الرئيسية (Master Files)
-- =================================================================================

-- 0. بيانات المنشأة وإعدادات النطاقات المستقلة
CREATE TABLE IF NOT EXISTS company_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    company_name TEXT NOT NULL DEFAULT 'مجموعة بلس التجارية والصناعية ش.م.م',
    commercial_reg TEXT NOT NULL DEFAULT 'CR-2026-88410',
    tax_number TEXT NOT NULL DEFAULT '310-994-821',
    address TEXT NOT NULL DEFAULT 'برج الأعمال الذهبي - الحي المالي - القاهرة',
    city TEXT NOT NULL DEFAULT 'القاهرة',
    phone TEXT NOT NULL DEFAULT '+20 2 2794 5500',
    email TEXT NOT NULL DEFAULT 'finance@plus-accounting.app',
    currency TEXT NOT NULL DEFAULT 'ج.م',
    fiscal_year INTEGER NOT NULL DEFAULT 2026,
    frontend_domain TEXT NOT NULL DEFAULT 'https://app.plus-accounting.app',
    admin_domain TEXT NOT NULL DEFAULT 'https://admin.plus-accounting.app',
    api_domain TEXT NOT NULL DEFAULT 'https://api.plus-accounting.app',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 1. جدول الإدارات والأقسام
CREATE TABLE IF NOT EXISTS departments (
    dept_code TEXT PRIMARY KEY,
    dept_name TEXT NOT NULL,
    manager_name TEXT,
    description TEXT
);

-- 2. دليل الحسابات الشجري (3 مستويات: رئيسي -> فرعي -> حسابات)
-- المستوى الأول: جدول المجموعات الرئيسية للحسابات
CREATE TABLE IF NOT EXISTS account_main_groups (
    main_group_code TEXT PRIMARY KEY,
    group_name TEXT NOT NULL,
    account_nature TEXT NOT NULL CHECK (account_nature IN ('debit', 'credit')),
    statement_type TEXT NOT NULL CHECK (statement_type IN ('balance_sheet', 'income_statement'))
);

-- المستوى الثاني: جدول المجموعات الفرعية للحسابات
CREATE TABLE IF NOT EXISTS account_sub_groups (
    sub_group_code TEXT PRIMARY KEY,
    sub_group_name TEXT NOT NULL,
    main_group_code TEXT NOT NULL,
    FOREIGN KEY (main_group_code) REFERENCES account_main_groups(main_group_code)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

-- المستوى الثالث: جدول الحسابات
CREATE TABLE IF NOT EXISTS accounts (
    account_code TEXT PRIMARY KEY,
    account_name TEXT NOT NULL,
    sub_group_code TEXT NOT NULL,
    opening_debit REAL NOT NULL DEFAULT 0,
    opening_credit REAL NOT NULL DEFAULT 0,
    is_cash_account INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (sub_group_code) REFERENCES account_sub_groups(sub_group_code)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 3. مجموعات الأصناف وجدول البيانات الأساسية للأصناف
CREATE TABLE IF NOT EXISTS item_groups (
    group_code TEXT PRIMARY KEY,
    group_name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS items (
    item_code TEXT PRIMARY KEY,
    item_name TEXT NOT NULL,
    group_code TEXT NOT NULL,
    item_type TEXT NOT NULL DEFAULT 'بضاعة تامة الصنع',
    unit_of_measure TEXT NOT NULL DEFAULT 'وحدة',
    cost_price REAL NOT NULL DEFAULT 0,
    unit_price REAL NOT NULL DEFAULT 0,
    annual_demand REAL NOT NULL DEFAULT 0,
    safety_stock REAL NOT NULL DEFAULT 0,
    lead_time_days INTEGER NOT NULL DEFAULT 7,
    eoq REAL NOT NULL DEFAULT 0,
    reorder_point REAL NOT NULL DEFAULT 0,
    current_balance REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (group_code) REFERENCES item_groups(group_code)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 4. جدول البيانات الأساسية للعملاء
CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    credit_limit REAL NOT NULL DEFAULT 50000,
    opening_balance REAL NOT NULL DEFAULT 0
);

-- 5. جدول البيانات الأساسية للموردين
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id TEXT PRIMARY KEY,
    supplier_name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    opening_balance REAL NOT NULL DEFAULT 0
);

-- 6. جدول بيانات العاملين (الموارد البشرية)
CREATE TABLE IF NOT EXISTS employees (
    employee_code TEXT PRIMARY KEY,
    employee_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    dept_code TEXT NOT NULL,
    specialization TEXT,
    qualification TEXT,
    birth_date TEXT,
    hire_date TEXT,
    marital_status TEXT DEFAULT 'أعزب',
    basic_salary REAL NOT NULL DEFAULT 0,
    housing_allowance REAL NOT NULL DEFAULT 0,
    transport_allowance REAL NOT NULL DEFAULT 0,
    meal_allowance REAL NOT NULL DEFAULT 0,
    other_allowances REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'نشط',
    FOREIGN KEY (dept_code) REFERENCES departments(dept_code)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 7. جدول حسابات البنوك
CREATE TABLE IF NOT EXISTS bank_accounts (
    bank_account_number TEXT PRIMARY KEY,
    bank_name TEXT NOT NULL,
    branch TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'ج.م',
    opening_balance REAL NOT NULL DEFAULT 0,
    balance REAL NOT NULL DEFAULT 0,
    gl_account_code TEXT,
    FOREIGN KEY (gl_account_code) REFERENCES accounts(account_code)
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- =================================================================================
-- ثانياً: جداول الحركة (Transaction Files - رأس المستند + تفاصيل المستند)
-- =================================================================================

-- الفترات المالية وإقفال وترحيل الأرصدة
CREATE TABLE IF NOT EXISTS fiscal_periods (
    period_id TEXT PRIMARY KEY,
    period_name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'مفتوحة' CHECK (status IN ('مفتوحة', 'مقفلة')),
    closed_at TEXT,
    closed_by TEXT,
    closing_entry_no TEXT,
    net_income REAL DEFAULT 0
);

-- 1. قيود اليومية العامة (رأس القيد + تفاصيل القيد)
CREATE TABLE IF NOT EXISTS journal_entries (
    entry_number TEXT PRIMARY KEY,
    entry_date TEXT NOT NULL,
    reference_type TEXT NOT NULL DEFAULT 'قيد يومية يدوي',
    reference_no TEXT,
    description TEXT NOT NULL,
    total_debit REAL NOT NULL CHECK (total_debit >= 0),
    total_credit REAL NOT NULL CHECK (total_credit >= 0),
    period_id TEXT DEFAULT 'FY-2026',
    created_by TEXT DEFAULT 'النظام',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_no INTEGER NOT NULL,
    entry_number TEXT NOT NULL,
    account_code TEXT NOT NULL,
    debit REAL NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit REAL NOT NULL DEFAULT 0 CHECK (credit >= 0),
    notes TEXT,
    FOREIGN KEY (entry_number) REFERENCES journal_entries(entry_number)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (account_code) REFERENCES accounts(account_code)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

-- سندات المتحصلات والمدفوعات النقدية وبالشيكات
CREATE TABLE IF NOT EXISTS treasury_vouchers (
    voucher_no TEXT PRIMARY KEY,
    voucher_type TEXT NOT NULL CHECK (voucher_type IN ('receipt', 'payment')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('نقدي', 'شيك', 'تحويل بنكي')),
    voucher_date TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    account_code TEXT NOT NULL,
    bank_account_number TEXT,
    check_number TEXT,
    check_due_date TEXT,
    beneficiary_name TEXT,
    notes TEXT,
    journal_entry_number TEXT,
    FOREIGN KEY (account_code) REFERENCES accounts(account_code),
    FOREIGN KEY (bank_account_number) REFERENCES bank_accounts(bank_account_number),
    FOREIGN KEY (journal_entry_number) REFERENCES journal_entries(entry_number)
);

-- 2. المبيعات وحسابات العملاء
CREATE TABLE IF NOT EXISTS sales_invoices (
    invoice_no TEXT PRIMARY KEY,
    invoice_date TEXT NOT NULL,
    employee_code TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'آجل' CHECK (payment_method IN ('آجل', 'نقدي', 'شيك', 'تحويل بنكي')),
    bank_account_number TEXT,
    gross_total REAL NOT NULL DEFAULT 0,
    discount_total REAL NOT NULL DEFAULT 0,
    net_total REAL NOT NULL DEFAULT 0,
    notes TEXT,
    journal_entry_number TEXT,
    FOREIGN KEY (employee_code) REFERENCES employees(employee_code),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (journal_entry_number) REFERENCES journal_entries(entry_number)
);

CREATE TABLE IF NOT EXISTS sales_invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_no INTEGER NOT NULL,
    invoice_no TEXT NOT NULL,
    item_code TEXT NOT NULL,
    quantity REAL NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    discount_percent REAL NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_amount REAL NOT NULL DEFAULT 0,
    net_amount REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (invoice_no) REFERENCES sales_invoices(invoice_no)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (item_code) REFERENCES items(item_code)
);

CREATE TABLE IF NOT EXISTS sales_returns (
    return_no TEXT PRIMARY KEY,
    return_date TEXT NOT NULL,
    invoice_no TEXT,
    customer_id TEXT NOT NULL,
    refund_method TEXT NOT NULL DEFAULT 'خصم من الحساب' CHECK (refund_method IN ('خصم من الحساب', 'نقدي')),
    total_amount REAL NOT NULL DEFAULT 0,
    reason TEXT,
    journal_entry_number TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (journal_entry_number) REFERENCES journal_entries(entry_number)
);

CREATE TABLE IF NOT EXISTS sales_return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_no INTEGER NOT NULL,
    return_no TEXT NOT NULL,
    item_code TEXT NOT NULL,
    quantity REAL NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    discount_percent REAL NOT NULL DEFAULT 0,
    net_amount REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (return_no) REFERENCES sales_returns(return_no)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (item_code) REFERENCES items(item_code)
);

CREATE TABLE IF NOT EXISTS customer_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_no TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    tx_date TEXT NOT NULL,
    debit REAL NOT NULL DEFAULT 0,
    credit REAL NOT NULL DEFAULT 0,
    tx_type TEXT NOT NULL,
    collection_method TEXT DEFAULT 'آجل',
    bank_account_number TEXT,
    check_number TEXT,
    notes TEXT,
    journal_entry_number TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- 3. المشتريات وحسابات الموردين
CREATE TABLE IF NOT EXISTS purchase_orders (
    po_no TEXT PRIMARY KEY,
    po_date TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    expected_date TEXT,
    status TEXT NOT NULL DEFAULT 'قيد التنفيذ' CHECK (status IN ('قيد التنفيذ', 'تم الاستلام', 'ملغى')),
    total_amount REAL NOT NULL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_no INTEGER NOT NULL,
    po_no TEXT NOT NULL,
    item_code TEXT NOT NULL,
    quantity REAL NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    net_amount REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (po_no) REFERENCES purchase_orders(po_no)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (item_code) REFERENCES items(item_code)
);

CREATE TABLE IF NOT EXISTS purchase_invoices (
    invoice_no TEXT PRIMARY KEY,
    invoice_date TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    po_no TEXT,
    payment_method TEXT NOT NULL DEFAULT 'آجل' CHECK (payment_method IN ('آجل', 'نقدي', 'شيك', 'تحويل بنكي')),
    bank_account_number TEXT,
    gross_total REAL NOT NULL DEFAULT 0,
    discount_total REAL NOT NULL DEFAULT 0,
    net_total REAL NOT NULL DEFAULT 0,
    notes TEXT,
    journal_entry_number TEXT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
    FOREIGN KEY (journal_entry_number) REFERENCES journal_entries(entry_number)
);

CREATE TABLE IF NOT EXISTS purchase_invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_no INTEGER NOT NULL,
    invoice_no TEXT NOT NULL,
    item_code TEXT NOT NULL,
    quantity REAL NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    discount_percent REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    net_amount REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (invoice_no) REFERENCES purchase_invoices(invoice_no)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (item_code) REFERENCES items(item_code)
);

CREATE TABLE IF NOT EXISTS purchase_returns (
    return_no TEXT PRIMARY KEY,
    return_date TEXT NOT NULL,
    invoice_no TEXT,
    supplier_id TEXT NOT NULL,
    refund_method TEXT NOT NULL DEFAULT 'خصم من الحساب' CHECK (refund_method IN ('خصم من الحساب', 'نقدي')),
    total_amount REAL NOT NULL DEFAULT 0,
    reason TEXT,
    journal_entry_number TEXT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
    FOREIGN KEY (journal_entry_number) REFERENCES journal_entries(entry_number)
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_no INTEGER NOT NULL,
    return_no TEXT NOT NULL,
    item_code TEXT NOT NULL,
    quantity REAL NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    net_amount REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (return_no) REFERENCES purchase_returns(return_no)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (item_code) REFERENCES items(item_code)
);

CREATE TABLE IF NOT EXISTS supplier_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_no TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    tx_date TEXT NOT NULL,
    debit REAL NOT NULL DEFAULT 0,
    credit REAL NOT NULL DEFAULT 0,
    tx_type TEXT NOT NULL,
    payment_method TEXT DEFAULT 'آجل',
    bank_account_number TEXT,
    check_number TEXT,
    notes TEXT,
    journal_entry_number TEXT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

-- 4. المخزون السلعي وحركة الأصناف
CREATE TABLE IF NOT EXISTS stock_additions (
    addition_no TEXT PRIMARY KEY,
    addition_date TEXT NOT NULL,
    warehouse_name TEXT NOT NULL DEFAULT 'المخزن الرئيسي',
    supplier_id TEXT,
    reference_doc TEXT,
    notes TEXT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

CREATE TABLE IF NOT EXISTS stock_addition_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_no INTEGER NOT NULL,
    addition_no TEXT NOT NULL,
    item_code TEXT NOT NULL,
    quantity REAL NOT NULL CHECK (quantity > 0),
    unit_cost REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (addition_no) REFERENCES stock_additions(addition_no)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (item_code) REFERENCES items(item_code)
);

CREATE TABLE IF NOT EXISTS stock_issues (
    issue_no TEXT PRIMARY KEY,
    issue_date TEXT NOT NULL,
    warehouse_name TEXT NOT NULL DEFAULT 'المخزن الرئيسي',
    dept_code TEXT,
    reference_doc TEXT,
    notes TEXT,
    FOREIGN KEY (dept_code) REFERENCES departments(dept_code)
);

CREATE TABLE IF NOT EXISTS stock_issue_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    line_no INTEGER NOT NULL,
    issue_no TEXT NOT NULL,
    item_code TEXT NOT NULL,
    quantity REAL NOT NULL CHECK (quantity > 0),
    unit_cost REAL NOT NULL DEFAULT 0,
    total_cost REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (issue_no) REFERENCES stock_issues(issue_no)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (item_code) REFERENCES items(item_code)
);

CREATE TABLE IF NOT EXISTS item_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movement_date TEXT NOT NULL,
    item_code TEXT NOT NULL,
    movement_type TEXT NOT NULL,
    doc_no TEXT NOT NULL,
    qty_in REAL NOT NULL DEFAULT 0,
    qty_out REAL NOT NULL DEFAULT 0,
    unit_price REAL NOT NULL DEFAULT 0,
    balance_after REAL NOT NULL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (item_code) REFERENCES items(item_code)
);

-- 5. الموارد البشرية والأجور والمستحقات
CREATE TABLE IF NOT EXISTS attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_code TEXT NOT NULL,
    att_date TEXT NOT NULL,
    check_in TEXT DEFAULT '08:30',
    check_out TEXT DEFAULT '16:30',
    status TEXT NOT NULL DEFAULT 'حاضر' CHECK (status IN ('حاضر', 'غائب', 'تأخير', 'إجازة')),
    late_minutes INTEGER NOT NULL DEFAULT 0,
    overtime_hours REAL NOT NULL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (employee_code) REFERENCES employees(employee_code)
);

CREATE TABLE IF NOT EXISTS monthly_payrolls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_code TEXT NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    basic_salary REAL NOT NULL DEFAULT 0,
    allowances REAL NOT NULL DEFAULT 0,
    incentives REAL NOT NULL DEFAULT 0,
    overtime_pay REAL NOT NULL DEFAULT 0,
    deductions REAL NOT NULL DEFAULT 0,
    net_salary REAL NOT NULL DEFAULT 0,
    is_paid INTEGER NOT NULL DEFAULT 1,
    journal_entry_number TEXT,
    UNIQUE (employee_code, month, year),
    FOREIGN KEY (employee_code) REFERENCES employees(employee_code)
);

-- =================================================================================
-- ثالثاً: إدارة النظام والصلاحيات وسجل المراجعة (Administrator & RBAC)
-- =================================================================================

CREATE TABLE IF NOT EXISTS roles (
    role_code TEXT PRIMARY KEY,
    role_name TEXT NOT NULL,
    description TEXT,
    permissions_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role_code TEXT NOT NULL,
    is_admin_portal_allowed INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_login TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (role_code) REFERENCES roles(role_code)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    username TEXT NOT NULL,
    user_role TEXT,
    portal TEXT NOT NULL DEFAULT 'ERP',
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_id TEXT,
    details TEXT
);

-- فهارس لتحسين أداء الاستعلامات والتقارير اللحظية
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_entry_lines(account_code);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_customer_tx_cust ON customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_tx_supp ON supplier_transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_item_movements_item ON item_movements(item_code);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON sales_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date ON purchase_invoices(invoice_date);
