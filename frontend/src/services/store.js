// UI state cache hydrated from the Node API; Neon is the persistent source.
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "yourbite.state.v2";
const SCHEMA_VERSION = 2;

const listeners = new Set();
let databaseReady = false;
let databaseWriteQueue = Promise.resolve();

/* ------------------------------------------------------------------ */
/* Table lifecycle helpers                                             */
/* ------------------------------------------------------------------ */

export function activeOrdersOf(state, tableId) {
  return state.orders.filter(
    (o) => o.tableId === tableId && o.status !== "cancelled" && o.paymentStatus !== "paid"
  );
}

export function computeTableStatus(state, tableId) {
  const table = state.tables.find((t) => t.id === tableId);
  if (!table) return "available";
  const active = activeOrdersOf(state, tableId);
  if (active.length) {
    const allSettled = active.every(
      (o) => o.status === "served" || o.status === "completed"
    );
    return allSettled ? "payment_pending" : "occupied";
  }
  return table.claimed ? "occupied" : "available";
}

export function withTableStatuses(state) {
  return {
    ...state,
    tables: state.tables.map((t) => ({
      ...t,
      status: computeTableStatus(state, t.id),
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Local cache + database hydration                                    */
/* ------------------------------------------------------------------ */

function emptyState() {
  return {
    version: SCHEMA_VERSION,
    seededAt: null,
    tables: [],
    categories: [],
    items: [],
    orders: [],
    nextOrderId: 1,
    settings: {
      cafeName: "Your Restaurant",
      taxRate: 0,
      openingHours: "",
    },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === SCHEMA_VERSION) return parsed;
    }
  } catch {
    /* fall through to the empty database-backed state */
  }
  const fresh = withTableStatuses(emptyState());
  persist(fresh);
  return fresh;
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full/blocked — state stays in memory for this session */
  }
}

let state = load();

function notify() {
  listeners.forEach((listener) => listener());
}

function changesBetween(previous, next) {
  const collectionChanges = (before, after) => {
    const oldById = new Map(before.map((record) => [String(record.id), record]));
    const newById = new Map(after.map((record) => [String(record.id), record]));
    return {
      upsert: after.filter((record) => JSON.stringify(oldById.get(String(record.id))) !== JSON.stringify(record)),
      delete: before.filter((record) => !newById.has(String(record.id))).map((record) => record.id),
    };
  };

  const changes = {
    categories: collectionChanges(previous.categories, next.categories),
    tables: collectionChanges(previous.tables, next.tables),
    items: collectionChanges(previous.items, next.items),
    orders: collectionChanges(previous.orders, next.orders),
  };
  if (JSON.stringify(previous.settings) !== JSON.stringify(next.settings)) changes.settings = next.settings;
  return changes;
}

function hasChanges(changes) {
  return Boolean(changes.settings) || ["categories", "tables", "items", "orders"].some((key) =>
    changes[key].upsert.length || changes[key].delete.length
  );
}

function getAuthHeaders() {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("yourbite_auth_token") : null;
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function persistChanges(changes) {
  databaseWriteQueue = databaseWriteQueue
    .catch(() => {})
    .then(async () => {
      const headers = { "Content-Type": "application/json", ...getAuthHeaders() };
      const response = await fetch("/api/changes", {
        method: "POST",
        headers,
        body: JSON.stringify(changes),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Database update failed.");
    })
    .catch((error) => {
      console.error("Database synchronization failed:", error.message);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("yourbite:database-error", { detail: error.message }));
      }
    });
}

/* ------------------------------------------------------------------ */
/* Store API                                                           */
/* ------------------------------------------------------------------ */

export function getState() {
  return state;
}

export function setState(updater) {
  const previous = state;
  state = withTableStatuses(updater(state));
  persist(state);
  if (databaseReady) {
    const changes = changesBetween(previous, state);
    if (hasChanges(changes)) persistChanges(changes);
  }
  notify();
}

export async function initializeStore(tenantId) {
   let url = "/api/bootstrap";
   if (tenantId) {
     url += `?tenant=${encodeURIComponent(tenantId)}`;
   }
   try {
     const response = await fetch(url, { headers: getAuthHeaders() });
     const snapshot = await response.json();
     if (!response.ok) throw new Error(snapshot.error || "Database bootstrap failed.");
     state = withTableStatuses({ ...snapshot, version: SCHEMA_VERSION, seededAt: null });
     databaseReady = true;
     persist(state);
     notify();
     return true;
   } catch (error) {
     databaseReady = false;
     state = withTableStatuses(emptyState());
     persist(state);
     notify();
     console.error("Could not load Neon data:", error.message);
     return false;
   }
 }

export function flushDatabaseWrites() {
  return databaseWriteQueue;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React hook: subscribes components to the whole store state. */
export function useStore() {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Reload the current persisted state; this never reseeds mock records. */
export async function resetDemoData() {
  await flushDatabaseWrites();
  return initializeStore();
}
