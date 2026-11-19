/**
 * طبقة التخزين المحلي الدائم (تُستخدم للعمل بدون إنترنت)
 * - في التطبيق الأصلي: Capacitor Preferences (تخزين أصلي دائم).
 * - في المتصفح: localStorage كبديل.
 */

interface PreferencesPlugin {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
  keys(): Promise<{ keys: string[] }>;
}

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  Plugins?: { Preferences?: PreferencesPlugin };
};

const cap = (globalThis as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
const nativePreferences: PreferencesPlugin | undefined = cap?.Plugins?.Preferences;
const isNative = Boolean(cap?.isNativePlatform?.());

export const storage = {
  async get(key: string): Promise<string | null> {
    if (nativePreferences) {
      try {
        const { value } = await nativePreferences.get({ key });
        return value ?? null;
      } catch {
        /* fall through to localStorage */
      }
    }
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    if (nativePreferences) {
      try {
        await nativePreferences.set({ key, value });
      } catch {
        /* fall through */
      }
    }
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* ignore quota errors */
    }
  },

  async remove(key: string): Promise<void> {
    if (nativePreferences) {
      try {
        await nativePreferences.remove({ key });
      } catch {
        /* fall through */
      }
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },

  syncGet(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  syncSet(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
};

export { isNative };
