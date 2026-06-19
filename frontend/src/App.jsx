import React, { useEffect, useState } from "react";
import LeftPanel from "./components/LeftPanel.jsx";
import RightPanel from "./components/RightPanel.jsx";
import { SelectProvider } from "./store.jsx";
import { api } from "./api.js";

export default function App() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const s = await api.getStats();
        if (!cancelled) setStats(s);
      } catch {}
    };
    load();
    const t = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <SelectProvider>
      <div className="app">
        <header className="app__header">
          <div className="app__brand">
            <h1>Список 1 000 000 элементов</h1>
            <p className="app__subtitle">
              Выбор и порядок сохраняются на сервере и общие для всех. Поиск -
              только в этой сессии.
            </p>
          </div>
          {stats && (
            <div className="app__stats" aria-label="Сводка">
              <Stat label="Всего" value={stats.totalInitial} />
              <Stat label="Добавлено" value={stats.customCount} accent="info" />
              <Stat
                label="Выбрано"
                value={stats.selectedCount}
                accent="primary"
              />
              <Stat label="Осталось" value={stats.unselectedCount} />
            </div>
          )}
        </header>

        <main className="app__main">
          <LeftPanel />
          <RightPanel />
        </main>
      </div>
    </SelectProvider>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className={`stat stat--${accent || "default"}`}>
      <div className="stat__value">{Number(value).toLocaleString("ru-RU")}</div>
      <div className="stat__label">{label}</div>
    </div>
  );
}
