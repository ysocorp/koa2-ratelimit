/**
 * RedisStore
 *
 * RedisStore for koa2-ratelimit
 *
 * @author Ashok Vishwakarma <akvlko@gmail.com>
 */

import Redis = require('ioredis');

/**
 * Store
 *
 * Existing Store class
 */
import Store from './Store';


/**
 * RedisStore
 *
 * Class RedisStore
 */
class RedisStore extends Store {
    client: Redis.Redis

    constructor(config: Redis.RedisOptions) {
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
    async _hit(key: any, options: { interval: number; }, weight: any) {
        let [counter, dateEnd] = await this.client.multi().get(key).ttl(key).exec() as any;

        if (counter === null) {
            counter = weight;
            dateEnd = Date.now() + options.interval;

            const seconds = Math.ceil(options.interval / 1000);
            await this.client.setex(key, seconds, counter);
        } else {
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
    async incr(key: any, options: any, weight: any) {
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
    async decrement(key: any, options: any, weight: any) {
        await this.client.decrby(key, weight);
    }

    /**
* saveAbuse
*
* Override saveAbuse method from Store class
*/
    saveAbuse() { }
}

export default RedisStore;
