'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const fastifyPostgres = require('../index')
const { connectionString } = require('./helpers')

const extractUserCount = response => parseInt(JSON.parse(response.payload).rows[0].userCount)

test('fastify postgress useTransaction route option - ', t => {
  test('queries that succeed provided', async t => {
    const fastify = Fastify()
    t.teardown(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString
    })

    await fastify.pg.query('TRUNCATE users')

    await fastify.get('/count-users', async (req, reply) => {
      const result = await fastify.pg.query('SELECT COUNT(*) AS "userCount" FROM users WHERE username=\'pass-opt-in\'')

      reply.send(result)
    })

    await fastify.get('/pass', { pg: { transact: true } }, async (req, reply) => {
      await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in'])
      await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in'])
      reply.send('complete')
    })

    await fastify.inject({
      method: 'GET',
      url: '/pass'
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/count-users'
    })

    t.is(extractUserCount(response), 2)
  })
  test('queries that succeed provided to a namespace', async t => {
    const fastify = Fastify()
    t.teardown(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    await fastify.pg.test.query('TRUNCATE users')

    await fastify.get('/count-users', async (req, reply) => {
      const result = await fastify.pg.test.query('SELECT COUNT(*) AS "userCount" FROM users WHERE username=\'pass-opt-in\'')

      reply.send(result)
    })

    await fastify.get('/pass', { pg: { transact: 'test' } }, async (req, reply) => {
      await req.pg.test.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in'])
      await req.pg.test.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in'])

      reply.send('complete')
    })

    await fastify.inject({
      method: 'GET',
      url: '/pass'
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/count-users'
    })

    t.is(extractUserCount(response), 2)
  })
  test('queries that fail provided', async t => {
    const fastify = Fastify()
    t.teardown(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString
    })

    await fastify.pg.query('TRUNCATE users')

    await fastify.get('/count-users', async (req, reply) => {
      const result = await fastify.pg.query('SELECT COUNT(*) AS "userCount" FROM users WHERE username=\'fail-opt-in\'')

      reply.send(result)
    })

    await fastify.get('/fail', { pg: { transact: true } }, async (req, reply) => {
      await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['fail-opt-in'])
      await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['fail-opt-in'])
      await req.pg.query('INSERT INTO nope(username) VALUES($1) RETURNING id', ['fail-opt-in'])
      reply.send('complete')
    })

    await fastify.inject({
      method: 'GET',
      url: '/fail'
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/count-users'
    })

    t.is(extractUserCount(response), 0)
  })

  t.end()
})
