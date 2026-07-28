"use client";

// Minimal IndexedDB-backed mutation outbox so core inventory edits (add,
// status change, delete) keep working offline and sync automatically once
// the connection returns. AI-dependent endpoints (analyze, generate listing,
// assistant) are intentionally NOT queueable here — they need a live model
// call at the moment of use, so those flows stay online-only.

const DB_NAME = "resellai-offline";
const STORE = "outbox";
const listeners = new Set<(pending: number) => void>();

interface QueuedMutation {
  id?: number;
  url: string;
  method: string;
  body: unknown;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueMutation(mutation: Omit<QueuedMutation, "id" | "createdAt">): Promise<void> {
  await withStore("readwrite", (store) => store.add({ ...mutation, createdAt: Date.now() }));
  await notifyListeners();
}

async function getQueue(): Promise<QueuedMutation[]> {
  return withStore("readonly", (store) => store.getAll());
}

async function deleteMutation(id: number): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

export async function getPendingCount(): Promise<number> {
  if (typeof indexedDB === "undefined") return 0;
  return (await getQueue()).length;
}

export function subscribePendingCount(cb: (pending: number) => void): () => void {
  listeners.add(cb);
  getPendingCount().then(cb);
  return () => listeners.delete(cb);
}

async function notifyListeners() {
  const count = await getPendingCount();
  listeners.forEach((cb) => cb(count));
}

let flushInFlight: Promise<{ flushed: number; remaining: number }> | null = null;

/**
 * Replays queued mutations in order, stopping at the first failure to
 * preserve ordering. Guarded against concurrent calls (e.g. multiple
 * "online" listeners, or a manual retry racing the automatic one) so the
 * same queued mutation is never replayed twice.
 */
export async function flushQueue(): Promise<{ flushed: number; remaining: number }> {
  if (flushInFlight) return flushInFlight;
  flushInFlight = doFlush().finally(() => {
    flushInFlight = null;
  });
  return flushInFlight;
}

async function doFlush(): Promise<{ flushed: number; remaining: number }> {
  if (typeof indexedDB === "undefined" || !navigator.onLine) return { flushed: 0, remaining: 0 };
  const queue = await getQueue();
  let flushed = 0;
  for (const item of queue.sort((a, b) => a.createdAt - b.createdAt)) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { "Content-Type": "application/json" },
        body: item.body ? JSON.stringify(item.body) : undefined,
      });
      if (!res.ok) throw new Error(`sync failed: ${res.status}`);
      if (item.id != null) await deleteMutation(item.id);
      flushed++;
    } catch {
      break;
    }
  }
  await notifyListeners();
  const remaining = await getPendingCount();
  return { flushed, remaining };
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushQueue();
  });
}

/**
 * Fetch wrapper for mutating inventory calls. When offline, queues the
 * mutation in IndexedDB and returns a synthetic 202 response instead of
 * throwing, so calling UI code can proceed optimistically.
 */
export async function apiFetch(url: string, options: { method: string; body?: unknown }): Promise<Response> {
  const isOnline = typeof navigator === "undefined" || navigator.onLine;
  if (isOnline) {
    try {
      return await fetch(url, {
        method: options.method,
        headers: { "Content-Type": "application/json" },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch {
      // fall through to queueing on network failure
    }
  }
  await queueMutation({ url, method: options.method, body: options.body });
  return new Response(JSON.stringify({ queued: true }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
}
