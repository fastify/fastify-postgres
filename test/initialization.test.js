'use strict'

const { test } = require('node:test')
const Fastify = require('fastify')
const fastifyPostgres = require('../index')
const { connectionString } = require('./helpers')

test('Should be able to use native module', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.after(() => fastify.close())

  await fastify.register(fastifyPostgres, {
    connectionString,
    native: true
  })

  const ready = await fastify.ready()
  t.assert.ok(ready)

  const result = await fastify.pg
    .query('SELECT 1 AS one')

  t.assert.strictEqual(result.rows[0].one, 1)
})

test('Should be able to use an alternative pg module', async (t) => {
  t.plan(2)

  const altPg = require('pg')
  const fastify = Fastify()
  t.after(() => fastify.close())

  await fastify.register(fastifyPostgres, {
    connectionString,
    pg: altPg
  })

  const ready = await fastify.ready()
  t.assert.ok(ready)

  const result = await fastify.pg
    .query('SELECT 1 AS one')
  t.assert.strictEqual(result.rows[0].one, 1)
})

test('Should not throw if registered within different scopes (with and without named instances)', async (t) => {
  t.plan(1)

  const fastify = Fastify()
  t.after(() => fastify.close())

  await fastify.register(function scopeOne (instance, _opts, next) {
    instance.register(fastifyPostgres, {
      connectionString
    })

    next()
  })

  await fastify.register(function scopeTwo (instance, _opts, next) {
    instance.register(fastifyPostgres, {
      connectionString,
      name: 'one'
    })

    instance.register(fastifyPostgres, {
      connectionString,
      name: 'two'
    })

    next()
  })

  const ready = await fastify.ready()
  t.assert.ok(ready)
})

test('Should throw when trying to register multiple instances without giving a name', async (t) => {
  t.plan(3)

  const fastify = Fastify()
  t.after(() => fastify.close())

  await fastify.register(fastifyPostgres, {
    connectionString
  })

  await t.assert.rejects(
    async () => await fastify.register(fastifyPostgres, {
      connectionString
    }),
    (err) => {
      t.assert.ok(err)
      t.assert.strictEqual((err || {}).message, 'fastify-postgres has already been registered')
      return true
    }
  )
})

test('Should not throw when registering a named instance and an unnamed instance', async (t) => {
  t.plan(1)

  const fastify = Fastify()
  t.after(() => fastify.close())

  await fastify.register(fastifyPostgres, {
    connectionString,
    name: 'one'
  })

  await fastify.register(fastifyPostgres, {
    connectionString
  })

  const ready = await fastify.ready()
  t.assert.ok(ready)
})

test('Should throw when trying to register duplicate connection names', async (t) => {
  t.plan(3)

  const fastify = Fastify()
  t.after(() => fastify.close())
  const name = 'test'

  await fastify
    .register(fastifyPostgres, {
      connectionString,
      name
    })

  await t.assert.rejects(
    async () => await fastify.register(fastifyPostgres, {
      connectionString,
      name
    }),
    (err) => {
      t.assert.ok(err)
      t.assert.strictEqual((err || {}).message, `fastify-postgres '${name}' instance name has already been registered`)
      return true
    }
  )
})

test('Should throw when trying to register a named connection with a reserved keyword', async (t) => {
  t.plan(3)

  const fastify = Fastify()
  t.after(() => fastify.close())
  const name = 'Client'

  await t.assert.rejects(
    async () => await fastify.register(fastifyPostgres, {
      connectionString,
      name
    }),
    (err) => {
      t.assert.ok(err)
      t.assert.strictEqual((err || {}).message, `fastify-postgres '${name}' is a reserved keyword`)
      return true
    }
  )
})

test('const result = await fastify.pg namespace should exist', async (t) => {
  t.plan(5)

  const fastify = Fastify()
  t.after(() => fastify.close())

  await fastify.register(fastifyPostgres, {
    connectionString
  })

  const ready = await fastify.ready()
  t.assert.ok(ready)

  t.assert.ok(fastify.pg)
  t.assert.ok(fastify.pg.connect)
  t.assert.ok(fastify.pg.pool)
  t.assert.ok(fastify.pg.Client)
})

test('const result = await fastify.pg custom namespace should exist if a name is set', async (t) => {
  t.plan(6)

  const fastify = Fastify()
  t.after(() => fastify.close())

  await fastify.register(fastifyPostgres, {
    connectionString,
    name: 'test'
  })

  const ready = await fastify.ready()
  t.assert.ok(ready)

  t.assert.ok(fastify.pg)
  t.assert.ok(fastify.pg.test)
  t.assert.ok(fastify.pg.test.connect)
  t.assert.ok(fastify.pg.test.pool)
  t.assert.ok(fastify.pg.test.Client)
})

test('const result = await fastify.pg and a fastify.pg custom namespace should exist when registering a named instance before an unnamed instance)', async (t) => {
  t.plan(11)

  const fastify = Fastify()
  t.after(() => fastify.close())

  await fastify.register(fastifyPostgres, {
    connectionString,
    name: 'one'
  })

  await fastify.register(fastifyPostgres, {
    connectionString
  })

  const ready = await fastify.ready()
  t.assert.ok(ready)

  t.assert.ok(fastify.pg)
  t.assert.ok(fastify.pg.connect)
  t.assert.ok(fastify.pg.pool)
  t.assert.ok(fastify.pg.Client)

  t.assert.ok(fastify.pg.one)
  t.assert.ok(fastify.pg.one.connect)
  t.assert.ok(fastify.pg.one.pool)
  t.assert.ok(fastify.pg.one.Client)

  const result = await fastify.pg.query('SELECT NOW()')
  const resultOne = await fastify.pg.one.query('SELECT NOW()')
  t.assert.deepStrictEqual(result.rowCount, 1)
  t.assert.deepStrictEqual(resultOne.rowCount, 1)
})
