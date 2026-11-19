const CUSTOM_API_KEY = 'plus_custom_api_base_url';

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

const TOKEN_KEY = 'plus_erp_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const err: any = new Error('تعذر الوصول لخادم البيانات (Plus Backend API). تأكد من ربط رابط الـ Backend المنشور.');
    err.code = 'API_UNREACHABLE';
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data.error || `حدث خطأ في الاتصال (${res.status})`);
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data as T;
}

export function fmtMoney(val: number | string | null | undefined, currency = 'ج.م'): string {
  const num = Number(val || 0);
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function fmtNum(val: number | string | null | undefined): string {
  return Number(val || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
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
