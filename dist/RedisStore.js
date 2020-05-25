"use strict";
/**
 * RedisStore
 *
 * RedisStore for koa2-ratelimit
 *
 * @author Ashok Vishwakarma <akvlko@gmail.com>
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Redis = require("ioredis");
/**
 * Store
 *
 * Existing Store class
 */
const Store_1 = tslib_1.__importDefault(require("./Store"));
/**
 * RedisStore
 *
 * Class RedisStore
 */
class RedisStore extends Store_1.default {
    constructor(config) {
        super();
        this.client = new Redis(config);
    }
    /**
* _hit
* @access private
* @param {*} key
* @param {*} options
* @param {*} weight
*/
    async _hit(key, options, weight) {
        let [counter, dateEnd] = await this.client.multi().get(key).ttl(key).exec();
        if (counter === null) {
            counter = weight;
            dateEnd = Date.now() + options.interval;
            const seconds = Math.ceil(options.interval / 1000);
            await this.client.setex(key, seconds, counter);
        }
        else {
            counter = await this.client.incrby(key, weight);
        }
        return {
            counter,
            dateEnd,
        };
    }
    /**
* incr
*
* Override incr method from Store class
* @param {*} key
* @param {*} options
* @param {*} weight
*/
    async incr(key, options, weight) {
        return this._hit(key, options, weight);
    }
    /**
* decrement
*
* Override decrement method from Store class
* @param {*} key
* @param {*} options
* @param {*} weight
*/
    async decrement(key, options, weight) {
        await this.client.decrby(key, weight);
    }
    /**
* saveAbuse
*
* Override saveAbuse method from Store class
*/
    saveAbuse() { }
}
exports.default = RedisStore;
//# sourceMappingURL=RedisStore.js.map