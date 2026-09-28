import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { checkAuth, getToken } from "../../services/auth.js";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const [status, setStatus] = useState("checking"); // "checking" | "authenticated" | "unauthenticated"

  useEffect(() => {
    let mounted = true;

    async function verify() {
      if (!getToken()) {
        if (mounted) setStatus("unauthenticated");
        return;
      }

      const user = await checkAuth();
      if (mounted) {
        setStatus(user ? "authenticated" : "unauthenticated");
      }
    }

    verify();
    return () => {
      mounted = false;
    };
  }, [location.pathname]);

  if (status === "checking") {
    return (
      <div className="auth-splash">
        <div className="auth-splash-card">
          <div className="auth-splash-spinner" />
          <p>Verifying owner credentials...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
