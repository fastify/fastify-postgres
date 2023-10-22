'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const fastifyPostgres = require('../index')
const { connectionString } = require('./helpers')

const extractUserCount = response => parseInt(JSON.parse(response.payload).rows[0].userCount)

test('When we use the fastify-postgres transaction route option', t => {
  t.test('Should be able to execute queries provided to the request pg decorator', async t => {
    const fastify = Fastify()
    t.teardown(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString
    })

    await fastify.pg.query('DELETE FROM "users" WHERE TRUE')

    fastify.get('/count-users', async (req, reply) => {
      const result = await fastify.pg.query('SELECT COUNT(*) AS "userCount" FROM users WHERE username=\'pass-opt-in\'')

      return result
    })

    fastify.get('/pass', { pg: { transact: true } }, async (req, reply) => {
      await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in'])
      await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in'])
      return 'complete'
    })

    await fastify.inject({ url: '/pass' })

    const response = await fastify.inject({
      method: 'GET',
      url: '/count-users'
    })

    t.equal(extractUserCount(response), 2)
  })

  t.test('Should be able to execute queries provided to a namespaced request pg decorator', async t => {
    const fastify = Fastify()
    t.teardown(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    await fastify.pg.test.query('DELETE FROM "users" WHERE TRUE')

    fastify.get('/count-users', async (req, reply) => {
      const result = await fastify.pg.test.query('SELECT COUNT(*) AS "userCount" FROM users WHERE username=\'pass-opt-in\'')

      return result
    })

    fastify.get('/pass', { pg: { transact: 'test' } }, async (req, reply) => {
      await req.pg.test.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in'])
      await req.pg.test.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in'])

      return 'complete'
    })

    await fastify.inject({ url: '/pass' })

    const response = await fastify.inject({
      method: 'GET',
      url: '/count-users'
    })

    t.equal(extractUserCount(response), 2)
  })

  t.test('Should trigger a rollback when failing to execute a query provided to the request pg decorator', async t => {
    const fastify = Fastify()
    t.teardown(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString
    })

    await fastify.pg.query('DELETE FROM "users" WHERE TRUE')

    fastify.get('/count-users', async (req, reply) => {
      const result = await fastify.pg.query('SELECT COUNT(*) AS "userCount" FROM users WHERE username=\'fail-opt-in\'')

      reply.send(result)
    })

    fastify.get('/fail', { pg: { transact: true } }, async (req, reply) => {
      await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['fail-opt-in'])
      await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['fail-opt-in'])
      // This one should fail (unknown_table does not exist) and trigger a rollback
      await req.pg.query('INSERT INTO unknown_table(username) VALUES($1) RETURNING id', ['fail-opt-in'])
      reply.send('complete')
    })

    await fastify.inject({ url: '/fail' })

    const response = await fastify.inject({
      method: 'GET',
      url: '/count-users'
    })

    t.equal(extractUserCount(response), 0)
  })

  t.test('Should trigger a rollback when failing to execute a query provided to a namespaced request pg decorator', async t => {
    const fastify = Fastify()
    t.teardown(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    await fastify.pg.test.query('DELETE FROM "users" WHERE TRUE')

    fastify.get('/count-users', async (req, reply) => {
      const result = await fastify.pg.test.query('SELECT COUNT(*) AS "userCount" FROM users WHERE username=\'fail-opt-in\'')

      reply.send(result)
    })

    fastify.get('/fail', { pg: { transact: true } }, async (req, reply) => {
      await req.pg.test.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['fail-opt-in'])
      await req.pg.test.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['fail-opt-in'])
      // This one should fail (unknown_table does not exist) and trigger a rollback
      await req.pg.test.query('INSERT INTO unknown_table(username) VALUES($1) RETURNING id', ['fail-opt-in'])
      reply.send('complete')
    })

    await fastify.inject({ url: '/fail' })

    const response = await fastify.inject({
      method: 'GET',
      url: '/count-users'
    })

    t.equal(extractUserCount(response), 0)
  })

  t.test('Should work properly with `schema` option and validation failure', async t => {
    const fastify = Fastify()
    t.teardown(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString
    })

    fastify.post('/schema-validation', {
      schema: {
        body: {
          type: 'object',
          properties: {
            hello: { type: 'string' }
          },
          required: ['hello']
        }
      },
      pg: { transact: true }
    }, async (req, reply) => {
      t.fail('should never execute the handler')
    })

    const response = await fastify.inject({
      url: '/schema-validation',
      method: 'POST',
      body: { notValid: 'json input' }
    })
    t.not(response.body, 'never success')
    t.equal(response.json().code, 'FST_ERR_VALIDATION')
  })

  t.end()
})

test('Should not add hooks with combinations of registration `options.name` and route options `pg.transact`', t => {
  t.test('Should not add hooks when `transact` is not set', t => {
    t.plan(1)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString
    }).after(() => {
      fastify.get('/', (req, reply) => {
        t.equal(req.pg, null)
      })
    })
    fastify.inject({ url: '/' })
  })

  t.test('Should not add hooks when `name` is set and `transact` is not set', t => {
    t.plan(1)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    }).after(() => {
      fastify.get('/', (req, reply) => {
        t.equal(req.pg, null)
      })
    })

    fastify.inject({ url: '/' })
  })

  t.test('Should not add hooks when `name` is set and `transact` is set to `true`', t => {
    t.plan(1)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    }).after(() => {
      fastify.get('/', { pg: { transact: true } }, (req, reply) => {
        t.equal(req.pg, null)
      })
    })

    fastify.inject({ url: '/' })
  })

  t.test('Should not add hooks when `name` is not set and `transact` is set and is a string', t => {
    t.plan(1)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString
    }).after(() => {
      fastify.get('/', { pg: { transact: 'test' } }, (req, reply) => {
        t.equal(req.pg, null)
      })
    })

    fastify.inject({ url: '/' })
  })

  t.test('Should not add hooks when `name` and `transact` are set to different strings', t => {
    t.plan(1)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    }).after(() => {
      fastify.get('/', { pg: { transact: 'different' } }, (req, reply) => {
        t.equal(req.pg, null)
      })
    })

    fastify.inject({ url: '/' })
  })

  t.end()
})

test('Should throw errors with incorrect combinations of registration `options.name` and route options `pg.transact`', t => {
  t.test('Should throw an error when `name` is set as reserved keyword', async t => {
    const fastify = Fastify()
    t.teardown(() => fastify.close())

    const name = 'user'

    await fastify.register(fastifyPostgres, {
      connectionString,
      name
    })

    fastify.get('/', { pg: { transact: name } }, (req, reply) => {})

    const response = await fastify.inject({ url: '/' })
    t.same(response.json(), {
      statusCode: 500,
      error: 'Internal Server Error',
      message: `request client '${name}' does not exist`
    })
  })

  t.test('Should throw an error when pg client has already been registered with the same name', async t => {
    const fastify = Fastify()
    t.teardown(() => fastify.close())

    const name = 'test'

    await fastify.register(fastifyPostgres, {
      connectionString,
      name
    })
    fastify.addHook('onRequest', async (req, reply) => {
      req.pg = { [name]: await fastify.pg[name].connect() }
    })
    fastify.get('/', { pg: { transact: name } }, (req, reply) => {})

    const response = await fastify.inject({ url: '/' })
    t.same(response.json(), {
      statusCode: 500,
      error: 'Internal Server Error',
      message: `request client '${name}' has already been registered`
    })
  })

  t.test('Should throw an error when pg client has already been registered', async t => {
    const fastify = Fastify()
    t.teardown(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString
    })
    fastify.addHook('onRequest', async (req, reply) => {
      req.pg = await fastify.pg.connect()
    })
    fastify.get('/', { pg: { transact: true } }, (req, reply) => {})

    const response = await fastify.inject({ url: '/' })
    t.same(response.json(), {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'request client has already been registered'
    })
  })

  t.end()
})
