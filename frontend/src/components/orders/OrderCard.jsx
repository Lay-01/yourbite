import Icon from "../common/Icon.jsx";
import Badge, { ORDER_TONES, PAYMENT_TONES } from "../common/Badge.jsx";
import { ORDER_FLOW, STATUS_LABELS } from "../../services/api.js";
import { inr, timeAgo } from "../../utils/format.js";

export default function OrderCard({ order, onAdvance, compact = false }) {
  const next = ORDER_FLOW[order.status] || [];
  return (
    <article className={`order-card${compact ? " compact" : ""}`}>
      <header className="order-card-head">
        <div className="order-id"><strong>Order #{order.id}</strong><span className="muted">{timeAgo(order.createdAt)}</span></div>
        <span className="order-table-chip"><small>TABLE</small><b>{order.tableNumber}</b></span>
      </header>
      <div className="order-tags">
        <Badge tone={ORDER_TONES[order.status]}>{STATUS_LABELS[order.status] || order.status}</Badge>
        <Badge tone={PAYMENT_TONES[order.paymentStatus] || "neutral"}>{order.paymentStatus === "paid" ? "Paid" : order.paymentStatus === "failed" ? "Failed" : "Payment pending"}</Badge>
      </div>
      <ul className="order-lines">
        {order.items.map((line, index) => (
          <li key={`${line.itemId}-${index}`}><em>{line.qty}×</em><span>{line.name}</span><span className="line-price">{inr(line.price * line.qty)}</span></li>
        ))}
      </ul>
      {order.note ? <p className="order-note"><Icon name="alert" size={14} />{order.note}</p> : null}
      <footer className="order-card-foot">
        <strong className="order-total">{inr(order.subtotal)}</strong>
        {next.length ? (
          <div className="order-actions">
            {next.filter((status) => status !== "cancelled").map((status) => (
              <button className="btn btn-primary btn-sm" key={status} onClick={() => onAdvance?.(order, status)}>
                {status === "accepted" ? "Accept" : status === "preparing" ? "Preparing" : status === "ready" ? "Ready" : status === "served" ? "Served" : "Complete"}
              </button>
            ))}
          </div>
        ) : null}
      </footer>
    </article>
  );
}