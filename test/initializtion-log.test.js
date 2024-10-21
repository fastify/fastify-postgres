const { test } = require('tap')
const Fastify = require('fastify')
const pg = require('pg')
const { connectionString } = require('./helpers')

// node:tes currently does not support mocking module properties
test('Should print warning when native module not installed', (t) => {
  t.plan(3)

  const mockedFastifyPostgres = t.mock('../index', {
    pg: { ...pg, native: null }
  })
  const realConsole = global.console
  global.console.warn = (msg) => t.equal(msg, "pg-native not installed, can't use native option - fallback to pg module")

  const fastify = Fastify()
  t.teardown(() => {
    fastify.close()
    global.console = realConsole
  })

  fastify.register(mockedFastifyPostgres, {
    connectionString,
    native: true
  })

  fastify.ready((err) => {
    t.error(err)

    fastify.pg
      .query('SELECT 1 AS one')
      .then((result) => {
        t.equal(result.rows[0].one, 1)
      })
      .catch((err) => {
        t.fail(err)
      })
  })
})
