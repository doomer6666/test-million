export class Batcher {
    /**
     * @param {number} interval интервал flush в мс
     * @param {(items: any[]) => any[]} processor функция обработки пачки
     * @param {(item: any) => string} getKey функция извлечения ключа дедупликации
     * @param {string} name имя для логов
     */
    constructor(interval, processor, getKey, name = 'batcher') {
        this.interval = interval;
        this.processor = processor;
        this.getKey = getKey;
        this.name = name;
        /** @type {Map<string, {item: any, resolve: Function, reject: Function}>} */
        this.buffer = new Map();
        this.flushing = false;

        this.timer = setInterval(() => this.flushSafe(), interval);
        // Не держим процесс из-за таймера.
        if (this.timer.unref) this.timer.unref();
    }

    /**
     * Добавить запрос в буфер. Возвращает Promise, который
     * зарезолвится результатом после ближайшего flush.
     * @param {any} item
     * @returns {Promise<any>}
     */
    add(item) {
        return new Promise((resolve, reject) => {
            const key = this.getKey(item);
            this.buffer.set(key, { item, resolve, reject });
        });
    }

    flushSafe() {
        if (this.buffer.size === 0) return;
        this.flush().catch((err) => {
            console.error(`[${this.name}] flush error`, err);
        });
    }

    async flush() {
        if (this.flushing) return;
        if (this.buffer.size === 0) return;
        this.flushing = true;

        const entries = Array.from(this.buffer.entries());
        this.buffer.clear();

        const items = entries.map(([, entry]) => entry.item);
        try {
            const results = this.processor(items);
            entries.forEach(([, entry], i) => entry.resolve(results[i]));
        } catch (err) {
            // Если процессор кинул — реджектим все ожидающие.
            entries.forEach(([, entry]) => entry.reject(err));
        } finally {
            this.flushing = false;
        }
    }

    stop() {
        clearInterval(this.timer);
        return this.flush();
    }
}
