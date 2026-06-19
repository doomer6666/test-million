import React from "react";

export default function SearchInput({
  value,
  onChange,
  placeholder = "Поиск по ID…",
}) {
  return (
    <div className="search">
      <span className="search__icon" aria-hidden>
        ⌕
      </span>
      <input
        type="search"
        className="search__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
      />
      {value && (
        <button
          type="button"
          className="search__clear"
          onClick={() => onChange("")}
          aria-label="Очистить поиск"
        >
          ×
        </button>
      )}
    </div>
  );
}
