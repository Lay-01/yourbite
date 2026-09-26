import { useMemo, useState } from "react";
import { useStore } from "../../services/store.js";
import { listOrders, ORDER_TABS, STATUS_LABELS, updateOrderStatus } from "../../services/api.js";
import OrderCard from "../../components/orders/OrderCard.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Icon from "../../components/common/Icon.jsx";
import { useToast } from "../../components/common/Toast.jsx";

const tabs = [{ key: "all", label: "All" }, ...ORDER_TABS];

export default function OrdersPage() {
  const state = useStore();
  const toast = useToast();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const rows = useMemo(() => listOrders({ tab, search }), [tab, search, state.orders]);
  const advance = (order, status) => {
    try { updateOrderStatus(order.id, status); toast(`Order #${order.id} moved to ${STATUS_LABELS[status]}.`); }
    catch (error) { toast(error.message, "error"); }
  };

  return (
    <>
      <div className="toolbar">
        <div className="tabs-row">
          {tabs.map((item) => <button key={item.key} className={`tab-btn${tab === item.key ? " active" : ""}`} onClick={() => setTab(item.key)}>{item.label}<span className="tab-count">{item.key === "all" ? state.orders.length : listOrders({ tab: item.key }).length}</span></button>)}
        </div>
        <div className="search-box"><Icon name="search" size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, table, or dish…" /></div>
      </div>
      {rows.length ? <div className="order-grid">{rows.map((order) => <OrderCard key={order.id} order={order} onAdvance={advance} />)}</div> : <section className="panel"><EmptyState icon="orders" title="No orders found" subtitle={search ? "Try changing your search or status filter." : "New customer orders will appear here."} /></section>}
    </>
  );
}