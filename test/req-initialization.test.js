'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const fastifyPostgres = require('../index')
const { connectionString } = require('./helpers')

// // A failed set of queries with transactions on, on test, NONE of these entries should be visible in the DB
// fastify.get('/fail', { useTransaction: true }, async (req, reply) => {
//   console.log('in fail registration')

//   await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['fail-opt-in-q1'])
//   await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['fail-opt-in-q2'])
//   await req.pg.query('INSERT INTO nope(username) VALUES($1) RETURNING id', ['fail-opt-in-q3'])

//   reply.send('Fail example')
// })

// // A passing set of queries with transactions on, on test, ALL of these entries should be visible in the DB
// fastify.get('/pass', { useTransaction: true }, async (req, reply) => {
//   console.log('in pass registration')

//   await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in-q1'])
//   await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-in-q2'])

//   reply.send('Pass example')
// })

// // A failed set of queries with transactions off, on test, THE FIRST TWO of these entries should be visible in the DB
// fastify.get('/fail-opt-out', { useTransaction: false }, async (req, reply) => {
//   console.log('in fail registration')

//   await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['fail-opt-out-q1'])
//   await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['fail-opt-out-q2'])
//   await req.pg.query('INSERT INTO nope(username) VALUES($1) RETURNING id', ['fail-opt-out-q3'])

//   reply.send('Fail example')
// })

// // A passing set of queries with transactions off, on test, ALL of these entries should be visible in the DB
// fastify.get('/pass-opt-out', { useTransaction: false }, async (req, reply) => {
//   console.log('in pass registration')

//   await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-out-q1'])
//   await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-out-q2'])

//   reply.send('Pass example')
// })

const extractUserCount = response => parseInt(JSON.parse(response.payload).rows[0].userCount)

test('fastify postgress useTransaction route option - ', t => {
  test('set to true - ', t => {
    test('passing queries provided', async t => {
      const fastify = Fastify()
      t.teardown(() => fastify.close())

      await fastify.register(fastifyPostgres, {
        connectionString
      })

      await fastify.pg.query('TRUNCATE users')

      await fastify.get('/count-users', async (req, reply) => {
        const result = await req.pg.query('SELECT COUNT(*) AS "userCount" FROM users WHERE username=\'pass-opt-in\'')

        reply.send(result)
      })

      await fastify.get('/pass', { useTransaction: true }, async (req, reply) => {
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
    test('failing queries provided', async t => {
      const fastify = Fastify()
      t.teardown(() => fastify.close())

      await fastify.register(fastifyPostgres, {
        connectionString
      })

      await fastify.pg.query('TRUNCATE users')

      await fastify.get('/count-users', async (req, reply) => {
        const result = await req.pg.query('SELECT COUNT(*) AS "userCount" FROM users WHERE username=\'fail-opt-in\'')

        reply.send(result)
      })

      await fastify.get('/fail', { useTransaction: true }, async (req, reply) => {
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
  test('set to false - ', t => {
    test('passing queries provided', async t => {
      const fastify = Fastify()
      t.teardown(() => fastify.close())

      await fastify.register(fastifyPostgres, {
        connectionString
      })

      await fastify.pg.query('TRUNCATE users')

      await fastify.get('/count-users', async (req, reply) => {
        const result = await req.pg.query('SELECT COUNT(*) AS "userCount" FROM users WHERE username=\'pass-opt-out\'')

        reply.send(result)
      })

      await fastify.get('/pass-opt-out', { useTransaction: false }, async (req, reply) => {
        await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-out'])
        await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['pass-opt-out'])
        reply.send('complete')
      })

      await fastify.inject({
        method: 'GET',
        url: '/pass-opt-out'
      })

      const response = await fastify.inject({
        method: 'GET',
        url: '/count-users'
      })

      t.is(extractUserCount(response), 2)
    })
    test('failing queries provided', async t => {
      const fastify = Fastify()
      t.teardown(() => fastify.close())

      await fastify.register(fastifyPostgres, {
        connectionString
      })

      await fastify.pg.query('TRUNCATE users')

      await fastify.get('/count-users', async (req, reply) => {
        const result = await req.pg.query('SELECT COUNT(*) AS "userCount" FROM users WHERE username=\'fail-opt-out\'')

        reply.send(result)
      })

      await fastify.get('/fail-opt-out', { useTransaction: false }, async (req, reply) => {
        await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['fail-opt-out'])
        await req.pg.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['fail-opt-out'])
        await req.pg.query('INSERT INTO nope(username) VALUES($1) RETURNING id', ['fail-opt-out'])
        reply.send('complete')
      })

      await fastify.inject({
        method: 'GET',
        url: '/fail-opt-out'
      })

      const response = await fastify.inject({
        method: 'GET',
        url: '/count-users'
      })

      t.is(extractUserCount(response), 2)
    })

    t.end()
  })

  t.end()
})
