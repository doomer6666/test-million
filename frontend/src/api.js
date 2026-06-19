async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // не JSON
  }

  if (!res.ok) {
    const message = data?.error || `${res.status} ${res.statusText}`;
    const err = new Error(message);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

function qs(params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  getItems: ({ search = '', offset = 0, limit = 20 } = {}) =>
    request(`/api/items${qs({ search, offset, limit })}`),

  getItemsCount: ({ search = '' } = {}) =>
    request(`/api/items/count${qs({ search })}`),

  addItem: (id) =>
    request('/api/items', { method: 'POST', body: JSON.stringify({ id }) }),

  getSelected: ({ search = '', offset = 0, limit = 20 } = {}) =>
    request(`/api/selected${qs({ search, offset, limit })}`),

  getSelectedCount: ({ search = '' } = {}) =>
    request(`/api/selected/count${qs({ search })}`),

  getSelectedAll: () => request('/api/selected/all'),

  selectItem: (id) =>
    request('/api/selected', { method: 'POST', body: JSON.stringify({ id }) }),

  unselectItem: (id) =>
    request(`/api/selected/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  reorderSelected: (order) =>
    request('/api/selected/order', {
      method: 'PUT',
      body: JSON.stringify({ order }),
    }),

  getStats: () => request('/api/stats'),
};
