import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Icon from "../common/Icon.jsx";
import { useStore } from "../../services/store.js";
import { fmtDate, fmtTime, inr } from "../../utils/format.js";
import { STATUS_LABELS } from "../../services/api.js";
import { logout, getStoredUser } from "../../services/auth.js";

const PAGE_TITLES = [
  { match: "/admin/tables", title: "Tables", sub: "Manage tables and generate QR codes" },
  { match: "/admin/menu", title: "Menu", sub: "One central menu for every table" },
  { match: "/admin/orders", title: "Orders", sub: "Live order pipeline" },
  { match: "/admin/history", title: "Order History", sub: "Search and filter past orders" },
  { match: "/admin/billing", title: "Billing", sub: "Table bills and payment status" },
  { match: "/admin/kitchen", title: "Kitchen / KOT", sub: "Kitchen display system" },
  { match: "/admin/analytics", title: "Analytics", sub: "Sales, trends and product performance" },
  { match: "/admin/settings", title: "Settings", sub: "Restaurant profile and preferences" },
  { match: "/admin", title: "Dashboard", sub: "Today at a glance" },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function useClickOutside(onOut) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onOut();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOut]);
  return ref;
}

/* ------------------------------------------------------------------ */
/* Global search: orders, menu items, tables                           */
/* ------------------------------------------------------------------ */
function GlobalSearch() {
  const state = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useClickOutside(() => setOpen(false));
  const inputRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return null;

    const orders = state.orders
      .filter(
        (o) =>
          String(o.id).includes(query.replace("#", "")) ||
          String(o.tableNumber).toLowerCase() === query
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 4)
      .map((o) => ({
        key: `o-${o.id}`,
        icon: "orders",
        title: `Order #${o.id} · Table ${o.tableNumber}`,
        sub: `${STATUS_LABELS[o.status] || o.status} · ${inr(o.subtotal)}`,
        to: "/admin/orders",
      }));

    const items = state.items
      .filter((i) => i.name.toLowerCase().includes(query))
      .slice(0, 4)
      .map((i) => ({
        key: `i-${i.id}`,
        icon: "menu",
        title: i.name,
        sub: `${inr(i.price)}${i.available ? "" : " · unavailable"}`,
        to: "/admin/menu",
      }));

    const tables = state.tables
      .filter((t) => String(t.number).toLowerCase().includes(query))
      .slice(0, 3)
      .map((t) => ({
        key: `t-${t.id}`,
        icon: "table",
        title: `Table ${t.number}`,
        sub: `${t.seats} seats`,
        to: "/admin/tables",
      }));

    const total = orders.length + items.length + tables.length;
    return { orders, items, tables, total };
  }, [q, state.orders, state.items, state.tables]);

  function go(to) {
    setOpen(false);
    setQ("");
    navigate(to);
  }

  return (
    <div className="topbar-search" ref={wrapRef}>
      <Icon name="search" size={16} />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search orders, menu items, tables…"
        aria-label="Global search"
      />
      <span className="topbar-search-kbd">Ctrl K</span>

      {open && results ? (
        <div className="search-pop">
          {results.total === 0 ? (
            <div className="search-pop-empty">No matches for “{q}”</div>
          ) : (
            <>
              {results.orders.length ? (
                <>
                  <div className="search-pop-head">Orders</div>
                  {results.orders.map((r) => (
                    <button key={r.key} className="search-pop-item" onClick={() => go(r.to)}>
                      <Icon name={r.icon} size={15} />
                      <span className="sp-strong">{r.title}</span>
                      <span className="sp-sub">{r.sub}</span>
                    </button>
                  ))}
                </>
              ) : null}
              {results.items.length ? (
                <>
                  <div className="search-pop-head">Menu items</div>
                  {results.items.map((r) => (
                    <button key={r.key} className="search-pop-item" onClick={() => go(r.to)}>
                      <Icon name={r.icon} size={15} />
                      <span className="sp-strong">{r.title}</span>
                      <span className="sp-sub">{r.sub}</span>
                    </button>
                  ))}
                </>
              ) : null}
              {results.tables.length ? (
                <>
                  <div className="search-pop-head">Tables</div>
                  {results.tables.map((r) => (
                    <button key={r.key} className="search-pop-item" onClick={() => go(r.to)}>
                      <Icon name={r.icon} size={15} />
                      <span className="sp-strong">{r.title}</span>
                      <span className="sp-sub">{r.sub}</span>
                    </button>
                  ))}
                </>
              ) : null}
            </>
          )}
          <div className="search-pop-foot">
            {results.total} result{results.total === 1 ? "" : "s"} — Enter a page from the sidebar to browse everything
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notification bell: live operational alerts                          */
/* ------------------------------------------------------------------ */
function AlertsBell() {
  const state = useStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useClickOutside(() => setOpen(false));

  const alerts = useMemo(() => {
    const list = [];
    const now = Date.now();

    for (const o of state.orders) {
      if (o.status === "new") {
        const mins = Math.floor((now - o.createdAt) / 60000);
        list.push({
          key: `new-${o.id}`,
          tone: "warn",
          icon: "orders",
          title: `Order #${o.id} needs acceptance`,
          sub: `Table ${o.tableNumber} · waiting ${mins}m`,
          to: "/admin/orders",
        });
      } else if (o.status === "ready") {
        list.push({
          key: `ready-${o.id}`,
          tone: "info",
          icon: "kitchen",
          title: `Order #${o.id} is ready to serve`,
          sub: `Table ${o.tableNumber}`,
          to: "/admin/kitchen",
        });
      }
    }

    for (const t of state.tables) {
      if (t.status === "payment_pending") {
        list.push({
          key: `pay-${t.id}`,
          tone: "good",
          icon: "billing",
          title: `Table ${t.number} — payment pending`,
          sub: "Settle the bill to free the table",
          to: "/admin/billing",
        });
      }
    }

    return list
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 8);
  }, [state.orders, state.tables]);

  const toneClass = { warn: "warn", info: "info", good: "good" };

  return (
    <div className="bell-wrap" ref={wrapRef}>
      <button
        className="icon-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications (${alerts.length})`}
      >
        <Icon name="alert" size={17} />
        {alerts.length ? <span className="bell-dot" /> : null}
      </button>

      {open ? (
        <div className="alert-pop">
          <div className="alert-pop-head">
            Notifications <small>{alerts.length} active</small>
          </div>
          {alerts.length === 0 ? (
            <div className="alert-empty">All clear — nothing needs your attention 🎉</div>
          ) : (
            <ul className="alert-list">
              {alerts.map((a) => (
                <li key={a.key}>
                  <button
                    className="alert-item"
                    onClick={() => {
                      setOpen(false);
                      navigate(a.to);
                    }}
                  >
                    <span className={`alert-icon ${toneClass[a.tone]}`}>
                      <Icon name={a.icon} size={15} />
                    </span>
                    <span>
                      <strong>{a.title}</strong>
                      <small>{a.sub}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* Avatar menu                                                         */
/* ------------------------------------------------------------------ */
function AvatarMenu({ cafeName }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useClickOutside(() => setOpen(false));
  const user = getStoredUser();
  const ownerEmail = user?.email || "owner@yourbite.com";

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="avatar-wrap" ref={wrapRef}>
      <button className="avatar-trigger" onClick={() => setOpen((v) => !v)} aria-label="Owner console menu">
        <span className="avatar"><Icon name="users" size={16} /></span>
        <span className="avatar-details">
          <strong>Owner</strong>
          <small>{ownerEmail.length > 18 ? ownerEmail.slice(0, 15) + "..." : ownerEmail}</small>
        </span>
      </button>
      {open ? (
        <div className="avatar-pop">
          <div className="avatar-pop-head">
            <strong>{cafeName}</strong>
            <small>{ownerEmail}</small>
          </div>
          <div className="avatar-pop-body">
            <Link className="avatar-pop-item" to="/admin/settings" onClick={() => setOpen(false)}>
              <Icon name="settings" size={15} /> Settings & Security
            </Link>
            <a
              className="avatar-pop-item outside"
              href="/menu"
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
            >
              <Icon name="external" size={15} /> Customer menu
            </a>
            <button className="avatar-pop-item logout-btn" onClick={handleLogout}>
              <Icon name="alert" size={15} /> Sign Out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */
export default function AdminLayout() {
  const location = useLocation();
  const state = useStore();
  const [open, setOpen] = useState(false);
  const businessName = state.settings.cafeName || "Your Restaurant";

  useEffect(() => setOpen(false), [location.pathname]);

  const page =
    PAGE_TITLES.find((p) => (p.end === false ? location.pathname.startsWith(p.match) : location.pathname === p.match)) ||
    PAGE_TITLES[0];

  const isDashboard = location.pathname === "/admin";

  return (
    <div className="admin-shell">
      <aside className={`sidebar${open ? " open" : ""}`}>
        <Sidebar cafeName={businessName} onNavigate={() => setOpen(false)} />
      </aside>
      {open ? <div className="sidebar-backdrop" onClick={() => setOpen(false)} /> : null}

      <div className="admin-main">
        <header className="topbar">
          <button className="icon-btn hamburger" onClick={() => setOpen((v) => !v)} aria-label="Toggle navigation">
            <Icon name="hamburger" />
          </button>
          {!isDashboard ? (
            <div className="topbar-title">
              <h1>{page.title}</h1>
              <p>{page.sub}</p>
            </div>
          ) : null}
          <GlobalSearch />
          <div className="topbar-right">
            <span className="topbar-date">{fmtDate(Date.now())}<small>{fmtTime(Date.now())}</small></span>
            <AlertsBell />
            <AvatarMenu cafeName={businessName} />
          </div>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
