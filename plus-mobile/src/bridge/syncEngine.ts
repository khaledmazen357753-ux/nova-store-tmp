/**
 * محرك المزامنة: يرسل العمليات المعلّقة بالترتيب عند عودة الاتصال.
 */

import { getQueue, markAttempt, removeOperation, subscribeQueue, type QueuedOperation } from './syncQueue';
import { pushQueuedOperation } from './api';
import { isOnline, onNetworkChange } from './network';

export interface SyncState {
  running: boolean;
  pending: number;
  synced: number;
  failed: number;
  lastRunAt: number | null;
  lastError: string | null;
}

type Listener = (state: SyncState) => void;

const listeners = new Set<Listener>();
let state: SyncState = {
  running: false,
  pending: 0,
  synced: 0,
  failed: 0,
  lastRunAt: null,
  lastError: null,
};

function publish(patch: Partial<SyncState> = {}) {
  state = { ...state, ...patch, pending: getQueue().length };
  listeners.forEach((fn) => fn(state));
}

export function onSyncState(fn: Listener): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export function getSyncState(): SyncState {
  return state;
}

let started = false;
let timer: ReturnType<typeof setInterval> | null = null;

export function startSyncEngine() {
  if (started) return;
  started = true;

  subscribeQueue(() => publish());
  onNetworkChange((online) => {
    if (online && getQueue().length > 0) void runSync();
  });

  // محاولة دورية كل 45 ثانية
  timer = setInterval(() => {
    if (isOnline() && getQueue().length > 0) void runSync();
  }, 45_000);

  publish();
}

export function stopSyncEngine() {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}

let syncing = false;

export async function runSync(): Promise<SyncState> {
  if (syncing) return state;
  const queue = getQueue();
  if (queue.length === 0) {
    publish({ lastRunAt: Date.now() });
    return state;
  }
  if (!isOnline()) {
    publish({ lastError: 'لا يوجد اتصال بالشبكة' });
    return state;
  }

  syncing = true;
  publish({ running: true, failed: 0, synced: 0, lastError: null });

  let synced = 0;
  let failed = 0;

  for (const op of queue) {
    try {
      const res = await pushQueuedOperation(op.method, op.path, op.body, op.path.startsWith('/api/admin'));
      if (res.ok) {
        removeOperation(op.id);
        synced += 1;
        publish({ synced });
      } else if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        // خطأ منطقي دائم (مثل قيد غير متوازن) — نُبقيه للمراجعة اليدوية
        markAttempt(op.id, (res.data as any)?.error || `مرفوض (${res.status})`);
        failed += 1;
        publish({ failed });
      } else {
        markAttempt(op.id, `خطأ مؤقت (${res.status})`);
        failed += 1;
        publish({ failed });
        break; // توقف، سنحاول لاحقاً
      }
    } catch (err: any) {
      markAttempt(op.id, err?.message || 'خطأ في الشبكة');
      failed += 1;
      publish({ failed });
      break;
    }
  }

  syncing = false;
  publish({ running: false, lastRunAt: Date.now() });
  return state;
}

export function pendingOperations(): QueuedOperation[] {
  return getQueue();
}
