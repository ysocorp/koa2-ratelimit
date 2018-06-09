const mongoose = require('mongoose');

const Store = require('./Store.js');

async function findOrCreate({ where, defaults }) {
    const elem = await this.findOne(where);
    if (elem) {
        return elem;
    }
    return new this(defaults).save();
}

const abuseSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        index: { unique: true },
    },
    counter: {
        type: Number,
        required: true,
        default: 0,
    },
    dateEnd: {
        type: Date,
        required: true,
    },
});
abuseSchema.statics.findOrCreate = findOrCreate;

const abuseHistorySchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
    },
    prefix: {
        type: String,
        required: false,
    },
    interval: {
        type: Number,
        required: true,
    },
    nbMax: {
        type: Number,
        required: true,
    },
    nbHit: {
        type: Number,
        required: true,
        default: 0,
    },
    userId: {
        type: Number,
        required: false,
    },
    ip: {
        type: String,
        required: false,
    },
    dateEnd: {
        type: Date,
        required: true,
    },
    createdAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
});
abuseHistorySchema.index({ key: 1, dateEnd: 1 }, { unique: true });

function beforSave(next) {
    this.updatedAt = Date.now();
    next();
}
abuseHistorySchema.pre('save', beforSave);
abuseHistorySchema.pre('update', beforSave);
abuseHistorySchema.pre('findOneAndUpdate', beforSave);
abuseHistorySchema.statics.findOrCreate = findOrCreate;

class SequelizeStore extends Store {
    constructor(mongodb, options = {}) {
        super();
        this.collectionName = options.collectionName || 'Ratelimits';
        this.collectionAbuseName = options.collectionAbuseName || `${this.collectionName}Abuses`;
        this.Ratelimits = mongodb.model(this.collectionName, abuseSchema);
        this.Abuse = mongodb.model(this.collectionAbuseName, abuseHistorySchema);
    }

    async _increment(model, where, nb = 1, field) {
        return model.findOneAndUpdate(where, { $inc: { [field]: nb } });
    }

    // remove all if time is passed
    async _removeAll() {
        await this.Ratelimits.remove({ dateEnd: { $lte: Date.now() } });
    }

    async incr(key, options) {
        await this._removeAll();

        const data = await this.Ratelimits.findOrCreate({
            where: { key },
            defaults: {
                key,
                dateEnd: Date.now() + options.interval,
            },
        });
        await this._increment(this.Ratelimits, { key }, 1, 'counter');
        data.counter += 1;
        // Remap the date field name to be consistent with the rest
        // whilst remaining backwards compatible
        return {
            counter: data.counter,
            date_end: data.dateEnd,
        };
    }

    async decrement(key /* , options */) {
        await this._increment(this.Ratelimits, { key }, -1, 'counter');
    }

    async saveAbuse(options) {
        const ratelimit = await this.Ratelimits.findOne({
            key: options.key,
        }).exec();

        if (ratelimit) {
            // eslint-disable-next-line
      const dateEnd = ratelimit.dateEnd;
            // create if not exist
            await this.Abuse.findOrCreate({
                where: { key: options.key, dateEnd },
                defaults: {
                    key: options.key,
                    prefix: options.prefixKey,
                    interval: options.interval,
                    nbMax: options.max,
                    nbHit: options.max,
                    userId: options.user_id,
                    ip: options.ip,
                    dateEnd,
                },
            }).catch(() => { });

            await this._increment(this.Abuse, { key: options.key, dateEnd }, 1, 'nbHit');
        }
    }
}

module.exports = SequelizeStore;
