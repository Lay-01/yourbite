import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "../../services/store.js";
import { placeOrder } from "../../services/api.js";

const CartContext = createContext(null);

export function useCart() {
  return useContext(CartContext);
}

const cartKey = (tableId) => `socialcafe.cart.${tableId}`;

function loadCart(tableId) {
  try {
    const raw = localStorage.getItem(cartKey(tableId));
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { items: [], note: "" };
}

/** Provides cart state + table identity for the customer QR flow. */
export function CartProvider({ children }) {
  const { tableId: tableParam } = useParams();
  const state = useStore();

  const table = useMemo(
    () => state.tables.find((t) => t.number === tableParam || t.id === tableParam) || null,
    [state.tables, tableParam]
  );

  const [cart, setCart] = useState(() => (table ? loadCart(table.id) : { items: [], note: "" }));

  // Keep separate cart contents per QR route without claiming a table before an order.
  useEffect(() => {
    if (!table) return;
    setCart(loadCart(table.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.id]);

  useEffect(() => {
    if (!table) return;
    try {
      localStorage.setItem(cartKey(table.id), JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart, table]);

  const add = useCallback((item) => {
    setCart((c) => {
      const existing = c.items.find((li) => li.itemId === item.id);
      const items = existing
        ? c.items.map((li) => (li.itemId === item.id ? { ...li, qty: li.qty + 1 } : li))
        : [...c.items, { itemId: item.id, name: item.name, price: item.price, qty: 1 }];
      return { ...c, items };
    });
  }, []);

  const setQty = useCallback((itemId, qty) => {
    setCart((c) => ({
      ...c,
      items:
        qty <= 0
          ? c.items.filter((li) => li.itemId !== itemId)
          : c.items.map((li) => (li.itemId === itemId ? { ...li, qty } : li)),
    }));
  }, []);

  const remove = useCallback((itemId) => setQty(itemId, 0), [setQty]);
  const setNote = useCallback((note) => setCart((c) => ({ ...c, note })), []);
  const clear = useCallback(() => setCart({ items: [], note: "" }), []);

  const qtyOf = useCallback(
    (itemId) => cart.items.find((li) => li.itemId === itemId)?.qty || 0,
    [cart.items]
  );

  const subtotal = cart.items.reduce((sum, li) => sum + li.price * li.qty, 0);
  const count = cart.items.reduce((sum, li) => sum + li.qty, 0);

  const place = useCallback(() => {
    if (!table) throw new Error("Table not found.");
    const order = placeOrder({ tableId: table.id, items: cart.items, note: cart.note });
    clear();
    return order;
  }, [table, cart.items, cart.note, clear]);

  const value = {
    table,
    tableParam,
    items: cart.items,
    note: cart.note,
    subtotal,
    count,
    add,
    setQty,
    remove,
    setNote,
    clear,
    qtyOf,
    place,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
