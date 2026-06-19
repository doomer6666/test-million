import express from 'express';
import { store, INITIAL_MAX_ID } from './store.js';
import { Batcher } from './batcher.js';

const router = express.Router();

const addBatcher = new Batcher(
    10_000,
    (items) => items.map((it) => {
        try {
            const created = store.addCustomItem(it.id);
            return { ok: true, item: created };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }),
    (it) => `add:${it.id}`,
    'add'
);

const writeBatcher = new Batcher(
    1_000,
    (items) => items.map((it) => {
        try {
            if (it.type === 'select') {
                store.selectItem(it.id);
                return { ok: true };
            } else if (it.type === 'unselect') {
                store.unselectItem(it.id);
                return { ok: true };
            } else if (it.type === 'reorder') {
                store.reorder(it.order);
                return { ok: true, count: it.order.length };
            }
            return { ok: false, error: 'unknown op' };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }),
    (it) => {
        if (it.type === 'reorder') return 'reorder';
        return `${it.type}:${it.id}`;
    },
    'write'
);

async function flushAddIfNeeded(id) {
    if (addBatcher.buffer.has(`add:${id}`)) {
        await addBatcher.flush();
    }
}

router.get('/items', (req, res) => {
    const { search = '', offset = '0', limit = '20' } = req.query;
    const result = store.getUnselected({
        search,
        offset: Number(offset),
        limit: Number(limit),
    });
    res.json(result);
});

router.get('/items/count', (req, res) => {
    const { search = '' } = req.query;
    res.json({ count: store.getUnselectedCount(search) });
});

router.get('/selected', (req, res) => {
    const { search = '', offset = '0', limit = '20' } = req.query;
    const result = store.getSelected({
        search,
        offset: Number(offset),
        limit: Number(limit),
    });
    res.json(result);
});

router.get('/selected/count', (req, res) => {
    const { search = '' } = req.query;
    res.json({ count: store.getSelectedCount(search) });
});

router.get('/selected/all', (_req, res) => {
    res.json({ order: store.getSelectedAllIds() });
});

router.get('/stats', (_req, res) => {
    res.json({
        ...store.stats(),
        maxId: INITIAL_MAX_ID,
    });
});

router.post('/items', async (req, res) => {
    const { id } = req.body || {};
    if (id === undefined || id === null) {
        return res.status(400).json({ ok: false, error: 'Не передан id' });
    }
    try {
        const result = await addBatcher.add({ id });
        if (!result.ok) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/selected', async (req, res) => {
    const { id } = req.body || {};
    if (id === undefined || id === null) {
        return res.status(400).json({ ok: false, error: 'Не передан id' });
    }
    try {
        await flushAddIfNeeded(Number(id));
        const result = await writeBatcher.add({ type: 'select', id });
        if (!result.ok) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.delete('/selected/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ ok: false, error: 'Некорректный id' });
    }
    try {
        const result = await writeBatcher.add({ type: 'unselect', id });
        if (!result.ok) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.put('/selected/order', async (req, res) => {
    const { order } = req.body || {};
    if (!Array.isArray(order)) {
        return res.status(400).json({ ok: false, error: 'order должен быть массивом' });
    }
    try {
        const result = await writeBatcher.add({ type: 'reorder', order });
        if (!result.ok) return res.status(400).json(result);
        res.json(result);
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

router.post('/_debug/reset', (_req, res) => {
    store.customItems.clear();
    store.selectedOrder.length = 0;
    store.selectedSet.clear();
    res.json({ ok: true });
});

router.get('/_debug/batchers', (_req, res) => {
    res.json({
        add: { pending: addBatcher.buffer.size },
        write: { pending: writeBatcher.buffer.size },
    });
});

export { router, addBatcher, writeBatcher };
