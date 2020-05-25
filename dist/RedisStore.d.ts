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
declare class RedisStore extends Store {
    client: Redis.Redis;
    constructor(config: Redis.RedisOptions);
    /**
* _hit
* @access private
* @param {*} key
* @param {*} options
* @param {*} weight
*/
    _hit(key: any, options: {
        interval: number;
    }, weight: any): Promise<{
        counter: any;
        dateEnd: any;
    }>;
    /**
* incr
*
* Override incr method from Store class
* @param {*} key
* @param {*} options
* @param {*} weight
*/
    incr(key: any, options: any, weight: any): Promise<{
        counter: any;
        dateEnd: any;
    }>;
    /**
* decrement
*
* Override decrement method from Store class
* @param {*} key
* @param {*} options
* @param {*} weight
*/
    decrement(key: any, options: any, weight: any): Promise<void>;
    /**
* saveAbuse
*
* Override saveAbuse method from Store class
*/
    saveAbuse(): void;
}
export default RedisStore;
