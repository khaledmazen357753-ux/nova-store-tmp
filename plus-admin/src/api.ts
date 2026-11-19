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

const ADMIN_TOKEN_KEY = 'plus_admin_portal_token';

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function adminFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${getApiBaseUrl()}${path}`, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('تعذر الوصول لخادم البيانات (Plus Backend API). تأكد من إدخال رابط الـ Backend المنشور.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `خطأ في الاتصال بالخادم (${res.status})`);
  }
  return data as T;
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
