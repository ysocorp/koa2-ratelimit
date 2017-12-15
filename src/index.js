
var RateLimit = require('./RateLimit.js');
var MemoryStore = require('./MemoryStore.js');
var SequelizeStore = require('./SequelizeStore.js');
var Store = require('./Store.js');

module.exports = {
  RateLimit,
  Stores: {
    Memory: MemoryStore,
    Sequelize: SequelizeStore,
    Store,
  },
};
