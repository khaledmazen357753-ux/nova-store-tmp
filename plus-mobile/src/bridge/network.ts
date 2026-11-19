/**
 * مراقبة حالة الشبكة داخل التطبيق الأصلي (Capacitor Network) مع بديل للمتصفح.
 */

import { storage } from './storage';

interface NetworkStatus {
  connected: boolean;
  connectionType?: string;
}

interface NetworkPlugin {
  getStatus(): Promise<NetworkStatus>;
  addListener(
    event: 'networkStatusChange',
    cb: (status: NetworkStatus) => void
  ): Promise<{ remove: () => void }> | { remove: () => void };
}

type CapacitorGlobal = {
  Plugins?: { Network?: NetworkPlugin };
};

const cap = (globalThis as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
const plugin = cap?.Plugins?.Network;

const PROBE_KEY = 'plus_mobile_api_probe';
const OFFLINE_FLAG = 'plus_mobile_forced_offline';

type Listener = (online: boolean) => void;
const listeners = new Set<Listener>();

let currentOnline = true;

function emit() {
  listeners.forEach((fn) => fn(currentOnline));
}

export function onNetworkChange(fn: Listener): () => void {
  listeners.add(fn);
  fn(currentOnline);
  return () => listeners.delete(fn);
}

export function isOnline(): boolean {
  return currentOnline;
}

export function getLastApiProbe(): { url: string; at: number } | null {
  const raw = storage.syncGet(PROBE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setForcedOffline(forced: boolean) {
  if (forced) storage.syncSet(OFFLINE_FLAG, '1');
  else storage.syncSet(OFFLINE_FLAG, '0');
  currentOnline = forced ? false : navigator.onLine;
  emit();
}

export function isForcedOffline(): boolean {
  return storage.syncGet(OFFLINE_FLAG) === '1';
}

/** فحص فعلي للاتصال عبر طلب خفيف إلى الخادم */
export async function probeConnection(apiBase: string, timeoutMs = 6000): Promise<boolean> {
  if (isForcedOffline()) {
    currentOnline = false;
    emit();
    return false;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    currentOnline = false;
    emit();
    return false;
  }
  if (!apiBase) {
    currentOnline = false;
    emit();
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiBase}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    const ok = res.ok;
    currentOnline = ok;
    if (ok) {
      storage.syncSet(PROBE_KEY, JSON.stringify({ url: apiBase, at: Date.now() }));
    }
    emit();
    return ok;
  } catch {
    currentOnline = false;
    emit();
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function startNetworkMonitor(apiBase: string) {
  // أحداث المتصفح (تعمل أيضاً داخل webview التطبيق)
  window.addEventListener('online', () => {
    currentOnline = true;
    emit();
  });
  window.addEventListener('offline', () => {
    currentOnline = false;
    emit();
  });

  if (plugin) {
    try {
      const status = await plugin.getStatus();
      currentOnline = Boolean(status.connected) && !isForcedOffline();
      emit();
      const handle = await plugin.addListener('networkStatusChange', (status) => {
        currentOnline = Boolean(status.connected) && !isForcedOffline();
        emit();
      });
      void handle;
    } catch {
      /* المتصفح يتكفل بالباقي */
    }
  }

  await probeConnection(apiBase);
  // فحص دوري خفيف كل 30 ثانية
  setInterval(() => {
    void probeConnection(apiBase);
  }, 30_000);
}
