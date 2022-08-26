#  Koajs 2 Rate Limit (Bruteforce)

[![Build Status](https://secure.travis-ci.org/ysocorp/koa2-ratelimit.png?branch=master "Test")](http://travis-ci.org/ysocorp/koa2-ratelimit)
[![NPM version](http://badge.fury.io/js/koa2-ratelimit.png)](https://npmjs.org/package/koa2-ratelimit "View this project on NPM")

Rate-limiting middleware for Koa2 with `async` `await`. Use to limit repeated requests to APIs and/or endpoints such as password reset.

Note: This module is based on [express-rate-limit](https://github.com/nfriedly/express-rate-limit) and adapted to koa2 ES6 with the `async` `await` capabilities.

## Summary

- [Install](#install)
- [Usage](#usage)
    - [Use with RedisStore](#use-with-redisStore)
    - [Use with SequelizeStore](#use-with-sequelizestore)
    - [Use with MongooseStore (Mongodb)](#use-with-mongoosestore)
- [Configuration](#configuration)
- [Time Type](#time-type)
- [Upgrade](#upgrade)
 - [0.9.1 to 1.0.0](#0.9.1-to-1.0.0)


## Install

```sh
$ npm install --save koa2-ratelimit
```

## Usage

For an API-only server where the rate-limiter should be applied to all requests:

```js
const RateLimit = require('koa2-ratelimit').RateLimit;

const limiter = RateLimit.middleware({
  interval: { min: 15 }, // 15 minutes = 15*60*1000
  max: 100, // limit each IP to 100 requests per interval
});

//  apply to all requests
app.use(limiter);
```

Create multiple instances to apply different rules to different routes:

```js
const RateLimit = require('koa2-ratelimit').RateLimit;
const KoaRouter = require('koa-router');
const router = new KoaRouter();

const getUserLimiter = RateLimit.middleware({
  interval: 15*60*1000, // 15 minutes
  max: 100,
  prefixKey: 'get/user/:id' // to allow the bdd to Differentiate the endpoint 
});
// add route with getUserLimiter middleware
router.get('/user/:id', getUserLimiter, (ctx) => {
  // Do your job
});

const createAccountLimiter = RateLimit.middleware({
  interval: { hour: 1, min: 30 }, // 1h30 window
  delayAfter: 1, // begin slowing down responses after the first request
  timeWait: 3*1000, // slow down subsequent responses by 3 seconds per request
  max: 5, // start blocking after 5 requests
  prefixKey: 'post/user', // to allow the bdd to Differentiate the endpoint 
  message: "Too many accounts created from this IP, please try again after an hour",
  messageKey: "message"
});
// add route  with createAccountLimiter middleware
router.post('/user', createAccountLimiter, (ctx) => {
  // Do your job
});

// mount routes
app.use(router.middleware())

```

Set default options to all your middleware:

```js
const RateLimit = require('koa2-ratelimit').RateLimit;

RateLimit.defaultOptions({
    message: 'Get out.',
    // ...
});

const getUserLimiter = RateLimit.middleware({
  max: 100,
  // message: 'Get out.', will be added
});

const createAccountLimiter = RateLimit.middleware({
  max: 5, // start blocking after 5 requests
  // message: 'Get out.', will be added
});
```

### Use with RedisStore 

```bash
npm install redis@4
```

```js
const RateLimit = require('koa2-ratelimit').RateLimit;
const Stores = require('koa2-ratelimit').Stores;
//Detailed Redis Configuration Reference: https://github.com/redis/node-redis/blob/master/docs/client-configuration.md
RateLimit.defaultOptions({
    message: 'Get out.',
    store: new Stores.Redis({
        socket: {
            host: 'redis_host',
            port: 'redis_port',
        },
        password: 'redis_password',
        database: 1
    })
});

const getUserLimiter = RateLimit.middleware({
    prefixKey: 'get/user/:id',
});
router.get('/user/:id', getUserLimiter, (ctx) => {});

const createAccountLimiter = RateLimit.middleware.middleware({
    prefixKey: 'post/user',
});
router.post('/user', createAccountLimiter, (ctx) => {});

// mount routes
app.use(router.middleware())
```

### Use with SequelizeStore 

```bash
npm install sequelize@5
```

```js
const Sequelize = require('sequelize');
const RateLimit = require('koa2-ratelimit').RateLimit;
const Stores = require('koa2-ratelimit').Stores;

const sequelize = new Sequelize(/*your config to connected to bdd*/);

RateLimit.defaultOptions({
    message: 'Get out.',
    store: new Stores.Sequelize(sequelize, {
        tableName: 'ratelimits', // table to manage the middleware
        tableAbuseName: 'ratelimitsabuses', // table to store the history of abuses in.
    })
});

const getUserLimiter = RateLimit.middleware({
    prefixKey: 'get/user/:id',
});
router.get('/user/:id', getUserLimiter, (ctx) => {});

const createAccountLimiter = RateLimit.middleware.middleware({
    prefixKey: 'post/user',
});
router.post('/user', createAccountLimiter, (ctx) => {});

// mount routes
app.use(router.middleware())
```

### Use with MongooseStore (Mongodb)

```bash
npm install mongoose@5
```

```js
const mongoose = require('mongoose');
const RateLimit = require('koa2-ratelimit').RateLimit;
const Stores = require('koa2-ratelimit').Stores;

await mongoose.connect(/*your config to connected to bdd*/);

RateLimit.defaultOptions({
    message: 'Get out.',
    store: new Stores.Mongodb(mongoose.connection, {
        collectionName: 'ratelimits', // table to manage the middleware
        collectionAbuseName: 'ratelimitsabuses', // table to store the history of abuses in.
    }),
});

```

A `ctx.state.rateLimit` property is added to all requests with the `limit`, `current`, and `remaining` number of requests for usage in your application code.

## Configuration

* **interval**: [Time Type](#time-type) - how long should records of requests be kept in memory. Defaults to `60000` (1 minute).
* **delayAfter**: max number of connections during `interval` before starting to delay responses. Defaults to `1`. Set to `0` to disable delaying.  
* **timeWait**: [Time Type](#time-type) - how long to delay the response, multiplied by (number of recent hits - `delayAfter`).  Defaults to `1000` (1 second). Set to `0` to disable delaying.
* **max**: max number of connections during `interval` milliseconds before sending a `429` response code. Defaults to `5`. Set to `0` to disable.
* **message**: Error message returned when `max` is exceeded. Defaults to `'Too many requests, please try again later.'`
* **statusCode**: HTTP status code returned when `max` is exceeded. Defaults to `429`.
* **headers**: Enable headers for request limit (`X-RateLimit-Limit`) and current usage (`X-RateLimit-Remaining`) on all responses and time to wait before retrying (`Retry-After`) when `max` is exceeded.
* **skipFailedRequests**: when `true`, failed requests (response status >= 400) won't be counted. Defaults to `false`.
* **whitelist**: Array of whitelisted IPs/UserIds to not be rate limited.
* **getUserIdFromKey**: Function that extracts from given key the userId. Defaults to `(key) => key.split(options.prefixKeySeparator)`.
* **prefixKeySeparator**: Separator string between the prefixKey and the userId. Defaults to `::`. (Set it to `|` if you want whitelist userIds)
* **getUserId**: Function used to get userId (if connected) to be added as key and saved in bdd, should an abuse case surface. Defaults:

    ```js
    async function (ctx) {
        const whereFinds = [ctx.state.user, ctx.user, ctx.state.User, 
          ctx.User, ctx.state, ctx];
        const toFinds = ['id', 'userId', 'user_id', 'idUser', 'id_user'];
        for (const whereFind of whereFinds) {
          if (whereFind) {
            for (const toFind of toFinds) {
              if (whereFind[toFind]) {
                  return whereFind[toFind];
              }
            }
          }
        }
        return null;
    },
    ```
    
* **keyGenerator**: Function used to generate keys. By default userID (if connected) or the user's IP address. Defaults:

    ```js
    async function (ctx) {
        const userId = await this.options.getUserId(ctx);
        if (userId) {
            return `${this.options.prefixKey}|${userId}`;
        }
        return `${this.options.prefixKey}|${ctx.request.ip}`;
    }
    ```

* **skip**: Function used to skip requests. Returning true from the function will skip limiting for that request. Defaults:

    ```js
    async function (/*ctx*/) {
        return false;
    }
    ```

* **handler**: The function to execute once the max limit has been exceeded. It receives the request and the response objects. The "next" param is available if you need to pass to the next middleware. Defaults:

    ```js
    async function (ctx/*, next*/) {
        ctx.status = this.options.statusCode;
        ctx.body = { message: this.options.message };
        if (this.options.headers) {
            ctx.set('Retry-After', Math.ceil(this.options.interval / 1000));
        }
    }
    ```

* **onLimitReached**: Function to listen each time the limit is reached. It call the store to save abuse, You can use it to debug/log. Defaults:

    ```js
    async function (ctx) {
        this.store.saveAbuse({
            key: await this.options.keyGenerator(ctx),
            ip: ctx.request.ip,
            user_id: await this.options.getUserId(ctx),
        });
    }
    ```

* **weight**: Function to set the incrementation of the counter depending on the request. Defaults:

    ```js
    async function (/*ctx*/) {
        return 1;
    }
    ```

* **store**: The storage to use when persisting rate limit attempts. By default, the [MemoryStore](src/MemoryStore.js) is used.

  Avaliable data stores are:
   * [MemoryStore](src/MemoryStore.js): (default)Simple in-memory option. Does not share state when app has multiple processes or servers.
   * [SequelizeStore](src/SequelizeStore.js): more suitable for large or demanding deployments.

The `delayAfter` and `timeWait` options were written for human-facing pages such as login and password reset forms.
For public APIs, setting these to `0` (disabled) and relying on only `interval` and `max` for rate-limiting usually makes the most sense.


## Time Type
Time type can be milliseconds or an object
```js
    Times = {
        ms ?: number,
        sec ?: number,
        min ?: number,
        hour ?: number,
        day ?: number,
        week ?: number,
        month ?: number,
        year ?: number,
    };
```

Examples
```js
    RateLimit.middleware({
        interval: { hour: 1, min: 30 }, // 1h30 window
        timeWait: { week: 2 }, // 2 weeks window
    });
    RateLimit.middleware({
        interval: { ms: 2000 }, // 2000 ms = 2 sec
        timeWait: 2000, // 2000 ms = 2 sec
    });
```
    
## Upgrade

### 0.9.1 to 1.0.0

1.0.0 moves sequelize, mongoose and redis from dependencies to peerDependencies.

Install the one you use (see [Use with RedisStore](#use-with-redisStore), [Use with SequelizeStore](#use-with-sequelizestore) or [Use with MongooseStore (Mongodb)](#use-with-mongoosestore)).

The rest did not change.


## License

MIT © [YSO Corp](http://ysocorp.com/)

