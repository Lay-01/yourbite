import { Link, Navigate, Route, Routes, useParams } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout.jsx";
import { CartProvider } from "./components/customer/CartProvider.jsx";
import EmptyState from "./components/common/EmptyState.jsx";

import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import LoginPage from "./pages/admin/LoginPage.jsx";
import { getToken } from "./services/auth.js";

import DashboardPage from "./pages/admin/DashboardPage.jsx";
import TablesPage from "./pages/admin/TablesPage.jsx";
import MenuPage from "./pages/admin/MenuPage.jsx";
import OrdersPage from "./pages/admin/OrdersPage.jsx";
import OrderHistoryPage from "./pages/admin/OrderHistoryPage.jsx";
import BillingPage from "./pages/admin/BillingPage.jsx";
import KitchenPage from "./pages/admin/KitchenPage.jsx";
import AnalyticsPage from "./pages/admin/AnalyticsPage.jsx";
import SettingsPage from "./pages/admin/SettingsPage.jsx";

import CustomerMenuPage from "./pages/customer/CustomerMenuPage.jsx";
import CustomerCartPage from "./pages/customer/CustomerCartPage.jsx";
import OrderTrackingPage from "./pages/customer/OrderTrackingPage.jsx";

function ScanPrompt() {
  const { tableId } = useParams();
  if (tableId) return null;
  return (
    <div className="cust-shell">
      <EmptyState
        icon="qr"
        title="Scan your table's QR code"
        subtitle="Customer menus open from the QR code assigned to each table."
      />
    </div>
  );
}

function NotFound() {
  const authenticated = Boolean(getToken());
  return (
    <div className="page notfound">
      <EmptyState
        icon="alert"
        title="404 — Page not found"
        subtitle="That route doesn't exist in this prototype."
        action={<Link className="btn btn-primary" to={authenticated ? "/admin" : "/"}>Back to Home</Link>}
      />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="tables" element={<TablesPage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="history" element={<OrderHistoryPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="kitchen" element={<KitchenPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route
        path="/menu/table/:tableId"
        element={
          <CartProvider>
            <CustomerMenuPage />
          </CartProvider>
        }
      />
      <Route
        path="/menu/table/:tableId/cart"
        element={
          <CartProvider>
            <CustomerCartPage />
          </CartProvider>
        }
      />
      <Route path="/menu/order/:orderId" element={<OrderTrackingPage />} />
      <Route path="/menu" element={<ScanPrompt />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
