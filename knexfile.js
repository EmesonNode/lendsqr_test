
// Update with your config settings.

module.exports = require('knex')(
    {
        client: 'mysql2',
        connection: {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        },
        pool: {
            min: parseInt(process.env.DB_MINIMUM_POOL),
            max: parseInt(process.env.DB_MAXIMUM_POOL)
        },
    });
