'use strict'

const BAD_DB_NAME = 'db_that_does_not_exist'
const connectionString = process.env.DATABASE_TEST_URL || 'postgres://postgres:postgres@127.0.0.1/postgres'
const connectionStringBadDbName = connectionString.replace(/\/[^/]+$/, '/' + BAD_DB_NAME)

module.exports = Object.freeze({
  BAD_DB_NAME,
  connectionString,
  connectionStringBadDbName
})
