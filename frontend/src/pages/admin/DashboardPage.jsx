import { Link } from "react-router-dom";
import { useStore } from "../../services/store.js";
import { getAnalytics, getDashboardStats, STATUS_LABELS } from "../../services/api.js";
import StatCard from "../../components/dashboard/StatCard.jsx";
import Badge, { ORDER_TONES, PAYMENT_TONES, TABLE_TONES } from "../../components/common/Badge.jsx";
import Icon from "../../components/common/Icon.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import { inr, fmtTime, fmtDate } from "../../utils/format.js";

function SalesTrend({ data }) {
  const max = Math.max(...data.map((point) => point.value), 1);
  const points = data.map((point, index) => {
    const x = 18 + (index * 664) / Math.max(data.length - 1, 1);
    const y = 132 - (point.value / max) * 104;
    return `${x},${y}`;
  });

  return (
    <div className="sales-trend">
      <div className="sales-axis"><span>{inr(max)}</span><span>{inr(Math.round(max / 2))}</span><span>₹0</span></div>
      <svg viewBox="0 0 700 150" role="img" aria-label="Paid sales over the last seven days" preserveAspectRatio="none">
        {[28, 80, 132].map((y) => <line key={y} x1="18" y1={y} x2="682" y2={y} className="sales-gridline" />)}
        <polyline points={points.join(" ")} className="sales-line" />
        {points.map((point, index) => {
          const [cx, cy] = point.split(",");
          return <circle key={data[index].label} cx={cx} cy={cy} r="3.5" className="sales-point"><title>{data[index].label}: {inr(data[index].value)}</title></circle>;
        })}
      </svg>
      <div className="sales-labels">{data.map((point) => <span key={point.label}>{point.label}</span>)}</div>
    </div>
  );
}

const TABLE_LABEL = {
  available: "Available",
  occupied: "Occupied",
  payment_pending: "Payment Pending",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function DashboardPage() {
  const state = useStore();
  const stats = getDashboardStats();
  const analytics = getAnalytics({ range: "7d" });
  const deltaUp = stats.salesDelta >= 0;

  return (
    <>
      <div className="greet-row">
        <div>
          <h2>
            {greeting()}
          </h2>
          <p className="greet-sub">Here's what's happening at your restaurant today.</p>
        </div>
        <div className="dashboard-date-control"><Icon name="calendar" size={14} /><span>Today</span><b>{fmtDate(Date.now())}</b></div>
      </div>

      <div className="stat-grid four">
        <StatCard
          icon="rupee"
          label="Today's Sales"
          value={inr(stats.salesToday)}
          hint={stats.salesToday ? { text: `${deltaUp ? "▲" : "▼"} ${Math.abs(stats.salesDelta)}% vs yesterday`, up: deltaUp ? "up" : "", down: deltaUp ? "" : "down" } : { text: "No sales recorded yet" }}
          tone="good"
        />
        <StatCard icon="orders" label="Orders Today" value={stats.ordersToday} hint={{ text: "since midnight" }} />
        <StatCard
          icon="table"
          label="Active Tables"
          value={`${stats.activeTables} / ${stats.totalTables}`}
          hint={{ text: "occupied or awaiting payment" }}
          tone="violet"
        />
        <StatCard
          icon="kitchen"
          label="Pending Orders"
          value={stats.pendingOrders}
          hint={{ text: stats.pendingOrders ? "need action now" : "all caught up" }}
          tone={stats.pendingOrders ? "warn" : "good"}
        />
      </div>

      <div className="dash-grid">
        <section className="panel sales-panel">
          <div className="panel-head">
            <div className="dashboard-panel-title"><Icon name="analytics" size={17} /><span><h3>Sales Overview</h3><small>Sales · last 7 days</small></span></div>
            <Link className="link" to="/admin/analytics">View reports <Icon name="chevronRight" size={14} /></Link>
          </div>
          {analytics.ordersCount === 0 ? (
            <EmptyState icon="analytics" title="No sales data yet" subtitle="Sales analytics will appear once transactions are recorded." />
          ) : (
            <SalesTrend data={analytics.trend} />
          )}
        </section>

        <section className="panel source-panel">
          <div className="panel-head"><div className="dashboard-panel-title"><Icon name="orders" size={17} /><h3>Order Source</h3></div></div>
          <EmptyState icon="orders" title="Channel data unavailable" subtitle="Order source reporting requires channel information." />
        </section>

        <Link className="dashboard-feature" to="/admin/menu">
          <span><strong>Good Food<br />Happy Customers</strong><small>Your menu, your business.</small><em>Manage your menu <Icon name="arrowRight" size={14} /></em></span>
          <img src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85" alt="Freshly prepared restaurant dishes" />
        </Link>

        <section className="panel recent-orders-panel">
          <div className="panel-head">
            <div className="dashboard-panel-title"><Icon name="orders" size={17} /><h3>Recent Orders</h3></div>
            <Link className="link" to="/admin/orders">View all <Icon name="arrowRight" size={14} /></Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <EmptyState icon="orders" title="No orders yet" subtitle="New orders will appear here." />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Order</th><th>Time</th><th>Table</th><th>Items</th><th className="num">Amount</th><th>Status</th><th>Payment</th></tr></thead>
                <tbody>{stats.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td><strong>#{o.id}</strong></td>
                    <td className="muted">{fmtTime(o.createdAt)}</td>
                    <td><span className="table-mini">{o.tableNumber}</span></td>
                    <td>{o.items.reduce((sum, li) => sum + li.qty, 0)} items</td>
                    <td className="num">{inr(o.subtotal)}</td>
                    <td><Badge tone={ORDER_TONES[o.status]}>{STATUS_LABELS[o.status]}</Badge></td>
                    <td><Badge tone={PAYMENT_TONES[o.paymentStatus] || "warn"}>{o.paymentStatus === "pending" ? "Pending" : o.paymentStatus === "paid" ? "Paid" : "Failed"}</Badge></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>

        <div className="dashboard-side-stack">
          <section className="panel">
            <div className="panel-head">
              <h3>Active Tables</h3>
              <Link className="link" to="/admin/tables">Manage <Icon name="arrowRight" size={14} /></Link>
            </div>
            {state.tables.length ? (
              <ul className="table-status-list">
                {state.tables.slice(0, 6).map((t) => (
                  <li key={t.id}>
                    <span className="table-mini">{t.number}</span>
                    <Badge tone={TABLE_TONES[t.status]} dot>{TABLE_LABEL[t.status]}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="table" title="No tables configured" subtitle="Add tables to start managing dine-in orders." action={<Link className="btn btn-primary btn-sm" to="/admin/tables"><Icon name="plus" size={14} /> Add Tables</Link>} />
            )}
            {state.tables.length > 6 ? (
              <Link className="link" to="/admin/tables">+ {state.tables.length - 6} more tables</Link>
            ) : null}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h3>Top Selling Items</h3>
              <span className="muted">7 days</span>
            </div>
            {stats.topSelling.length === 0 ? (
              <EmptyState icon="trend" title="Not enough data yet" />
            ) : (
              <ol className="rank-list">
                {stats.topSelling.map((it, idx) => (
                  <li key={it.itemId}>
                    <span className="rank">{idx + 1}</span>
                    <span className="rank-name">{it.name}</span>
                    <span className="rank-qty">{it.qty} orders</span>
                  </li>
                ))}
              </ol>
            )}
            <div className="panel-foot">
              <Link className="link" to="/admin/analytics">Full analytics <Icon name="chevronRight" size={14} /></Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
