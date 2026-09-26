import { useMemo, useState } from "react";
import { useStore } from "../../services/store.js";
import { listOrders } from "../../services/api.js";
import Badge, { ORDER_TONES, PAYMENT_TONES } from "../../components/common/Badge.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Icon from "../../components/common/Icon.jsx";
import { fmtDateTime, inr } from "../../utils/format.js";

export default function OrderHistoryPage() {
  const state = useStore();
  const [search, setSearch] = useState("");
  const [table, setTable] = useState("all");
  const [payment, setPayment] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const orders = useMemo(() => listOrders({ search, table, payment, from: from ? new Date(`${from}T00:00:00`).getTime() : null, to: to ? new Date(`${to}T23:59:59`).getTime() : null }).slice(0, 100), [state.orders, search, table, payment, from, to]);

  return (
    <>
      <div className="toolbar">
        <div className="search-box"><Icon name="search" size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, table, or dish…" /></div>
        <select className="select" value={table} onChange={(event) => setTable(event.target.value)}><option value="all">All tables</option>{state.tables.map((entry) => <option key={entry.id} value={entry.number}>Table {entry.number}</option>)}</select>
        <select className="select" value={payment} onChange={(event) => setPayment(event.target.value)}><option value="all">All payments</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option></select>
        <div className="date-range-inputs"><input type="date" className="input" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" /><span>to</span><input type="date" className="input" value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" /></div>
      </div>
      {orders.length ? <div className="panel table-wrap"><table className="data-table"><thead><tr><th>Order</th><th>Date &amp; Time</th><th>Table</th><th>Items</th><th className="num">Amount</th><th>Status</th><th>Payment</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>#{order.id}</strong></td><td>{fmtDateTime(order.createdAt)}</td><td><span className="table-mini">{order.tableNumber}</span></td><td>{order.items.reduce((sum, line) => sum + line.qty, 0)} items</td><td className="num">{inr(order.subtotal)}</td><td><Badge tone={ORDER_TONES[order.status]}>{order.status}</Badge></td><td><Badge tone={PAYMENT_TONES[order.paymentStatus]}>{order.paymentStatus}</Badge></td></tr>)}</tbody></table></div> : <section className="panel"><EmptyState icon="history" title="No orders found" subtitle="Orders will appear here after they are placed." /></section>}
    </>
  );
}