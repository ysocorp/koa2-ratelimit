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

    async incr(key, options, weight) {
        this.nb += weight;
        this.incr_was_called = true;
        return {
            counter: this.nb,
            dateEnd: new Date().setHours(new Date().getHours() + 1),
        };
    }

    async decrement(key, options, weight) {
        this.decrement_was_called = true;
        this.nb -= weight;
    }

    async saveAbuse() {
        this.saveAbuse_was_called = true;
    }
}

function getCtx() {
    return {
        request: { ip: '192.168.1.0' },
        res: { on: () => { } },
        state: { user: { id: 1 } },
        set: () => { },
    };
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('RateLimit node module', () => {
    let start;
    let nbCall;
    let ctx;
    let store;
    let memoryStore;

    beforeEach(() => {
        start = Date.now();
        store = new MockStore();
        MemoryStore.cleanAll();
        memoryStore = new MemoryStore();
        nbCall = 0;
        ctx = getCtx();
    });

    afterEach(() => {
        nbCall = 0;
    });

    function nextNb() { nbCall += 1; }

    it('Times should return the correct time in ms', () => {
        expect(RateLimit.RateLimit.timeToMs(123)).toBe(123);
        expect(RateLimit.RateLimit.timeToMs({ hour: 2 })).toBe(2 * 3600000);
        expect(RateLimit.RateLimit.timeToMs({ hour: 2, min: 3 })).toBe((2 * 3600000) + (3 * 60000));
    });

    it('Times should throw error if key does not exist', (done) => {
        try {
            RateLimit.RateLimit.timeToMs({ hours: 3 });
        } catch (e) { return done(); }
        return done(new Error('Times should throw error if key does not exist'));
    });

    it('should not allow to use of a store that is not valid', (done) => {
        try {
            RateLimit.middleware({ store: new InvalidStore() });
        } catch (e) {
            return done();
        }

        return done(new Error('It allowed an invalid store'));
    });

    it('should call incr on the store', async () => {
        const middleware = RateLimit.middleware({ store });

        await middleware(getCtx(), nextNb);
        expect(store.incr_was_called).toBe(true);
    });

    it('should apply a small delay to the second request', async () => {
        const middleware = RateLimit.middleware({ delayAfter: 1, timeWait: 500, store });
        await middleware(getCtx(), nextNb);

        start = Date.now();
        await middleware(getCtx(), nextNb);
        expect(Date.now() - start).toBeGreaterThan(500);
    });
    it('should apply a larger delay to the subsequent request', async () => {
        const middleware = RateLimit.middleware({ delayAfter: 1, timeWait: 100, store });
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);
        expect(Date.now() - start).toBeGreaterThan(400);
    });
    it('should allow delayAfter requests before delaying responses', async () => {
        const middleware = RateLimit.middleware({ delayAfter: 2, timeWait: 100, store });

        await middleware(getCtx(), nextNb);
        expect(Date.now() - start).toBeLessThan(50);

        await middleware(getCtx(), nextNb);
        expect(Date.now() - start).toBeLessThan(100);

        await middleware(getCtx(), nextNb);
        expect(Date.now() - start).toBeGreaterThan(100);
        expect(Date.now() - start).toBeLessThan(150);
    });

    it('should allow delayAfter to be disabled entirely', async () => {
        const middleware = RateLimit.middleware({ delayAfter: 0, timeWait: 1000, store });

        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);

        expect(Date.now() - start).toBeLessThan(100);
    });

    it('should refuse additional connections once IP has reached the max', async () => {
        const middleware = RateLimit.middleware({ max: 1, store });

        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);

        expect(nbCall).toBe(1);
    });

    it('should allow max to be disabled entirely', async () => {
        const middleware = RateLimit.middleware({ max: 0, store });

        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);

        expect(nbCall).toBe(3);
    });

    it('should show the provided message instead of the default message when max connections are reached', async () => {
        const message = 'my msg';
        const middleware = RateLimit.middleware({ max: 2, message, store });
        await middleware(getCtx(), nextNb);
        await middleware(getCtx(), nextNb);

        const ctxDefault = getCtx();
        await middleware(ctxDefault, nextNb);

        expect(ctxDefault.body.message).toBe(message);
    });

    it('should (eventually) accept new connections from a blocked IP', async () => {
        const middleware = RateLimit.middleware({
            max: 10, interval: 50, prefixKey: start, store: memoryStore,
        });
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        await sleep(60);
        await middleware(ctx, nextNb);
        expect(nbCall).toBe(3);
    });

    it('should work repeatedly (issues #2 & #3)', async () => {
        const middleware = RateLimit.middleware({
            max: 2, interval: 50, prefixKey: start, store: memoryStore,
        });
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        await sleep(60);
        await middleware(ctx, nextNb);
        expect(nbCall).toBe(3);
    });

    it('should allow the error statusCode to be customized', async () => {
        const middleware = RateLimit.middleware({ max: 1, statusCode: 123, store });
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        expect(ctx.status).toBe(123);
    });

    it('should use the custom handler when specified', async () => {
        const middleware = RateLimit.middleware({
            max: 1,
            handler: (c) => { c.status = 231; },
            store,
        });
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        expect(ctx.status).toBe(231);
    });

    it('should allow custom skip function', async () => {
        const middleware = RateLimit.middleware({
            max: 1,
            skip: (c) => {
                assert.ok(c);
                return true;
            },
            store,
        });
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        expect(nbCall).toBe(3);
    });

    it('should allow custom weight function', async () => {
        const middleware = RateLimit.middleware({
            max: 3,
            weight: () => 2,
            store,
        });
        await middleware(ctx, nextNb);
        await middleware(ctx, nextNb);
        expect(nbCall).toBe(1);
    });

    it('should allow custom key generators', async () => {
        let key = null;
        const middleware = RateLimit.middleware({
            keyGenerator: (c) => {
                assert.ok(c);
                key = 'TITI';
                return key;
            },
            store,
        });
        await middleware(ctx, nextNb);
        expect(key).toBe('TITI');
    });

    it('should set X-RateLimit-Reset with the correct value', async () => {
        const middleware = RateLimit.middleware({ store });
        const dateEnd = new Date(1528824545000);
        const dateEndSec = dateEnd / 1000;
        let dateEndReset = null;

        store.incr = async () => {
            return { counter: 10, dateEnd };
        };
        ctx.set = (key, value) => {
            if (key === 'X-RateLimit-Reset') {
                dateEndReset = value;
            }
        };
        await middleware(ctx, nextNb);

        expect(dateEndReset).toBe(dateEndSec);
        expect(ctx.state.rateLimit.reset).toBe(dateEndSec);
    });
});
