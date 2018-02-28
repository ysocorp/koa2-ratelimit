const RateLimit = require('./RateLimit.js');
const MemoryStore = require('./MemoryStore.js');
const SequelizeStore = require('./SequelizeStore.js');
const MongodbStore = require('./MongodbStore.js');
const Store = require('./Store.js');

module.exports = {
    RateLimit,
    Stores: {
        Memory: MemoryStore,
        Sequelize: SequelizeStore,
        Mongodb: MongodbStore,
        Store,
    },
};
