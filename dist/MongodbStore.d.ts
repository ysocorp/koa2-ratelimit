import mongoose = require('mongoose');
import Store from './Store';
declare class MongodbStore extends Store {
    collectionName: any;
    collectionAbuseName: any;
    Ratelimits: any;
    Abuse: any;
    constructor(mongodb: {
        model: (arg0: any, arg1: mongoose.Schema<any>) => any;
    }, options?: any);
    _increment(model: {
        findOneAndUpdate: (arg0: any, arg1: {
            $inc: {
                [x: number]: number;
            };
        }) => any;
    }, where: {
        key: any;
        dateEnd?: any;
    }, nb: number | undefined, field: string): Promise<any>;
    _removeAll(): Promise<void>;
    incr(key: any, options: {
        interval: number;
    }, weight: number | undefined): Promise<{
        counter: any;
        dateEnd: any;
    }>;
    decrement(key: any, options: any, weight: number): Promise<void>;
    saveAbuse(options: {
        key: any;
        prefixKey: any;
        interval: any;
        max: any;
        user_id: any;
        ip: any;
    }): Promise<void>;
}
export default MongodbStore;
