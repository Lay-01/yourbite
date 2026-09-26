import { useMemo, useState } from "react";
import { useStore } from "../../services/store.js";
import { getAnalytics } from "../../services/api.js";
import { BarChart, HBarChart } from "../../components/analytics/BarChart.jsx";
import EmptyState from "../../components/common/EmptyState.jsx";
import { inr } from "../../utils/format.js";

const ranges = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
];

export default function AnalyticsPage() {
  const state = useStore();
  const [range, setRange] = useState("7d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const data = useMemo(() => getAnalytics({ range, from: range === "custom" ? from : null, to: range === "custom" ? to : null }), [state.orders, state.items, state.categories, range, from, to]);
  const hasData = data.ordersCount > 0;

  return (
    <>
      <div className="kpi-strip"><div className="kpi"><span>Sales today</span><strong>{inr(data.kpis.today)}</strong></div><div className="kpi"><span>Sales this week</span><strong>{inr(data.kpis.week)}</strong></div><div className="kpi"><span>Sales this month</span><strong>{inr(data.kpis.month)}</strong></div></div>
      <div className="page-actions"><div className="tabs-row">{ranges.map((entry) => <button key={entry.id} className={`tab-btn${range === entry.id ? " active" : ""}`} onClick={() => setRange(entry.id)}>{entry.label}</button>)}<button className={`tab-btn${range === "custom" ? " active" : ""}`} onClick={() => setRange("custom")}>Custom</button></div>{range === "custom" ? <div className="date-range-inputs"><input type="date" className="input" value={from} onChange={(event) => setFrom(event.target.value)} /><span>to</span><input type="date" className="input" value={to} onChange={(event) => setTo(event.target.value)} /></div> : null}</div>
      {hasData ? <div className="analytics-grid dash-grid">
        <section className="panel span-2"><div className="panel-head"><div><h3>Sales Overview</h3><p className="muted">{data.label}</p></div><strong>{inr(data.sales)}</strong></div><BarChart data={data.trend} height={220} color="#2f7df6" /><p className="hint">{data.ordersCount} orders · Average order value {inr(data.avgOrderValue)}</p></section>
        <section className="panel"><div className="panel-head"><h3>Sales by Category</h3></div><HBarChart data={data.categorySales} colors={["#2f7df6", "#12b76a", "#f79009", "#7a5af8"]} /></section>
        <section className="panel span-2"><div className="panel-head"><h3>Top Selling Items</h3></div>{data.topSelling.length ? <ol className="rank-list">{data.topSelling.map((item, index) => <li key={item.itemId}><span className="rank">{index + 1}</span><span className="rank-name">{item.name}</span><span className="rank-qty">{item.qty} sold</span></li>)}</ol> : <p className="muted">No item sales in this period.</p>}</section>
      </div> : <section className="panel"><EmptyState icon="analytics" title="No sales data yet" subtitle="Analytics will appear once orders are recorded." /></section>}
    </>
  );
}