import type { CapacitorConfig } from '@capacitor/cli';

/**
 * إعدادات القشرة الأصلية (Capacitor)
 * - webDir يشير إلى مخرجات البناء المضمّنة في ملف واحد (dist-app).
 * - التطبيق يعمل أوفلاين بالكامل، والاتصال بالخادم يتم عبر HTTPS فقط.
 */
const config: CapacitorConfig = {
  appId: 'app.plusaccounting.mobile',
  appName: 'المحاسبي Plus',
  webDir: 'dist-app',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
  },
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'app.plus-accounting.app',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#050507',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
