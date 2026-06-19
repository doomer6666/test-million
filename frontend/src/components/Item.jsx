import React, { forwardRef } from "react";

const Item = forwardRef(function Item(
  {
    id,
    onAction,
    actionLabel,
    actionClassName,
    isCustom,
    isDragging,
    dragHandleProps,
    style,
  },
  ref,
) {
  return (
    <div
      ref={ref}
      style={style}
      className={`item${isDragging ? " item--dragging" : ""}`}
    >
      {dragHandleProps && (
        <button
          type="button"
          className="item__handle"
          aria-label="Перетащить"
          {...dragHandleProps}
        >
          <span aria-hidden>⋮⋮</span>
        </button>
      )}
      <span className="item__id">#{id}</span>
      {isCustom && <span className="item__badge">custom</span>}
      <button
        type="button"
        className={`item__action ${actionClassName || ""}`}
        onClick={() => onAction?.(id)}
        aria-label={actionLabel}
        title={actionLabel}
      >
        {actionLabel}
      </button>
    </div>
  );
});

export default Item;
