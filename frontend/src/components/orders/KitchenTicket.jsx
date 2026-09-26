import Icon from "../common/Icon.jsx";
import { inr, timeAgo } from "../../utils/format.js";

export default function KitchenTicket({ order, actionLabel, onAction }) {
  return (
    <article className="kot-card">
      <header className="kot-head"><strong>#{order.id} · Table {order.tableNumber}</strong><span className="muted">{timeAgo(order.createdAt)}</span></header>
      <ul>{order.items.map((item, index) => <li key={`${item.itemId}-${index}`}><em>{item.qty}×</em> {item.name}</li>)}</ul>
      {order.note ? <p className="order-note"><Icon name="alert" size={13} />{order.note}</p> : null}
      <footer><strong>{inr(order.subtotal)}</strong><button className="btn btn-primary btn-sm" onClick={onAction}>{actionLabel}</button></footer>
    </article>
  );
}