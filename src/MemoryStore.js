const Store = require('./Store.js');

var Hits = {};

class MemoryStore extends Store {
    static cleanAll() {
        Hits = {};
    }

    _getHit(key, options) {
        if (!Hits[key]) {
            const now = new Date();
            Hits[key] = {
                counter: 0,
                date_end: now.getTime() + options.interval,
            };
        }
        return Hits[key];
    }

    _resetAll() {
        const now = (new Date()).getTime();
        for (const key in Hits) { // eslint-disable-line
            this._resetKey(key, now);
        }
    }

    _resetKey(key, now) {
        now = now || (new Date()).getTime();
        const elem = Hits[key];
        if (elem && elem.date_end <= now) {
            delete Hits[key];
        }
    }

    async incr(key, options) {
        this._resetAll();
        const hits = this._getHit(key, options);
        hits.counter += 1;

        return hits.counter;
    }

    decrement(key) {
        const hits = this._getHit(key);
        hits.counter -= 1;
    }

    saveAbuse() {}
}

module.exports = MemoryStore;
