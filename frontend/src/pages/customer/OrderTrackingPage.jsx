import { Link, useParams, useSearchParams } from "react-router-dom";
import { useStore } from "../../services/store.js";
import { getOrder } from "../../services/api.js";
import Icon from "../../components/common/Icon.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import { inr, fmtDateTime } from "../../utils/format.js";

const STEPS = [
  { key: "received", label: "Order Received", statuses: ["new", "accepted"] },
  { key: "preparing", label: "Preparing", statuses: ["preparing"] },
  { key: "ready", label: "Ready", statuses: ["ready"] },
  { key: "served", label: "Served", statuses: ["served", "completed"] },
];

const STATUS_RANK = {
  new: 0,
  accepted: 0,
  preparing: 1,
  ready: 2,
  served: 3,
  completed: 4,
};

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const state = useStore();
  const order = getOrder(orderId);

  if (!order) {
    return (
      <div className="cust-shell">
        <EmptyState
          icon="search"
          title={`Order #${orderId} not found`}
          subtitle="It may belong to another session. Scan your table QR again."
          action={
            <Link className="btn btn-primary" to="/menu">Back to menu</Link>
          }
        />
      </div>
    );
  }

  const justPlaced = params.get("placed") === "1";
  const rank = STATUS_RANK[order.status] ?? 0;
  const cancelled = order.status === "cancelled";
  const cafeName = state.settings.cafeName;

  return (
    <div className="cust-shell">
      <header className="cust-header compact">
        <div className="cust-brand"><h1>{cafeName}</h1></div>
      </header>

      {justPlaced ? (
        <div className="track-banner">
          <Icon name="checkCircle" size={18} /> Order placed — the kitchen is on it!
        </div>
      ) : null}

      <section className="track-card">
        <div className="track-head">
          <div>
            <h2>Order #{order.id}</h2>
            <span className="muted">{fmtDateTime(order.createdAt)}</span>
          </div>
          <span className={`pill ${cancelled ? "danger" : "live"}`}>
            {cancelled
              ? "Cancelled"
              : order.status === "completed"
              ? "Completed"
              : STEPS[Math.min(rank, 3)].label}
          </span>
        </div>

        {cancelled ? (
          <p className="form-error">This order was cancelled.</p>
        ) : (
          <ol className="track-steps">
            {STEPS.map((step, idx) => {
              const done = idx < rank;
              const current = idx === rank;
              return (
                <li key={step.key} className={done ? "done" : current ? "current" : ""}>
                  <span className="step-dot">{done ? <Icon name="check" size={13} /> : idx + 1}</span>
                  <span className="step-label">{step.label}</span>
                </li>
              );
            })}
          </ol>
        )}

        <ul className="cart-lines compact">
          {order.items.map((li) => (
            <li key={li.itemId}>
              <div className="cart-line-info">
                <strong>{li.qty} × {li.name}</strong>
              </div>
              <span className="cart-line-total">{inr(li.price * li.qty)}</span>
            </li>
          ))}
        </ul>

        {order.note ? <p className="order-note">Note: “{order.note}”</p> : null}

        <div className="track-total">
          <span>Total (before tax)</span>
          <strong>{inr(order.subtotal)}</strong>
        </div>

        <div className="track-payment">
          Payment:{" "}
          <span className={`pill ${order.paymentStatus === "paid" ? "ok" : order.paymentStatus === "failed" ? "danger" : "warn"}`}>
            {order.paymentStatus === "pending" ? "Pending" : order.paymentStatus === "paid" ? "Paid" : "Failed"}
          </span>
          {order.paymentMethod ? <span className="muted"> via {order.paymentMethod}</span> : null}
        </div>
      </section>

      <div className="success-actions">
        <Link className="btn btn-soft btn-block" to={`/menu/table/${order.tableNumber}?tenant=${encodeURIComponent(params.get("tenant") || state.tenantId)}`}>
          <Icon name="arrowLeft" size={15} /> Order more
        </Link>
      </div>
      <p className="hint center">This screen updates live as the kitchen moves your order along.</p>
    </div>
  );
}
