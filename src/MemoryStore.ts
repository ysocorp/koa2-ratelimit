import Store from './Store';

let Hits = {};

class MemoryStore extends Store {
    static cleanAll() {
        Hits = {};
    }

    _getHit(key: string | number, options?: any) {
        if (!Hits[key]) {
            Hits[key] = {
                counter: 0,
                date_end: Date.now() + options.interval,
            };
        }
        return Hits[key];
    }

    _resetAll() {
        const now = Date.now();
        for (const key in Hits) { // eslint-disable-line
            this._resetKey(key, now);
        }
    }

    _resetKey(key: string, now: number) {
        now = now || Date.now();
        if (Hits[key] && Hits[key].date_end <= now) {
            delete Hits[key];
        }
    }

    async incr(key: string | number, options: any, weight: any) {
        this._resetAll();
        const hits = this._getHit(key, options);
        hits.counter += weight;

        return {
            counter: hits.counter,
            dateEnd: hits.date_end,
        };
    }

    decrement(key: string | number, options: any, weight: number) {
        const hits = this._getHit(key, options);
        hits.counter -= weight;
    }

    saveAbuse() { }
}

export default MemoryStore;
