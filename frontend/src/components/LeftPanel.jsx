import React, { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { useDebounce } from "../hooks/useDebounce.js";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll.js";
import { useSelect } from "../store.jsx";
import SearchInput from "./SearchInput.jsx";
import AddItemForm from "./AddItemForm.jsx";
import Item from "./Item.jsx";

const PAGE_SIZE = 20;

export default function LeftPanel() {
  const { order: selectedOrder, select } = useSelect();

  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const debouncedSearch = useDebounce(search, 300);
  const offsetRef = useRef(0);
  const listRef = useRef(null);

  const selectedSet = React.useMemo(
    () => new Set(selectedOrder),
    [selectedOrder],
  );

  useEffect(() => {
    let cancelled = false;
    setItems([]);
    setHasMore(false);
    setInitialLoading(true);
    setError(null);
    offsetRef.current = 0;

    (async () => {
      try {
        const [page, count] = await Promise.all([
          api.getItems({
            search: debouncedSearch,
            offset: 0,
            limit: PAGE_SIZE,
          }),
          api.getItemsCount({ search: debouncedSearch }),
        ]);
        if (cancelled) return;
        const filtered = page.items.filter((i) => !selectedSet.has(i.id));
        setItems(filtered);
        setHasMore(page.hasMore);
        setTotal(count.count);
        offsetRef.current = page.items.length;
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  // Подгрузка следующей страницы.
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const page = await api.getItems({
        search: debouncedSearch,
        offset: offsetRef.current,
        limit: PAGE_SIZE,
      });
      setItems((prev) => {
        const known = new Set(prev.map((i) => i.id));
        const fresh = page.items.filter(
          (i) => !known.has(i.id) && !selectedSet.has(i.id),
        );
        return [...prev, ...fresh];
      });
      setHasMore(page.hasMore);
      offsetRef.current += page.items.length;
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, debouncedSearch, selectedSet]);

  const lastItemRef = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: loading,
    rootRef: listRef,
  });

  const handleSelect = useCallback(
    async (id) => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      try {
        await select(id);
      } catch (e) {
        offsetRef.current = Math.max(0, offsetRef.current - 1);
        try {
          const page = await api.getItems({
            search: debouncedSearch,
            offset: 0,
            limit: PAGE_SIZE,
          });
          setItems(page.items.filter((i) => !selectedSet.has(i.id)));
          setHasMore(page.hasMore);
        } catch {}
      }
    },
    [debouncedSearch, selectedSet, select],
  );

  const handleAdd = useCallback(async (id) => {
    setItems((prev) => [{ id }, ...prev]);
    setTotal((t) => t + 1);
    try {
      const res = await api.addItem(id);
      if (!res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setTotal((t) => Math.max(0, t - 1));
        throw new Error(res.error || "Не удалось добавить");
      }
    } catch (e) {
      throw e;
    }
  }, []);

  const visibleItems = React.useMemo(
    () => items.filter((i) => !selectedSet.has(i.id)),
    [items, selectedSet],
  );

  const showingEmpty = !initialLoading && visibleItems.length === 0;

  return (
    <section className="panel panel--left">
      <header className="panel__header">
        <div className="panel__title">
          <h2>Доступно</h2>
          <span className="panel__count" title="Всего невыбрано">
            {total.toLocaleString("ru-RU")}
          </span>
        </div>
        <AddItemForm onAdd={handleAdd} />
      </header>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Поиск по ID…"
      />

      <div className="panel__body" ref={listRef}>
        {error && <div className="panel__error">{error}</div>}

        {initialLoading && <div className="panel__placeholder">Загрузка…</div>}

        {showingEmpty && (
          <div className="panel__placeholder">
            {debouncedSearch
              ? "По этому запросу ничего не найдено"
              : "Все элементы выбраны"}
          </div>
        )}

        <ul className="list">
          {visibleItems.map((item, idx) => {
            const isLast = idx === visibleItems.length - 1;
            const isCustom = item.id > 1_000_000;
            return (
              <li key={item.id} className="list__row">
                <Item
                  ref={isLast && hasMore ? lastItemRef : null}
                  id={item.id}
                  isCustom={isCustom}
                  onAction={handleSelect}
                  actionLabel="→"
                  actionClassName="item__action--add"
                />
              </li>
            );
          })}
        </ul>

        {loading && <div className="panel__loading">Подгружаем ещё…</div>}
      </div>
    </section>
  );
}
