import { NavLink } from "react-router-dom";
import Icon from "../common/Icon.jsx";

export const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      { to: "/admin", label: "Dashboard", icon: "dashboard", end: true },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/admin/orders", label: "Orders", icon: "orders" },
      { to: "/admin/kitchen", label: "Kitchen / KOT", icon: "kitchen" },
      { to: "/admin/menu", label: "Menu", icon: "menu" },
      { to: "/admin/tables", label: "Tables", icon: "table" },
      { to: "/admin/billing", label: "Billing", icon: "billing" },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/admin/history", label: "Order History", icon: "history" },
      { to: "/admin/analytics", label: "Analytics", icon: "analytics" },
    ],
  },
  {
    label: "Settings",
    items: [{ to: "/admin/settings", label: "Restaurant Settings", icon: "settings" }],
  },
];

/** Flat list — kept for any consumer that needs all routes in one array. */
export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

export default function Sidebar({ cafeName, onNavigate }) {
  return (
    <nav className="sidebar-inner">
      <div className="brand">
        <div className="brand-text">
          <strong>Your<span>Byte</span></strong>
          <small>Manage · Serve · Grow</small>
        </div>
      </div>

      <div className="nav-scroll">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            <ul className="nav-list">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                    onClick={onNavigate}
                  >
                    <Icon name={item.icon} size={17} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="sidebar-foot">
        <a className="nav-link" href="/menu" target="_blank" rel="noreferrer">
          <Icon name="external" size={17} />
          <span>Customer menu</span>
        </a>
        <div className="sidebar-business">
          <span className="sidebar-business-icon"><Icon name="home" size={17} /></span>
          <span><strong>{cafeName || "Your Restaurant"}</strong><small>Owner Console</small></span>
          <Icon name="chevronRight" size={15} />
        </div>
      </div>
    </nav>
  );
}
