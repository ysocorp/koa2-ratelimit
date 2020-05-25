"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Store_1 = tslib_1.__importDefault(require("./Store"));
let Hits = {};
class MemoryStore extends Store_1.default {
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
        const hits = this._getHit(key, options);
        hits.counter -= weight;
    }
    saveAbuse() { }
}
exports.default = MemoryStore;
//# sourceMappingURL=MemoryStore.js.map