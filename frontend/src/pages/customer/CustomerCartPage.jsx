import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../../components/customer/CartProvider.jsx";
import { useStore } from "../../services/store.js";
import Icon from "../../components/common/Icon.jsx";
import Modal from "../../components/common/Modal.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import { useToast } from "../../components/common/Toast.jsx";
import { inr, fmtTime } from "../../utils/format.js";

export default function CustomerCartPage() {
  const cart = useCart();
  const state = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  if (!cart?.table) {
    return (
      <div className="cust-shell">
        <EmptyState icon="qr" title="Table not found" subtitle="Scan the QR code on your table again." />
      </div>
    );
  }

  const table = cart.table;
  const cafeName = state.settings.cafeName;
  const menuHref = `/menu/table/${table.number}${location.search}`;

  const doPlace = async () => {
    setPlacing(true);
    try {
      const order = await cart.place();
      setConfirmOpen(false);
      setPlaced(order);
    } catch (err) {
      setConfirmOpen(false);
      setError(err.message);
      toast(err.message, "error");
    } finally {
      setPlacing(false);
    }
  };

  /* ---------- Success screen ---------- */
  if (placed) {
    return (
      <div className="cust-shell">
        <header className="cust-header compact">
          <div className="cust-brand"><h1>{cafeName}</h1></div>
        </header>

        <div className="order-success">
          <div className="success-icon"><Icon name="checkCircle" size={40} /></div>
          <h2>Order Placed Successfully</h2>

          <dl className="success-meta">
            <div><dt>Order</dt><dd>#{placed.id}</dd></div>
            <div><dt>Total</dt><dd>{inr(placed.subtotal)}</dd></div>
            <div>
              <dt>Status</dt>
              <dd className="status-live">Order Received</dd>
            </div>
          </dl>

          <ul className="success-items">
            {placed.items.map((li) => (
              <li key={li.itemId}>
                <span>{li.qty} × {li.name}</span>
                <span>{inr(li.price * li.qty)}</span>
              </li>
            ))}
          </ul>

          <div className="success-actions">
            <button className="btn btn-primary btn-block" onClick={() => navigate(`/menu/order/${placed.id}${location.search}`)}>
              Track My Order
            </button>
            <Link className="btn btn-soft btn-block" to={menuHref}>
              Back to Menu
            </Link>
          </div>
          <p className="hint center">Kitchen has been notified · placed at {fmtTime(placed.createdAt)}</p>
        </div>
      </div>
    );
  }

  /* ---------- Empty cart ---------- */
  if (cart.items.length === 0 && !error) {
    return (
      <div className="cust-shell">
        <header className="cust-header compact">
          <div className="cust-brand"><h1>{cafeName}</h1></div>
        </header>
        <EmptyState
          icon="cart"
          title="Your cart is empty"
          subtitle="Add something delicious from the menu."
          action={
            <Link className="btn btn-primary" to={menuHref}>
              Browse Menu
            </Link>
          }
        />
      </div>
    );
  }

  /* ---------- Cart ---------- */
  return (
    <div className="cust-shell">
      <header className="cust-header compact">
        <Link className="back-link" to={menuHref}>
          <Icon name="arrowLeft" size={18} /> Menu
        </Link>
      </header>

      <h2 className="cart-title">Your Cart</h2>
      {error ? <p className="form-error">{error}</p> : null}

      <ul className="cart-lines">
        {cart.items.map((li) => (
          <li key={li.itemId}>
            <div className="cart-line-info">
              <strong>{li.name}</strong>
              <span className="muted">{inr(li.price)} each</span>
            </div>
            <div className="qty-stepper inline">
              <button onClick={() => cart.setQty(li.itemId, li.qty - 1)} aria-label="Decrease">
                <Icon name="minus" size={15} />
              </button>
              <b>{li.qty}</b>
              <button onClick={() => cart.setQty(li.itemId, li.qty + 1)} aria-label="Increase">
                <Icon name="plus" size={15} />
              </button>
            </div>
            <span className="cart-line-total">{inr(li.price * li.qty)}</span>
          </li>
        ))}
      </ul>

      <label className="field cart-note">
        <span>Special Instructions</span>
        <textarea
          rows="2"
          value={cart.note}
          onChange={(e) => cart.setNote(e.target.value)}
          placeholder='e.g. "Less spicy", "No onion", "Extra cheese"'
        />
      </label>

      <div className="cart-summary">
        <div><span>Subtotal</span><strong>{inr(cart.subtotal)}</strong></div>
        <p className="hint">Taxes are added to the table bill at billing.</p>
      </div>

      <button className="btn btn-primary btn-block place-btn" onClick={() => setConfirmOpen(true)}>
        Place Order · {inr(cart.subtotal)}
      </button>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Order"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setConfirmOpen(false)}>Edit Cart</button>
            <button className="btn btn-primary" onClick={doPlace} disabled={placing}>
              {placing ? "Placing order..." : "Confirm Order"}
            </button>
          </>
        }
      >
        <ul className="confirm-items">
          {cart.items.map((li) => (
            <li key={li.itemId}>
              <span>{li.qty} × {li.name}</span>
              <span>{inr(li.price * li.qty)}</span>
            </li>
          ))}
        </ul>
        {cart.note ? <p className="order-note">Note: “{cart.note}”</p> : null}
        <div className="confirm-total">
          <span>Total</span>
          <strong>{inr(cart.subtotal)}</strong>
        </div>
      </Modal>
    </div>
  );
}
