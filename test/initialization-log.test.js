const { test } = require('node:test')
const Fastify = require('fastify')
const pg = require('pg')
const fastifyPostgres = require('../index')
const { connectionString } = require('./helpers')

test('Initalization log tests', async (t) => {
  const realConsole = global.console
  const ctx = {}

  test.beforeEach(() => {
    ctx.fastify = require('fastify')()
    ctx.pg = {
      ...require('pg'),
      native: null
    }
    ctx.native = pg.native
  })

  test.afterEach(() => {
  // Really would just remove the module from the
  // cache.
    ctx.pg.native = ctx.native
    global.console = realConsole
  })

  await t.test('Should print warning when native module not installed', async (t) => {
    t.plan(2)

    global.console.warn = (msg) => t.assert.strictEqual(msg, "pg-native not installed, can't use native option - fallback to pg module")

    const fastify = Fastify()
    t.after(() => {
      fastify.close()
    })

    await ctx.fastify.register(fastifyPostgres, {
      connectionString,
      native: true,
      pg: ctx.pg
    })

    const ready = await ctx.fastify.ready()
    t.assert.ok(ready)
  })
})
