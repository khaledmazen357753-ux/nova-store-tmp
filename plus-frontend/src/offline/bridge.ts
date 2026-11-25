/**
 * جسر تشغيل كود الخادم داخل المتصفح.
 *
 * الفكرة: كود الخادم (`routes/*.js`, `accountingEngine.js`) مكتوب بأسلوب
 * Express: كل ملف يستقبل `db` ويعيد «راوتر» يعرّف مسارات عبر
 * `router.get/post/put/delete`، والمعالجات تستخدم `req.params` و `req.body`
 * و `req.query` وتستجيب بـ `res.json()` / `res.status()`.
 *
 * هنا نوفّر بديلاً مصغّراً لـ Express يحاكي نفس الواجهة، ثم نوجّه الطلبات
 * إليه مباشرة. النتيجة:
 *
 *   نفس منطق الخادم المحاسبي — بلا إعادة كتابة ولا نسخة ثانية.
 *   مصدر واحد للحقيقة: أي تعديل مستقبلي على الخادم ينعكس هنا تلقائياً.
 *
 * هذا ما يجعل «العقل المحاسبي» يعمل أوفلاين بنفس القواعد تماماً.
 */

export interface ReqLike {
  method: string;
  path: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  query: Record<string, string>;
  body: Record<string, unknown>;
  user?: Record<string, unknown>;
}

export interface ResLike {
  statusCode: number;
  json(body: unknown): void;
  status(code: number): ResLike;
  send(body: unknown): void;
  body?: unknown;
  done: boolean;
}

type Handler = (req: ReqLike, res: ResLike, next: (err?: unknown) => void) => unknown;
type NextFn = (err?: unknown) => void;

export interface RouteEntry {
  method: string;
  pattern: string;
  handlers: Handler[];
}

export interface RouterRecord {
  prefix: string;
  routes: RouteEntry[];
  /** وسطاء router.use — تُطبَّق قبل كل مسار في هذا الراوتر فقط */
  middleware: Handler[];
}

export interface RouterLike {
  get(p: string, ...h: Handler[]): RouterLike;
  post(p: string, ...h: Handler[]): RouterLike;
  put(p: string, ...h: Handler[]): RouterLike;
  delete(p: string, ...h: Handler[]): RouterLike;
  use(...args: unknown[]): RouterLike;
  readonly record: RouterRecord;
}

function makeRouter(prefix: string): RouterLike {
  const record: RouterRecord = { prefix, routes: [], middleware: [] };

  const router: RouterLike = {
    record,
    get(p, ...h) {
      record.routes.push({ method: 'GET', pattern: p, handlers: h as Handler[] });
      return router;
    },
    post(p, ...h) {
      record.routes.push({ method: 'POST', pattern: p, handlers: h as Handler[] });
      return router;
    },
    put(p, ...h) {
      record.routes.push({ method: 'PUT', pattern: p, handlers: h as Handler[] });
      return router;
    },
    delete(p, ...h) {
      record.routes.push({ method: 'DELETE', pattern: p, handlers: h as Handler[] });
      return router;
    },
    use(...args) {
      const handlers = args.filter((a) => typeof a === 'function') as Handler[];
      record.middleware.push(...handlers);
      return router;
    },
  };

  return router;
}

export interface ExpressStub {
  (): ExpressStub;
  Router(): RouterLike;
  /** يستخدمه تركيب الراوترات لتحديد البادئة (بديل app.use('/api/x', router)) */
  __setPrefix(prefix: string): void;
}

/** يبني كائن express مصغّراً. المسارات تُسجَّل في السجل المركزي. */
export function createExpressStub(registry: RouterRecord[]): ExpressStub {
  let currentPrefix = '/';
  const expressStub = Object.assign(() => expressStub, {
    __setPrefix(prefix: string) {
      currentPrefix = prefix;
    },
    Router: () => {
      const record = makeRouter(currentPrefix).record;
      registry.push(record);
      return makeRouterFromRecord(record);
    },
  }) as ExpressStub;
  return expressStub;
}

/** يغلّف سجلاً موجوداً كواجهة راوتر */
export function makeRouterFromRecord(record: RouterRecord): RouterLike {
  const router: RouterLike = {
    record,
    get(p, ...h) {
      record.routes.push({ method: 'GET', pattern: p, handlers: h as Handler[] });
      return router;
    },
    post(p, ...h) {
      record.routes.push({ method: 'POST', pattern: p, handlers: h as Handler[] });
      return router;
    },
    put(p, ...h) {
      record.routes.push({ method: 'PUT', pattern: p, handlers: h as Handler[] });
      return router;
    },
    delete(p, ...h) {
      record.routes.push({ method: 'DELETE', pattern: p, handlers: h as Handler[] });
      return router;
    },
    use(...args) {
      const handlers = args.filter((a) => typeof a === 'function') as Handler[];
      record.middleware.push(...handlers);
      return router;
    },
  };
  return router;
}

/** يحوّل نمط مسار Express إلى تعبير نمطي ويستخرج أسماء المعاملات */
function compilePattern(pattern: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:([A-Za-z0-9_]+)/g, (_m, key) => {
      keys.push(key);
      return '([^/]+)';
    });
  return { regex: new RegExp(`^${escaped}/?$`), keys };
}

/**
 * ينادي معالجات المسار بالتسلسل (وسطاء الراوتر ثم معالجات المسار).
 * يتوقف فوراً إذا أنهى أحدهم الطلب بـ res.json / res.status().json.
 *
 * كل معالجات هذا المشروع متزامنة تماماً (تم التحقق: صفر async وصفر await
 * في accountingEngine و routes/*)، فالتنفيذ هنا مطابق لسلوك Express حرفياً
 * ولا يحتاج أي تعقيد إضافي.
 */
function runHandlers(handlers: Handler[], req: ReqLike, res: ResLike): void {
  let idx = 0;
  const next: NextFn = (err) => {
    if (res.done || err || idx >= handlers.length) return;
    const handler = handlers[idx];
    idx += 1;
    try {
      handler(req, res, next);
    } catch (error) {
      // نعيد الخطأ كرد JSON بدل أن يختفي بصمت
      res.status(500).json({
        error: error instanceof Error ? error.message : 'خطأ غير متوقع في معالجة الطلب',
      });
    }
  };
  next();
}

export interface DispatchResult {
  status: number;
  body: unknown;
}

/**
 * يوجّه طلباً إلى المسارات المسجّلة (بديل fetch للخادم الحقيقي).
 * يعيد نفس شكل رد الـ API: { status, body }.
 */
export async function dispatch(
  registry: RouterRecord[],
  method: string,
  path: string,
  options: {
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  } = {}
): Promise<DispatchResult> {
  const [rawPath, rawQuery] = path.split('?');
  const query: Record<string, string> = {};
  if (rawQuery) {
    new URLSearchParams(rawQuery).forEach((v, k) => {
      query[k] = v;
    });
  }

  const upper = method.toUpperCase();

  // أطول بادئة أولاً حتى لا يسرق /api مسار /api/master
  const groups = [...registry].sort((a, b) => b.prefix.length - a.prefix.length);

  for (const group of groups) {
    if (!rawPath.startsWith(group.prefix)) continue;
    const subPath = rawPath.slice(group.prefix.length) || '/';

    for (const route of group.routes) {
      if (route.method !== upper) continue;
      const { regex, keys } = compilePattern(route.pattern);
      const match = regex.exec(subPath);
      if (!match) continue;

      const params: Record<string, string> = {};
      keys.forEach((k, i) => {
        params[k] = decodeURIComponent(match[i + 1]);
      });

      const res: ResLike = {
        statusCode: 200,
        done: false,
        json(body: unknown) {
          this.body = body;
          this.done = true;
        },
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        send(body: unknown) {
          this.body = body;
          this.done = true;
        },
      };

      // HTTP يجعل أسماء الترويسات بأحرف صغيرة — نحاكي ذلك بدقة،
      // وإلا فإن `req.headers.authorization` (كما يقرأها auth.js) لن تجد التوكن.
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(options.headers || {})) {
        headers[key.toLowerCase()] = value;
      }

      const req: ReqLike = {
        method: upper,
        path: subPath,
        headers,
        params,
        query,
        body: options.body || {},
      };

      await Promise.resolve(runHandlers([...group.middleware, ...route.handlers], req, res));
      return { status: res.statusCode, body: res.body ?? null };
    }
  }

  return { status: 404, body: { error: `المسار غير معروف: ${method} ${path}` } };
}

export type { Handler, NextFn };
