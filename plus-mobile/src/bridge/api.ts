/**
 * طبقة الاتصال بالخادم في تطبيق الجوال:
 * - تقرأ عنوان الخادم من إعدادات التطبيق (أو متغير البناء).
 * - تخزّن آخر نسخة ناجحة من كل استعلام (GET) لعرضها عند انقطاع الشبكة.
 * - تحوّل عمليات الإدخال (POST/PUT/DELETE) تلقائياً إلى قائمة مزامنة عند انقطاع الشبكة.
 */

import { enqueue } from './syncQueue';
import { isOnline } from './network';
import { storage } from './storage';

const CUSTOM_API_KEY = 'plus_custom_api_base_url';
const CACHE_PREFIX = 'plus_cache_v1:';
const CACHE_INDEX_KEY = 'plus_cache_index_v1';
const DEFAULT_API = (import.meta as any).env?.VITE_API_BASE_URL || '';

export const DEFAULT_API_BASE_URL = String(DEFAULT_API || '').trim().replace(/\/+$/, '');

export function getApiBaseUrl(): string {
  const custom = storage.syncGet(CUSTOM_API_KEY);
  const envUrl = DEFAULT_API_BASE_URL;
  return String(custom || envUrl || '').trim().replace(/\/+$/, '');
}

export function setCustomApiBaseUrl(url: string | null) {
  if (url && url.trim()) {
    storage.syncSet(CUSTOM_API_KEY, url.trim().replace(/\/+$/, ''));
  } else {
    storage.syncSet(CUSTOM_API_KEY, '');
  }
}


const TOKEN_KEY = 'plus_erp_auth_token';
const ADMIN_TOKEN_KEY = 'plus_admin_portal_token';

export function getStoredToken(): string | null {
  return storage.syncGet(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) storage.syncSet(TOKEN_KEY, token);
  else storage.syncSet(TOKEN_KEY, '');
}

export function getAdminToken(): string | null {
  return storage.syncGet(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (token) storage.syncSet(ADMIN_TOKEN_KEY, token);
  else storage.syncSet(ADMIN_TOKEN_KEY, '');
}

export class OfflineQueuedError extends Error {
  queued = true;
  constructor(message: string) {
    super(message);
    this.name = 'OfflineQueuedError';
  }
}

function isMutation(method?: string) {
  const m = (method || 'GET').toUpperCase();
  return m !== 'GET';
}

function readCache<T>(path: string): T | null {
  const raw = storage.syncGet(CACHE_PREFIX + path);
  if (!raw) return null;
  try {
    return JSON.parse(raw).data as T;
  } catch {
    return null;
  }
}

function writeCache(path: string, data: unknown) {
  try {
    storage.syncSet(CACHE_PREFIX + path, JSON.stringify({ at: Date.now(), data }));
    const rawIndex = storage.syncGet(CACHE_INDEX_KEY);
    const index: Record<string, number> = rawIndex ? JSON.parse(rawIndex) : {};
    index[path] = Date.now();
    // نحتفظ بآخر 120 مسار فقط لتقليل الحجم
    const trimmed = Object.entries(index)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 120);
    storage.syncSet(CACHE_INDEX_KEY, JSON.stringify(Object.fromEntries(trimmed)));
  } catch {
    /* تجاهل تجاوز مساحة التخزين */
  }
}

export function getCachedAt(path: string): number | null {
  const raw = storage.syncGet(CACHE_PREFIX + path);
  if (!raw) return null;
  try {
    return JSON.parse(raw).at as number;
  } catch {
    return null;
  }
}

export function cacheSize(): number {
  const raw = storage.syncGet(CACHE_INDEX_KEY);
  if (!raw) return 0;
  try {
    return Object.keys(JSON.parse(raw)).length;
  } catch {
    return 0;
  }
}

export function clearCache() {
  const raw = storage.syncGet(CACHE_INDEX_KEY);
  if (raw) {
    try {
      Object.keys(JSON.parse(raw)).forEach((k) => storage.syncSet(CACHE_PREFIX + k, ''));
    } catch {
      /* ignore */
    }
  }
  storage.syncSet(CACHE_INDEX_KEY, '{}');
}

export interface ApiOptions extends RequestInit {
  /** يُستخدم كعنوان وصفي عند وضع العملية في قائمة المزامنة */
  queueLabel?: string;
  /** يمنع استخدام النسخة المحفوظة عند الفشل */
  noCache?: boolean;
}

export async function apiFetch<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const method = (options.method || 'GET').toUpperCase();
  const base = getApiBaseUrl();

  const doRequest = async () =>
    fetch(`${base}${path}`, {
      ...options,
      headers,
      cache: 'no-store',
    });

  // عمليات الكتابة بدون اتصال: تُحفظ للمزامنة لاحقاً
  if (isMutation(method) && !isOnline()) {
    enqueue(method as 'POST' | 'PUT' | 'DELETE', path, options.body ? JSON.parse(String(options.body)) : {});
    throw new OfflineQueuedError(
      'لا يوجد اتصال بالشبكة — تم حفظ العملية في قائمة المزامنة وستُرسل تلقائياً عند عودة الإنترنت.'
    );
  }

  let res: Response;
  try {
    res = await doRequest();
  } catch {
    // خطأ شبكة: للقراءة نعرض النسخة المحفوظة، وللكتابة نضيف للمزامنة
    if (isMutation(method)) {
      enqueue(method as 'POST' | 'PUT' | 'DELETE', path, options.body ? JSON.parse(String(options.body)) : {});
      throw new OfflineQueuedError(
        'تعذر الوصول للخادم — تم حفظ العملية في قائمة المزامنة وستُرسل تلقائياً عند عودة الإنترنت.'
      );
    }
    const cached = options.noCache ? null : readCache<T>(path);
    if (cached) return cached;
    const err: any = new Error(
      'لا يوجد اتصال بالخادم ولا توجد نسخة محفوظة من هذه البيانات على الجهاز.'
    );
    err.code = 'OFFLINE_NO_CACHE';
    throw err;
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const err: any = new Error(
      'تعذر الوصول لخادم البيانات (Plus Backend API). تأكد من ضبط رابط الخادم في إعدادات التطبيق.'
    );
    err.code = 'API_UNREACHABLE';
    if (!isMutation(method) && !options.noCache) {
      const cached = readCache<T>(path);
      if (cached) return cached;
    }
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error((data as any).error || `حدث خطأ في الاتصال (${res.status})`);
    err.status = res.status;
    err.code = (data as any).code;
    throw err;
  }

  if (!isMutation(method)) writeCache(path, data);
  return data as T;
}

/** إرسال عملية واحدة من قائمة الانتظار مباشرة للخادم */
export async function pushQueuedOperation(method: string, path: string, body: string, isAdmin = false) {
  const token = isAdmin ? getAdminToken() : getStoredToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${getApiBaseUrl()}${path}`, { method, headers, body });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('json') ? await res.json().catch(() => ({})) : {};
  return { ok: res.ok, status: res.status, data };
}

/** طلب إداري (بوابة مدير النظام) — لا يُخزَّن محلياً */
export async function adminFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${getApiBaseUrl()}${path}`, { ...options, headers, cache: 'no-store' });
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('تعذر الوصول لخادم البيانات. تأكد من الاتصال بالإنترنت.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `خطأ في الاتصال بالخادم (${res.status})`);
  return data as T;
}

export function fmtMoney(val: number | string | null | undefined, currency = 'ج.م'): string {
  const num = Number(val || 0);
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function fmtNum(val: number | string | null | undefined): string {
  return Number(val || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  const escapeCell = (cell: any) => {
    const str = cell === null || cell === undefined ? '' : String(cell);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
