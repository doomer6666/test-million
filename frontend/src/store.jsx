import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "./api.js";

const SelectContext = createContext(null);

export function SelectProvider({ children }) {
  const [order, setOrder] = useState([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api.getSelectedAll();
        if (!cancelled) setOrder(r.order);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const select = useCallback(async (id) => {
    setOrder((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setVersion((v) => v + 1);
    try {
      await api.selectItem(id);
    } catch (e) {
      try {
        const r = await api.getSelectedAll();
        setOrder(r.order);
      } catch {
        // ignore
      }
      throw e;
    }
  }, []);

  const unselect = useCallback(async (id) => {
    setOrder((prev) => prev.filter((x) => x !== id));
    setVersion((v) => v + 1);
    try {
      await api.unselectItem(id);
    } catch (e) {
      try {
        const r = await api.getSelectedAll();
        setOrder(r.order);
      } catch {
        // ignore
      }
      throw e;
    }
  }, []);

  const reorder = useCallback(async (newOrder) => {
    setOrder(newOrder);
    setVersion((v) => v + 1);
    try {
      await api.reorderSelected(newOrder);
    } catch (e) {
      try {
        const r = await api.getSelectedAll();
        setOrder(r.order);
      } catch {
        // ignore
      }
      throw e;
    }
  }, []);

  const value = useMemo(
    () => ({ order, version, select, unselect, reorder }),
    [order, version, select, unselect, reorder],
  );

  return (
    <SelectContext.Provider value={value}>{children}</SelectContext.Provider>
  );
}

export function useSelect() {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error("useSelect must be inside SelectProvider");
  return ctx;
}
