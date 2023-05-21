/**
 * IORedisStore
 *
 * IORedis Store for koa2-ratelimit
 *
 * @author Ross MacPhee (https://ross.software)
 */

const IORedis = require('ioredis');
const Store = require('./Store.js');

/**
 * RedisStore
 *
 * Class RedisStore
 */
class IORedisStore extends Store {
    /**
     * constructor
     * @param {*} config
     *
     * Constructor accepts any IORedis configuration.
     */
    constructor(config) {
        super();
        this.client = new IORedis(config);
        this.client.on('error', (err) => console.log('IORedis Client Error', err));
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
    saveAbuse() {}

    /**
     * _hit
     * @access private
     * @param {*} key
     * @param {*} options
     * @param {*} weight
     */
    async _hit(key, options, weight) {
        let [[, counter], [, dateEnd]] = await this.client.multi()
            .get(key)
            .ttl(key)
            .exec();
        if (counter === null || dateEnd === -2 || dateEnd === -1) {
            counter += weight;
            dateEnd = Date.now() + options.interval;
            await this.client.setex(
                key,
                Math.ceil(options.interval / 1000),
                counter,
            );
        } else {
            counter = await this.client.incrby(key, weight);
        }
        return { counter, dateEnd };
    }
}

module.exports = IORedisStore;
