/*global describe, it, beforeEach, afterEach */

var Koa = require('koa');
var bodyParser = require('koa-bodyparser');
var assert = require('assert');
var expect = require('expect');

var RateLimit = require('../src/RateLimit.js');
var MemoryStore = require('../src/MemoryStore.js');
var Store = require('../src/Store.js');


class InvalidStore { }


class MockStore extends Store {
    constructor() {
        super();
        this.nb = 0;

        this.incr_was_called = false;
        this.decrement_was_called = false;
        this.saveAbuse_was_called = false;
    }

    async incr(key) {
        this.nb++;
        this.incr_was_called = true;
        return this.nb;
    };

    async decrement(key) {
        this.decrement_was_called = true;
        this.nb--;
    }

    async saveAbuse() {
        this.saveAbuse_was_called = true;
    };
}


describe('RateLimit node module', () => {

    let start, nbCall, delay, message, app, ctx, store, memoryStore;

    beforeEach(() => {
        start = Date.now();
        store = new MockStore();
        memoryStore = new MemoryStore();
        message = 'You have been very naughty.. No API response for you!!';
        nbCall = 0;
        ctx = getCtx();
    });

    afterEach(() => {
        delay = null;
        nbCall = 0;
    });

    async function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    };
    function nextNb() { nbCall += 1; };
    function getCtx() {
        return {
            request: {
                ip: '192.168.1.0',
            },
            res: {
                on: () => { },
            },
            state: {
                user: {
                    id: 1,
                }
            },
            set: () => { },
        }
    };

    it("should not allow to use of a store that is not valid", (done) => {
        try {
            RateLimit({}, new InvalidStore());
        } catch (e) {
            return done();
        }

        done(new Error("It allowed an invalid store"));
    });

    it("should call incr on the store", async () => {
        const middleware = new RateLimit({ store }).middleware;

        await middleware(getCtx(), nextNb);
        expect(store.incr_was_called).toBe(true);
    });

    it("should apply a small delay to the second request", async () => {
        const middleware = new RateLimit({ delayAfter: 1, delayMs: 500, store }).middleware;
        await middleware(getCtx(), nextNb);

        start = Date.now();
        await middleware(getCtx(), nextNb);
        expect(Date.now() - start).toBeGreaterThan(500);
    });
    it("should apply a larger delay to the subsequent request", async () => {
        const middleware = new RateLimit({ delayAfter: 1, delayMs: 100, store }).middleware;
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);
        expect(Date.now() - start).toBeGreaterThan(400);
    });
    it("should allow delayAfter requests before delaying responses", async () => {
        const middleware = new RateLimit({ delayAfter: 2, delayMs: 100, store }).middleware;

        await middleware(getCtx(), nextNb);
        expect(Date.now() - start).toBeLessThan(50);

        await middleware(getCtx(), nextNb);
        expect(Date.now() - start).toBeLessThan(100);

        await middleware(getCtx(), nextNb);
        expect(Date.now() - start).toBeGreaterThan(100);
        expect(Date.now() - start).toBeLessThan(150);
    });

    it("should allow delayAfter to be disabled entirely", async () => {
        const middleware = new RateLimit({ delayAfter: 0, delayMs: 1000, store }).middleware;

        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);

        expect(Date.now() - start).toBeLessThan(100);
    });

    it("should refuse additional connections once IP has reached the max", async () => {
        const middleware = new RateLimit({ max: 1, store }).middleware;

        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);

        const isCall = false;
        const myNext = () => { isCall: true };

        await middleware(getCtx(), myNext);

        expect(isCall).toBe(false);
    });

    it("should allow max to be disabled entirely", async () => {
        const middleware = new RateLimit({ max: 0, store }).middleware;

        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);

        expect(nbCall).toBe(3);
    });

    it("should show the provided message instead of the default message when max connections are reached", async () => {
        const message = 'my msg';
        const middleware = new RateLimit({ max: 2, message, store }).middleware;
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);

        const ctx = getCtx();
        await middleware(ctx, nextNb);

        expect(ctx.body.message).toBe(message);
    });

    it("should (eventually) accept new connections from a blocked IP", async () => {
        const middleware = new RateLimit({ max: 10, windowMs: 50, prefixKey: start, store: memoryStore }).middleware;
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        await sleep(60);
        await middleware(ctx, nextNb);
        expect(nbCall).toBe(3);
    });

    it("should work repeatedly (issues #2 & #3)", async () => {
        const middleware = new RateLimit({ max: 2, windowMs: 50, prefixKey: start, store: memoryStore }).middleware;
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        await sleep(60);
        await middleware(ctx, nextNb);
        expect(nbCall).toBe(3);
    });

    it("should allow the error statusCode to be customized", async () => {
        const middleware = new RateLimit({ max: 1, statusCode: 123, store }).middleware;
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        expect(ctx.status).toBe(123);
    });

    it("should use the custom handler when specified", async () => {
        const middleware = new RateLimit({
            max: 1,
            handler: function (ctx) {
                ctx.status = 231;
            },
            store
        }).middleware;
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        expect(ctx.status).toBe(231);
    });

    it("should allow custom skip function", async () => {
        const middleware = new RateLimit({
            max: 1,
            skip: (ctx) => {
                assert.ok(ctx);
                return true;
            },
            store,
        }).middleware;
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        expect(nbCall).toBe(3);
    });

    it("should allow custom key generators", async () => {
        let key = null;
        const middleware = new RateLimit({
            keyGenerator: (ctx) => {
                assert.ok(ctx);
                key = 'TITI';
                return key;
            },
            store,
        }).middleware;
        await middleware(ctx, nextNb);
        expect(key).toBe('TITI');
    });
});
