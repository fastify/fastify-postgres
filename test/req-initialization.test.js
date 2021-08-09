'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const fastifyPostgres = require('../index')
const { connectionString } = require('./helpers')

const extractUserCount = response => parseInt(JSON.parse(response.payload).rows[0].userCount)

test('fastify postgress useTransaction route option', t => {
  test('queries that succeed provided', async t => {
    const fastify = Fastify()
    t.teardown(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString
    })

    await fastify.pg.query('TRUNCATE users')

    fastify.get('/count-users', async (req, reply) => {
      const result = await fastify.pg.query('SELECT COUNT(*) AS "userCount" FROM users WHERE username=\'pass-opt-in\'')

      reply.send(result)
    })

    fastify.get('/pass', { pg: { transact: true } }, async (req, reply) => {
      await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in'])
      await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in'])
      reply.send('complete')
    })

    await fastify.inject({ url: '/pass' })

    const response = await fastify.inject({
      method: 'GET',
      url: '/count-users'
    })

    t.equal(extractUserCount(response), 2)
  })
  test('queries that succeed provided to a namespace', async t => {
    const fastify = Fastify()
    t.teardown(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    await fastify.pg.test.query('TRUNCATE users')

    fastify.get('/count-users', async (req, reply) => {
      const result = await fastify.pg.test.query('SELECT COUNT(*) AS "userCount" FROM users WHERE username=\'pass-opt-in\'')

      reply.send(result)
    })

    fastify.get('/pass', { pg: { transact: 'test' } }, async (req, reply) => {
      await req.pg.test.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in'])
      await req.pg.test.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in'])

      reply.send('complete')
    })

    await fastify.inject({ url: '/pass' })

    const response = await fastify.inject({
      method: 'GET',
      url: '/count-users'
    })

    t.equal(extractUserCount(response), 2)
  })
  test('queries that fail provided', async t => {
    const fastify = Fastify()
    t.teardown(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString
    })

    await fastify.pg.query('TRUNCATE users')

    fastify.get('/count-users', async (req, reply) => {
      const result = await fastify.pg.query('SELECT COUNT(*) AS "userCount" FROM users WHERE username=\'fail-opt-in\'')

      reply.send(result)
    })

    fastify.get('/fail', { pg: { transact: true } }, async (req, reply) => {
      await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['fail-opt-in'])
      await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['fail-opt-in'])
      await req.pg.query('INSERT INTO nope(username) VALUES($1) RETURNING id', ['fail-opt-in'])
      reply.send('complete')
    })

    await fastify.inject({ url: '/fail' })

    const response = await fastify.inject({
      method: 'GET',
      url: '/count-users'
    })

    t.equal(extractUserCount(response), 0)
  })

  t.end()
})

test('combinations of registrationOptions.name and routeOptions.pg.transact that should not add hooks', t => {
  test('transact not set', t => {
    t.plan(1)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString
    })

    fastify.get('/', (req, reply) => {
      t.equal(req.pg, null)
    })

    fastify.inject({ url: '/' })
  })
  test('name set and transact not set', t => {
    t.plan(1)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    fastify.get('/', (req, reply) => {
      t.equal(req.pg, null)
    })

    fastify.inject({ url: '/' })
  })
  test('name set and transact set to true', t => {
    t.plan(1)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    fastify.get('/', { pg: { transact: true } }, (req, reply) => {
      t.equal(req.pg, null)
    })

    fastify.inject({ url: '/' })
  })
  test('name not set and transact set to string', t => {
    t.plan(1)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString
    })

    fastify.get('/', { pg: { transact: 'test' } }, (req, reply) => {
      t.equal(req.pg, null)
    })

    fastify.inject({ url: '/' })
  })
  test('name and transact set to different strings', t => {
    t.plan(1)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    fastify.get('/', { pg: { transact: 'different' } }, (req, reply) => {
      t.equal(req.pg, null)
    })

    fastify.inject({ url: '/' })
  })
  t.end()
})

test('incorrect combinations of registrationOptions.name and routeOptions.pg.transact should throw errors', t => {
  t.test('name set as reserved keyword', t => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    const name = 'user'

    fastify.register(fastifyPostgres, {
      connectionString,
      name
    })

    fastify.get('/', { pg: { transact: name } }, (req, reply) => {})

    fastify.inject({ url: '/' }, (err, response) => {
      t.error(err)
      t.same(response.json(), {
        statusCode: 500,
        error: 'Internal Server Error',
        message: `request client '${name}' does not exist`
      })
    })
  })

  t.test('named pg client has already registered', t => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    const name = 'test'

    fastify.register(fastifyPostgres, {
      connectionString,
      name
    })
    fastify.addHook('onRequest', async (req, reply) => {
      req.pg = { [name]: await fastify.pg[name].connect() }
    })
    fastify.get('/', { pg: { transact: name } }, (req, reply) => {})

    fastify.inject({ url: '/' }, (err, response) => {
      t.error(err)
      t.same(response.json(), {
        statusCode: 500,
        error: 'Internal Server Error',
        message: `request client '${name}' has already been registered`
      })
    })
  })

  t.test('pg client has already registered', t => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString
    })
    fastify.addHook('onRequest', async (req, reply) => {
      req.pg = await fastify.pg.connect()
    })
    fastify.get('/', { pg: { transact: true } }, (req, reply) => {})

    fastify.inject({ url: '/' }, (err, response) => {
      t.error(err)
      t.same(response.json(), {
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'request client has already been registered'
      })
    })
  })
  t.end()
})
