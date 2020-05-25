import Store from './Store';
declare class MemoryStore extends Store {
    static cleanAll(): void;
    _getHit(key: string | number, options?: any): any;
    _resetAll(): void;
    _resetKey(key: string, now: number): void;
    incr(key: string | number, options: any, weight: any): Promise<{
        counter: any;
        dateEnd: any;
    }>;
    decrement(key: string | number, options: any, weight: number): void;
    saveAbuse(): void;
}
export default MemoryStore;
