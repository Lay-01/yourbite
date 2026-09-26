// Service / API layer.
//
// Shared domain operations used by the UI and backed by the hydrated store.
// They are plain synchronous functions over the local store today; swapping
// the bodies for `await fetch("/api/...")` later requires no UI changes.
import {
  getState,
  setState,
  resetDemoData,
  computeTableStatus,
  withTableStatuses,
} from "./store.js";
import { startOfDay, endOfDay } from "../utils/format.js";

/* ================================================================== */
/* Order constants                                                     */
/* ================================================================== */

export const ORDER_FLOW = {
  new: ["accepted", "preparing", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: ["served"],
  served: ["completed"],
  completed: [],
  cancelled: [],
};

export const STATUS_LABELS = {
  new: "New",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ORDER_TABS = [
  { key: "new", label: "New", statuses: ["new", "accepted"] },
  { key: "preparing", label: "Preparing", statuses: ["preparing"] },
  { key: "ready", label: "Ready", statuses: ["ready"] },
  { key: "served", label: "Served", statuses: ["served"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

export const PAYMENT_STATUSES = ["Pending", "Paid", "Failed"];
export const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Other"];

export const TABLE_STATUS_LABELS = {
  available: "Available",
  occupied: "Occupied",
  payment_pending: "Payment Pending",
};

function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

function logEntry(status, at = Date.now()) {
  return { status, label: statusLabel(status), at };
}

/** Recompute derived table statuses after any order/table mutation. */
function commit(updater) {
  setState((s) => withTableStatuses(updater(s)));
}

class ServiceError extends Error {}

function fail(message) {
  throw new ServiceError(message);
}

/* ================================================================== */
/* Tables                                                              */
/* ================================================================== */

export function listTables() {
  return getState().tables;
}

export function getTable(tableId) {
  return getState().tables.find((t) => t.id === tableId) || null;
}

export function getTableByNumber(number) {
  const norm = String(number || "").trim().toLowerCase();
  return getState().tables.find((t) => t.number.toLowerCase() === norm) || null;
}

export function addTable({ number, seats }) {
  const num = String(number || "").trim();
  if (!num) fail("Table number is required.");
  if (getTableByNumber(num)) fail(`Table ${num} already exists.`);

  const id = `t-${num.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
  const table = {
    id,
    number: num,
    seats: Number(seats) || 4,
    active: true,
    claimed: false,
    status: "available",
    createdAt: Date.now(),
  };
  commit((s) => ({ ...s, tables: [...s.tables, table] }));
  return table;
}

export function updateTable(tableId, patch) {
  const table = getTable(tableId);
  if (!table) fail("Table not found.");
  if (patch.number !== undefined) {
    const num = String(patch.number).trim();
    if (!num) fail("Table number is required.");
    const dup = getTableByNumber(num);
    if (dup && dup.id !== tableId) fail(`Table ${num} already exists.`);
    patch.number = num;
  }
  commit((s) => ({
    ...s,
    tables: s.tables.map((t) => (t.id === tableId ? { ...t, ...patch } : t)),
    orders:
      patch.number !== undefined
        ? s.orders.map((o) =>
            o.tableId === tableId ? { ...o, tableNumber: patch.number } : o
          )
        : s.orders,
  }));
}

export function deleteTable(tableId) {
  const s = getState();
  const hasOpen = s.orders.some(
    (o) =>
      o.tableId === tableId &&
      o.status !== "cancelled" &&
      o.status !== "completed" &&
      o.paymentStatus !== "paid"
  );
  if (hasOpen) fail("This table has active orders. Settle them before deleting.");
  commit((st) => ({ ...st, tables: st.tables.filter((t) => t.id !== tableId) }));
}

/** Customer scanned the QR but hasn't ordered yet. */
export function claimTable(tableId) {
  const table = getTable(tableId);
  if (!table) return;
  if (computeTableStatus(getState(), tableId) !== "available") return;
  commit((s) => ({
    ...s,
    tables: s.tables.map((t) => (t.id === tableId ? { ...t, claimed: true } : t)),
  }));
}

/** Owner frees an occupied table that has no pending bill. */
export function freeTable(tableId) {
  commit((s) => ({
    ...s,
    tables: s.tables.map((t) =>
      t.id === tableId ? { ...t, claimed: false } : t
    ),
  }));
}

/* ================================================================== */
/* Menu — categories                                                   */
/* ================================================================== */

export function listCategories() {
  return [...getState().categories].sort((a, b) => a.order - b.order);
}

export function addCategory({ name }) {
  const clean = String(name || "").trim();
  if (!clean) fail("Category name is required.");
  if (getState().categories.some((c) => c.name.toLowerCase() === clean.toLowerCase()))
    fail("A category with this name already exists.");
  const cats = listCategories();
  const category = {
    id: `cat-${clean.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
    name: clean,
    order: (cats[cats.length - 1]?.order || 0) + 1,
  };
  commit((s) => ({ ...s, categories: [...s.categories, category] }));
  return category;
}

export function updateCategory(id, patch) {
  if (patch.name !== undefined && !String(patch.name).trim()) fail("Category name is required.");
  commit((s) => ({
    ...s,
    categories: s.categories.map((c) => (c.id === id ? { ...c, name: String(patch.name).trim() } : c)),
  }));
}

export function deleteCategory(id) {
  const count = getState().items.filter((i) => i.categoryId === id).length;
  if (count) fail(`Move or delete the ${count} item(s) in this category first.`);
  const cats = listCategories().filter((c) => c.id !== id);
  commit((s) => ({
    ...s,
    categories: cats.map((c, idx) => ({ ...c, order: idx + 1 })),
  }));
}

export function moveCategory(id, direction) {
  const cats = listCategories();
  const idx = cats.findIndex((c) => c.id === id);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapWith < 0 || swapWith >= cats.length) return;
  const a = cats[idx];
  const b = cats[swapWith];
  commit((s) => ({
    ...s,
    categories: s.categories.map((c) => {
      if (c.id === a.id) return { ...c, order: b.order };
      if (c.id === b.id) return { ...c, order: a.order };
      return c;
    }),
  }));
}

/* ================================================================== */
/* Menu — items                                                        */
/* ================================================================== */

export function listItems({ search = "", categoryId = "all" } = {}) {
  const q = search.trim().toLowerCase();
  return getState().items.filter((i) => {
    if (categoryId !== "all" && i.categoryId !== categoryId) return false;
    if (q && !(`${i.name} ${i.description}`.toLowerCase().includes(q))) return false;
    return true;
  });
}

export function getItem(itemId) {
  return getState().items.find((i) => i.id === itemId) || null;
}

export function saveItem(data) {
  const name = String(data.name || "").trim();
  if (!name) fail("Item name is required.");
  const price = Number(data.price);
  if (!Number.isFinite(price) || price < 0) fail("Enter a valid price.");
  if (!data.categoryId) fail("Choose a category.");

  const existing = data.id ? getItem(data.id) : null;
  const patch = {
    name,
    description: String(data.description || "").trim(),
    categoryId: data.categoryId,
    price,
    emoji: String(data.emoji || "").trim() || "🍽️",
    image: String(data.image || "").trim(),
    veg: !!data.veg,
    available: !!data.available,
    bestseller: !!data.bestseller,
  };

  if (existing) {
    commit((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === existing.id ? { ...i, ...patch } : i)),
    }));
    return getItem(existing.id);
  }

  const item = {
    ...patch,
    id: `i-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
    createdAt: Date.now(),
  };
  commit((s) => ({ ...s, items: [...s.items, item] }));
  return item;
}

export function deleteItem(itemId) {
  commit((s) => ({ ...s, items: s.items.filter((i) => i.id !== itemId) }));
}

export function toggleItemAvailability(itemId) {
  commit((s) => ({
    ...s,
    items: s.items.map((i) => (i.id === itemId ? { ...i, available: !i.available } : i)),
  }));
}

/* ================================================================== */
/* Orders                                                              */
/* ================================================================== */

export function listOrders(filters = {}) {
  const {
    tab = "all",
    search = "",
    table = "all",
    payment = "all",
    from = null,
    to = null,
    tableId = null,
    limit = 0,
  } = filters;

  const tabDef = ORDER_TABS.find((t) => t.key === tab);
  const q = search.trim().toLowerCase();

  let rows = [...getState().orders].sort((a, b) => b.createdAt - a.createdAt);

  if (tabDef) rows = rows.filter((o) => tabDef.statuses.includes(o.status));
  if (tableId) rows = rows.filter((o) => o.tableId === tableId);
  if (table !== "all") rows = rows.filter((o) => o.tableNumber === table);
  if (payment !== "all")
    rows = rows.filter((o) => (o.paymentStatus || "pending").toLowerCase() === payment);
  if (from) rows = rows.filter((o) => o.createdAt >= from);
  if (to) rows = rows.filter((o) => o.createdAt <= to);
  if (q) {
    rows = rows.filter(
      (o) =>
        String(o.id).includes(q.replace("#", "")) ||
        `table ${o.tableNumber}`.includes(q) ||
        o.items.some((li) => li.name.toLowerCase().includes(q))
    );
  }
  if (limit > 0) rows = rows.slice(0, limit);
  return rows;
}

export function getOrder(orderId) {
  return getState().orders.find((o) => o.id === Number(orderId)) || null;
}

export function placeOrder({ tableId, items, note = "" }) {
  const table = getTable(tableId);
  if (!table) fail("Table not found.");
  if (!items?.length) fail("Cart is empty.");

  const lines = items.map((li) => {
    const item = getItem(li.itemId);
    if (!item) fail(`${li.name || "An item"} is no longer on the menu.`);
    if (!item.available) fail(`${item.name} is currently unavailable.`);
    return {
      itemId: item.id,
      name: item.name,
      price: item.price,
      veg: item.veg,
      qty: Math.max(1, Number(li.qty) || 1),
    };
  });

  const now = Date.now();
  const id = Math.max(getState().nextOrderId, Date.now() * 1000 + Math.floor(Math.random() * 1000));
  const order = {
    id,
    tableId: table.id,
    tableNumber: table.number,
    items: lines,
    note: String(note).trim(),
    subtotal: lines.reduce((sum, l) => sum + l.price * l.qty, 0),
    status: "new",
    paymentStatus: "pending",
    paymentMethod: null,
    createdAt: now,
    updatedAt: now,
    statusLog: [logEntry("new", now)],
  };

  commit((s) => ({
    ...s,
    orders: [...s.orders, order],
    nextOrderId: s.nextOrderId + 1,
    tables: s.tables.map((t) =>
      t.id === tableId ? { ...t, claimed: true } : t
    ),
  }));
  return order;
}

export function updateOrderStatus(orderId, nextStatus) {
  const order = getOrder(orderId);
  if (!order) fail("Order not found.");
  const allowed = ORDER_FLOW[order.status] || [];
  if (!allowed.includes(nextStatus))
    fail(`Cannot move order from ${statusLabel(order.status)} to ${statusLabel(nextStatus)}.`);

  commit((s) => ({
    ...s,
    orders: s.orders.map((o) =>
      o.id === order.id
        ? {
            ...o,
            status: nextStatus,
            updatedAt: Date.now(),
            statusLog: [...o.statusLog, logEntry(nextStatus)],
          }
        : o
    ),
  }));
  return getOrder(orderId);
}

/* ================================================================== */
/* Billing                                                             */
/* ================================================================== */

/** Live bill for a table = its unsettled (unpaid, non-cancelled) orders. */
export function getTableBill(tableId) {
  const s = getState();
  const table = s.tables.find((t) => t.id === tableId);
  if (!table) return null;

  const orders = s.orders
    .filter(
      (o) =>
        o.tableId === tableId &&
        o.status !== "cancelled" &&
        o.paymentStatus !== "paid"
    )
    .sort((a, b) => a.createdAt - b.createdAt);

  const subtotal = orders.reduce((sum, o) => sum + o.subtotal, 0);
  const tax = Math.round((subtotal * (s.settings.taxRate || 0)) / 100);
  const hasOrders = orders.length > 0;
  const paymentStatus = !hasOrders
    ? "Paid"
    : orders.some((o) => o.paymentStatus === "failed")
    ? "Failed"
    : "Pending";

  return {
    table,
    orders,
    subtotal,
    tax,
    total: subtotal + tax,
    paymentStatus,
    taxRate: s.settings.taxRate || 0,
  };
}

export function listBillableTables() {
  const s = getState();
  return s.tables
    .map((t) => getTableBill(t.id))
    .filter((b) => b && b.orders.length > 0);
}

export function markBillFailed(tableId) {
  const bill = getTableBill(tableId);
  if (!bill || !bill.orders.length) fail("No active bill for this table.");
  const ids = new Set(bill.orders.map((o) => o.id));
  commit((s) => ({
    ...s,
    orders: s.orders.map((o) =>
      ids.has(o.id) ? { ...o, paymentStatus: "failed" } : o
    ),
  }));
}

export function markBillPaid(tableId, method = "Cash") {
  const bill = getTableBill(tableId);
  if (!bill || !bill.orders.length) fail("No active bill for this table.");
  const ids = new Set(bill.orders.map((o) => o.id));
  const now = Date.now();
  commit((s) => ({
    ...s,
    orders: s.orders.map((o) =>
      ids.has(o.id)
        ? { ...o, paymentStatus: "paid", paymentMethod: method, paidAt: now }
        : o
    ),
    tables: s.tables.map((t) =>
      t.id === tableId ? { ...t, claimed: false } : t
    ),
  }));
  return { ...bill, paymentStatus: "Paid", method };
}

/* ================================================================== */
/* Dashboard                                                           */
/* ================================================================== */

function itemSalesFor(orderList) {
  const map = new Map();
  for (const o of orderList) {
    for (const li of o.items) {
      const cur = map.get(li.itemId) || { itemId: li.itemId, name: li.name, qty: 0, revenue: 0 };
      cur.qty += li.qty;
      cur.revenue += li.qty * li.price;
      map.set(li.itemId, cur);
    }
  }
  return [...map.values()];
}

export function getDashboardStats() {
  const s = getState();
  const todayStart = startOfDay();
  const now = Date.now();
  const todays = s.orders.filter((o) => o.createdAt >= todayStart && o.status !== "cancelled");
  const yesterdays = s.orders.filter(
    (o) => o.createdAt >= todayStart - 86400000 && o.createdAt < todayStart && o.status !== "cancelled"
  );
  const sum = (list) => list.reduce((acc, o) => acc + o.subtotal, 0);

  const salesToday = sum(todays);
  const salesYesterday = sum(yesterdays);

  const pendingStatuses = ["new", "accepted", "preparing", "ready"];
  const pendingOrders = s.orders.filter((o) => pendingStatuses.includes(o.status)).length;
  const pendingPayments = s.tables.filter((t) => t.status === "payment_pending").length;
  const activeTables = s.tables.filter((t) => t.status !== "available").length;

  const weekStart = todayStart - 6 * 86400000;
  const topSelling = itemSalesFor(
    s.orders.filter((o) => o.createdAt >= weekStart && o.status !== "cancelled")
  )
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return {
    salesToday,
    salesDelta: salesYesterday ? Math.round(((salesToday - salesYesterday) / salesYesterday) * 100) : 0,
    ordersToday: todays.length,
    activeTables,
    totalTables: s.tables.length,
    pendingOrders,
    pendingPayments,
    recentOrders: listOrders({ limit: 6 }),
    tables: s.tables,
    topSelling,
    now,
  };
}

/* ================================================================== */
/* Analytics                                                           */
/* ================================================================== */

export function resolveRange({ range = "today", from = null, to = null }) {
  const todayStart = startOfDay();
  switch (range) {
    case "yesterday":
      return { start: todayStart - 86400000, end: endOfDay(todayStart - 86400000), label: "Yesterday" };
    case "7d":
      return { start: todayStart - 6 * 86400000, end: Date.now(), label: "Last 7 Days" };
    case "30d":
      return { start: todayStart - 29 * 86400000, end: Date.now(), label: "Last 30 Days" };
    case "custom": {
      const start = from ? new Date(from + "T00:00:00").getTime() : todayStart - 6 * 86400000;
      const end = to ? new Date(to + "T23:59:59").getTime() : Date.now();
      return { start: Math.min(start, end), end: Math.max(start, end), label: "Custom range" };
    }
    case "today":
    default:
      return { start: todayStart, end: Date.now(), label: "Today" };
  }
}

export function getAnalytics(filters = {}) {
  const s = getState();
  const { start, end, label } = resolveRange(filters);
  const now = Date.now();
  const todayStart = startOfDay();

  const inRange = s.orders.filter(
    (o) => o.createdAt >= start && o.createdAt <= end && o.status !== "cancelled"
  );
  const sum = (list) => list.reduce((acc, o) => acc + o.subtotal, 0);

  const sales = sum(inRange);
  const ordersCount = inRange.length;
  const avgOrderValue = ordersCount ? Math.round(sales / ordersCount) : 0;

  // KPI strip — always today / week / month (spec §21)
  const kpis = {
    today: sum(s.orders.filter((o) => o.createdAt >= todayStart && o.status !== "cancelled")),
    week: sum(s.orders.filter((o) => o.createdAt >= todayStart - 6 * 86400000 && o.status !== "cancelled")),
    month: sum(s.orders.filter((o) => o.createdAt >= todayStart - 29 * 86400000 && o.status !== "cancelled")),
  };

  // Trend buckets: hourly for single-day ranges, daily otherwise
  const singleDay = end - start <= 86400000;
  const trend = [];
  if (singleDay) {
    for (let h = 0; h < 24; h++) {
      const bucketStart = start + h * 3600000;
      if (bucketStart > end) break;
      trend.push({
        label: `${((h + 11) % 12) + 1}${h < 12 ? "a" : "p"}`,
        value: sum(inRange.filter((o) => o.createdAt >= bucketStart && o.createdAt < bucketStart + 3600000)),
      });
    }
  } else {
    for (let t = startOfDay(start); t <= end; t += 86400000) {
      trend.push({
        label: new Date(t).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        value: sum(inRange.filter((o) => o.createdAt >= t && o.createdAt < t + 86400000)),
      });
    }
  }

  const salesByItem = itemSalesFor(inRange);
  const topSelling = [...salesByItem].sort((a, b) => b.qty - a.qty).slice(0, 8);
  const lowSelling = s.items
    .map((it) => {
      const hit = salesByItem.find((x) => x.itemId === it.id);
      return { itemId: it.id, name: it.name, qty: hit ? hit.qty : 0, revenue: hit ? hit.revenue : 0 };
    })
    .sort((a, b) => a.qty - b.qty || a.name.localeCompare(b.name))
    .slice(0, 6);

  const catMap = new Map();
  for (const it of salesByItem) {
    const item = s.items.find((x) => x.id === it.itemId);
    const cat = s.categories.find((c) => c.id === item?.categoryId);
    const key = cat ? cat.name : "Other";
    catMap.set(key, (catMap.get(key) || 0) + it.revenue);
  }
  const categorySales = [...catMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return { label, start, end, sales, ordersCount, avgOrderValue, kpis, trend, topSelling, lowSelling, categorySales };
}

/* ================================================================== */
/* Settings                                                            */
/* ================================================================== */

export function getSettings() {
  return getState().settings;
}

export function saveSettings(patch) {
  const taxRate = patch.taxRate !== undefined ? Number(patch.taxRate) : undefined;
  if (taxRate !== undefined && (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100))
    fail("Tax must be between 0 and 100.");
  const clean = {
    ...(patch.cafeName !== undefined ? { cafeName: String(patch.cafeName).trim() || "Your Restaurant" } : {}),
    ...(taxRate !== undefined ? { taxRate } : {}),
    ...(patch.openingHours !== undefined ? { openingHours: String(patch.openingHours).trim() } : {}),
  };
  setState((s) => ({ ...s, settings: { ...s.settings, ...clean } }));
  return getState().settings;
}

export function resetAllData() {
  resetDemoData();
}
