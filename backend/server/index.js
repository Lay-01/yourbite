import crypto from "node:crypto";
import "dotenv/config";
import express from "express";
import { pool } from "./db.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required by the YourBite API server.");
  process.exit(1);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return { hash, salt };
}

function verifyPassword(password, storedHash, storedSalt) {
  try {
    const { hash } = hashPassword(password, storedSalt);
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
  } catch {
    return false;
  }
}

let testUsersProvisioned = false;

async function ensureAuthSchema(client) {
  await client.query(`
    create table if not exists public.owner_users (
      id text primary key,
      tenant_id text,
      email text not null unique,
      password_hash text not null,
      password_salt text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create table if not exists public.owner_sessions (
      token text primary key,
      user_id text not null references public.owner_users(id) on delete cascade,
      created_at timestamptz not null default now(),
      expires_at timestamptz not null
    );

    alter table public.owner_users add column if not exists tenant_id text;
    alter table public.restaurant_settings add column if not exists tenant_id text;
    alter table public.menu_categories add column if not exists tenant_id text;
    alter table public.dining_tables add column if not exists tenant_id text;
    alter table public.menu_items add column if not exists tenant_id text;
    alter table public.orders add column if not exists tenant_id text;
  `);

  try {
    await client.query(`
      alter table public.restaurant_settings drop constraint if exists restaurant_settings_pkey;
      alter table public.restaurant_settings add primary key (tenant_id);
    `);
  } catch {
    /* ignore if primary key already exists */
  }

  try {
    await client.query("alter table public.menu_categories drop constraint if exists menu_categories_name_key;");
  } catch {
    /* ignore */
  }

  if (!testUsersProvisioned) {
    const ownersToSeed = [
      { id: "usr_owner_1", email: "laymankad02@gmail.com", pass: process.env.TEST_USER_1_PASSWORD },
      { id: "usr_owner_2", email: "the.social.dev12@gmail.com", pass: process.env.TEST_USER_2_PASSWORD },
      { id: "usr_owner_3", email: "laypower123456789@gmail.com", pass: process.env.TEST_USER_3_PASSWORD },
    ];

    for (const owner of ownersToSeed) {
      if (!owner.pass) continue;
      const { hash, salt } = hashPassword(owner.pass);
      await client.query(
        `insert into public.owner_users (id, tenant_id, email, password_hash, password_salt)
         values ($1, $2, $3, $4, $5)
         on conflict (email) do update set tenant_id = coalesce(owner_users.tenant_id, excluded.tenant_id),
           password_hash = excluded.password_hash, password_salt = excluded.password_salt`,
        [owner.id, `tenant_${owner.id}`, owner.email.toLowerCase(), hash, salt]
      );
    }
    testUsersProvisioned = true;
  }
}

async function ensureUserTenant(client, userId) {
  const result = await client.query(
    `update public.owner_users
     set tenant_id = case
       when tenant_id is null or tenant_id = '' or tenant_id like 'tenant_owner_%'
       then 'tenant_' || id
       else tenant_id
     end
     where id = $1
     returning id, email, tenant_id`,
    [userId]
  );
  return result.rows[0] || null;
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

async function ensureTenantSeeded(client, tenantId) {
  const cafeName = "Your Restaurant";
  await client.query(`
    insert into public.restaurant_settings (tenant_id, cafe_name, tax_rate, opening_hours)
    values ($1, $2, 5, '9:00 AM – 11:00 PM')
    on conflict (tenant_id) do nothing;
  `, [tenantId, cafeName]);

  const catCheck = await client.query("select 1 from public.menu_categories where tenant_id = $1 limit 1", [tenantId]);
  if (catCheck.rowCount === 0) {
    const catBev = `cat-bev-${tenantId}`;
    const catFood = `cat-food-${tenantId}`;

    await client.query(`
      insert into public.menu_categories (id, tenant_id, name, sort_order)
      values ($1, $2, 'Beverages', 1), ($3, $2, 'Food', 2)
      on conflict do nothing;
    `, [catBev, tenantId, catFood]);

    await client.query(`
      insert into public.menu_items (id, tenant_id, name, description, category_id, price, emoji, veg, available, bestseller)
      values
        ($1, $2, 'Cold Coffee', 'Rich espresso blended with chilled milk & ice cream', $3, 120, '☕', true, true, true),
        ($4, $2, 'Cappuccino', 'Fresh espresso topped with steamed milk foam', $3, 150, '☕', true, true, false),
        ($5, $2, 'Paneer Pizza', 'Crispy crust topped with spiced cottage cheese & mozzarella', $6, 280, '🍕', true, true, true),
        ($7, $2, 'French Fries', 'Golden crispy salted potato fries with dip', $6, 160, '🍟', true, true, false)
      on conflict do nothing;
    `, [
      `i-cc-${tenantId}`, tenantId, catBev,
      `i-cap-${tenantId}`,
      `i-pp-${tenantId}`, catFood,
      `i-ff-${tenantId}`
    ]);
  }

  const tblCheck = await client.query("select 1 from public.dining_tables where tenant_id = $1 limit 1", [tenantId]);
  if (tblCheck.rowCount === 0) {
    await client.query(`
      insert into public.dining_tables (id, tenant_id, number, seats, active, claimed)
      values
        ($1, $2, '01', 4, true, false),
        ($3, $2, '02', 2, true, false),
        ($4, $2, '03', 4, true, false),
        ($5, $2, '04', 6, true, false)
      on conflict do nothing;
    `, [
      `t-01-${tenantId}`, tenantId,
      `t-02-${tenantId}`,
      `t-03-${tenantId}`,
      `t-04-${tenantId}`
    ]);
  }
}

function tokenFromReq(req) {
  const authHeader = req.get("authorization") || "";
  return authHeader.startsWith("Bearer ")
    ? authHeader.substring(7)
    : req.get("x-auth-token") || null;
}

async function getTenantFromReq(req, client, { allowPublic = false } = {}) {
  const token = tokenFromReq(req);
  if (token) {
    const result = await client.query(
      `select u.id, u.tenant_id from public.owner_sessions s
       join public.owner_users u on u.id = s.user_id
       where s.token = $1 and s.expires_at > now()`,
      [token]
    );
    return result.rows[0] ? { ...result.rows[0], authenticated: true } : null;
  }

  if (!allowPublic) return null;
  const tenantId = String(req.body?.tenantId || req.query.tenant || "");
  if (!tenantId) return null;
  const result = await client.query(
    "select id, tenant_id from public.owner_users where tenant_id = $1 limit 1",
    [tenantId]
  );
  return result.rows[0] ? { ...result.rows[0], authenticated: false } : null;
}

const toMillis = (value) => (value ? new Date(value).getTime() : null);
const toDate = (value) => (value === null || value === undefined ? null : new Date(Number(value)));

async function loadSnapshot(client, tenantId) {
  const settingsResult = await client.query("select cafe_name, tax_rate, opening_hours from public.restaurant_settings where tenant_id = $1", [tenantId]);
  const categoriesResult = await client.query("select id, name, sort_order from public.menu_categories where tenant_id = $1 order by sort_order, name", [tenantId]);
  const tablesResult = await client.query("select id, number, seats, active, claimed, created_at from public.dining_tables where tenant_id = $1 order by number", [tenantId]);
  const itemsResult = await client.query(`select id, name, description, category_id, price, emoji, image, veg, available, bestseller, created_at
      from public.menu_items where tenant_id = $1 order by created_at, name`, [tenantId]);
  const ordersResult = await client.query(`select id, table_id, table_number, note, subtotal, status, payment_status,
      payment_method, created_at, updated_at, paid_at from public.orders where tenant_id = $1 order by created_at`, [tenantId]);
  const linesResult = await client.query(`select order_id, line_number, item_id, name, price, qty, veg
      from public.order_items where order_id in (select id from public.orders where tenant_id = $1) order by order_id, line_number`, [tenantId]);
  const eventsResult = await client.query(`select order_id, sequence, status, label, created_at
        from public.order_status_events where order_id in (select id from public.orders where tenant_id = $1) order by order_id, sequence`, [tenantId]);

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
    tenantId,
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
    tenantId,
    seededAt: null,
    settings: {
      cafeName: row?.cafe_name || "Your Restaurant",
      taxRate: Number(row?.tax_rate || 5),
      openingHours: row?.opening_hours || "9:00 AM – 11:00 PM",
    },
    categories: categoriesResult.rows.map((category) => ({
      id: category.id,
      tenantId,
      name: category.name,
      order: Number(category.sort_order),
    })),
tables: tablesResult.rows.map((table) => ({
       id: table.id,
       tenantId: tenantId,
       number: table.number,
       seats: Number(table.seats),
       active: table.active,
       claimed: table.claimed,
       createdAt: toMillis(table.created_at),
     })),
    items: itemsResult.rows.map((item) => ({
      id: item.id,
      tenantId,
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

async function persistChanges(changes, tenantId, client) {
  await client.query("begin");
  try {
    await client.query("select set_config('app.tenant_id', $1, true)", [tenantId]);
    await ensureTenantSeeded(client, tenantId);
    if (changes.settings) {
      await client.query(`insert into public.restaurant_settings (tenant_id, cafe_name, tax_rate, opening_hours)
        values ($1, $2, $3, $4)
        on conflict (tenant_id) do update set cafe_name = excluded.cafe_name,
          tax_rate = excluded.tax_rate, opening_hours = excluded.opening_hours`, [
        tenantId,
        changes.settings.cafeName || "Your Restaurant",
        Number(changes.settings.taxRate) || 0,
        changes.settings.openingHours || "",
      ]);
    }

    for (const category of changes.categories?.upsert || []) {
      await client.query(`insert into public.menu_categories (id, tenant_id, name, sort_order) values ($1, $2, $3, $4)
        on conflict (id) do update set name = excluded.name, sort_order = excluded.sort_order, tenant_id = excluded.tenant_id`, [
        category.id, tenantId, category.name, Number(category.order) || 0,
      ]);
    }
    for (const table of changes.tables?.upsert || []) {
      await client.query(`insert into public.dining_tables (id, tenant_id, number, seats, active, claimed, created_at)
        values ($1, $2, $3, $4, $5, $6, coalesce($7, now()))
        on conflict (id) do update set number = excluded.number, seats = excluded.seats,
          active = excluded.active, claimed = excluded.claimed, tenant_id = excluded.tenant_id`, [
        table.id, tenantId, table.number, Number(table.seats) || 4, table.active !== false,
        Boolean(table.claimed), toDate(table.createdAt),
      ]);
    }
    for (const item of changes.items?.upsert || []) {
      await client.query(`insert into public.menu_items
        (id, tenant_id, name, description, category_id, price, emoji, image, veg, available, bestseller, created_at)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, coalesce($12, now()))
        on conflict (id) do update set name = excluded.name, description = excluded.description,
          category_id = excluded.category_id, price = excluded.price, emoji = excluded.emoji,
          image = excluded.image, veg = excluded.veg, available = excluded.available,
          bestseller = excluded.bestseller, tenant_id = excluded.tenant_id`, [
        item.id, tenantId, item.name, item.description || "", item.categoryId, Number(item.price), item.emoji || "",
        item.image || "", Boolean(item.veg), Boolean(item.available), Boolean(item.bestseller), toDate(item.createdAt),
      ]);
    }
    for (const order of changes.orders?.upsert || []) {
      await client.query(`insert into public.orders
        (id, tenant_id, table_id, table_number, note, subtotal, status, payment_status, payment_method, created_at, updated_at, paid_at)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, coalesce($10, now()), coalesce($11, now()), $12)
        on conflict (id) do update set table_id = excluded.table_id, table_number = excluded.table_number,
          note = excluded.note, subtotal = excluded.subtotal, status = excluded.status,
          payment_status = excluded.payment_status, payment_method = excluded.payment_method,
          updated_at = excluded.updated_at, paid_at = excluded.paid_at, tenant_id = excluded.tenant_id`, [
        order.id, tenantId, order.tableId || null, order.tableNumber, order.note || "", Number(order.subtotal) || 0,
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

    for (const id of changes.orders?.delete || []) await client.query("delete from public.orders where id = $1 and tenant_id = $2", [id, tenantId]);
    for (const id of changes.items?.delete || []) await client.query("delete from public.menu_items where id = $1 and tenant_id = $2", [id, tenantId]);
    for (const id of changes.tables?.delete || []) await client.query("delete from public.dining_tables where id = $1 and tenant_id = $2", [id, tenantId]);
    for (const id of changes.categories?.delete || []) await client.query("delete from public.menu_categories where id = $1 and tenant_id = $2", [id, tenantId]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
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

app.get("/api/bootstrap", async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureAuthSchema(client);
    const context = await getTenantFromReq(req, client, { allowPublic: true });
    if (!context) {
      return res.status(401).json({ error: "Authentication or a valid public cafe link is required." });
    }

    await client.query("begin isolation level repeatable read");
    await client.query("select set_config('app.tenant_id', $1, true)", [context.tenant_id]);
    await ensureTenantSeeded(client, context.tenant_id);
    const snapshot = await loadSnapshot(client, context.tenant_id);
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

app.post("/api/public/orders", async (req, res) => {
  const client = await pool.connect();
  try {
    await ensureAuthSchema(client);
    const context = await getTenantFromReq(req, client, { allowPublic: true });
    if (!context) {
      return res.status(400).json({ error: "A valid cafe link is required to place an order." });
    }

    const tableNumber = String(req.body?.tableNumber || "").trim();
    const items = req.body?.items;
    const note = String(req.body?.note || "").trim();
    if (!tableNumber || !Array.isArray(items) || items.length === 0 || items.length > 30) {
      return res.status(400).json({ error: "A table and at least one menu item are required." });
    }
    if (note.length > 500) {
      return res.status(400).json({ error: "Order notes cannot exceed 500 characters." });
    }

    const requestedItems = items.map((item) => ({
      itemId: String(item?.itemId || ""),
      qty: Number(item?.qty),
    }));
    if (requestedItems.some((item) => !item.itemId || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99)
      || new Set(requestedItems.map((item) => item.itemId)).size !== requestedItems.length) {
      return res.status(400).json({ error: "The order contains invalid menu items or quantities." });
    }

    await client.query("begin");
    await client.query("select set_config('app.tenant_id', $1, true)", [context.tenant_id]);
    const tableResult = await client.query(
      "select id, number from public.dining_tables where tenant_id = $1 and number = $2 and active = true",
      [context.tenant_id, tableNumber]
    );
    const table = tableResult.rows[0];
    if (!table) {
      await client.query("rollback");
      return res.status(404).json({ error: "Table not found." });
    }

    const itemIds = requestedItems.map((item) => item.itemId);
    const menuResult = await client.query(
      `select id, name, price, veg from public.menu_items
       where tenant_id = $1 and id = any($2::text[]) and available = true`,
      [context.tenant_id, itemIds]
    );
    if (menuResult.rowCount !== itemIds.length) {
      await client.query("rollback");
      return res.status(400).json({ error: "One or more menu items are unavailable." });
    }

    const menuById = new Map(menuResult.rows.map((item) => [item.id, item]));
    const lines = requestedItems.map(({ itemId, qty }) => {
      const item = menuById.get(itemId);
      return {
        itemId: item.id,
        name: item.name,
        price: Number(item.price),
        qty,
        veg: item.veg,
      };
    });
    const subtotal = lines.reduce((sum, item) => sum + item.price * item.qty, 0);
    const now = new Date();
    const orderResult = await client.query(
      `insert into public.orders
       (tenant_id, table_id, table_number, note, subtotal, status, payment_status, created_at, updated_at)
       values ($1, $2, $3, $4, $5, 'new', 'pending', $6, $6)
       returning id`,
      [context.tenant_id, table.id, table.number, note, subtotal, now]
    );
    const orderId = Number(orderResult.rows[0].id);

    for (const [index, line] of lines.entries()) {
      await client.query(
        `insert into public.order_items (order_id, line_number, item_id, name, price, qty, veg)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, index + 1, line.itemId, line.name, line.price, line.qty, line.veg]
      );
    }
    await client.query(
      `insert into public.order_status_events (order_id, sequence, status, label, created_at)
       values ($1, 1, 'new', 'New', $2)`,
      [orderId, now]
    );
    await client.query(
      `insert into public.payments (order_id, amount, status, created_at)
       values ($1, $2, 'pending', $3)`,
      [orderId, subtotal, now]
    );
    await client.query(
      "update public.dining_tables set claimed = true where id = $1 and tenant_id = $2",
      [table.id, context.tenant_id]
    );
    await client.query("commit");

    res.status(201).json({
      ok: true,
      order: {
        id: orderId,
        tenantId: context.tenant_id,
        tableId: table.id,
        tableNumber: table.number,
        items: lines,
        note,
        subtotal,
        status: "new",
        paymentStatus: "pending",
        paymentMethod: null,
        createdAt: now.getTime(),
        updatedAt: now.getTime(),
        paidAt: null,
        statusLog: [{ status: "new", label: "New", at: now.getTime() }],
      },
    });
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.error("Public order failed:", error.message);
    res.status(500).json({ error: "Could not place this order." });
  } finally {
    client.release();
  }
});

app.post("/api/changes", async (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Invalid change set." });
  }
  const client = await pool.connect();
  try {
    await ensureAuthSchema(client);
    const context = await getTenantFromReq(req, client);
    if (!context?.authenticated) {
      return res.status(401).json({ error: "Authentication is required." });
    }
    await persistChanges(req.body, context.tenant_id, client);
    res.json({ ok: true, tenantId: context.tenant_id });
  } catch (error) {
    console.error("Database change failed:", error.message);
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

/* ================================================================== */
/* Authentication Endpoints                                            */
/* ================================================================== */

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const client = await pool.connect();
  try {
    await ensureAuthSchema(client);
    const userResult = await client.query(
      "select id, tenant_id, email, password_hash, password_salt from public.owner_users where lower(email) = $1",
      [cleanEmail]
    );

    const storedUser = userResult.rows[0];
    if (!storedUser || !verifyPassword(password, storedUser.password_hash, storedUser.password_salt)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const user = await ensureUserTenant(client, storedUser.id);

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await client.query(
      "insert into public.owner_sessions (token, user_id, expires_at) values ($1, $2, $3)",
      [token, user.id, expiresAt]
    );

    res.json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, tenantId: user.tenant_id },
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    res.status(500).json({ error: "Login failed due to a server error." });
  } finally {
    client.release();
  }
});

app.get("/api/auth/me", async (req, res) => {
  const authHeader = req.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : req.get("x-auth-token");
  if (!token) {
    return res.status(401).json({ error: "No token provided." });
  }

  const client = await pool.connect();
  try {
    await ensureAuthSchema(client);
    const sessionResult = await client.query(
      `select s.token, u.id, u.email, u.tenant_id
       from public.owner_sessions s
       join public.owner_users u on u.id = s.user_id
       where s.token = $1 and s.expires_at > now()`,
      [token]
    );

    const session = sessionResult.rows[0];
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session token." });
    }

    const user = await ensureUserTenant(client, session.id);
    res.json({ ok: true, user: { id: user.id, email: user.email, tenantId: user.tenant_id } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const authHeader = req.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : req.get("x-auth-token") || req.body?.token;

  if (token) {
    try {
      await pool.query("delete from public.owner_sessions where token = $1", [token]);
    } catch {
      /* ignore delete errors on logout */
    }
  }
  res.json({ ok: true });
});

app.post("/api/auth/change-credentials", async (req, res) => {
  const authHeader = req.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : req.get("x-auth-token");
  const { currentPassword, newEmail, newPassword } = req.body || {};

  if (!token) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  if (!currentPassword) {
    return res.status(400).json({ error: "Current password is required to save credential changes." });
  }

  const client = await pool.connect();
  try {
    await ensureAuthSchema(client);
    const sessionResult = await client.query(
      `select s.token, u.id, u.email, u.password_hash, u.password_salt
       from public.owner_sessions s
       join public.owner_users u on u.id = s.user_id
       where s.token = $1 and s.expires_at > now()`,
      [token]
    );

    const session = sessionResult.rows[0];
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session." });
    }

    if (!verifyPassword(currentPassword, session.password_hash, session.password_salt)) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (newEmail && newEmail.trim() && newEmail.trim().toLowerCase() !== session.email.toLowerCase()) {
      updates.push(`email = $${paramIndex++}`);
      values.push(newEmail.trim().toLowerCase());
    }

    if (newPassword && newPassword.trim()) {
      const { hash, salt } = hashPassword(newPassword.trim());
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(hash);
      updates.push(`password_salt = $${paramIndex++}`);
      values.push(salt);
    }

    if (updates.length === 0) {
      return res.json({ ok: true, user: { id: session.id, email: session.email }, message: "No credential changes requested." });
    }

    updates.push(`updated_at = now()`);
    values.push(session.id);
    const query = `update public.owner_users set ${updates.join(", ")} where id = $${paramIndex} returning id, email`;

    const updatedResult = await client.query(query, values);
    const updatedUser = updatedResult.rows[0];

    res.json({ ok: true, user: { id: updatedUser.id, email: updatedUser.email } });
  } catch (error) {
    console.error("Change credentials error:", error.message);
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`YourBite API listening on http://127.0.0.1:${port}`);
});