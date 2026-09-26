import { useStore } from "../../services/store.js";
import { listOrders, updateOrderStatus } from "../../services/api.js";
import KitchenTicket from "../../components/orders/KitchenTicket.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import { useToast } from "../../components/common/Toast.jsx";

const columns = [
  { key: "new", label: "New", next: "accepted", action: "Accept", className: "kot-new" },
  { key: "preparing", label: "Preparing", next: "ready", action: "Mark Ready", className: "kot-preparing" },
  { key: "ready", label: "Ready to Serve", next: "served", action: "Mark Served", className: "kot-ready" },
];

export default function KitchenPage() {
  const state = useStore();
  const toast = useToast();
  return (
    <div className="kot-board">
      {columns.map((column) => {
        const orders = column.key === "new"
          ? state.orders.filter((order) => ["new", "accepted"].includes(order.status))
          : listOrders({ tab: column.key });
        return (
          <section className={`kot-col ${column.className}`} key={column.key}>
            <header><h3>{column.label}</h3><span className="kot-count">{orders.length}</span></header>
            {orders.length ? orders.map((order) => {
              const next = column.key === "new" && order.status === "new" ? "accepted" : column.key === "new" ? "preparing" : column.next;
              const action = column.key === "new" && order.status === "accepted" ? "Start Preparing" : column.action;
              return <KitchenTicket key={order.id} order={order} actionLabel={action} onAction={() => { try { updateOrderStatus(order.id, next); toast(`Order #${order.id} updated.`); } catch (error) { toast(error.message, "error"); } }} />;
            }) : <EmptyState icon="kitchen" title="Nothing in this queue" />}
          </section>
        );
      })}
    </div>
  );
}