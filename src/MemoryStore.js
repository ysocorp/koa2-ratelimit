const Store = require('./Store.js');

let Hits = {};

class MemoryStore extends Store {
    static cleanAll() {
        Hits = {};
    }

    _getHit(key, options) {
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

    _resetKey(key, now) {
        now = now || Date.now();
        if (Hits[key] && Hits[key].date_end <= now) {
            delete Hits[key];
        }
    }

    async incr(key, options, weight) {
        this._resetAll();
        const hits = this._getHit(key, options);
        hits.counter += weight;

        return {
            counter: hits.counter,
            dateEnd: hits.date_end,
        };
    }

    decrement(key, options, weight) {
        const hits = this._getHit(key);
        hits.counter -= weight;
    }

    saveAbuse() {}
}

module.exports = MemoryStore;
