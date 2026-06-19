const INITIAL_MAX_ID = 1_000_000;

class Store {
    constructor() {
        /** @type {Map<number, {id: number}>} */
        this.customItems = new Map();
        /** @type {number[]} порядок выбранных (включая кастомные) */
        this.selectedOrder = [];
        /** @type {Set<number>} */
        this.selectedSet = new Set();
    }

    getUnselected({ search = '', offset = 0, limit = 20 } = {}) {
        const searchStr = String(search || '');
        const results = [];
        let skipped = 0;
        let produced = 0;
        const cap = Math.min(Number(limit) || 20, 20);
        const startOffset = Math.max(Number(offset) || 0, 0);

        const customIds = Array.from(this.customItems.keys()).sort((a, b) => a - b);

        for (const id of customIds) {
            if (this.selectedSet.has(id)) continue;
            if (searchStr && !String(id).includes(searchStr)) continue;

            if (skipped < startOffset) {
                skipped++;
                continue;
            }
            results.push({ id });
            produced++;
            if (produced >= cap) break;
        }

        let hasMore = produced >= cap && results.length === cap;
        if (produced < cap) {
            for (let id = 1; id <= INITIAL_MAX_ID; id++) {
                if (this.selectedSet.has(id)) continue;
                if (searchStr && !String(id).includes(searchStr)) continue;

                if (skipped < startOffset) {
                    skipped++;
                    continue;
                }
                results.push({ id });
                produced++;
                if (produced >= cap) {
                    hasMore = id < INITIAL_MAX_ID || customIds.length > 0;
                    break;
                }
            }
        }

        if (!hasMore) {
            const total = this.getUnselectedCount(searchStr);
            hasMore = startOffset + results.length < total;
        }

        return { items: results, hasMore };
    }

    getUnselectedCount(search = '') {
        const searchStr = String(search || '');
        let count = 0;

        for (const id of this.customItems.keys()) {
            if (this.selectedSet.has(id)) continue;
            if (searchStr && !String(id).includes(searchStr)) continue;
            count++;
        }

        if (searchStr) {
            for (let id = 1; id <= INITIAL_MAX_ID; id++) {
                if (this.selectedSet.has(id)) continue;
                if (!String(id).includes(searchStr)) continue;
                count++;
            }
        } else {
            count += INITIAL_MAX_ID + this.customItems.size - this.selectedSet.size;
        }

        return count;
    }

    _countSelectedInInitial() {
        let n = 0;
        for (const id of this.selectedSet) {
            if (id >= 1 && id <= INITIAL_MAX_ID) n++;
        }
        return n;
    }
    getSelected({ search = '', offset = 0, limit = 20 } = {}) {
        const searchStr = String(search || '');
        const results = [];
        let skipped = 0;
        let produced = 0;
        const cap = Math.min(Number(limit) || 20, 20);
        const startOffset = Math.max(Number(offset) || 0, 0);

        for (let i = 0; i < this.selectedOrder.length; i++) {
            const id = this.selectedOrder[i];
            if (searchStr && !String(id).includes(searchStr)) continue;

            if (skipped < startOffset) {
                skipped++;
                continue;
            }
            results.push({ id });
            produced++;
            if (produced >= cap) break;
        }

        const total = this.getSelectedCount(searchStr);
        const hasMore = startOffset + results.length < total;
        return { items: results, hasMore };
    }

    getSelectedCount(search = '') {
        const searchStr = String(search || '');
        if (!searchStr) return this.selectedOrder.length;
        let count = 0;
        for (const id of this.selectedOrder) {
            if (String(id).includes(searchStr)) count++;
        }
        return count;
    }

    getSelectedAllIds() {
        return [...this.selectedOrder];
    }

    addCustomItem(id) {
        const numericId = Number(id);
        if (!Number.isInteger(numericId) || numericId < 0) {
            throw new Error('ID должен быть целым неотрицательным числом');
        }
        if (numericId >= 1 && numericId <= INITIAL_MAX_ID) {
            throw new Error(`ID ${numericId} уже существует в начальном диапазоне`);
        }
        if (this.customItems.has(numericId)) {
            throw new Error(`ID ${numericId} уже добавлен`);
        }
        this.customItems.set(numericId, { id: numericId });
        return { id: numericId };
    }

    selectItem(id) {
        const numericId = Number(id);
        if (!this._itemExists(numericId)) {
            throw new Error(`Элемент ${numericId} не существует`);
        }
        if (!this.selectedSet.has(numericId)) {
            this.selectedOrder.push(numericId);
            this.selectedSet.add(numericId);
        }
        return { id: numericId };
    }

    unselectItem(id) {
        const numericId = Number(id);
        if (this.selectedSet.has(numericId)) {
            this.selectedSet.delete(numericId);
            const idx = this.selectedOrder.indexOf(numericId);
            if (idx !== -1) this.selectedOrder.splice(idx, 1);
        }
        return { id: numericId };
    }

    reorder(newOrder) {
        if (!Array.isArray(newOrder)) {
            throw new Error('order должен быть массивом');
        }
        if (newOrder.length !== this.selectedOrder.length) {
            throw new Error(
                `Длина ${newOrder.length} не совпадает с текущим количеством выбранных ${this.selectedOrder.length}`
            );
        }
        const seen = new Set();
        for (const id of newOrder) {
            const n = Number(id);
            if (!Number.isInteger(n)) throw new Error(`Некорректный ID: ${id}`);
            if (seen.has(n)) throw new Error(`Дубликат ID в order: ${n}`);
            if (!this.selectedSet.has(n)) throw new Error(`ID ${n} не выбран`);
            seen.add(n);
        }
        this.selectedOrder = newOrder.map(Number);
        return { count: this.selectedOrder.length };
    }

    stats() {
        return {
            totalInitial: INITIAL_MAX_ID,
            customCount: this.customItems.size,
            selectedCount: this.selectedOrder.length,
            unselectedCount:
                INITIAL_MAX_ID +
                this.customItems.size -
                this._countSelectedInInitial() -
                this._countSelectedCustom(),
        };
    }

    _countSelectedCustom() {
        let n = 0;
        for (const id of this.selectedSet) {
            if (this.customItems.has(id)) n++;
        }
        return n;
    }

    _itemExists(id) {
        if (!Number.isInteger(id)) return false;
        if (id >= 1 && id <= INITIAL_MAX_ID) return true;
        return this.customItems.has(id);
    }
}

export const store = new Store();
export { INITIAL_MAX_ID };
