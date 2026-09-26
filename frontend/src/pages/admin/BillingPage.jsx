import { useMemo, useState } from "react";
import { useStore } from "../../services/store.js";
import { listBillableTables, markBillFailed, markBillPaid, PAYMENT_METHODS } from "../../services/api.js";
import Badge from "../../components/common/Badge.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Icon from "../../components/common/Icon.jsx";
import Modal from "../../components/common/Modal.jsx";
import { useToast } from "../../components/common/Toast.jsx";
import { inr } from "../../utils/format.js";

export default function BillingPage() {
  const state = useStore();
  const toast = useToast();
  const bills = useMemo(() => listBillableTables(), [state.orders, state.tables, state.settings]);
  const [selectedId, setSelectedId] = useState(null);
  const [method, setMethod] = useState("Cash");
  const [receipt, setReceipt] = useState(null);
  const selected = bills.find((bill) => bill.table.id === selectedId) || bills[0] || null;

  const pay = () => {
    if (!selected) return;
    try {
      const result = markBillPaid(selected.table.id, method);
      setReceipt({ ...result, tableNumber: selected.table.number });
      toast("Payment marked as received.");
    } catch (error) { toast(error.message, "error"); }
  };

  return (
    <>
      {bills.length === 0 ? <section className="panel"><EmptyState icon="billing" title="No payment pending" subtitle="Unsettled table bills will appear here." /></section> : (
        <div className="billing-grid">
          <aside className="panel bill-sidebar">
            <div className="panel-head"><h3>Open Bills</h3><span className="muted">{bills.length}</span></div>
            <ul className="bill-table-list">{bills.map((bill) => <li key={bill.table.id}><button className={`bill-table-btn${selected?.table.id === bill.table.id ? " active" : ""}`} onClick={() => setSelectedId(bill.table.id)}><span className="table-mini">{bill.table.number}</span><span className="bill-table-meta"><strong>Table {bill.table.number}</strong><small>{bill.orders.length} order{bill.orders.length === 1 ? "" : "s"}</small></span><strong>{inr(bill.total)}</strong></button></li>)}</ul>
          </aside>
          {selected ? <section className="panel bill-detail">
            <header className="panel-head bill-head"><div><h3>Table {selected.table.number}</h3><p className="muted">{selected.orders.length} unsettled order{selected.orders.length === 1 ? "" : "s"}</p></div><Badge tone="warn">Payment pending</Badge></header>
            <ul className="bill-orders">{selected.orders.map((order) => <li key={order.id}><div className="bill-order-head"><strong>Order #{order.id}</strong><span className="num">{inr(order.subtotal)}</span></div><div className="bill-order-items">{order.items.map((item) => `${item.qty} × ${item.name}`).join(" · ")}</div></li>)}</ul>
            <dl className="bill-summary"><div><dt>Subtotal</dt><dd>{inr(selected.subtotal)}</dd></div><div><dt>Tax ({selected.taxRate}%)</dt><dd>{inr(selected.tax)}</dd></div><div className="grand"><dt>Total</dt><dd>{inr(selected.total)}</dd></div></dl>
            <div className="payment-actions"><label className="method-picker"><span className="field-label">Payment method</span><div className="pay-buttons segmented">{PAYMENT_METHODS.filter((entry) => entry !== "Other").map((entry) => <button key={entry} className={method === entry ? "active" : ""} onClick={() => setMethod(entry)}>{entry}</button>)}</div></label><div className="pay-buttons"><button className="btn btn-ghost" onClick={() => { try { markBillFailed(selected.table.id); toast("Payment marked failed."); } catch (error) { toast(error.message, "error"); } }}>Mark Failed</button><button className="btn btn-primary" onClick={pay}><Icon name="check" size={15} /> Payment Received</button></div></div>
            <p className="hint">Payment is recorded only after staff confirmation. No payment gateway is connected.</p>
          </section> : null}
        </div>
      )}
      <Modal open={Boolean(receipt)} onClose={() => setReceipt(null)} title="Payment Successful" footer={<button className="btn btn-primary" onClick={() => setReceipt(null)}>Done</button>}>
        {receipt ? <div className="receipt"><div className="receipt-check"><Icon name="checkCircle" size={34} /></div><h3>Payment received</h3><dl><div><dt>Table</dt><dd>{receipt.tableNumber}</dd></div><div><dt>Method</dt><dd>{receipt.method}</dd></div><div><dt>Total</dt><dd>{inr(receipt.total)}</dd></div></dl></div> : null}
      </Modal>
    </>
  );
}