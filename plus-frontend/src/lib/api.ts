/**
 * طبقة الاتصال الموحّدة.
 *
 * تعمل في وضعين:
 *
 *   offline (الافتراضي) — كل طلب يُنفَّذ داخل المتصفح على قاعدة SQLite
 *     محلية بنفس كود الخادم المحاسبي. لا يحتاج إنترنت إطلاقاً.
 *
 *   cloud — يمر الطلب إلى خادم REST خارجي إن ضبط المستخدم رابطه.
 *     نفس سلوك النظام قبل التغيير بالحرف.
 *
 * واجهة الاستدعاء لم تتغيّر: apiFetch(path, { method, body }) — لذلك
 * كل وحدات الواجهة الثمانية تعمل في الوضعين دون أي تعديل.
 */

import { dispatch as offlineDispatch } from '../offline/bridge';
import { offlineState, initOfflineEngine } from '../offline/engine';

const CUSTOM_API_KEY = 'plus_custom_api_base_url';
const TOKEN_KEY = 'plus_erp_auth_token';
const MODE_KEY = 'plus_erp_data_mode'; // 'offline' | 'cloud'

export type DataMode = 'offline' | 'cloud';

export function getDataMode(): DataMode {
  const stored = localStorage.getItem(MODE_KEY);
  if (stored === 'cloud' || stored === 'offline') return stored;
  // الافتراضي: أوفلاين — لأن أهم متطلب أن يعمل النظام بلا إنترنت
  return 'offline';
}

export function setDataMode(mode: DataMode) {
  localStorage.setItem(MODE_KEY, mode);
}

export function getApiBaseUrl(): string {
  const custom = typeof window !== 'undefined' ? localStorage.getItem(CUSTOM_API_KEY) : null;
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL || '';
  return String(custom || envUrl || '').trim().replace(/\/+$/, '');
}

export function setCustomApiBaseUrl(url: string | null) {
  if (url && url.trim()) {
    localStorage.setItem(CUSTOM_API_KEY, url.trim().replace(/\/+$/, ''));
  } else {
    localStorage.removeItem(CUSTOM_API_KEY);
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export interface ApiError extends Error {
  code?: string;
  status?: number;
}

function makeError(message: string, code?: string, status?: number): ApiError {
  const err = new Error(message) as ApiError;
  err.code = code;
  err.status = status;
  return err;
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const method = (options.method || 'GET').toUpperCase();

  // ═══════════ الوضع السحابي (اختياري) ═══════════════════════════
  if (getDataMode() === 'cloud') {
    const res = await fetch(`${getApiBaseUrl()}${path}`, { ...options, headers });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw makeError(
        'تعذر الوصول لخادم البيانات (Plus Backend API). تأكد من ربط رابط الـ Backend المنشور.',
        'API_UNREACHABLE'
      );
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw makeError(data.error || `حدث خطأ في الاتصال (${res.status})`, data.code, res.status);
    }
    return data as T;
  }

  // ═══════════ الوضع الأوفلاين (الافتراضي) ═══════════════════════
  // ننتظر التهيئة إن لم تكن تمت بعد — أول طلب يفتح قاعدة البيانات المحلية
  const engineState = offlineState() || (await initOfflineEngine());

  const body =
    options.body === undefined || options.body === null
      ? {}
      : typeof options.body === 'string'
        ? JSON.parse(options.body)
        : (options.body as unknown as Record<string, unknown>);

  const result = await offlineDispatch(engineState.routers, method, path, { headers, body });

  // حفظ غير متزامن بعد كل تعديل ناجح
  if (method !== 'GET' && result.status < 400) {
    void engineState.db.persist().catch(() => undefined);
  }

  const payload = result.body as Record<string, unknown> | null;
  if (result.status >= 400) {
    throw makeError(
      (payload?.error as string) || `حدث خطأ (${result.status})`,
      payload?.code as string | undefined,
      result.status
    );
  }
  return payload as T;
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
