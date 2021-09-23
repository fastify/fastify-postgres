'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const pg = require('pg')
const fastifyPostgres = require('../index')
const { connectionString } = require('./helpers')

test('Should be able to use native module', (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  fastify.register(fastifyPostgres, {
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

test('Should be able to use an alternative pg module', (t) => {
  t.plan(2)

  const altPg = require('pg')
  const fastify = Fastify()
  t.teardown(() => fastify.close())

  fastify.register(fastifyPostgres, {
    connectionString,
    pg: altPg
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

test('Should not throw if registered within different scopes (with and without named instances)', (t) => {
  t.plan(1)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  fastify.register(function scopeOne (instance, opts, next) {
    instance.register(fastifyPostgres, {
      connectionString
    })

    next()
  })

  fastify.register(function scopeTwo (instance, opts, next) {
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

  fastify.ready((err) => {
    t.error(err)
  })
})

test('Should throw when trying to register multiple instances without giving a name', (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  fastify.register(fastifyPostgres, {
    connectionString
  })

  fastify.register(fastifyPostgres, {
    connectionString
  })

  fastify.ready((err) => {
    t.ok(err)
    t.equal((err || {}).message, 'fastify-postgres has already been registered')
  })
})

test('Should not throw when registering a named instance and an unnamed instance', (t) => {
  t.plan(1)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  fastify.register(fastifyPostgres, {
    connectionString,
    name: 'one'
  })

  fastify.register(fastifyPostgres, {
    connectionString
  })

  fastify.ready((err) => {
    t.error(err)
  })
})

test('Should throw when trying to register duplicate connection names', (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(() => fastify.close())
  const name = 'test'

  fastify
    .register(fastifyPostgres, {
      connectionString,
      name
    })
  fastify.register(fastifyPostgres, {
    connectionString,
    name
  })

  fastify.ready((err) => {
    t.ok(err)
    t.equal((err || {}).message, `fastify-postgres '${name}' instance name has already been registered`)
  })
})

test('Should throw when trying to register a named connection with a reserved keyword', (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(() => fastify.close())
  const name = 'Client'

  fastify.register(fastifyPostgres, {
    connectionString,
    name
  })

  fastify.ready((err) => {
    t.ok(err)
    t.equal((err || {}).message, `fastify-postgres '${name}' is a reserved keyword`)
  })
})

test('fastify.pg namespace should exist', (t) => {
  t.plan(5)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  fastify.register(fastifyPostgres, {
    connectionString
  })

  fastify.ready((err) => {
    t.error(err)

    t.ok(fastify.pg)
    t.ok(fastify.pg.connect)
    t.ok(fastify.pg.pool)
    t.ok(fastify.pg.Client)
  })
})

test('fastify.pg custom namespace should exist if a name is set', (t) => {
  t.plan(6)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  fastify.register(fastifyPostgres, {
    connectionString,
    name: 'test'
  })

  fastify.ready((err) => {
    t.error(err)

    t.ok(fastify.pg)
    t.ok(fastify.pg.test)
    t.ok(fastify.pg.test.connect)
    t.ok(fastify.pg.test.pool)
    t.ok(fastify.pg.test.Client)
  })
})

test('fastify.pg and a fastify.pg custom namespace should exist when registering a named instance before an unnamed instance)', async (t) => {
  t.plan(10)

  const fastify = Fastify()
  t.teardown(() => fastify.close())

  await fastify.register(fastifyPostgres, {
    connectionString,
    name: 'one'
  })

  await fastify.register(fastifyPostgres, {
    connectionString
  })

  await fastify.ready().catch(err => t.error(err))

  t.ok(fastify.pg)
  t.ok(fastify.pg.connect)
  t.ok(fastify.pg.pool)
  t.ok(fastify.pg.Client)

  t.ok(fastify.pg.one)
  t.ok(fastify.pg.one.connect)
  t.ok(fastify.pg.one.pool)
  t.ok(fastify.pg.one.Client)

  const result = await fastify.pg.query('SELECT NOW()')
  const resultOne = await fastify.pg.one.query('SELECT NOW()')
  t.same(result.rowCount, 1)
  t.same(resultOne.rowCount, 1)
})
