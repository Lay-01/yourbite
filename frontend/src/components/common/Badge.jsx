export const ORDER_TONES = {
  new: "info",
  accepted: "info",
  preparing: "warn",
  ready: "success",
  served: "success",
  completed: "success",
  cancelled: "danger",
};

export const PAYMENT_TONES = { pending: "warn", paid: "success", failed: "danger" };
export const TABLE_TONES = { available: "success", occupied: "danger", payment_pending: "warn" };

export default function Badge({ children, tone = "neutral", dot = false }) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot ? <i className="badge-dot" /> : null}
      {children}
    </span>
  );
}