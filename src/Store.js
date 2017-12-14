
const methods = ['incr', 'decrement', 'saveAbuse'];

class Store {
    constructor() {
        for (const elem of methods) {
            if (this[elem] === undefined) {
                throw new TypeError(`Must override method ${elem}`);
            }
        }
    }
}

module.exports = Store;
