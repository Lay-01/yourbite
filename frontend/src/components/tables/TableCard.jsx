import Icon from "../common/Icon.jsx";
import Badge, { TABLE_TONES } from "../common/Badge.jsx";
import { inr } from "../../utils/format.js";

const labels = { available: "Available", occupied: "Occupied", payment_pending: "Payment Pending" };

export default function TableCard({ table, openOrders = [], onEdit, onDelete, onQr, onFree }) {
  const total = openOrders.reduce((sum, order) => sum + order.subtotal, 0);
  return (
    <article className={`table-card status-${table.status}`}>
      <header className="table-card-head">
        <strong className="table-number">{table.number}</strong>
        <Badge tone={TABLE_TONES[table.status]} dot>{labels[table.status] || "Available"}</Badge>
      </header>
      <div className="table-card-meta">
        <span><Icon name="users" size={14} /> {table.seats} seats</span>
        <button className="qr-chip" onClick={() => onQr(table)}><Icon name="qr" size={13} /> View QR</button>
      </div>
      {openOrders.length ? <p className="muted">{openOrders.length} open order{openOrders.length === 1 ? "" : "s"} · {inr(total)}</p> : <p className="muted">No open orders</p>}
      <footer className="table-card-actions">
        <button className="btn btn-soft btn-sm" onClick={() => onEdit(table)}><Icon name="edit" size={14} /> Edit</button>
        {table.status === "occupied" ? <button className="btn btn-soft btn-sm" onClick={() => onFree(table)}><Icon name="check" size={14} /> Free</button> : null}
        <button className="icon-btn danger" onClick={() => onDelete(table)} aria-label={`Delete table ${table.number}`}><Icon name="trash" size={15} /></button>
      </footer>
    </article>
  );
}