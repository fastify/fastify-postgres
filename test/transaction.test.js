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
  t.test('Should be able to use transact util with a callback', (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString: process.env.DATABASE_TEST_URL || 'postgres://postgres:postgres@localhost/postgres'
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.transact(
        (client) =>
          client.query('INSERT INTO users(username) VALUES($1) RETURNING id', [
            'root-with-callback'
          ]),
        function (err, result) {
          t.error(err)
          t.is(result.rows.length, 1)

          const userId = result.rows[0].id

          fastify.pg
            .query('SELECT * FROM users WHERE id = $1', [userId])
            .then((result) => {
              t.is(result.rows[0].username, 'root-with-callback')
            })
            .catch((err) => {
              t.fail(err)
            })
        }
      )
    })
  })

  t.test('Should be able to use transact util with promises', (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString: process.env.DATABASE_TEST_URL || 'postgres://postgres:postgres@localhost/postgres'
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg
        .transact((client) =>
          client.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['root-with-promise'])
        )
        .then((result) => {
          t.is(result.rows.length, 1)

          const userId = result.rows[0].id

          fastify.pg
            .query('SELECT * FROM users WHERE id = $1', [userId])
            .then((result) => {
              t.is(result.rows[0].username, 'root-with-promise')
            })
            .catch((err) => {
              t.fail(err)
            })
        })
        .catch((err) => {
          t.fail(err)
        })
    })
  })

  t.test('Should be able to use transact util with a commit callback', (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString: process.env.DATABASE_TEST_URL || 'postgres://postgres:postgres@localhost/postgres'
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.transact(
        (client, commit) =>
          client.query(
            'INSERT INTO users(username) VALUES($1) RETURNING id',
            ['root-commit-callback'],
            (err, id) => {
              commit(err, id)
            }
          ),
        function (err, result) {
          t.error(err)
          t.is(result.rows.length, 1)

          const userId = result.rows[0].id

          fastify.pg
            .query('SELECT * FROM users WHERE id = $1', [userId])
            .then((result) => {
              t.is(result.rows[0].username, 'root-commit-callback')
            })
            .catch((err) => {
              t.fail(err)
            })
        }
      )
    })
  })

  t.test('Should trigger a rollback when something goes wrong (with callback)', (t) => {
    t.plan(9)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString: process.env.DATABASE_TEST_URL || 'postgres://postgres:postgres@localhost/postgres'
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.transact(
        (client) => {
          return client
            .query('INSERT INTO users(username) VALUES($1) RETURNING id', [
              'root-rollback-user-callback'
            ])
            .then((result) => {
              t.ok(result)

              const userId = result.rows[0].id

              return client
                .query('SELECT * FROM users WHERE id = $1', [userId])
                .then((result) => {
                  t.ok(result)
                  t.is(result.rows[0].username, 'root-rollback-user-callback')
                })
                .then(() => {
                  throw new Error('We make it throw on purpose to trigger a rollback')
                })
            })
        },
        function (err, result) {
          t.ok(err)
          t.is(err.message, 'We make it throw on purpose to trigger a rollback')
          t.is(result, undefined)

          fastify.pg
            .query('SELECT * FROM users WHERE username = \'root-rollback-user-callback\'')
            .then((result) => {
              t.ok(result)
              t.is(result.rows.length, 0)
            })
            .catch((err) => {
              t.fail(err)
            })
        }
      )
    })
  })

  t.test('Should trigger a rollback when something goes wrong (with promises)', (t) => {
    t.plan(8)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString: process.env.DATABASE_TEST_URL || 'postgres://postgres:postgres@localhost/postgres'
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg
        .transact((client) =>
          client
            .query('INSERT INTO users(username) VALUES($1) RETURNING id', [
              'root-rollback-user-promise'
            ])
            .then((result) => {
              t.ok(result)

              const userId = result.rows[0].id

              return client
                .query('SELECT * FROM users WHERE id = $1', [userId])
                .then((result) => {
                  t.ok(result)
                  t.is(result.rows[0].username, 'root-rollback-user-promise')
                })
                .then(() => {
                  throw new Error('We make it throw on purpose to trigger a rollback')
                })
            })
        )
        .catch((err) => {
          t.ok(err)
          t.is(err.message, 'We make it throw on purpose to trigger a rollback')

          fastify.pg
            .query('SELECT * FROM users WHERE username = \'root-rollback-user-promise\'')
            .then((result) => {
              t.ok(result)
              t.is(result.rows.length, 0)
            })
            .catch((err) => {
              t.fail(err)
            })
        })
    })
  })

  t.test('Should throw if the pool connection throws an error', (t) => {
    t.plan(3)

    const fastify = Fastify()

    fastify.register(fastifyPostgres, {
      connectionString: connectionStringBadDbName
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.transact((client) => client.query('SELECT NOW()'))
        .catch((err) => {
          t.ok(err)
          t.is(err.message, `database "${BAD_DB_NAME}" does not exist`)
        })
    })
  })

  t.end()
})

test('When fastify.pg.test namespace is used:', (t) => {
  t.test('Should be able to use transact util with a callback', (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.test.transact(
        (client) =>
          client.query('INSERT INTO users(username) VALUES($1) RETURNING id', [
            'namespace-with-callback'
          ]),
        function (err, result) {
          t.error(err)
          t.is(result.rows.length, 1)

          const userId = result.rows[0].id

          fastify.pg.test
            .query('SELECT * FROM users WHERE id = $1', [userId])
            .then((result) => {
              t.is(result.rows[0].username, 'namespace-with-callback')
            })
            .catch((err) => {
              t.fail(err)
            })
        }
      )
    })
  })

  t.test('Should be able to use transact util with promises', (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.test
        .transact((client) =>
          client.query('INSERT INTO users(username) VALUES($1) RETURNING id', [
            'namespace-with-promise'
          ])
        )
        .then((result) => {
          t.is(result.rows.length, 1)

          const userId = result.rows[0].id

          fastify.pg.test
            .query('SELECT * FROM users WHERE id = $1', [userId])
            .then((result) => {
              t.is(result.rows[0].username, 'namespace-with-promise')
            })
            .catch((err) => {
              t.fail(err)
            })
        })
        .catch((err) => {
          t.fail(err)
        })
    })
  })

  t.test('Should be able to use transact util with a commit callback', (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.test.transact(
        (client, commit) => {
          client.query(
            'INSERT INTO users(username) VALUES($1) RETURNING id',
            ['namespace-commit-callback'],
            (err, id) => {
              commit(err, id)
            }
          )
        },
        function (err, result) {
          t.error(err)
          t.is(result.rows.length, 1)

          const userId = result.rows[0].id

          fastify.pg.test
            .query('SELECT * FROM users WHERE id = $1', [userId])
            .then((result) => {
              t.is(result.rows[0].username, 'namespace-commit-callback')
            })
            .catch((err) => {
              t.fail(err)
            })
        }
      )
    })
  })

  t.test('Should trigger a rollback when something goes wrong (with callback)', (t) => {
    t.plan(9)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.test.transact(
        (client) => {
          return client
            .query('INSERT INTO users(username) VALUES($1) RETURNING id', [
              'namespace-rollback-user-callback'
            ])
            .then((result) => {
              t.ok(result)

              const userId = result.rows[0].id

              return client
                .query('SELECT * FROM users WHERE id = $1', [userId])
                .then((result) => {
                  t.ok(result)
                  t.is(result.rows[0].username, 'namespace-rollback-user-callback')
                })
                .then(() => {
                  throw new Error('We make it throw on purpose to trigger a rollback')
                })
            })
        },
        function (err, result) {
          t.ok(err)
          t.is(err.message, 'We make it throw on purpose to trigger a rollback')
          t.is(result, undefined)

          fastify.pg.test
            .query('SELECT * FROM users WHERE username = \'namespace-rollback-user-callback\'')
            .then((result) => {
              t.ok(result)
              t.is(result.rows.length, 0)
            })
            .catch((err) => {
              t.fail(err)
            })
        }
      )
    })
  })

  t.test('Should trigger a rollback when something goes wrong (with promises)', (t) => {
    t.plan(8)

    const fastify = Fastify()
    t.teardown(() => fastify.close())

    fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.test
        .transact((client) =>
          client
            .query('INSERT INTO users(username) VALUES($1) RETURNING id', [
              'namespace-rollback-user-promise'
            ])
            .then((result) => {
              t.ok(result)

              const userId = result.rows[0].id

              return client
                .query('SELECT * FROM users WHERE id = $1', [userId])
                .then((result) => {
                  t.ok(result)
                  t.is(result.rows[0].username, 'namespace-rollback-user-promise')
                })
                .then(() => {
                  throw new Error('We make it throw on purpose to trigger a rollback')
                })
            })
        )
        .catch((err) => {
          t.ok(err)
          t.is(err.message, 'We make it throw on purpose to trigger a rollback')

          fastify.pg.test
            .query('SELECT * FROM users WHERE username = \'namespace-rollback-user-promise\'')
            .then((result) => {
              t.ok(result)
              t.is(result.rows.length, 0)
            })
            .catch((err) => {
              t.fail(err)
            })
        })
    })
  })

  t.test('Should throw if the pool connection throws an error', (t) => {
    t.plan(3)

    const fastify = Fastify()

    fastify.register(fastifyPostgres, {
      connectionString: connectionStringBadDbName,
      name: 'test'
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.pg.test.transact((client) => client.query('SELECT NOW()'))
        .catch((err) => {
          t.ok(err)
          t.is(err.message, `database "${BAD_DB_NAME}" does not exist`)
        })
    })
  })

  t.end()
})
