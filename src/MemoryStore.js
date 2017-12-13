const Store = require('./Store.js');

const Hits = {};

class MemoryStore extends Store {

    initOptions(options) {
        super.initOptions(options);

        const interval = setInterval(() => this._resetAll(), this.options.windowMs);
        if (interval.unref) {
            interval.unref();
        }
    }

    _getHit(key) {
        if (!Hits[key]) {
            const now = new Date();
            Hits[key] = {
                counter: 0,
                date_end: now.getTime() + this.options.windowMs,
            };
        }
        return Hits[key];
    }

    _resetAll() {
        const now = (new Date()).getTime();
        for (const key in Hits) {
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

    async incr(key) {
        this._resetKey(key);
        const hits = this._getHit(key);
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