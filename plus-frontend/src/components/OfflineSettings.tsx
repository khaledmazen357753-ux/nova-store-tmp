import React, { useEffect, useState } from 'react';
import { Cloud, Database, Download, HardDrive, RefreshCw, Trash2, X, Check, Upload, AlertTriangle } from 'lucide-react';
import { getDataMode, setDataMode, setCustomApiBaseUrl, getApiBaseUrl } from '../lib/api';
import {
  offlineState,
  offlineStorageBytes,
  resetOfflineData,
  persistNow,
  exportSqliteFile,
  previewSqliteFile,
  restoreSqliteFile,
} from '../offline/engine';
import { suggestedFileName, BackupError, type SqliteFileInfo } from '../offline/sqliteFile';

/**
 * لوحة إعدادات البيانات:
 *   • نوع التخزين (أوفلاين على الجهاز / سحابي على خادم)
 *   • حجم القاعدة المحلية وحالة الحفظ
 *   • نسخة احتياطية كاملة بصيغة JSON قابلة للاستعادة
 *   • ملف قاعدة بيانات SQLite ثنائي (.sqlite) قابل للنقل والفتح بأي أداة
 *   • مسح وإعادة تهيئة البيانات
 */
export const OfflineSettings: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const [mode, setMode] = useState<'offline' | 'cloud'>(() => getDataMode());
  const [cloudUrl, setCloudUrl] = useState<string>(() => getApiBaseUrl());
  const [bytes, setBytes] = useState<number>(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // ── الاستعادة ──
  // المرحلة الأولى معاينة فقط: لا يُلمس شيء حتى يرى المستخدم ماذا سيفقد.
  const [restoreFile, setRestoreFile] = useState<{ name: string; payload: unknown } | null>(null);
  const [restorePreview, setRestorePreview] = useState<{
    tables_count: number;
    total_rows: number;
    exported_at: string | null;
    tables: { table: string; current_rows: number; incoming_rows: number; delta: number }[];
    warnings: string[];
  } | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreDone, setRestoreDone] = useState<string | null>(null);

  // ── النسخة الثنائية (.sqlite) ──
  // مسار منفصل تماماً عن JSON: الملف هو القاعدة نفسها، والاستعادة تستبدلها
  // كاملة. لذلك نطلب تأكيداً صريحاً مختلفاً وأوضح.
  const [sqliteFile, setSqliteFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [sqliteInfo, setSqliteInfo] = useState<SqliteFileInfo | null>(null);
  const [sqliteProblem, setSqliteProblem] = useState<string | null>(null);
  const [sqliteError, setSqliteError] = useState<string | null>(null);
  const [sqliteDone, setSqliteDone] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void offlineStorageBytes().then(setBytes);
    setConfirmReset(false);
    setSaved(false);
    setRestoreFile(null);
    setRestorePreview(null);
    setRestoreError(null);
    setRestoreDone(null);
    setSqliteFile(null);
    setSqliteInfo(null);
    setSqliteProblem(null);
    setSqliteError(null);
    setSqliteDone(null);
  }, [open]);

  if (!open) return null;

  const details = offlineState()?.meta;
  const kb = Math.round(bytes / 1024);

  const applyMode = (next: 'offline' | 'cloud') => {
    setMode(next);
    setDataMode(next);
    if (next === 'cloud' && cloudUrl.trim()) setCustomApiBaseUrl(cloudUrl.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const saveCloudUrl = () => {
    setCustomApiBaseUrl(cloudUrl.trim() || null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const backup = async () => {
    setBusy('backup');
    try {
      await persistNow();
      const res = await fetch('/api/admin/backup', {
        headers: { Authorization: `Bearer ${localStorage.getItem('plus_erp_auth_token') || ''}` },
      }).catch(() => null);
      // في الوضع الأوفلاين نقرأ مباشرة من الحالة المحلية
      const st = offlineState();
      let payload: unknown = null;
      if (st) {
        const result = await (
          await import('../offline/bridge')
        ).dispatch(st.routers, 'GET', '/api/admin/backup', {
          headers: { authorization: `Bearer ${localStorage.getItem('plus_erp_auth_token') || ''}` },
        });
        payload = result.body;
      }
      void res;
      if (!payload) throw new Error('تعذر إنشاء النسخة');

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plus-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  };

  /** ينفّذ طلباً على الراوتر المحلي أو السحابي — نفس مسار النسخ الاحتياطي */
  const callApi = async (method: 'GET' | 'POST', path: string, body?: unknown) => {
    const st = offlineState();
    if (st) {
      const result = await (
        await import('../offline/bridge')
      ).dispatch(st.routers, method, path, {
        headers: { authorization: `Bearer ${localStorage.getItem('plus_erp_auth_token') || ''}` },
        body: body as Record<string, unknown> | undefined,
      });
      return { status: result.status, body: result.body as Record<string, unknown> };
    }
    const res = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('plus_erp_auth_token') || ''}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, unknown> };
  };

  /** يقرأ الملف ويعرض تقريراً — بلا أي كتابة */
  const pickRestoreFile = async (file: File) => {
    setBusy('preview');
    setRestoreError(null);
    setRestoreDone(null);
    setRestorePreview(null);
    try {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(await file.text());
      } catch {
        throw new Error('الملف ليس JSON صالحاً — تأكد أنه النسخة الاحتياطية التي نزّلتها من النظام.');
      }

      const res = await callApi('POST', '/api/admin/restore/preview', payload);
      if (res.status !== 200) {
        throw new Error(String(res.body.error || 'تعذر التحقق من الملف'));
      }
      setRestoreFile({ name: file.name, payload });
      setRestorePreview(res.body as unknown as typeof restorePreview);
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'تعذر قراءة الملف');
    } finally {
      setBusy(null);
    }
  };

  /** التنفيذ الفعلي — بعد المعاينة والموافقة الصريحة */
  const runRestore = async () => {
    if (!restoreFile) return;
    setBusy('restore');
    setRestoreError(null);
    try {
      const res = await callApi('POST', '/api/admin/restore', {
        confirm: 'RESTORE',
        backup: restoreFile.payload,
      });
      if (res.status !== 200) {
        throw new Error(String(res.body.error || 'فشلت الاستعادة'));
      }
      await persistNow();
      setRestoreDone(
        `تمت استعادة ${res.body.tables_count} جدولاً و${res.body.total_rows} صفاً. أعد تحميل الصفحة لرؤية البيانات.`
      );
      setRestorePreview(null);
      setRestoreFile(null);
      void offlineStorageBytes().then(setBytes);
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'فشلت الاستعادة');
    } finally {
      setBusy(null);
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // النسخة الثنائية (.sqlite)
  // ═══════════════════════════════════════════════════════════════════

  /** تنزيل القاعدة الحالية كملف SQLite حقيقي */
  const downloadSqlite = async () => {
    setBusy('sqlite-export');
    setSqliteError(null);
    try {
      const bytes = await exportSqliteFile();
      // Uint8Array → ArrayBuffer مستقل، وإلا قد يتضمّن أي slice إضافي
      const blob = new Blob([bytes.slice().buffer], { type: 'application/vnd.sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedFileName();
      a.click();
      // تحرير الذاكرة بعد أن يبدأ المتصفح التنزيل
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setSqliteError(err instanceof Error ? err.message : 'تعذّر تصدير ملف قاعدة البيانات');
    } finally {
      setBusy(null);
    }
  };

  /** قراءة الملف وفحصه — بلا أي كتابة */
  const pickSqliteFile = async (file: File) => {
    setBusy('sqlite-preview');
    setSqliteError(null);
    setSqliteDone(null);
    setSqliteInfo(null);
    setSqliteProblem(null);
    setSqliteFile(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { info, problem } = await previewSqliteFile(bytes);
      setSqliteFile({ name: file.name, bytes });
      setSqliteInfo(info);
      setSqliteProblem(problem);
    } catch (err) {
      setSqliteError(
        err instanceof BackupError || err instanceof Error
          ? err.message
          : 'تعذّر قراءة الملف'
      );
    } finally {
      setBusy(null);
    }
  };

  /** التنفيذ — بعد المعاينة والموافقة */
  const runSqliteRestore = async () => {
    if (!sqliteFile || sqliteProblem) return;
    setBusy('sqlite-restore');
    setSqliteError(null);
    try {
      const result = await restoreSqliteFile(sqliteFile.bytes);
      setSqliteDone(
        `تمت استعادة ${result.tables} جدولاً و${result.rows.toLocaleString('en-US')} صفاً. أعد تحميل الصفحة لرؤية البيانات.`
      );
      setSqliteFile(null);
      setSqliteInfo(null);
      void offlineStorageBytes().then(setBytes);
    } catch (err) {
      setSqliteError(err instanceof Error ? err.message : 'فشلت الاستعادة');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-[#0B0B10] border border-[#D4AF37]/30 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4AF37]/20">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-sm font-extrabold gold-gradient-text">إعدادات البيانات والتخزين</h2>
          </div>
          <button onClick={onClose} className="text-[#9E9682] hover:text-[#D4AF37] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* نوع التخزين */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-[#9E9682]">مكان تشغيل محرك الحسابات</div>
            <button
              onClick={() => applyMode('offline')}
              className={`w-full text-right p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                mode === 'offline'
                  ? 'bg-emerald-950/30 border-emerald-500/50'
                  : 'bg-[#101016] border-[#D4AF37]/20 hover:border-[#D4AF37]/40'
              }`}
            >
              <HardDrive className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#F3EDDD] flex items-center gap-2">
                  أوفلاين — على هذا الجهاز
                  {mode === 'offline' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <div className="text-[11px] text-[#9E9682] mt-0.5 leading-relaxed">
                  كل الحسابات والقيود والفواتير تُنفَّذ وتُحفظ داخل المتصفح. يعمل بلا إنترنت تماماً.
                </div>
              </div>
            </button>

            <button
              onClick={() => applyMode('cloud')}
              className={`w-full text-right p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                mode === 'cloud'
                  ? 'bg-[#1A1608] border-[#D4AF37]/60'
                  : 'bg-[#101016] border-[#D4AF37]/20 hover:border-[#D4AF37]/40'
              }`}
            >
              <Cloud className="w-4 h-4 mt-0.5 text-[#D4AF37] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#F3EDDD] flex items-center gap-2">
                  سحابي — خادم خارجي
                  {mode === 'cloud' && <Check className="w-3.5 h-3.5 text-[#D4AF37]" />}
                </div>
                <div className="text-[11px] text-[#9E9682] mt-0.5 leading-relaxed">
                  يرسل الطلبات إلى رابط الخادم أدناه. يحتاج اتصالاً بالشبكة دائماً.
                </div>
              </div>
            </button>
          </div>

          {/* رابط الخادم */}
          {mode === 'cloud' && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-[#9E9682]">رابط خادم البيانات</div>
              <div className="flex gap-2">
                <input
                  dir="ltr"
                  value={cloudUrl}
                  onChange={(e) => setCloudUrl(e.target.value)}
                  placeholder="https://plus-erp-api.vercel.app"
                  className="flex-1 px-3 py-2 rounded-lg bg-[#0A0A0E] border border-[#D4AF37]/25 text-xs text-[#F3EDDD] font-mono focus:outline-none focus:border-[#D4AF37]/60"
                />
                <button
                  onClick={saveCloudUrl}
                  className="px-3 py-2 rounded-lg text-xs font-bold gold-metallic-btn cursor-pointer"
                >
                  حفظ
                </button>
              </div>
            </div>
          )}

          {/* حالة التخزين المحلي */}
          {mode === 'offline' && (
            <div className="p-3 rounded-xl bg-[#0A0F0C] border border-emerald-500/20 space-y-1.5">
              <div className="text-[11px] font-bold text-emerald-300">قاعدة البيانات المحلية</div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div>
                  <div className="text-sm font-extrabold text-[#F3EDDD] font-mono">{kb}</div>
                  <div className="text-[10px] text-[#7E8B84]">كيلوبايت</div>
                </div>
                <div>
                  <div className="text-sm font-extrabold text-[#F3EDDD] font-mono">
                    {details?.tables ?? '—'}
                  </div>
                  <div className="text-[10px] text-[#7E8B84]">جدول</div>
                </div>
                <div>
                  <div className="text-sm font-extrabold text-[#F3EDDD] font-mono">
                    {details?.routes ?? '—'}
                  </div>
                  <div className="text-[10px] text-[#7E8B84]">مسار API</div>
                </div>
              </div>
            </div>
          )}

          {/* أدوات */}
          <div className="space-y-2 pt-1">
            <button
              onClick={backup}
              disabled={busy !== null}
              className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-[#13131A] hover:bg-[#1A1A24] border border-[#D4AF37]/25 text-[#E2DAC6] flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              {busy === 'backup' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
              )}
              <span>تنزيل نسخة احتياطية كاملة</span>
            </button>

            {/* ── النسخة الثنائية (.sqlite) ──────────────────────────────
                ملف SQLite حقيقي: يُفتح بأي أداة (DB Browser / sqlite3 CLI)،
                ويعمل حتى لو تغيّر المخطط لاحقاً لأن الفحص يمنع النسخ الغريبة. */}
            <div className="pt-2 mt-2 border-t border-[#D4AF37]/15 space-y-2">
              <div className="text-[11px] font-bold text-[#9E9682] flex items-center gap-1.5">
                <Database className="w-3 h-3 text-[#D4AF37]" />
                <span>نسخة قاعدة بيانات كاملة (.sqlite)</span>
              </div>
              <p className="text-[10px] leading-relaxed text-[#7E8B84]">
                ملف قاعدة البيانات نفسه — تفتحه بأي برنامج SQLite، وتستعيده هنا في أي وقت.
                أنسب من JSON للنسخ طويلة الأمد.
              </p>

              <button
                onClick={downloadSqlite}
                disabled={busy !== null}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-[#13131A] hover:bg-[#1A1A24] border border-[#D4AF37]/25 text-[#E2DAC6] flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                {busy === 'sqlite-export' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                ) : (
                  <HardDrive className="w-3.5 h-3.5 text-[#D4AF37]" />
                )}
                <span>تنزيل قاعدة البيانات (.sqlite)</span>
              </button>

              <input
                id="plus-sqlite-file"
                type="file"
                accept=".sqlite,.db,application/vnd.sqlite3,application/x-sqlite3"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void pickSqliteFile(f);
                }}
              />

              {!sqliteInfo && !sqliteDone && (
                <button
                  onClick={() => document.getElementById('plus-sqlite-file')?.click()}
                  disabled={busy !== null}
                  className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-[#13131A] hover:bg-[#1A1A24] border border-[#D4AF37]/25 text-[#E2DAC6] flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {busy === 'sqlite-preview' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                  )}
                  <span>استعادة من ملف .sqlite</span>
                </button>
              )}

              {/* تقرير الفحص — يُعرض قبل أي كتابة */}
              {sqliteInfo && (
                <div className="p-3 rounded-xl bg-[#0F0F16] border border-[#D4AF37]/25 space-y-2.5">
                  <div className="text-[11px] font-bold text-[#E5C158]">
                    فحص الملف: {sqliteFile?.name}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <div className="text-sm font-extrabold text-[#FAF5E8]">{sqliteInfo.tables}</div>
                      <div className="text-[9px] text-[#7E8B84]">جدول</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-extrabold text-[#FAF5E8]">
                        {sqliteInfo.rows.toLocaleString('en-US')}
                      </div>
                      <div className="text-[9px] text-[#7E8B84]">صف</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-extrabold text-[#FAF5E8]">
                        {Math.round(sqliteInfo.bytes / 1024).toLocaleString('en-US')}
                      </div>
                      <div className="text-[9px] text-[#7E8B84]">كيلوبايت</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                    <Check className="w-3 h-3" />
                    <span>رأس SQLite سليم · فحص السلامة ناجح · لا كسور في الروابط</span>
                  </div>

                  {sqliteProblem && (
                    <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/40 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-[10px] leading-relaxed text-amber-200">{sqliteProblem}</span>
                    </div>
                  )}

                  <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/30 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span className="text-[10px] leading-relaxed text-rose-200">
                      الاستعادة تستبدل كل البيانات الحالية بهذا الملف. صدّر نسخة من وضعك
                      الحالي أولاً إن كنت غير متأكد.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={runSqliteRestore}
                      disabled={busy !== null || !!sqliteProblem}
                      className="flex-1 py-2 rounded-lg text-[11px] font-bold bg-[#D4AF37] hover:bg-[#E5C158] text-[#0B0B10] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {busy === 'sqlite-restore' ? 'جارٍ الاستعادة…' : 'تأكيد الاستعادة'}
                    </button>
                    <button
                      onClick={() => {
                        setSqliteFile(null);
                        setSqliteInfo(null);
                        setSqliteProblem(null);
                      }}
                      disabled={busy !== null}
                      className="px-3 py-2 rounded-lg text-[11px] font-bold bg-[#13131A] hover:bg-[#1A1A24] border border-[#D4AF37]/25 text-[#E2DAC6] cursor-pointer transition-colors disabled:opacity-40"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {sqliteDone && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-[10px] leading-relaxed text-emerald-200">{sqliteDone}</span>
                </div>
              )}

              {sqliteError && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span className="text-[10px] leading-relaxed text-rose-200">{sqliteError}</span>
                </div>
              )}
            </div>


            {/* ── استعادة نسخة احتياطية ── */}
            <input
              id="plus-restore-file"
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void pickRestoreFile(f);
              }}
            />

            {!restorePreview && !restoreDone && (
              <button
                onClick={() => document.getElementById('plus-restore-file')?.click()}
                disabled={busy !== null}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-[#13131A] hover:bg-[#1A1A24] border border-[#D4AF37]/25 text-[#E2DAC6] flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                {busy === 'preview' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                )}
                <span>استعادة نسخة احتياطية</span>
              </button>
            )}

            {restoreDone && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
                <p className="text-[11px] text-emerald-200 leading-relaxed flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{restoreDone}</span>
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-2 rounded-lg text-xs font-bold bg-emerald-600/80 hover:bg-emerald-600 text-white cursor-pointer"
                >
                  إعادة تحميل الصفحة
                </button>
              </div>
            )}

            {restorePreview && (
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/40 space-y-2.5">
                <div className="flex items-start gap-2 text-amber-200">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="text-[11px] leading-relaxed">
                    <b>سيُستبدل كل شيء.</b> هذه الأرقام هي ما سيحدث فعلاً عند التنفيذ — راجعها
                    قبل الموافقة.
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#0E0E14] rounded-lg py-1.5">
                    <div className="text-xs font-extrabold text-[#F3EDDD] font-mono">
                      {restorePreview.tables_count}
                    </div>
                    <div className="text-[9px] text-[#7E8B84]">جدول</div>
                  </div>
                  <div className="bg-[#0E0E14] rounded-lg py-1.5">
                    <div className="text-xs font-extrabold text-[#F3EDDD] font-mono">
                      {restorePreview.total_rows.toLocaleString('en-US')}
                    </div>
                    <div className="text-[9px] text-[#7E8B84]">صف</div>
                  </div>
                  <div className="bg-[#0E0E14] rounded-lg py-1.5">
                    <div className="text-xs font-extrabold text-[#F3EDDD] font-mono">
                      {restorePreview.exported_at ? restorePreview.exported_at.slice(0, 10) : '—'}
                    </div>
                    <div className="text-[9px] text-[#7E8B84]">تاريخ النسخة</div>
                  </div>
                </div>

                {/* الجداول التي ستتغير فعلاً — لا نعرض 37 صفاً بلا داعٍ */}
                {(() => {
                  const changed = restorePreview.tables.filter((t) => t.delta !== 0);
                  if (!changed.length) {
                    return (
                      <p className="text-[10px] text-[#9E9682] leading-relaxed">
                        محتوى النسخة مطابق للبيانات الحالية — تنفيذها لن يغيّر شيئاً.
                      </p>
                    );
                  }
                  return (
                    <div className="max-h-32 overflow-y-auto rounded-lg bg-[#0E0E14] divide-y divide-[#1E1E28]">
                      {changed.slice(0, 20).map((t) => (
                        <div
                          key={t.table}
                          className="flex items-center justify-between px-2 py-1 text-[10px]"
                        >
                          <span className="text-[#C9C1AC] font-mono" dir="ltr">
                            {t.table}
                          </span>
                          <span
                            className={
                              t.delta > 0 ? 'text-emerald-300 font-mono' : 'text-red-300 font-mono'
                            }
                            dir="ltr"
                          >
                            {t.current_rows} → {t.incoming_rows}
                          </span>
                        </div>
                      ))}
                      {changed.length > 20 && (
                        <div className="px-2 py-1 text-[10px] text-[#7E8B84]">
                          و{changed.length - 20} جدولاً آخر…
                        </div>
                      )}
                    </div>
                  );
                })()}

                {restorePreview.warnings.map((w) => (
                  <p key={w} className="text-[10px] text-amber-300/90 leading-relaxed">
                    ⚠ {w}
                  </p>
                ))}

                <div className="flex gap-2">
                  <button
                    onClick={() => void runRestore()}
                    disabled={busy !== null}
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-red-600/80 hover:bg-red-600 text-white cursor-pointer disabled:opacity-50"
                  >
                    {busy === 'restore' ? 'جارٍ الاستعادة…' : 'نعم، استعد'}
                  </button>
                  <button
                    onClick={() => {
                      setRestorePreview(null);
                      setRestoreFile(null);
                    }}
                    disabled={busy !== null}
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-[#13131A] border border-[#D4AF37]/25 text-[#E2DAC6] cursor-pointer disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {restoreError && (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40">
                <p className="text-[11px] text-red-200 leading-relaxed">{restoreError}</p>
              </div>
            )}

            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-[#13131A] hover:bg-red-950/40 border border-[#D4AF37]/25 hover:border-red-500/40 text-[#E2DAC6] flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>مسح كل البيانات وإعادة التهيئة</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/40 space-y-2">
                <p className="text-[11px] text-red-200 leading-relaxed">
                  سيُمسح كل ما أدخلته على هذا الجهاز وتعود البيانات التأسيسية فقط. لا يمكن التراجع
                  إلا من نسخة احتياطية.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => void resetOfflineData()}
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-red-600/80 hover:bg-red-600 text-white cursor-pointer"
                  >
                    نعم، امسح
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold bg-[#13131A] border border-[#D4AF37]/25 text-[#E2DAC6] cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {saved && (
          <div className="px-5 py-2 bg-emerald-950/40 border-t border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
            <Check className="w-3.5 h-3.5" />
            تم حفظ الإعداد. أعد تحميل الصفحة لتطبيقه بالكامل.
          </div>
        )}
      </div>
    </div>
  );
};
