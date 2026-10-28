import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ToastProvider, useToast } from "./components/common/Toast.jsx";
import { initializeStore } from "./services/store.js";
import { getToken } from "./services/auth.js";
import "./style.css";
import "./customer.css";

function DatabaseSyncFeedback() {
  const toast = useToast();

  useEffect(() => {
    const onError = (event) => toast(event.detail || "Database update failed.", "error");
    window.addEventListener("yourbite:database-error", onError);
    return () => window.removeEventListener("yourbite:database-error", onError);
  }, [toast]);

  return null;
}

async function startApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const publicMenu = window.location.pathname.startsWith("/menu/");
  const tenant = publicMenu ? urlParams.get("tenant") : null;
  if (publicMenu && tenant) {
    await initializeStore(tenant, { publicMenu: true });
  } else if (getToken()) {
    await initializeStore();
  }
  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <BrowserRouter>
        <ToastProvider>
          <DatabaseSyncFeedback />
          <App />
        </ToastProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

startApp();
