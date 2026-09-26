// Formatting helpers shared by admin + customer UI.

const inrFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** ₹1,020 — Indian digit grouping */
export function inr(value) {
  return `₹${inrFormatter.format(Math.round(Number(value) || 0))}`;
}

export function startOfDay(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(ts = Date.now()) {
  return startOfDay(ts) + 86400000 - 1;
}

export function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtShortDate(ts) {
  return new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function fmtDateTime(ts) {
  return `${fmtShortDate(ts)}, ${fmtTime(ts)}`;
}

export function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** ISO date string (yyyy-mm-dd) for <input type="date"> */
export function toDateInput(ts) {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
