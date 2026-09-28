import { useMemo, useState } from "react";
import { useStore } from "../../services/store.js";
import { listOrders, ORDER_TABS, STATUS_LABELS, updateOrderStatus } from "../../services/api.js";
import OrderCard from "../../components/orders/OrderCard.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import Icon from "../../components/common/Icon.jsx";
import { useToast } from "../../components/common/Toast.jsx";
import { startOfDay, endOfDay, toDateInput } from "../../utils/format.js";

const tabs = [{ key: "all", label: "All Statuses" }, ...ORDER_TABS];

export default function OrdersPage() {
  const state = useStore();
  const toast = useToast();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  // Date filter state: 'today' | 'yesterday' | 'custom' | 'all'
  const [dateMode, setDateMode] = useState("today");
  const [customDate, setCustomDate] = useState(toDateInput(Date.now()));

  const dateRange = useMemo(() => {
    const todayStart = startOfDay();
    if (dateMode === "today") {
      return { from: todayStart, to: endOfDay(todayStart), label: "Today" };
    }
    if (dateMode === "yesterday") {
      const yest = todayStart - 86400000;
      return { from: yest, to: endOfDay(yest), label: "Yesterday" };
    }
    if (dateMode === "custom" && customDate) {
      const start = new Date(customDate + "T00:00:00").getTime();
      return { from: start, to: endOfDay(start), label: customDate };
    }
    return { from: null, to: null, label: "All Dates" };
  }, [dateMode, customDate]);

  const rows = useMemo(() => {
    return listOrders({
      tab,
      search,
      from: dateRange.from,
      to: dateRange.to,
    });
  }, [tab, search, dateRange, state.orders]);

  const advance = (order, status) => {
    try {
      updateOrderStatus(order.id, status);
      toast(`Order #${order.id} moved to ${STATUS_LABELS[status]}.`);
    } catch (error) {
      toast(error.message, "error");
    }
  };

  return (
    <>
      <div className="toolbar" style={{ flexWrap: "wrap", gap: "12px" }}>
        <div className="tabs-row">
          {tabs.map((item) => {
            const count = listOrders({ tab: item.key, from: dateRange.from, to: dateRange.to }).length;
            return (
              <button
                key={item.key}
                className={`tab-btn${tab === item.key ? " active" : ""}`}
                onClick={() => setTab(item.key)}
              >
                {item.label}
                <span className="tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Date Selector Controls */}
        <div className="date-filter-group" style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
          <select
            className="select"
            value={dateMode}
            onChange={(e) => setDateMode(e.target.value)}
            aria-label="Filter orders by date"
          >
            <option value="today">📅 Today's Orders</option>
            <option value="yesterday">📅 Yesterday</option>
            <option value="custom">📅 Pick Specific Date...</option>
            <option value="all">🗓️ All Dates (Historical)</option>
          </select>

          {dateMode === "custom" && (
            <input
              type="date"
              className="input-date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "13px" }}
            />
          )}

          <div className="search-box">
            <Icon name="search" size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order, table, or dish…"
            />
          </div>
        </div>
      </div>

      {rows.length ? (
        <div className="order-grid">
          {rows.map((order) => (
            <OrderCard key={order.id} order={order} onAdvance={advance} />
          ))}
        </div>
      ) : (
        <section className="panel">
          <EmptyState
            icon="orders"
            title={`No orders found for ${dateRange.label}`}
            subtitle={
              search
                ? "Try changing your search or status filter."
                : dateMode === "today"
                ? "Today's pipeline starts clean — new customer orders for today will appear here."
                : "No orders recorded on this date."
            }
          />
        </section>
      )}
    </>
  );
}