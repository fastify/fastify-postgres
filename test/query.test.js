'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const fastifyPostgres = require('../index')

test('When fastify.pg root namespace is used:', (childTest) => {
  childTest.test('Should be able to connect and perform a query with a callback', (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString: 'postgres://postgres@localhost/postgres'
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

  childTest.test('Should be able to use the query util with a callback', (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString: 'postgres://postgres@localhost/postgres'
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.query('SELECT NOW()', (err, result) => {
        t.error(err)
        t.ok(result.rows)
      })
    })
  })

  childTest.test('Should be able to use the query util with promises', (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString: 'postgres://postgres@localhost/postgres'
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

  childTest.test(
    'query util should return an error when pg fails to perform an operation using a callback',
    (t) => {
      t.plan(4)

      const fastify = Fastify()
      t.teardown(() => fastify.close())

      const DB_NAME = 'db_that_does_not_exist'

      fastify.register(fastifyPostgres, {
        connectionString: `postgres://postgres@localhost/${DB_NAME}`
      })

      fastify.ready((err) => {
        t.error(err)

        fastify.pg.query('SELECT NOW()', (err, result) => {
          t.is(result, undefined)
          t.ok(err)
          t.is(err.message, `database "${DB_NAME}" does not exist`)
        })
      })
    }
  )

  childTest.test('Should throw when pg fails to perform operation with promises', (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    const DB_NAME = 'db_that_does_not_exist'

    fastify.register(fastifyPostgres, {
      connectionString: `postgres://postgres@localhost/${DB_NAME}`
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
          t.is(err.message, `database "${DB_NAME}" does not exist`)
        })
    })
  })

  childTest.end()
})

test('When fastify.pg.test namespace is used:', (childTest) => {
  childTest.test('Should be able to connect and perform a query', (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString: 'postgres://postgres@localhost/postgres',
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

  childTest.test('Should be able to use query util with a callback', (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString: 'postgres://postgres@localhost/postgres',
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

  childTest.test('Should be able to use query util with promises', (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString: 'postgres://postgres@localhost/postgres',
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

  childTest.test('Should be able to use native module', (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString: 'postgres://postgres@localhost/postgres',
      name: 'test',
      native: true
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.test
        .query('SELECT 1 AS one')
        .then((result) => {
          t.is(result.rows[0].one, 1)
        })
        .catch((err) => {
          t.fail(err)
        })
    })
  })

  childTest.test('Should throw when pg fails to perform an operation with promises', (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    const DB_NAME = 'database_that_do_not_exist'

    fastify.register(fastifyPostgres, {
      connectionString: `postgres://postgres@localhost/${DB_NAME}`,
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
          t.is(err.message, `database "${DB_NAME}" does not exist`)
        })
    })
  })

  childTest.end()
})
