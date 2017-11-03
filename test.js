'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const fastifyPostgres = require('./index')

test('fastify.pg.test namespace should exist', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.register(fastifyPostgres, {
    name: 'test',
    connectionString: 'postgres://postgres@localhost/postgres'
  })

  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.pg)
    t.ok(fastify.pg.test)
    t.ok(fastify.pg.test.connect)
    t.ok(fastify.pg.test.pool)
    t.ok(fastify.pg.test.Client)
    fastify.close()
  })
})

test('fastify.pg namespace should exist when name option not configure', t => {
  t.plan(5)

  const fastify = Fastify()

  fastify.register(fastifyPostgres, {
    connectionString: 'postgres://postgres@localhost/postgres'
  })

  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.pg)
    t.ok(fastify.pg.connect)
    t.ok(fastify.pg.pool)
    t.ok(fastify.pg.Client)
    fastify.close()
  })
})

test('should be able to connect and perform a query', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.register(fastifyPostgres, {
    name: 'test',
    connectionString: 'postgres://postgres@localhost/postgres'
  })

  fastify.ready(err => {
    t.error(err)
    fastify.pg.test.connect(onConnect)
  })

  function onConnect (err, client, done) {
    t.error(err)
    client.query('SELECT NOW()', (err, result) => {
      done()
      t.error(err)
      t.ok(result.rows)
      fastify.close()
    })
  }
})

test('use query util', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.register(fastifyPostgres, {
    name: 'test',
    connectionString: 'postgres://postgres@localhost/postgres'
  })

  fastify.ready(err => {
    t.error(err)
    fastify.pg.test.query('SELECT NOW()', (err, result) => {
      t.error(err)
      t.ok(result.rows)
      fastify.close()
    })
  })
})

test('use query util with promises', t => {
  t.plan(2)

  const fastify = Fastify()

  fastify.register(fastifyPostgres, {
    name: 'test',
    connectionString: 'postgres://postgres@localhost/postgres'
  })

  fastify.ready(err => {
    t.error(err)
    fastify.pg.test
      .query('SELECT NOW()')
      .then(result => {
        t.ok(result.rows)
        fastify.close()
      })
      .catch(err => {
        t.fail(err)
        fastify.close()
      })
  })
})

test('use native module', t => {
  t.plan(2)

  const fastify = Fastify()

  fastify.register(fastifyPostgres, {
    name: 'test',
    connectionString: 'postgres://postgres@localhost/postgres',
    native: true
  })

  fastify.ready(err => {
    t.error(err)
    fastify.pg.test
      .query('SELECT 1 AS one')
      .then(result => {
        t.ok(result.rows[0].one === 1)
        fastify.close()
      })
      .catch(err => {
        t.fail(err)
        fastify.close()
      })
  })
})
