'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const fastifyPostgres = require('../index')

const {
  BAD_DB_NAME,
  connectionString,
  connectionStringBadDbName
} = require('./helpers')

test('When fastify.pg root namespace is used:', (t) => {
  t.test('Should be able to connect and perform a query with a callback', (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.connect(onConnect)
    })

    function onConnect (err, client, done) {
      t.error(err)

      client.query('SELECT NOW()', (err, result) => {
        done()
        t.error(err)
        t.ok(result.rows)
      })
    }
  })

  t.test('Should be able to use the query util with a callback', (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.query('SELECT NOW()', (err, result) => {
        t.error(err)
        t.ok(result.rows)
      })
    })
  })

  t.test('Should be able to use the query util with promises', (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg
        .query('SELECT NOW()')
        .then((result) => {
          t.ok(result.rows)
        })
        .catch((err) => {
          t.fail(err)
        })
    })
  })

  t.test(
    'query util should return an error when pg fails to perform an operation using a callback',
    (t) => {
      t.plan(4)

      const fastify = Fastify()
      t.teardown(() => fastify.close())

      fastify.register(fastifyPostgres, {
        connectionString: connectionStringBadDbName
      })

      fastify.ready((err) => {
        t.error(err)

        fastify.pg.query('SELECT NOW()', (err, result) => {
          t.equal(result, undefined)
          t.ok(err)
          t.equal(err.message, `database "${BAD_DB_NAME}" does not exist`)
        })
      })
    }
  )

  t.test('Should throw when pg fails to perform operation with promises', (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString: connectionStringBadDbName
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg
        .query('SELECT NOW()')
        .then((result) => {
          t.fail(result)
        })
        .catch((err) => {
          t.ok(err)
          t.equal(err.message, `database "${BAD_DB_NAME}" does not exist`)
        })
    })
  })

  t.end()
})

test('When fastify.pg custom namespace is used:', (t) => {
  t.test('Should be able to connect and perform a query', (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    fastify.ready((err) => {
      t.error(err)
      fastify.pg.test.connect(onConnect)
    })

    function onConnect (err, client, done) {
      t.error(err)
      client.query('SELECT NOW()', (err, result) => {
        done()
        t.error(err)
        t.ok(result.rows)
      })
    }
  })

  t.test('Should be able to use query util with a callback', (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    fastify.ready((err) => {
      t.error(err)
      fastify.pg.test.query('SELECT NOW()', (err, result) => {
        t.error(err)
        t.ok(result.rows)
      })
    })
  })

  t.test('Should be able to use query util with promises', (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.test
        .query('SELECT NOW()')
        .then((result) => {
          t.ok(result.rows)
        })
        .catch((err) => {
          t.fail(err)
        })
    })
  })

  t.test('Should be able to use native module', (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test',
      native: true
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.test
        .query('SELECT 1 AS one')
        .then((result) => {
          t.equal(result.rows[0].one, 1)
        })
        .catch((err) => {
          t.fail(err)
        })
    })
  })

  t.test('Should throw when pg fails to perform an operation with promises', (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString: connectionStringBadDbName,
      name: 'test'
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.test
        .query('SELECT NOW()')
        .then((result) => {
          t.fail(result)
        })
        .catch((err) => {
          t.ok(err)
          t.equal(err.message, `database "${BAD_DB_NAME}" does not exist`)
        })
    })
  })

  t.end()
})
