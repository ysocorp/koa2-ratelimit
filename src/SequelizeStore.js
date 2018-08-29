const Sequelize = require('sequelize');

const Store = require('./Store.js');

const tableOption = [
    {
        key: {
            type: Sequelize.STRING(255),
            allowNull: false,
            primaryKey: true,
            unique: true,
        },
        counter: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        date_end: {
            type: Sequelize.DATE,
            allowNull: false,
        },
    },
    {
        indexes: [{ unique: true, fields: ['key'] }, { unique: false, fields: ['date_end'] }],
        underscored: true,
        createdAt: false,
        updatedAt: false,
    },
];

const tableAbuseOption = [
    {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
        },
        key: {
            type: Sequelize.STRING(255),
            allowNull: false,
        },
        prefix: {
            type: Sequelize.STRING(255),
            allowNull: true,
        },
        interval: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
        nb_max: {
            type: Sequelize.INTEGER,
            allowNull: false,
        },
        nb_hit: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        user_id: {
            allowNull: true,
            type: Sequelize.INTEGER,
        },
        ip: {
            type: Sequelize.STRING(255),
            allowNull: true,
        },
        date_end: {
            type: Sequelize.DATE,
            allowNull: false,
        },
        created_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
        },
        updated_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
        },
    },
    {
        indexes: [{ unique: true, fields: ['key', 'date_end'] }],
        underscored: true,
    },
];

class SequelizeStore extends Store {
    constructor(sequelize, options = {}) {
        super();
        this.sequelize = sequelize;
        this.tableName = options.tableName || 'ratelimits';
        this.tableAbuseName = options.tableAbuseName || `${this.tableName}abuses`;
        this.table = null;
        this.tableAbuses = null;
    }

    async _getTable() {
        if (!this.table) {
            this.table = this.sequelize.define(this.tableName, tableOption[0], tableOption[1]);
            await this.table.sync();
        }
        return this.table;
    }
    async _getTableAbuse() {
        if (!this.tableAbuses) {
            this.tableAbuses = this.sequelize.define(
                this.tableAbuseName,
                tableAbuseOption[0],
                tableAbuseOption[1],
            );
            await this.tableAbuses.sync();
        }
        return this.tableAbuses;
    }

    async _increment(table, where, nb = 1, field) {
        return table.update({ [field]: global.sequelize.literal(`${field} + ${nb}`) }, { where });
    }

    // remove all if time is passed
    async _removeAll(table) {
        const now = new Date();
        await table.destroy({
            where: {
                date_end: { $lte: now.getTime() },
            },
        });
    }

    async incr(key, options, weight) {
        const table = await this._getTable();
        await this._removeAll(table);
        const now = new Date();

        const data = await table.findOrCreate({
            where: { key },
            defaults: {
                key,
                date_end: now.getTime() + options.interval,
            },
        });
        await this._increment(table, { key }, weight, 'counter');
        return {
            counter: data[0].counter + weight,
            dateEnd: data[0].date_end,
        };
    }

    async decrement(key, options, weight) {
        const table = await this._getTable();
        await this._increment(table, { key }, -weight, 'counter');
    }

    async saveAbuse(options) {
        const table = await this._getTable();
        const ratelimit = await table.findOne({ where: { key: options.key } });

        if (ratelimit) {
            const tableAbuse = await this._getTableAbuse();
            // eslint-disable-next-line
            const date_end = ratelimit.date_end;
            // create if not exist
            await tableAbuse
                .findOrCreate({
                    where: { key: options.key, date_end },
                    defaults: {
                        key: options.key,
                        prefix: options.prefixKey,
                        interval: options.interval,
                        nb_max: options.max,
                        nb_hit: options.max,
                        user_id: options.user_id,
                        ip: options.ip,
                        date_end,
                    },
                })
                .catch(() => {});
            await this._increment(tableAbuse, { key: options.key, date_end }, 1, 'nb_hit');
        }
    }
}

module.exports = SequelizeStore;
