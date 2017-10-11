'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const fastifyPostgres = require('./index')

test('fastify.pg namespace should exist', t => {
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
    connectionString: 'postgres://postgres@localhost/postgres'
  })

  fastify.ready(err => {
    t.error(err)
    fastify.pg.connect(onConnect)
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
