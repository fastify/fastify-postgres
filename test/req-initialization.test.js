'use strict'

const { test } = require('node:test')
const Fastify = require('fastify')
const fastifyPostgres = require('../index')
const { connectionString } = require('./helpers')

const extractUserCount = response => parseInt(JSON.parse(response.payload).rows[0].userCount)

test('When we use the fastify-postgres transaction route option', async t => {
  await t.test('Should be able to execute queries provided to the request pg decorator', async t => {
    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString
    })

    await fastify.pg.query('DELETE FROM "users" WHERE TRUE')

    fastify.get('/count-users', async () => {
      const result = await fastify.pg.query('SELECT COUNT(*) AS "userCount" FROM users WHERE username=\'pass-opt-in\'')

      return result
    })

    fastify.get('/pass', { pg: { transact: true } }, async (req) => {
      await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in'])
      await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in'])
      return 'complete'
    })

    await fastify.inject({ url: '/pass' })

    const response = await fastify.inject({
      method: 'GET',
      url: '/count-users'
    })

    t.assert.strictEqual(extractUserCount(response), 2)
  })

  await t.test('Should be able to execute queries provided to a namespaced request pg decorator', async t => {
    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    await fastify.pg.test.query('DELETE FROM "users" WHERE TRUE')

    fastify.get('/count-users', async () => {
      const result = await fastify.pg.test.query('SELECT COUNT(*) AS "userCount" FROM users WHERE username=\'pass-opt-in\'')

      return result
    })

    fastify.get('/pass', { pg: { transact: 'test' } }, async (req) => {
      await req.pg.test.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in'])
      await req.pg.test.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in'])

      return 'complete'
    })

    await fastify.inject({ url: '/pass' })

    const response = await fastify.inject({
      method: 'GET',
      url: '/count-users'
    })

    t.assert.strictEqual(extractUserCount(response), 2)
  })

  await t.test('Should trigger a rollback when failing to execute a query provided to the request pg decorator', async t => {
    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString
    })

    await fastify.pg.query('DELETE FROM "users" WHERE TRUE')

    fastify.get('/count-users', async (_req, reply) => {
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

    t.assert.strictEqual(extractUserCount(response), 0)
  })

  await t.test('Should trigger a rollback when failing to execute a query provided to a namespaced request pg decorator', async t => {
    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    await fastify.pg.test.query('DELETE FROM "users" WHERE TRUE')

    fastify.get('/count-users', async (_req, reply) => {
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

    t.assert.strictEqual(extractUserCount(response), 0)
  })

  await t.test('Should work properly with `schema` option and validation failure', async t => {
    const fastify = Fastify()
    t.after(() => fastify.close())

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
    }, async () => {
      t.assert.fail('should never execute the handler')
    })

    const response = await fastify.inject({
      url: '/schema-validation',
      method: 'POST',
      body: { notValid: 'json input' }
    })
    t.assert.notStrictEqual(response.body, 'never success')
    t.assert.strictEqual(response.json().code, 'FST_ERR_VALIDATION')
  })
})

test('Should not add hooks with combinations of registration `options.name` and route options `pg.transact`', async t => {
  await t.test('Should not add hooks when `transact` is not set', async t => {
    t.plan(1)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString
    })
    fastify.get('/', async (req) => {
      t.assert.strictEqual(req.pg, null)
    })
    await fastify.inject({ url: '/' })
  })

  await t.test('Should not add hooks when `name` is set and `transact` is not set', async t => {
    t.plan(1)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })
    fastify.get('/', async (req) => {
      t.assert.strictEqual(req.pg, null)
    })

    await fastify.inject({ url: '/' })
  })

  await t.test('Should not add hooks when `name` is set and `transact` is set to `true`', async t => {
    t.plan(1)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })
    fastify.get('/', { pg: { transact: true } }, async (req) => {
      t.assert.strictEqual(req.pg, null)
    })

    await fastify.inject({ url: '/' })
  })

  await t.test('Should not add hooks when `name` is not set and `transact` is set and is a string', async t => {
    t.plan(1)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString
    })
    fastify.get('/', { pg: { transact: 'test' } }, async (req) => {
      t.assert.strictEqual(req.pg, null)
    })

    await fastify.inject({ url: '/' })
  })

  await t.test('Should not add hooks when `name` and `transact` are set to different strings', async t => {
    t.plan(1)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })
    fastify.get('/', { pg: { transact: 'different' } }, async (req) => {
      t.assert.strictEqual(req.pg, null)
    })

    await fastify.inject({ url: '/' })
  })
})

test('Should throw errors with incorrect combinations of registration `options.name` and route options `pg.transact`', async t => {
  await t.test('Should throw an error when `name` is set as reserved keyword', async t => {
    const fastify = Fastify()
    t.after(() => fastify.close())

    const name = 'user'

    await fastify.register(fastifyPostgres, {
      connectionString,
      name
    })

    fastify.get('/', { pg: { transact: name } }, async () => {})

    const response = await fastify.inject({ url: '/' })
    t.assert.deepStrictEqual(response.json(), {
      statusCode: 500,
      error: 'Internal Server Error',
      message: `request client '${name}' does not exist`
    })
  })

  await t.test('Should throw an error when pg client has already been registered with the same name', async t => {
    const fastify = Fastify()
    t.after(() => fastify.close())

    const name = 'test'

    await fastify.register(fastifyPostgres, {
      connectionString,
      name
    })
    fastify.addHook('onRequest', async (req) => {
      req.pg = { [name]: await fastify.pg[name].connect() }
    })
    fastify.get('/', { pg: { transact: name } }, async () => {})

    const response = await fastify.inject({ url: '/' })
    t.assert.deepStrictEqual(response.json(), {
      statusCode: 500,
      error: 'Internal Server Error',
      message: `request client '${name}' has already been registered`
    })
  })

  await t.test('Should throw an error when pg client has already been registered', async t => {
    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString
    })
    fastify.addHook('onRequest', async (req) => {
      req.pg = await fastify.pg.connect()
    })
    fastify.get('/', { pg: { transact: true } }, async () => {})

    const response = await fastify.inject({ url: '/' })
    t.assert.deepStrictEqual(response.json(), {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'request client has already been registered'
    })
  })
})
