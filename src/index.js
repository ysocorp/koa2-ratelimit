const RateLimit = require("./RateLimit.js");
const MemoryStore = require("./MemoryStore.js");
const Store = require("./Store.js");

module.exports = {
  RateLimit,
  Stores: {
    Memory: MemoryStore,
    get Sequelize() {
      // eslint-disable-next-line global-require
      return require("./SequelizeStore.js");
    },
    get Mongodb() {
      // eslint-disable-next-line global-require
      return require("./MongodbStore.js");
    },
    get Redis() {
      // eslint-disable-next-line global-require
      return require("./RedisStore.js");
    },
    Store,
  },
};
