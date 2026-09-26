import { createContext, useCallback, useContext, useRef, useState } from "react";
import Icon from "./Icon.jsx";

const ToastContext = createContext(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const push = useCallback((message, type = "success") => {
    const id = ++idRef.current;
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-viewport">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast${toast.type === "error" ? " toast-error" : ""}`}>
            <Icon name={toast.type === "error" ? "alert" : "checkCircle"} size={16} />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useAction(toast) {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (action, { success } = {}) => {
    setBusy(true);
    try {
      const result = await action();
      if (success) toast(typeof success === "function" ? success(result) : success);
      return { ok: true, result };
    } catch (error) {
      toast(error?.message || "Something went wrong.", "error");
      return { ok: false, error };
    } finally {
      setBusy(false);
    }
  }, [toast]);
  return [run, busy];
}