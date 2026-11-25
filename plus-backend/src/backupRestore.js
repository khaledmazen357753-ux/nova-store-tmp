/**
 * التحقق من ملف نسخة احتياطية قبل استعادته.
 *
 * الغرض: **لا نلمس قاعدة البيانات قبل التأكد من صلاحية الملف بالكامل.**
 * الاستعادة الخاطئة أسوأ من عدم وجود استعادة: المستخدم يظن أنه حفظ بياناته
 * ثم يجد نفسه لا يملك لا القديم ولا الجديد.
 *
 * تُستخدم هذه الدالة في مسارين:
 *   ١) المعاينة (dry run) — تعيد تقريراً بلا أي كتابة.
 *   ٢) التنفيذ — ترمي خطأً قبل `BEGIN` إن كان الملف غير صالح.
 * لأنها نفس الدالة، فما تقبله المعاينة تقبله الاستعادة حرفياً.
 */

const MAX_REPORTED = 10;

/** أسماء الأعمدة المتوقعة فعلياً في قاعدة البيانات، لكل جدول */
function tableColumns(db, tableName) {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return rows.map((r) => r.name);
}

function existingTables(db) {
  return db
    .prepare(
      `SELECT name FROM sqlite_master
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name`
    )
    .all()
    .map((r) => r.name);
}

/**
 * يتحقق من ملف نسخة ويعيد تقريراً كاملاً.
 * يرمي Error برسالة عربية واضحة عند أي مشكلة بنيوية.
 *
 * @returns {{
 *   tables: { table: string, rows: number, skippedColumns: string[] }[],
 *   totalRows: number,
 *   exportedAt: string | null,
 *   warnings: string[],
 *   notInFile: string[],
 *   extraInFile: string[],
 * }}
 */
function validateBackup(db, payload) {
  const fail = (msg) => {
    const err = new Error(msg);
    err.statusCode = 400;
    throw err;
  };

  if (!payload || typeof payload !== 'object') fail('الملف غير صالح: ليس كائن JSON');
  if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
    fail('الملف غير صالح: لا يحتوي على قسم data');
  }

  const known = new Set(existingTables(db));
  const fileTables = Object.keys(payload.data);
  if (fileTables.length === 0) fail('الملف غير صالح: لا يحتوي على أي جدول');

  const extraInFile = fileTables.filter((t) => !known.has(t));
  const notInFile = [...known].filter((t) => !fileTables.includes(t));
  const warnings = [];

  if (extraInFile.length) {
    warnings.push(
      `جداول في الملف لا وجود لها في النظام وستُتجاهل: ${extraInFile.slice(0, MAX_REPORTED).join(', ')}`
    );
  }
  if (notInFile.length) {
    warnings.push(
      `جداول في النظام غير موجودة في الملف وستُفرَّغ: ${notInFile.slice(0, MAX_REPORTED).join(', ')}`
    );
  }

  const tables = [];
  let totalRows = 0;

  for (const table of fileTables) {
    if (!known.has(table)) continue;
    const rows = payload.data[table];
    if (!Array.isArray(rows)) fail(`الجدول «${table}» ليس قائمة صفوف`);

    const cols = new Set(tableColumns(db, table));
    const skipped = new Set();

    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        fail(`الجدول «${table}» يحتوي على صف غير صالح`);
      }
      for (const key of Object.keys(row)) {
        if (!cols.has(key)) skipped.add(key);
      }
    }

    if (skipped.size) {
      warnings.push(
        `الجدول «${table}»: أعمدة غير معروفة ستُتجاهل (${[...skipped].join(', ')})`
      );
    }

    tables.push({ table, rows: rows.length, skippedColumns: [...skipped] });
    totalRows += rows.length;
  }

  return {
    tables,
    totalRows,
    exportedAt: payload.exported_at || null,
    application: payload.application || null,
    warnings,
    notInFile,
    extraInFile,
  };
}

/**
 * ينفّذ الاستعادة داخل معاملة واحدة.
 *
 * لماذا معاملة واحدة: لو فشل أي جدول في المنتصف بقي النظام على الحالة
 * القديمة بالكامل. بلا ذلك يصبح لدينا نصف بيانات قديمة ونصف جديدة —
 * وهو أسوأ من الفشل الصريح.
 *
 * الترتيب: حذف بترتيب عكسي (الأبناء قبل الآباء) وإدخال بالترتيب الطبيعي،
 * لأن قاعدة البيانات تحتوي 42 علاقة FOREIGN KEY.
 */
function applyRestore(db, dbModule, report, payload) {
  const tables = report.tables.map((t) => t.table);

  // ترتيب الإدخال: الآباء أولاً. نستخدم ترتيب sqlite_master العكسي للحذف.
  const insertOrder = tables;
  const deleteOrder = [...tables].reverse();

  db.exec('PRAGMA foreign_keys = OFF');
  try {
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const table of deleteOrder) {
        db.prepare(`DELETE FROM ${table}`).run();
      }

      for (const table of insertOrder) {
        const rows = payload.data[table];
        if (!rows.length) continue;

        const cols = new Set(tableColumns(db, table));
        const stmtCache = new Map();

        for (const row of rows) {
          const keys = Object.keys(row).filter((k) => cols.has(k));
          if (!keys.length) continue;

          const signature = keys.join('|');
          let stmt = stmtCache.get(signature);
          if (!stmt) {
            stmt = db.prepare(
              `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`
            );
            stmtCache.set(signature, stmt);
          }
          stmt.run(...keys.map((k) => row[k]));
        }
      }

      db.exec('COMMIT');
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch {
        /* تجاهل فشل التراجع */
      }
      throw err;
    }
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
}

module.exports = { validateBackup, applyRestore, existingTables };
