/* global describe, it, beforeEach, afterEach */

const assert = require('assert');
const expect = require('expect');

const RateLimit = require('../src/RateLimit.js');
const MemoryStore = require('../src/MemoryStore.js');
const Store = require('../src/Store.js');


class InvalidStore { }


class MockStore extends Store {
    constructor() {
        super();
        this.nb = 0;

        this.incr_was_called = false;
        this.decrement_was_called = false;
        this.saveAbuse_was_called = false;
    }

    async incr() {
        this.nb += 1;
        this.incr_was_called = true;
        return this.nb;
    }

    async decrement() {
        this.decrement_was_called = true;
        this.nb -= 1;
    }

    async saveAbuse() {
        this.saveAbuse_was_called = true;
    }
}


describe('RateLimit node module', () => {

    let start, nbCall, delay, message, app, ctx, store, memoryStore;

    beforeEach(() => {
        start = Date.now();
        store = new MockStore();
        MemoryStore.cleanAll();
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
            RateLimit.middleware({ store: new InvalidStore() });
        } catch (e) {
            return done();
        }

        done(new Error("It allowed an invalid store"));
    });

    it("should call incr on the store", async () => {
        const middleware = RateLimit.middleware({ store });

        await middleware(getCtx(), nextNb);
        expect(store.incr_was_called).toBe(true);
    });

    it("should apply a small delay to the second request", async () => {
        const middleware = RateLimit.middleware({ delayAfter: 1, delayMs: 500, store });
        await middleware(getCtx(), nextNb);

        start = Date.now();
        await middleware(getCtx(), nextNb);
        expect(Date.now() - start).toBeGreaterThan(500);
    });
    it("should apply a larger delay to the subsequent request", async () => {
        const middleware = RateLimit.middleware({ delayAfter: 1, delayMs: 100, store });
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);
        expect(Date.now() - start).toBeGreaterThan(400);
    });
    it("should allow delayAfter requests before delaying responses", async () => {
        const middleware = RateLimit.middleware({ delayAfter: 2, delayMs: 100, store });

        await middleware(getCtx(), nextNb);
        expect(Date.now() - start).toBeLessThan(50);

        await middleware(getCtx(), nextNb);
        expect(Date.now() - start).toBeLessThan(100);

        await middleware(getCtx(), nextNb);
        expect(Date.now() - start).toBeGreaterThan(100);
        expect(Date.now() - start).toBeLessThan(150);
    });

    it("should allow delayAfter to be disabled entirely", async () => {
        const middleware = RateLimit.middleware({ delayAfter: 0, delayMs: 1000, store });

        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);

        expect(Date.now() - start).toBeLessThan(100);
    });

    it("should refuse additional connections once IP has reached the max", async () => {
        const middleware = RateLimit.middleware({ max: 1, store });

        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);

        const isCall = false;
        const myNext = () => { isCall: true };

        await middleware(getCtx(), myNext);

        expect(isCall).toBe(false);
    });

    it("should allow max to be disabled entirely", async () => {
        const middleware = RateLimit.middleware({ max: 0, store });

        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);

        expect(nbCall).toBe(3);
    });

    it("should show the provided message instead of the default message when max connections are reached", async () => {
        const message = 'my msg';
        const middleware = RateLimit.middleware({ max: 2, message, store });
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);

        const ctx = getCtx();
        await middleware(ctx, nextNb);

        expect(ctx.body.message).toBe(message);
    });

    it("should (eventually) accept new connections from a blocked IP", async () => {
        const middleware = RateLimit.middleware({ max: 10, windowMs: 50, prefixKey: start, store: memoryStore });
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        await sleep(60);
        await middleware(ctx, nextNb);
        expect(nbCall).toBe(3);
    });

    it("should work repeatedly (issues #2 & #3)", async () => {
        const middleware = RateLimit.middleware({ max: 2, windowMs: 50, prefixKey: start, store: memoryStore });
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        await sleep(60);
        await middleware(ctx, nextNb);
        expect(nbCall).toBe(3);
    });

    it("should allow the error statusCode to be customized", async () => {
        const middleware = RateLimit.middleware({ max: 1, statusCode: 123, store });
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        expect(ctx.status).toBe(123);
    });

    it("should use the custom handler when specified", async () => {
        const middleware = RateLimit.middleware({
            max: 1,
            handler: function (ctx) {
                ctx.status = 231;
            },
            store
        });
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        expect(ctx.status).toBe(231);
    });

    it("should allow custom skip function", async () => {
        const middleware = RateLimit.middleware({
            max: 1,
            skip: (ctx) => {
                assert.ok(ctx);
                return true;
            },
            store,
        });
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        expect(nbCall).toBe(3);
    });

    it("should allow custom key generators", async () => {
        let key = null;
        const middleware = RateLimit.middleware({
            keyGenerator: (ctx) => {
                assert.ok(ctx);
                key = 'TITI';
                return key;
            },
            store,
        });
        await middleware(ctx, nextNb);
        expect(key).toBe('TITI');
    });
});
