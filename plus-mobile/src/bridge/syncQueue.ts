/**
 * قائمة انتظار المزامنة (Offline Sync Queue)
 * كل عملية إدخال/تعديل تُنفَّذ بدون اتصال تُخزَّن هنا،
 * ثم تُرسَل تلقائياً للخادم عند عودة الشبكة بنفس الترتيب.
 */

import { storage } from './storage';

export type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface QueuedOperation {
  id: string;
  method: HttpMethod;
  path: string;
  body: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
  label: string;
}

const QUEUE_KEY = 'plus_mobile_sync_queue_v1';
const listeners = new Set<(q: QueuedOperation[]) => void>();

let inMemoryQueue: QueuedOperation[] | null = null;

function uid() {
  return `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function emit() {
  const snapshot = getQueue();
  listeners.forEach((fn) => fn(snapshot));
}

export function subscribeQueue(fn: (q: QueuedOperation[]) => void): () => void {
  listeners.add(fn);
  fn(getQueue());
  return () => listeners.delete(fn);
}

export function getQueue(): QueuedOperation[] {
  if (inMemoryQueue) return inMemoryQueue;
  const raw = storage.syncGet(QUEUE_KEY);
  if (!raw) {
    inMemoryQueue = [];
    return inMemoryQueue;
  }
  try {
    const parsed = JSON.parse(raw);
    inMemoryQueue = Array.isArray(parsed) ? parsed : [];
  } catch {
    inMemoryQueue = [];
  }
  return inMemoryQueue;
}

function persist(queue: QueuedOperation[]) {
  inMemoryQueue = queue;
  storage.syncSet(QUEUE_KEY, JSON.stringify(queue));
  emit();
}

/** يوصف العملية بعنوان مفهوم يظهر للمستخدم في شاشة المزامنة */
export function describePath(path: string): string {
  const map: { pattern: RegExp; label: string }[] = [
    { pattern: /journal-entries/, label: 'قيد يومية' },
    { pattern: /treasury-vouchers/, label: 'سند خزينة' },
    { pattern: /sales-invoices/, label: 'فاتورة بيع' },
    { pattern: /sales-returns/, label: 'إشعار رد مبيعات' },
    { pattern: /customer-collections/, label: 'تحصيل من عميل' },
    { pattern: /purchase-orders/, label: 'أمر توريد' },
    { pattern: /purchase-invoices/, label: 'فاتورة شراء' },
    { pattern: /purchase-returns/, label: 'إشعار رد مشتريات' },
    { pattern: /supplier-payments/, label: 'سداد مورد' },
    { pattern: /stock-additions/, label: 'إذن إضافة مخزن' },
    { pattern: /stock-issues/, label: 'إذن صرف مخزن' },
    { pattern: /attendance/, label: 'تسجيل حضور' },
    { pattern: /payrolls/, label: 'احتساب رواتب' },
    { pattern: /customers/, label: 'بيانات عميل' },
    { pattern: /suppliers/, label: 'بيانات مورد' },
    { pattern: /items/, label: 'بيانات صنف' },
    { pattern: /employees/, label: 'بيانات موظف' },
    { pattern: /accounts/, label: 'حساب محاسبي' },
  ];
  const hit = map.find((m) => m.pattern.test(path));
  return hit ? hit.label : 'عملية';
}

export function enqueue(method: HttpMethod, path: string, body: unknown): QueuedOperation {
  const op: QueuedOperation = {
    id: uid(),
    method,
    path,
    body: JSON.stringify(body ?? {}),
    createdAt: Date.now(),
    attempts: 0,
    label: describePath(path),
  };
  persist([...getQueue(), op]);
  return op;
}

export function removeOperation(id: string) {
  persist(getQueue().filter((op) => op.id !== id));
}

export function clearQueue() {
  persist([]);
}

export function markAttempt(id: string, error?: string) {
  persist(
    getQueue().map((op) =>
      op.id === id ? { ...op, attempts: op.attempts + 1, lastError: error } : op
    )
  );
}

export function pendingCount(): number {
  return getQueue().length;
}
