/**
 * طلبات التعديل على البيانات الرئيسية — (ج) تعديلات بموافقة المدير
 * ═══════════════════════════════════════════════════════════════════
 *
 * المشكلة التي يحلّها هذا الملف
 * ─────────────────────────────
 * البيانات الرئيسية ليست ملكاً لمن يعدّلها لحظة إدخالها: تعديل سعر تكلفة
 * صنف يُغيّر تكلفة المخزون وتقارير الربحية بأثر رجعي. تعديل حدّ ائتمان عميل
 * يفتح له مبيعات لم يكن مؤهلاً لها. هذه التغييرات لا تُنتج قيداً محاسبياً،
 * فلا تظهر في ميزان المراجعة ولا في أي تقرير — تحدث صامتة.
 *
 * الحل: لا تُكتب مباشرة. تُسجَّل كطلب، ويعتمدها مدير النظام.
 *
 * ─── المبدأ الحاكم: لا شيء يُكتب قبل أن يُقرأ ───────────────────────
 *
 * `peekChange` تحسب نتيجة التعديل على **نسخة مقرَّرة معزولة** (savepoint)
 * ثم تتراجع عنها. النتيجة: ما يراه المدير في المعاينة هو بالحرف ما سيحدث
 * عند الاعتماد — لا فرق بين "قبل/بعد" المعروض والواقع. الاختبار يثبت ذلك.
 *
 * ─── لماذا لا يوجد endpoint لتعديل الطلب بعد إنشائه؟ ────────────────
 *
 * لو استطاع الطالب تعديل payload طلبٍ بعد إرساله، لصار الاعتماد بلا معنى:
 * يرسل طلباً بريئاً، يُعتمد، ثم يُعدّله إلى ما يريد. لذلك الحقول الوحيدة
 * القابلة للتغيير بعد الإنشاء هي `status` (للإلغاء) — وبقية الحقول مجمّدة.
 *
 * ─── لماذا الإلغاء بلا شروط isn't كافٍ؟ ─────────────────────────────
 *
 * الإلغاء مسموح لصاحب الطلب فقط، وللطلبات المعلّقة فقط. طلب مُعتمد صار
 * واقعاً محاسبياً، وإلغاؤه لا يُرجع آثره — رفضه هو الطريق الصحيح.
 */

const { logAudit } = require('./auth');

/**
 * الكيانات المدعومة. لكل كيان:
 *   table       — الجدول الفعلي
 *   pk          — عمود المفتاح الأساسي
 *   fields      — الأعمدة المسموح تعديلها (غير موجود هنا = غير قابل للتعديل)
 *   labelFn     — اسم مقروء للعرض
 *   modulePerm  — الوحدة التي تُفحص صلاحيتها
 *
 * الأعمدة غير المدرجة في `fields` **لا يمكن تعديلها عبر الطلبات إطلاقاً**.
 * هذا هو ما يمنع تسريب التعديل إلى أعمدة حسّاسة مثل password_hash أو
 * is_admin_portal_allowed أو current_balance — الأخير يُحسب من الحركات
 * ولا يجوز أن يُكتب يدوياً.
 */
const ENTITIES = {
  items: {
    table: 'items',
    pk: 'item_code',
    modulePerm: 'master',
    fields: [
      'item_name',
      'group_code',
      'item_type',
      'unit_of_measure',
      'cost_price',
      'unit_price',
      'annual_demand',
      'safety_stock',
      'lead_time_days',
      'eoq',
      'reorder_point',
    ],
    label: (row) => `${row.item_code} — ${row.item_name}`,
  },
  customers: {
    table: 'customers',
    pk: 'customer_id',
    modulePerm: 'master',
    fields: ['customer_name', 'address', 'city', 'phone', 'email', 'credit_limit'],
    label: (row) => `${row.customer_id} — ${row.customer_name}`,
  },
  suppliers: {
    table: 'suppliers',
    pk: 'supplier_id',
    modulePerm: 'master',
    fields: ['supplier_name', 'address', 'city', 'phone', 'email'],
    label: (row) => `${row.supplier_id} — ${row.supplier_name}`,
  },
  employees: {
    table: 'employees',
    pk: 'employee_code',
    modulePerm: 'master',
    fields: [
      'employee_name',
      'job_title',
      'dept_code',
      'specialization',
      'qualification',
      'marital_status',
      'basic_salary',
      'housing_allowance',
      'transport_allowance',
      'meal_allowance',
      'other_allowances',
    ],
    label: (row) => `${row.employee_code} — ${row.employee_name}`,
  },
  company_settings: {
    table: 'company_settings',
    pk: 'id',
    modulePerm: 'master',
    fields: [
      'company_name',
      'commercial_reg',
      'tax_number',
      'address',
      'city',
      'phone',
      'email',
      'currency',
      'fiscal_year',
    ],
    label: (row) => `بيانات المنشأة — ${row.company_name}`,
  },
};

/** الحقول التي لا يجوز أن تظهر في lقطة "قبل" لأسباب أمنية */
const REDACTED_COLUMNS = new Set([
  'password_hash',
  'permissions_json',
  'is_admin_portal_allowed',
  'is_active',
]);

/**
 * يحوّل صفاً من قاعدة البيانات إلى لقطة آمنة.
 * البديل — إرسال الصف كما هو — يسرّب password_hash إلى الواجهة عبر
 * audit/المعاينة، حتى لو لم يُستخدم.
 */
function snapshot(row) {
  if (!row) return {};
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (REDACTED_COLUMNS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * يشتق كود الطلب من تسلسل آمن.
 *
 * لا نستخدم COUNT(*) + 1: لو حُذف طلب في المنتصف (أو استُعيدت نسخة) يتكرر
 * الكود ويصطدم بالمفتاح الأساسي. نقرأ أكبر كود موجود ونزيد عليه — وهو
 * السلوك الصحيح حتى مع الفجوات.
 */
function nextChangeId(db) {
  const row = db
    .prepare(
      `SELECT change_id FROM change_requests
       WHERE change_id LIKE 'CR-%'
       ORDER BY LENGTH(change_id) DESC, change_id DESC
       LIMIT 1`
    )
    .get();
  const last = row ? Number(String(row.change_id).slice(3)) : 0;
  const next = (Number.isFinite(last) ? last : 0) + 1;
  return `CR-${String(next).padStart(6, '0')}`;
}

/** هل الحقل نصي في الجدول؟ نستخدمه لتحويل الأرقام القادمة كنصوص من الواجهة */
function columnTypes(db, table) {
  const info = db.prepare(`PRAGMA table_info("${table}")`).all();
  const map = {};
  for (const col of info) map[col.name] = String(col.type || '').toUpperCase();
  return map;
}

/**
 * ينقّي الحمولة: يحتفظ فقط بالحقول المسموح تعديلها، ويحوّل الأنواع.
 *
 * التحويل ضروري لأن الواجهة ترسل كل شيء كنصوص أحياناً (حقول HTML). لكن
 * التحويل الأعمى خطر: "‎abc" إلى REAL يصبح NULL بصمت. لذلك:
 *   • عمود رقمي + قيمة غير رقمية → خطأ واضح، لا NULL صامت
 *   • قيمة فارغة '' لعمود رقمي → تُحذف من الطلب (لا تُصفَّر)
 */
function sanitizePayload(db, entity, body) {
  const spec = ENTITIES[entity];
  const types = columnTypes(db, spec.table);
  const clean = {};
  const rejected = [];

  for (const [key, rawValue] of Object.entries(body || {})) {
    if (!spec.fields.includes(key)) {
      // حقل غير مسموح: نتجاهله ونُبلّغ عنه بدل رفض الطلب كله.
      // السبب: الواجهة ترسل الصف كاملاً، ومن الطبيعي أن يحوي مفتاحه الأساسي.
      if (key !== spec.pk) rejected.push(key);
      continue;
    }
    if (rawValue === null || rawValue === undefined) continue;
    if (typeof rawValue === 'string' && rawValue.trim() === '') continue;

    const type = types[key] || '';
    if (type.includes('INT') || type.includes('REAL') || type.includes('NUM')) {
      const num = Number(rawValue);
      if (!Number.isFinite(num)) {
        throw Object.assign(new Error(`القيمة «${rawValue}» في الحقل «${key}» ليست رقماً صالحاً`), {
          status: 400,
          code: 'BAD_NUMBER',
          field: key,
        });
      }
      clean[key] = num;
    } else {
      clean[key] = String(rawValue).trim();
    }
  }

  if (Object.keys(clean).length === 0) {
    throw Object.assign(new Error('لا يوجد أي حقل قابل للتعديل في الطلب'), {
      status: 400,
      code: 'EMPTY_PAYLOAD',
    });
  }

  return { clean, rejected };
}

/** يقرأ الصف المستهدف أو يرمي 404 */
function readRow(db, entity, entityId) {
  const spec = ENTITIES[entity];
  const row = db.prepare(`SELECT * FROM "${spec.table}" WHERE "${spec.pk}" = ?`).get(entityId);
  if (!row) {
    throw Object.assign(new Error(`العنصر المطلوب تعديله غير موجود (${entityId})`), {
      status: 404,
      code: 'NOT_FOUND',
    });
  }
  return row;
}

/**
 * يحسب نتيجة التعديل دون حفظها.
 *
 * ─ كيف يعمل ─
 * SAVEPOINT → تنفيذ التعديل → قراءة الصف بعد التعديل → ROLLBACK TO.
 * لا يبقى شيء. لكن ما قرأناه هو ما سيحدث فعلاً.
 *
 * ─ لماذا savepoint وليس نسخة من القاعدة ─
 * نسخ القاعدة كاملة (export) مكلف جداً لكل معاينة في المتصفح. savepoint
 * عملية خفيفة ومضمونة في SQLite.
 *
 * ⚠ لا تُستخدم هذه الدالة خارج معاملة قائمة. في sql.js و node:sqlite
 *   الـ savepoint خارج معاملة يفتح معاملة ضمنياً — وهو ما نريده، لكن
 *   كتابة `runInTransaction` هنا كانت ستُدخل معاملة داخل معاملة.
 */
function peekChange(db, entity, entityId, payload) {
  const spec = ENTITIES[entity];
  readRow(db, entity, entityId);

  const savepoint = 'plus_change_preview';
  db.exec(`SAVEPOINT ${savepoint}`);
  try {
    applyUpdate(db, spec, entityId, payload);
    const after = db.prepare(`SELECT * FROM "${spec.table}" WHERE "${spec.pk}" = ?`).get(entityId);
    return snapshot(after);
  } finally {
    // التراجع في كل الحالات — هذه معاينة، لا كتابة
    db.exec(`ROLLBACK TO ${savepoint}`);
    db.exec(`RELEASE ${savepoint}`);
  }
}

/** ينفّذ UPDATE بالحقول الممرّرة فقط — الباقي يبقى كما هو */
function applyUpdate(db, spec, entityId, payload) {
  const keys = Object.keys(payload);
  if (keys.length === 0) return;
  const sets = keys.map((k) => `"${k}" = ?`).join(', ');
  const values = keys.map((k) => payload[k]);
  db.prepare(`UPDATE "${spec.table}" SET ${sets} WHERE "${spec.pk}" = ?`).run(...values, entityId);
}

/**
 * يبني قائمة الفروق بين لقطة قبل ولقطة بعد.
 * تُستخدم في المعاينة وفي سجل التدقيق — والاثنان يجب أن يقولا نفس الشيء.
 */
function diffSnapshots(before, after, allowedFields) {
  const changes = [];
  for (const field of allowedFields) {
    const from = before[field];
    const to = after[field];
    // مقارنة نصية موحّدة: 10 و "10" و 10.0 كلها نفس القيمة
    const same =
      from === to ||
      (from !== null && from !== undefined && to !== null && to !== undefined && String(from) === String(to));
    if (same) continue;
    changes.push({
      field,
      from: from === undefined ? null : from,
      to: to === undefined ? null : to,
    });
  }
  return changes;
}

module.exports = function createChangeRequestRouter(db, authenticate, { requirePermission, requireSuperAdmin }) {
  const express = require('express');
  const router = express.Router();
  router.use(authenticate);

  // ═══════════════════════════════════════════════════════════════════
  // القراءة
  // ═══════════════════════════════════════════════════════════════════

  /**
   * قائمة الطلبات.
   *
   * قاعدة الخصوصية: من ليس SUPER_ADMIN يرى طلباته هو فقط. مدير النظام يرى
   * الكل. بدون هذا، أي محاسب يستطيع قراءة سبب تعديل زميله وقيمه — تسريب
   * لا داعي له.
   */
  router.get('/', (req, res) => {
    const { status, entity } = req.query;
    const isSuper = req.user.role_code === 'SUPER_ADMIN';

    let sql = `SELECT * FROM change_requests WHERE 1=1`;
    const params = [];

    if (!isSuper) {
      sql += ` AND requested_by = ?`;
      params.push(req.user.username);
    }
    if (status && ['pending', 'approved', 'rejected', 'cancelled'].includes(String(status))) {
      sql += ` AND status = ?`;
      params.push(String(status));
    }
    if (entity && ENTITIES[String(entity)]) {
      sql += ` AND entity_type = ?`;
      params.push(String(entity));
    }
    sql += ` ORDER BY requested_at DESC, change_id DESC LIMIT 200`;

    const rows = db.prepare(sql).all(...params);
    const requests = rows.map((r) => ({
      change_id: r.change_id,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      entity_label: r.entity_label,
      reason: r.reason,
      status: r.status,
      requested_by: r.requested_by,
      requested_by_name: r.requested_by_name,
      requested_at: r.requested_at,
      reviewed_by_name: r.reviewed_by_name,
      reviewed_at: r.reviewed_at,
      review_note: r.review_note,
      posted_ref: r.posted_ref,
    }));

    // عدّاد المعلّق: يُعرض شارة على أيقونة الإشعارات
    const pendingCount = isSuper
      ? db.prepare(`SELECT COUNT(*) AS c FROM change_requests WHERE status = 'pending'`).get().c
      : db
          .prepare(`SELECT COUNT(*) AS c FROM change_requests WHERE status = 'pending' AND requested_by = ?`)
          .get(req.user.username).c;

    res.json({ requests, pending_count: pendingCount, can_review: isSuper });
  });

  /**
   * تفاصيل طلب واحد مع معاينة محسوبة (قبل/بعد) — لا كتابة.
   *
   * تُحسب المعاينة الآن لا وقت الإنشاء، لأن الجدول الأصلي قد تغيّر بعد
   * الطلب (فاتورة بيع عدّلت رصيد العميل مثلاً). المعاينة يجب أن تُظهر
   * واقع اللحظة التي سيُعتمد فيها.
   */
  router.get('/:id', (req, res) => {
    const row = db.prepare(`SELECT * FROM change_requests WHERE change_id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'الطلب غير موجود' });

    const isSuper = req.user.role_code === 'SUPER_ADMIN';
    if (!isSuper && row.requested_by !== req.user.username) {
      return res.status(403).json({ error: 'لا يمكنك عرض طلب لم تُنشئه' });
    }

    const spec = ENTITIES[row.entity_type];
    if (!spec) return res.status(500).json({ error: 'نوع الكيان غير معروف في هذا الطلب' });

    const payload = JSON.parse(row.payload_json || '{}');
    const before = JSON.parse(row.before_json || '{}');

    let after = null;
    let previewError = null;
    let changes = [];

    try {
      after = peekChange(db, row.entity_type, row.entity_id, payload);
      changes = diffSnapshots(before, after, spec.fields);
    } catch (err) {
      // العنصر قد يكون حُذف بعد تقديم الطلب — نعرضها كمشكلة لا كصفحة خطأ
      previewError = err.message;
    }

    res.json({
      request: {
        change_id: row.change_id,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        entity_label: row.entity_label,
        reason: row.reason,
        status: row.status,
        requested_by: row.requested_by,
        requested_by_name: row.requested_by_name,
        requested_at: row.requested_at,
        reviewed_by_name: row.reviewed_by_name,
        reviewed_at: row.reviewed_at,
        review_note: row.review_note,
        posted_ref: row.posted_ref,
      },
      editable_fields: spec.fields,
      payload,
      before,
      after,
      changes,
      preview_error: previewError,
      can_review: isSuper && row.status === 'pending',
      can_cancel: row.status === 'pending' && row.requested_by === req.user.username,
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // الإنشاء — أي مستخدم لديه صلاحية «تعديل» على الوحدة
  // ═══════════════════════════════════════════════════════════════════

  router.post('/', (req, res) => {
    const { entity_type, entity_id, payload, reason } = req.body || {};

    const spec = ENTITIES[String(entity_type)];
    if (!spec) {
      return res.status(400).json({
        error: `نوع الكيان «${entity_type}» غير مدعوم. المدعوم: ${Object.keys(ENTITIES).join('، ')}`,
        code: 'BAD_ENTITY',
      });
    }

    // الصلاحية تُفحص هنا يدوياً لأنها تعتمد على الكيان المطلوب في الجسم
    if (req.user.role_code !== 'SUPER_ADMIN') {
      const perm = req.user.permissions?.[spec.modulePerm];
      if (!perm?.edit) {
        return res.status(403).json({
          error: `ليس لديك صلاحية تعديل وحدة (${spec.modulePerm}) لتقديم هذا الطلب.`,
          code: 'FORBIDDEN',
        });
      }
    }

    // سبب التعديل إلزامي — مدير بلا سبب لا يستطيع أن يحكم على الطلب
    const cleanReason = String(reason || '').trim();
    if (cleanReason.length < 5) {
      return res.status(400).json({
        error: 'اذكر سبب التعديل (٥ أحرف على الأقل) — بدونه لا يمكن لمدير النظام تقييم الطلب.',
        code: 'REASON_REQUIRED',
      });
    }

    const entityId = String(entity_id || '').trim();
    if (!entityId) {
      return res.status(400).json({ error: 'معرّف العنصر مطلوب', code: 'ENTITY_ID_REQUIRED' });
    }

    let row;
    try {
      row = readRow(db, entity_type, entityId);
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message, code: err.code });
    }

    let clean;
    let rejected;
    try {
      ({ clean, rejected } = sanitizePayload(db, entity_type, payload));
    } catch (err) {
      return res.status(err.status || 400).json({ error: err.message, code: err.code || 'BAD_PAYLOAD' });
    }

    // لا طلب بلا تغيير فعلي — وإلا امتلأ صندوق المدير بطلبات لا معنى لها
    const meaningful = diffSnapshots(
      snapshot(row),
      { ...snapshot(row), ...clean },
      spec.fields
    );
    if (meaningful.length === 0) {
      return res.status(400).json({
        error: 'القيم المطلوبة مطابقة للقيم الحالية — لا يوجد ما يستوجب الموافقة.',
        code: 'NO_CHANGE',
      });
    }

    const changeId = nextChangeId(db);
    db.prepare(
      `INSERT INTO change_requests
        (change_id, entity_type, entity_id, entity_label, payload_json, before_json, reason,
         status, requested_by, requested_by_name, requested_by_role)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
    ).run(
      changeId,
      entity_type,
      entityId,
      spec.label(row),
      JSON.stringify(clean),
      JSON.stringify(snapshot(row)),
      cleanReason,
      req.user.username,
      req.user.full_name || req.user.username,
      req.user.role_code
    );

    logAudit(db, {
      username: req.user.username,
      user_role: req.user.role_code,
      module: 'طلبات التعديل',
      action: 'تقديم طلب تعديل',
      entity_id: changeId,
      details: `${entity_type}/${entityId}: ${cleanReason} (${meaningful.length} حقلاً)`,
    });

    const created = db.prepare(`SELECT * FROM change_requests WHERE change_id = ?`).get(changeId);
    res.status(201).json({
      request: created,
      changes: meaningful,
      ignored_fields: rejected,
      message: `تم إرسال الطلب ${changeId} لمدير النظام للمراجعة. لن تُطبَّق القيم قبل الاعتماد.`,
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // الاعتماد والرفض — مدير النظام فقط
  // ═══════════════════════════════════════════════════════════════════

  /**
   * الاعتماد.
   *
   * كل شيء في معاملة واحدة: قراءة الطلب، إعادة التحقق من الصف، التطبيق،
   * تحديث حالة الطلب، تسجيل التدقيق. لو فشل أي جزء، لا يبقى نصف تعديل.
   *
   * إعادة التحقق مهمة: بين تقديم الطلب واعتماده قد يكون مدير آخر عدّل
   * نفس الصف. نطبّق الطلب على الحالة **الحالية** (لا على لقطة الطلب) لأن
   * المستخدم يعدّل حقولاً محددة، والباقي يجب أن يبقى بأحدث قيمة.
   */
  router.post('/:id/approve', requireSuperAdmin, (req, res) => {
    const note = String(req.body?.note || '').trim();
    const row = db.prepare(`SELECT * FROM change_requests WHERE change_id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'الطلب غير موجود' });

    if (row.status !== 'pending') {
      return res.status(409).json({
        error: `هذا الطلب حالته «${row.status}» — لا يمكن اعتماده مرة أخرى.`,
        code: 'NOT_PENDING',
      });
    }

    const spec = ENTITIES[row.entity_type];
    if (!spec) return res.status(500).json({ error: 'نوع الكيان غير معروف في هذا الطلب' });
    const payload = JSON.parse(row.payload_json || '{}');

    db.exec('BEGIN');
    try {
      // الصف قد يكون حُذف بين التقديم والاعتماد
      const current = db
        .prepare(`SELECT * FROM "${spec.table}" WHERE "${spec.pk}" = ?`)
        .get(row.entity_id);
      if (!current) {
        db.exec('ROLLBACK');
        return res.status(409).json({
          error: `العنصر ${row.entity_id} لم يعد موجوداً — الطلب أُبطل. يمكنك رفضه وتسجيل السبب.`,
          code: 'TARGET_GONE',
        });
      }

      applyUpdate(db, spec, row.entity_id, payload);

      db.prepare(
        `UPDATE change_requests
         SET status = 'approved', reviewed_by = ?, reviewed_by_name = ?, reviewed_at = datetime('now'), review_note = ?
         WHERE change_id = ? AND status = 'pending'`
      ).run(req.user.username, req.user.full_name || req.user.username, note, row.change_id);

      db.exec('COMMIT');
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch {
        /* لا معاملة مفتوحة */
      }
      return res.status(500).json({ error: `تعذّر اعتماد الطلب: ${err.message}` });
    }

    logAudit(db, {
      username: req.user.username,
      user_role: req.user.role_code,
      module: 'طلبات التعديل',
      action: 'اعتماد تعديل',
      entity_id: row.change_id,
      details: `${row.entity_type}/${row.entity_id} — طلب من ${row.requested_by_name || row.requested_by}. ${note}`.trim(),
    });

    const after = db.prepare(`SELECT * FROM "${spec.table}" WHERE "${spec.pk}" = ?`).get(row.entity_id);
    res.json({
      message: `تم اعتماد الطلب ${row.change_id} وتطبيق التعديل على ${spec.label(after)}.`,
      changes: diffSnapshots(JSON.parse(row.before_json || '{}'), snapshot(after), spec.fields),
      entity: snapshot(after),
    });
  });

  /**
   * الرفض — بسبب إلزامي.
   *
   * "مرفوض" بلا سبب يترك الطالب يعيد المحاولة بنفس الخطأ. السبب هو ما
   * يجعل الرفض مفيداً.
   */
  router.post('/:id/reject', requireSuperAdmin, (req, res) => {
    const note = String(req.body?.note || '').trim();
    if (note.length < 5) {
      return res.status(400).json({
        error: 'اذكر سبب الرفض (٥ أحرف على الأقل) — ليعرف مقدّم الطلب ما يجب تصحيحه.',
        code: 'NOTE_REQUIRED',
      });
    }

    const row = db.prepare(`SELECT * FROM change_requests WHERE change_id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'الطلب غير موجود' });
    if (row.status !== 'pending') {
      return res.status(409).json({
        error: `هذا الطلب حالته «${row.status}» — لا يمكن رفضه.`,
        code: 'NOT_PENDING',
      });
    }

    db.prepare(
      `UPDATE change_requests
       SET status = 'rejected', reviewed_by = ?, reviewed_by_name = ?, reviewed_at = datetime('now'), review_note = ?
       WHERE change_id = ?`
    ).run(req.user.username, req.user.full_name || req.user.username, note, row.change_id);

    logAudit(db, {
      username: req.user.username,
      user_role: req.user.role_code,
      module: 'طلبات التعديل',
      action: 'رفض تعديل',
      entity_id: row.change_id,
      details: `${row.entity_type}/${row.entity_id}: ${note}`,
    });

    res.json({ message: `تم رفض الطلب ${row.change_id}. السبب مسجّل وسيراه مقدّم الطلب.` });
  });

  /**
   * إلغاء الطالب لطلبه — قبل المراجعة فقط.
   *
   * بعد الاعتماد لا يصح الإلغاء: الأثر قد انتشر إلى تقارير وفواتير،
   * وإرجاعه لا يُلغي ذلك. الطريق الصحيح: طلب تعديل جديد يعكس القيمة.
   */
  router.post('/:id/cancel', (req, res) => {
    const row = db.prepare(`SELECT * FROM change_requests WHERE change_id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'الطلب غير موجود' });

    if (row.requested_by !== req.user.username) {
      return res.status(403).json({ error: 'لا يمكنك إلغاء طلب لم تُنشئه.' });
    }
    if (row.status !== 'pending') {
      return res.status(409).json({
        error:
          row.status === 'approved'
            ? 'الطلب معتمد وآثاره سارية — قدّم طلب تعديل جديداً يعكس القيمة بدل إلغائه.'
            : `لا يمكن إلغاء طلب حالته «${row.status}».`,
        code: 'NOT_CANCELLABLE',
      });
    }

    db.prepare(
      `UPDATE change_requests
       SET status = 'cancelled', reviewed_at = datetime('now'), reviewed_by = ?, reviewed_by_name = ?
       WHERE change_id = ?`
    ).run(req.user.username, req.user.full_name || req.user.username, row.change_id);

    logAudit(db, {
      username: req.user.username,
      user_role: req.user.role_code,
      module: 'طلبات التعديل',
      action: 'إلغاء طلب تعديل',
      entity_id: row.change_id,
      details: `${row.entity_type}/${row.entity_id}`,
    });

    res.json({ message: `تم إلغاء الطلب ${row.change_id}.` });
  });

  return router;
};

module.exports.ENTITIES = ENTITIES;
module.exports.diffSnapshots = diffSnapshots;
module.exports.snapshot = snapshot;
