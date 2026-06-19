import React, { useState } from "react";

export default function AddItemForm({ onAdd, disabled }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmed = value.trim();
    if (!trimmed) {
      setError("Введите ID");
      return;
    }
    if (!/^\d+$/.test(trimmed)) {
      setError("ID должен быть целым неотрицательным числом");
      return;
    }
    const id = Number(trimmed);
    if (!Number.isSafeInteger(id)) {
      setError("Слишком большое число");
      return;
    }

    try {
      await onAdd(id);
      setValue("");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="add-form" onSubmit={submit}>
      <div className="add-form__row">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="add-form__input"
          placeholder="Новый ID, например 1000001"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          disabled={disabled}
        />
        <button
          type="submit"
          className="add-form__submit"
          disabled={disabled || !value.trim()}
        >
          {disabled ? "…" : "Добавить"}
        </button>
      </div>
      {error && <div className="add-form__error">{error}</div>}
      <div className="add-form__hint">
        ID должен быть уникальным. Начальный диапазон 1–1000000 занят.
      </div>
    </form>
  );
}
