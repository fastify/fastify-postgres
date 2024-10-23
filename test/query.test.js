'use strict'

const { test } = require('node:test')
const Fastify = require('fastify')
const fastifyPostgres = require('../index')

const {
  BAD_DB_NAME,
  connectionString,
  connectionStringBadDbName
} = require('./helpers')

test('When fastify.pg root namespace is used:', async t => {
  await t.test('Should be able to connect and perform a query with a callback', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString
    })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    const client = await fastify.pg.connect()
    t.assert.ok(client)
    const result = await client.query('SELECT NOW()')
    t.assert.ok(result)
    t.assert.ok(result.rows)
    client.release()
  })

  await t.test('Should be able to use the query util with a callback', async (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString
    })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    const result = await fastify.pg.query('SELECT NOW()')
    t.assert.ok(result)
    t.assert.ok(result.rows)
  })

  await t.test('Should be able to use the query util with promises', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString
    })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    const result = await fastify.pg
      .query('SELECT NOW()')
    t.assert.ok(result.rows)
  })

  await t.test(
    'query util should return an error when pg fails to perform an operation using a callback',
    async (t) => {
      t.plan(4)

      const fastify = Fastify()
      t.after(() => fastify.close())

      await fastify.register(fastifyPostgres, {
        connectionString: connectionStringBadDbName
      })

      const ready = await fastify.ready()
      t.assert.ok(ready)

      await t.assert.rejects(
        async () => await fastify.pg.query('SELECT NOW()'),
        (err) => {
          t.assert.ok(err)
          t.assert.strictEqual(err.message, `database "${BAD_DB_NAME}" does not exist`)

          return true
        }
      )
    }
  )

  await t.test('Should throw when pg fails to perform operation with promises', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString: connectionStringBadDbName
    })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    await t.assert.rejects(
      async () => await fastify.pg
        .query('SELECT NOW()'),
      (err) => {
        t.assert.ok(err)
        t.assert.strictEqual(err.message, `database "${BAD_DB_NAME}" does not exist`)
        return true
      })
  })
})

test('When fastify.pg custom namespace is used:', async t => {
  await t.test('Should be able to connect and perform a query', async (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    const ready = await fastify.ready()
    t.assert.ok(ready)
    const client = await fastify.pg.test.connect()

    const result = await client.query('SELECT NOW()')
    t.assert.ok(ready)
    t.assert.ok(result.rows)

    client.release()
  })

  await t.test('Should be able to use query util with a callback', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    const ready = await fastify.ready()
    t.assert.ok(ready)
    const result = await fastify.pg.test.query('SELECT NOW()')
    t.assert.ok(result.rows)
  })

  await t.test('Should be able to use query util with promises', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    const result = await fastify.pg.test
      .query('SELECT NOW()')
    t.assert.ok(result.rows)
  })

  await t.test('Should be able to use native module', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test',
      native: true
    })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    const result = await fastify.pg.test
      .query('SELECT 1 AS one')
    t.assert.strictEqual(result.rows[0].one, 1)
  })

  await t.test('Should throw when pg fails to perform an operation with promises', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString: connectionStringBadDbName,
      name: 'test'
    })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    await t.assert.rejects(
      async () => await fastify.pg.test
        .query('SELECT NOW()'),
      (err) => {
        t.assert.ok(err)
        t.assert.strictEqual(err.message, `database "${BAD_DB_NAME}" does not exist`)
        return true
      })
  })
})
