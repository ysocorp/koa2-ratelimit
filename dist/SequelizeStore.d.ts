import Store from './Store';
declare class SequelizeStore extends Store {
    sequelize: any;
    tableName: any;
    tableAbuseName: any;
    table: any;
    tableAbuses: any;
    constructor(sequelize: any, options?: any);
    _getTable(): Promise<any>;
    _getTableAbuse(): Promise<any>;
    _increment(table: {
        update: (arg0: {
            [x: number]: any;
        }, arg1: {
            where: any;
        }) => any;
    }, where: {
        key: any;
        date_end?: any;
    }, nb: number | undefined, field: string): Promise<any>;
    _removeAll(table: {
        destroy: (arg0: {
            where: {
                date_end: {
                    $lte: number;
                };
            };
        }) => any;
    }): Promise<void>;
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
export default SequelizeStore;
