'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
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
        t.is(result.rows[0].one, 1)
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
        t.is(result.rows[0].one, 1)
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
    t.is((err || {}).message, 'fastify-postgres has already been registered')
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
    t.is((err || {}).message, `fastify-postgres '${name}' instance name has already been registered`)
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
    t.is((err || {}).message, `fastify-postgres '${name}' is a reserved keyword`)
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
