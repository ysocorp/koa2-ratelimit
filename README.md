#  Koajs 2 Rate Limit (Bruteforce)

Rate-limiting middleware for Koa2 with `async` `await`. Use to limit repeated requests to APIs and/or endpoints such as password reset.

Note: This module is base on [express-rate-limit](https://github.com/nfriedly/express-rate-limit) and adapted to koa2 ES6 with `async` `await` function.


## Install

```sh
$ npm install --save koa2-ratelimit
```

## Usage

For an API-only server where the rate-limiter should be applied to all requests:

```js
const RateLimit = require('koa2-ratelimit').RateLimit;

const limiter = RateLimit.middleware({
  windowMs: 15*60*1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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
  windowMs: 15*60*1000, // 15 minutes
  max: 100,
  prefixKey: 'get/user/:id' // to allow the bdd to Differentiate the endpoint 
});
// add route with getUserLimiter middleware
router.get('/user/:id', getUserLimiter, (ctx) => {
  // Do your job
});

const createAccountLimiter = RateLimit.middleware({
  windowMs: 60*60*1000, // 1 hour window
  delayAfter: 1, // begin slowing down responses after the first request
  delayMs: 3*1000, // slow down subsequent responses by 3 seconds per request
  max: 5, // start blocking after 5 requests
  prefixKey: 'post/user', // to allow the bdd to Differentiate the endpoint 
  message: "Too many accounts created from this IP, please try again after an hour"
});
// add route  with createAccountLimiter middleware
router.post('/user', createAccountLimiter, (ctx) => {
  // Do your job
});

// mount routes
app.use(this.koaRouter.middleware())

```

Set default options to all your middleware:

```js
const RateLimit = require('koa2-ratelimit').RateLimit;

RateLimit.defaultOptions({
    message: 'Go out.',
    // ...
});

const getUserLimiter = RateLimit.middleware({
  max: 100,
  // message: 'Go out.', will be add
});

const createAccountLimiter = RateLimit.middleware({
  max: 5, // start blocking after 5 requests
  // message: 'Go out.', will be add
});
```

Use with SequelizeStore 

```js
const Sequelize = require('sequelize');
const RateLimit = require('koa2-ratelimit').RateLimit;
const SequelizeStore = require('koa2-ratelimit').SequelizeStore;

const sequelize = new Sequelize(/*your config to connected to bdd*/);

RateLimit.defaultOptions({
    message: 'Go out.',
    store: new SequelizeStore(sequelize, {
        tableName: 'ratelimits', // table to manage the middleware
        tableAbuseName: 'ratelimitsabuses', // table to have an history of abuses
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
app.use(this.koaRouter.middleware())

```

A `ctx.state.rateLimit` property is added to all requests with the `limit`, `current`, and `remaining` number of requests for usage in your application code.

## Configuration

* **windowMs**: milliseconds - how long to keep records of requests in memory. Defaults to `60000` (1 minute).
* **delayAfter**: max number of connections during `windowMs` before starting to delay responses. Defaults to `1`. Set to `0` to disable delaying.  
* **delayMs**: milliseconds - how long to delay the response, multiplied by (number of recent hits - `delayAfter`).  Defaults to `1000` (1 second). Set to `0` to disable delaying.
* **max**: max number of connections during `windowMs` milliseconds before sending a 429 response. Defaults to `5`. Set to `0` to disable.
* **message**: Error message returned when `max` is exceeded. Defaults to `'Too many requests, please try again later.'`
* **statusCode**: HTTP status code returned when `max` is exceeded. Defaults to `429`.
* **headers**: Enable headers for request limit (`X-RateLimit-Limit`) and current usage (`X-RateLimit-Remaining`) on all responses and time to wait before retrying (`Retry-After`) when `max` is exceeded.
* **skipFailedRequests**: when `true` failed requests (response status >= 400) won't be counted. Defaults to `false`.
* **getUserId**: Function used to get userId (if connected) to be add has key and save in bdd if abuse. Defaults:

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
    
* **keyGenerator**: Function used to generate keys. By default userID if conected or user IP address. Defaults:

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

* **handler**: The function to execute once the max limit is exceeded. It receives the request and the response objects. The "next" param is available if you need to pass to the next middleware. Defaults:

    ```js
    async function (ctx, /*next*/) {
        ctx.status = this.options.statusCode;
        ctx.body = { message: this.options.message };
        if (this.options.headers) {
            ctx.set('Retry-After', Math.ceil(this.options.windowMs / 1000));
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

* **store**: The storage to use when persisting rate limit attempts. By default, the [MemoryStore](src/MemoryStore.js) is used.

  Avaliable data stores are:
   * [MemoryStore](src/MemoryStore.js): (default)Simple in-memory option. Does not share state when app has multiple processes or servers.
   * [SequelizeStore](src/SequelizeStore.js): more suitable for large or demanding deployments.

The `delayAfter` and `delayMs` options were written for human-facing pages such as login and password reset forms.
For public APIs, setting these to `0` (disabled) and relying on only `windowMs` and `max` for rate-limiting usually makes the most sense.


## License

MIT © [YSO Corp](http://ysocorp.com/)

