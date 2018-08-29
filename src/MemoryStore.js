const Store = require('./Store.js');

class MemoryStore extends Store {
    constructor() {
        super();
        this.hits = {};
    }

    _getHit(key, options) {
        if (!this.hits[key]) {
            this.hits[key] = {
                counter: 0,
                date_end: Date.now() + options.interval,
            };
        }
        return this.hits[key];
    }

    _resetAll() {
        const now = Date.now();
        for (const key in this.hits) { // eslint-disable-line
            this._resetKey(key, now);
        }
    }

    _resetKey(key, now) {
        now = now || Date.now();
        if (this.hits[key] && this.hits[key].date_end <= now) {
            delete this.hits[key];
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
