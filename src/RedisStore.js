/**
 * RedisStore
 * 
 * RedisStore for koa2-ratelimit
 * 
 * @author Ashok Vishwakarma <akvlko@gmail.com>
 */

/**
 * Store
 * 
 * Existing Store class
 */
const Store = require('./Store.js');

/**
 * redis
 * 
 * node-redis module
 */
const redis = require('redis');

/**
 * RedisStore
 * 
 * Class RedisStore
 */
class RedisStore extends Store {
  /**
   * constructor
   * @param {*} config 
   * 
   * config is redis config
   */
  constructor(config){
    super();
    this.client = redis.createClient(config);
    this.client.on('error', (err) => console.log('Redis Client Error', err));
    this.client.connect()


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
    
    if(counter === null) {
      counter = weight;
      dateEnd = Date.now() + options.interval;

      const seconds = Math.ceil(options.interval / 1000);
      await this.client.setEx(key, seconds.toString(), counter.toString());
    } else if (dateEnd === -2 || dateEnd === -1) {
      counter = counter + weight;
      dateEnd = Date.now() + options.interval;

      const seconds = Math.ceil(options.interval / 1000);
      await this.client.setEx(key, seconds.toString(), counter.toString());
    } else {
      counter = await this.client.incrBy(key, weight);
    }

    return {
      counter,
      dateEnd
    }
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
    return await this._hit(key, options, weight);
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
    await this.client.decrBy(key, weight);
  }

  /**
   * saveAbuse
   * 
   * Override saveAbuse method from Store class
   */
  saveAbuse() {}
}

module.exports = RedisStore;
