import "dotenv/config";
import express from "express";
import { pool } from "./db.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required by the YourBite API server.");
  process.exit(1);
}

const app = express();
const port = Number(process.env.API_PORT) || 3001;
const allowedOrigins = new Set(
  (process.env.FRONTEND_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  const origin = req.get("origin");
  let localDevelopmentOrigin = false;
  if (origin && process.env.NODE_ENV !== "production") {
    try {
      localDevelopmentOrigin = ["localhost", "127.0.0.1"].includes(new URL(origin).hostname);
    } catch {
      localDevelopmentOrigin = false;
    }
  }
  if (origin && !allowedOrigins.has(origin) && !localDevelopmentOrigin) {
    return res.status(403).json({ error: "Origin is not allowed." });
  }
  next();
});

const toMillis = (value) => (value ? new Date(value).getTime() : null);
const toDate = (value) => (value === null || value === undefined ? null : new Date(Number(value)));

async function loadSnapshot(client) {
  const settingsResult = await client.query("select cafe_name, tax_rate, opening_hours from public.restaurant_settings where singleton = true");
  const categoriesResult = await client.query("select id, name, sort_order from public.menu_categories order by sort_order, name");
  const tablesResult = await client.query("select id, number, seats, active, claimed, created_at from public.dining_tables order by number");
  const itemsResult = await client.query(`select id, name, description, category_id, price, emoji, image, veg, available, bestseller, created_at
      from public.menu_items order by created_at, name`);
  const ordersResult = await client.query(`select id, table_id, table_number, note, subtotal, status, payment_status,
      payment_method, created_at, updated_at, paid_at from public.orders order by created_at`);
  const linesResult = await client.query(`select order_id, line_number, item_id, name, price, qty, veg
      from public.order_items order by order_id, line_number`);
  const eventsResult = await client.query(`select order_id, sequence, status, label, created_at
        from public.order_status_events order by order_id, sequence`);

  const linesByOrder = new Map();
  for (const line of linesResult.rows) {
    const lines = linesByOrder.get(Number(line.order_id)) || [];
    lines.push({
      itemId: line.item_id,
      name: line.name,
      price: Number(line.price),
      qty: Number(line.qty),
      veg: line.veg,
    });
    linesByOrder.set(Number(line.order_id), lines);
  }

  const eventsByOrder = new Map();
  for (const event of eventsResult.rows) {
    const events = eventsByOrder.get(Number(event.order_id)) || [];
    events.push({ status: event.status, label: event.label, at: toMillis(event.created_at) });
    eventsByOrder.set(Number(event.order_id), events);
  }

  const orders = ordersResult.rows.map((order) => ({
    id: Number(order.id),
    tableId: order.table_id,
    tableNumber: order.table_number,
    items: linesByOrder.get(Number(order.id)) || [],
    note: order.note,
    subtotal: Number(order.subtotal),
    status: order.status,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    createdAt: toMillis(order.created_at),
    updatedAt: toMillis(order.updated_at),
    paidAt: toMillis(order.paid_at),
    statusLog: eventsByOrder.get(Number(order.id)) || [],
  }));

  const nextOrderId = orders.reduce((max, order) => Math.max(max, order.id), 0) + 1;
  const row = settingsResult.rows[0];
  return {
    version: 1,
    seededAt: null,
    settings: {
      cafeName: row?.cafe_name || "Your Restaurant",
      taxRate: Number(row?.tax_rate || 0),
      openingHours: row?.opening_hours || "",
    },
    categories: categoriesResult.rows.map((category) => ({
      id: category.id,
      name: category.name,
      order: Number(category.sort_order),
    })),
    tables: tablesResult.rows.map((table) => ({
      id: table.id,
      number: table.number,
      seats: Number(table.seats),
      active: table.active,
      claimed: table.claimed,
      createdAt: toMillis(table.created_at),
    })),
    items: itemsResult.rows.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      categoryId: item.category_id,
      price: Number(item.price),
      emoji: item.emoji,
      image: item.image,
      veg: item.veg,
      available: item.available,
      bestseller: item.bestseller,
      createdAt: toMillis(item.created_at),
    })),
    orders,
    nextOrderId,
  };
}

async function persistChanges(changes) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (changes.settings) {
      await client.query(`insert into public.restaurant_settings (singleton, cafe_name, tax_rate, opening_hours)
        values (true, $1, $2, $3)
        on conflict (singleton) do update set cafe_name = excluded.cafe_name,
          tax_rate = excluded.tax_rate, opening_hours = excluded.opening_hours`, [
        changes.settings.cafeName || "Your Restaurant",
        Number(changes.settings.taxRate) || 0,
        changes.settings.openingHours || "",
      ]);
    }

    for (const category of changes.categories?.upsert || []) {
      await client.query(`insert into public.menu_categories (id, name, sort_order) values ($1, $2, $3)
        on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order`, [
        category.id, category.name, Number(category.order) || 0,
      ]);
    }
    for (const table of changes.tables?.upsert || []) {
      await client.query(`insert into public.dining_tables (id, number, seats, active, claimed, created_at)
        values ($1, $2, $3, $4, $5, coalesce($6, now()))
        on conflict (id) do update set number = excluded.number, seats = excluded.seats,
          active = excluded.active, claimed = excluded.claimed`, [
        table.id, table.number, Number(table.seats) || 4, table.active !== false,
        Boolean(table.claimed), toDate(table.createdAt),
      ]);
    }
    for (const item of changes.items?.upsert || []) {
      await client.query(`insert into public.menu_items
        (id, name, description, category_id, price, emoji, image, veg, available, bestseller, created_at)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, coalesce($11, now()))
        on conflict (id) do update set name = excluded.name, description = excluded.description,
          category_id = excluded.category_id, price = excluded.price, emoji = excluded.emoji,
          image = excluded.image, veg = excluded.veg, available = excluded.available,
          bestseller = excluded.bestseller`, [
        item.id, item.name, item.description || "", item.categoryId, Number(item.price), item.emoji || "",
        item.image || "", Boolean(item.veg), Boolean(item.available), Boolean(item.bestseller), toDate(item.createdAt),
      ]);
    }
    for (const order of changes.orders?.upsert || []) {
      await client.query(`insert into public.orders
        (id, table_id, table_number, note, subtotal, status, payment_status, payment_method, created_at, updated_at, paid_at)
        values ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9, now()), coalesce($10, now()), $11)
        on conflict (id) do update set table_id = excluded.table_id, table_number = excluded.table_number,
          note = excluded.note, subtotal = excluded.subtotal, status = excluded.status,
          payment_status = excluded.payment_status, payment_method = excluded.payment_method,
          updated_at = excluded.updated_at, paid_at = excluded.paid_at`, [
        order.id, order.tableId || null, order.tableNumber, order.note || "", Number(order.subtotal) || 0,
        order.status, order.paymentStatus || "pending", order.paymentMethod || null,
        toDate(order.createdAt), toDate(order.updatedAt), toDate(order.paidAt),
      ]);

      await client.query("delete from public.order_items where order_id = $1", [order.id]);
      for (const [index, line] of (order.items || []).entries()) {
        await client.query(`insert into public.order_items
          (order_id, line_number, item_id, name, price, qty, veg)
          values ($1, $2, case when exists (select 1 from public.menu_items where id = $3) then $3 else null end, $4, $5, $6, $7)`, [
          order.id, index + 1, line.itemId || null, line.name, Number(line.price), Number(line.qty), Boolean(line.veg),
        ]);
      }

      await client.query("delete from public.order_status_events where order_id = $1", [order.id]);
      for (const [index, event] of (order.statusLog || []).entries()) {
        await client.query(`insert into public.order_status_events
          (order_id, sequence, status, label, created_at) values ($1, $2, $3, $4, $5)`, [
          order.id, index + 1, event.status, event.label || event.status, toDate(event.at),
        ]);
      }

      await client.query(`insert into public.payments (order_id, amount, method, status, created_at, confirmed_at)
        values ($1, $2, $3, $4, coalesce($5, now()), $6)
        on conflict (order_id) do update set amount = excluded.amount, method = excluded.method,
          status = excluded.status, confirmed_at = excluded.confirmed_at`, [
        order.id, Number(order.subtotal) || 0, order.paymentMethod || null,
        order.paymentStatus || "pending", toDate(order.createdAt), toDate(order.paidAt),
      ]);
    }

    for (const id of changes.orders?.delete || []) await client.query("delete from public.orders where id = $1", [id]);
    for (const id of changes.items?.delete || []) await client.query("delete from public.menu_items where id = $1", [id]);
    for (const id of changes.tables?.delete || []) await client.query("delete from public.dining_tables where id = $1", [id]);
    for (const id of changes.categories?.delete || []) await client.query("delete from public.menu_categories where id = $1", [id]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

app.get("/api/health", async (_req, res) => {
  try {
    const result = await pool.query("select current_database() as database");
    res.json({ ok: true, database: result.rows[0].database });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.get("/api/bootstrap", async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query("begin isolation level repeatable read read only");
    const snapshot = await loadSnapshot(client);
    await client.query("commit");
    res.json(snapshot);
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.error("Database bootstrap failed:", error.message);
    res.status(500).json({ error: "Could not load restaurant data." });
  } finally {
    client.release();
  }
});

app.post("/api/changes", async (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Invalid change set." });
  }
  try {
    await persistChanges(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error("Database change failed:", error.message);
    res.status(400).json({ error: error.message });
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`YourBite API listening on http://127.0.0.1:${port}`);
});