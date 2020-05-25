import MemoryStore from './MemoryStore';
import Koa = require('koa');
declare class Options {
    interval?: {
        min: number;
    };
    delayAfter?: number;
    timeWait?: {
        sec: number;
    };
    max?: number;
    message?: string;
    statusCode?: number;
    headers?: boolean;
    skipFailedRequests?: boolean;
    prefixKey?: string;
    store?: MemoryStore;
    keyGenerator?: any;
    skip?: any;
    getUserId?: any;
    handler?: any;
    onLimitReached?: any;
    weight?: any;
    whitelist?: any[];
}
declare class RateLimit {
    options: any;
    store: any;
    constructor(options: Options);
    static timeToMs(time: {
        [x: string]: number;
    }): number;
    keyGenerator(ctx: Koa.Context): Promise<any>;
    weight(ctx: Koa.Context): Promise<any>;
    skip(ctx: Koa.Context): Promise<any>;
    getUserId(ctx: Koa.Context): Promise<any>;
    handler(ctx: Koa.Context, next: Koa.Next): Promise<void>;
    onLimitReached(ctx: Koa.Context): Promise<void>;
    get middleware(): (ctx: Koa.Context, next: Koa.Next) => Promise<any>;
    _rateLimit(ctx: Koa.Context, next: Koa.Next): Promise<any>;
    _isWhitelisted(key: string): any;
    wait(ms: number): Promise<unknown>;
}
declare const _default: {
    RateLimit: typeof RateLimit;
    middleware(options?: Options): (ctx: Koa.Context, next: Koa.Next) => Promise<any>;
    defaultOptions(options?: Options): void;
};
export default _default;
