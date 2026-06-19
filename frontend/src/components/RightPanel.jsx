import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDebounce } from "../hooks/useDebounce.js";
import { useSelect } from "../store.jsx";
import SearchInput from "./SearchInput.jsx";
import Item from "./Item.jsx";

const PAGE_SIZE = 20;

function SortableItem({ id, isCustom, onRemove, setHandleRef }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
  };

  const composedRef = useCallback(
    (node) => {
      setNodeRef(node);
      setHandleRef?.(node);
    },
    [setNodeRef, setHandleRef],
  );

  return (
    <Item
      ref={composedRef}
      id={id}
      isCustom={isCustom}
      isDragging={isDragging}
      onAction={onRemove}
      actionLabel="←"
      actionClassName="item__action--remove"
      dragHandleProps={{ ...attributes, ...listeners }}
      style={style}
    />
  );
}

export default function RightPanel() {
  const { order, reorder, unselect } = useSelect();

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [error, setError] = useState(null);

  const debouncedSearch = useDebounce(search, 300);
  const listRef = useRef(null);
  const lastNodeRef = useRef(null);
  const setLastNodeRef = useCallback((node) => {
    lastNodeRef.current = node;
  }, []);

  const filtered = useMemo(() => {
    const s = debouncedSearch;
    if (!s) return order;
    return order.filter((id) => String(id).includes(s));
  }, [order, debouncedSearch]);

  useEffect(() => {
    setPageSize(PAGE_SIZE);
  }, [debouncedSearch]);

  const items = filtered.slice(0, pageSize);
  const hasMore = pageSize < filtered.length;

  useEffect(() => {
    if (!hasMore) return;
    const node = lastNodeRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPageSize((s) => s + PAGE_SIZE);
        }
      },
      { root: listRef.current, rootMargin: "120px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [items, hasMore]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIdx = items.indexOf(active.id);
      const newIdx = items.indexOf(over.id);
      if (oldIdx === -1 || newIdx === -1) return;

      const fromGlobal = order.indexOf(active.id);
      const toGlobal = order.indexOf(over.id);
      if (fromGlobal === -1 || toGlobal === -1) return;

      const newOrder = arrayMove(order, fromGlobal, toGlobal);
      reorder(newOrder).catch((e) => setError(e.message));
    },
    [items, order, reorder],
  );

  const handleRemove = useCallback(
    async (id) => {
      try {
        await unselect(id);
      } catch (e) {
        setError(e.message);
      }
    },
    [unselect],
  );

  const showingEmpty = items.length === 0 && order.length === 0;

  return (
    <section className="panel panel--right">
      <header className="panel__header">
        <div className="panel__title">
          <h2>Выбрано</h2>
          <span className="panel__count" title="Всего выбрано">
            {order.length.toLocaleString("ru-RU")}
          </span>
        </div>
        <div className="panel__hint">
          Перетаскивайте за <span className="handle-glyph">⋮⋮</span>, чтобы
          изменить порядок.
        </div>
      </header>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Поиск среди выбранных…"
      />

      <div className="panel__body" ref={listRef}>
        {error && <div className="panel__error">{error}</div>}

        {showingEmpty && (
          <div className="panel__placeholder">Нет выбранных элементов</div>
        )}

        {!showingEmpty && items.length === 0 && (
          <div className="panel__placeholder">
            По этому запросу ничего не найдено
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <ul className="list">
              {items.map((id, idx) => {
                const isLast = idx === items.length - 1;
                const isCustom = id > 1_000_000;
                return (
                  <li key={id} className="list__row">
                    <SortableItem
                      id={id}
                      isCustom={isCustom}
                      onRemove={handleRemove}
                      setHandleRef={isLast && hasMore ? setLastNodeRef : null}
                    />
                  </li>
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>

        {!hasMore && items.length > 0 && (
          <div className="panel__end">— конец списка —</div>
        )}
      </div>
    </section>
  );
}
