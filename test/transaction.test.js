'use strict'

const { test } = require('node:test')
const Fastify = require('fastify')
const pg = require('pg')
const fastifyPostgres = require('../index')
const {
  BAD_DB_NAME,
  connectionString,
  connectionStringBadDbName
} = require('./helpers')

test('When fastify.pg root namespace is used:', async (t) => {
  await t.test('Should be able to use transact util with a callback', async (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, { connectionString })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    const result = await fastify.pg.transact(
      (client) =>
        client.query('INSERT INTO users(username) VALUES($1) RETURNING id', [
          'root-with-callback'
        ])
    )
    t.assert.strictEqual(result.rows.length, 1)

    const userId = result.rows[0].id

    const result2 = await fastify.pg
      .query('SELECT * FROM users WHERE id = $1', [userId])
    t.assert.strictEqual(result2.rows[0].username, 'root-with-callback')
  })

  await t.test('Should be able to use transact util with promises', async (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, { connectionString })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    const result = await fastify.pg
      .transact((client) =>
        client.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['root-with-promise'])
      )
    t.assert.strictEqual(result.rows.length, 1)

    const userId = result.rows[0].id

    const result2 = await fastify.pg
      .query('SELECT * FROM users WHERE id = $1', [userId])
    t.assert.strictEqual(result2.rows[0].username, 'root-with-promise')
  })

  await t.test('Should be able to use transact util with a commit callback', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, { connectionString })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    const result = await fastify.pg.transact(
      (client, commit) =>
        client.query(
          'INSERT INTO users(username) VALUES($1) RETURNING id',
          ['root-commit-callback'],
          (err, id) => {
            commit(err, id)
          }
        ))
    t.assert.ok(ready)
    t.assert.strictEqual(result.rows.length, 1)

    const userId = result.rows[0].id

    const result2 = await fastify.pg
      .query('SELECT * FROM users WHERE id = $1', [userId])
    t.assert.strictEqual(result2.rows[0].username, 'root-commit-callback')
  })

  await t.test('Should trigger a rollback when something goes wrong (with callback)', async (t) => {
    t.plan(9)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, { connectionString })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    await t.assert.rejects(
      async () => await fastify.pg.transact(
        async (client) => {
          const result = await client
            .query('INSERT INTO users(username) VALUES($1) RETURNING id', [
              'root-rollback-user-callback'
            ])
          t.assert.ok(result)

          const userId = result.rows[0].id

          const result2 = await client
            .query('SELECT * FROM users WHERE id = $1', [userId])
          t.assert.ok(result2)
          t.assert.strictEqual(result2.rows[0].username, 'root-rollback-user-callback')
          throw new Error('We make it throw on purpose to trigger a rollback')
        }),
      (err) => {
        t.assert.ok(err)
        t.assert.strictEqual(err.message, 'We make it throw on purpose to trigger a rollback')
        return true
      }
    )

    const result3 = await fastify.pg
      .query('SELECT * FROM users WHERE username = \'root-rollback-user-callback\'')
    t.assert.ok(result3)
    t.assert.strictEqual(result3.rows.length, 0)
  })

  await t.test('Should trigger a rollback when something goes wrong (with promises)', async (t) => {
    t.plan(8)

    await new Promise((resolve) => {
      const fastify = Fastify()
      t.after(() => fastify.close())

      fastify.register(fastifyPostgres, { connectionString })

      fastify.ready((err) => {
        t.assert.ifError(err)

        fastify.pg
          .transact((client) =>
            client
              .query('INSERT INTO users(username) VALUES($1) RETURNING id', [
                'root-rollback-user-promise'
              ])
              .then((result) => {
                t.assert.ok(result)

                const userId = result.rows[0].id

                return client
                  .query('SELECT * FROM users WHERE id = $1', [userId])
                  .then((result) => {
                    t.assert.ok(result)
                    t.assert.strictEqual(result.rows[0].username, 'root-rollback-user-promise')
                  })
                  .then(() => {
                    throw new Error('We make it throw on purpose to trigger a rollback')
                  })
              })
          )
          .catch((err) => {
            t.assert.ok(err)
            t.assert.strictEqual(err.message, 'We make it throw on purpose to trigger a rollback')

            fastify.pg
              .query('SELECT * FROM users WHERE username = \'root-rollback-user-promise\'')
              .then((result) => {
                t.assert.ok(result)
                t.assert.strictEqual(result.rows.length, 0)
                resolve()
              })
              .catch((err) => {
                t.assert.ifError(err)
              })
          })
      })
    })
  })

  await t.test('Should throw if the pool connection throws an error', async (t) => {
    t.plan(4)

    const fastify = Fastify()

    await fastify.register(fastifyPostgres, {
      connectionString: connectionStringBadDbName
    })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    await t.assert.rejects(
      async () => await fastify.pg.transact((client) => client.query('SELECT NOW()')),
      (err) => {
        t.assert.ok(err)
        t.assert.strictEqual(err.message, `database "${BAD_DB_NAME}" does not exist`)
        return true
      }
    )
  })

  await t.test('Should trigger a rollback when it is impossible to begin transaction', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.after(() => fastify.close())

    class FakeClient extends pg.Client {
      query (cmd, cb) {
        if (cmd === 'BEGIN') {
          cb(new Error('Boom'))
        }
        cb(null, {})
      }
    }
    class FakePool extends pg.Pool {
      constructor (options) {
        super()
        this.Client = new FakeClient(options)
        this.options = Object.assign({}, options)
      }

      connect (cb) {
        cb(null, this.Client, () => {})
      }
    }

    await fastify.register(fastifyPostgres, { connectionString, pg: { ...pg, Pool: FakePool } })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    await t.assert.rejects(
      async () => await fastify.pg.transact(() => {}),
      (err) => {
        t.assert.ok(err)
        t.assert.strictEqual(err.message, 'Boom')
        return true
      }
    )
  })

  await t.test('Should trigger a rollback when it is impossible to commit transaction', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.after(() => fastify.close())

    class FakeClient extends pg.Client {
      query (queryText, values, cb) {
        if (values && typeof values === 'function') {
          cb = values
        }
        if (queryText === 'COMMIT') {
          return cb(new Error('Boom'))
        }
        return cb(null, {})
      }
    }
    class FakePool extends pg.Pool {
      constructor (options) {
        super()
        this.Client = new FakeClient(options)
        this.options = Object.assign({}, options)
      }

      connect (cb) {
        cb(null, this.Client, () => {})
      }
    }

    await fastify.register(fastifyPostgres, { connectionString, pg: { ...pg, Pool: FakePool } })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    await t.assert.rejects(
      async () => await fastify.pg.transact(
        (client, commit) => {
          return client.query('INSERT INTO users(username) VALUES($1) RETURNING id', [
            'root-rollback-commit'
          ], (err, res) => {
            commit(err, res)
          })
        }
      ),
      (err) => {
        t.assert.ok(err)
        t.assert.strictEqual(err.message, 'Boom')
        return true
      })
  })
})

test('When fastify.pg.test namespace is used:', async (t) => {
  await t.test('Should be able to use transact util with a callback', async (t) => {
    t.plan(4)

    await new Promise((resolve) => {
      const fastify = Fastify()
      t.after(() => fastify.close())

      fastify.register(fastifyPostgres, {
        connectionString,
        name: 'test'
      })

      fastify.ready((err) => {
        t.assert.ifError(err)

        fastify.pg.test.transact(
          (client) =>
            client.query('INSERT INTO users(username) VALUES($1) RETURNING id', [
              'namespace-with-callback'
            ]),
          function (err, result) {
            t.assert.ifError(err)
            t.assert.strictEqual(result.rows.length, 1)

            const userId = result.rows[0].id

            fastify.pg.test
              .query('SELECT * FROM users WHERE id = $1', [userId])
              .then((result) => {
                t.assert.strictEqual(result.rows[0].username, 'namespace-with-callback')
                resolve()
              })
              .catch((err) => {
                t.fail(err)
              })
          }
        )
      })
    })
  })

  await t.test('Should be able to use transact util with promises', async (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    const result = await fastify.pg.test
      .transact((client) =>
        client.query('INSERT INTO users(username) VALUES($1) RETURNING id', [
          'namespace-with-promise'
        ])
      )
    t.assert.strictEqual(result.rows.length, 1)

    const userId = result.rows[0].id

    const result2 = await fastify.pg.test
      .query('SELECT * FROM users WHERE id = $1', [userId])
    t.assert.strictEqual(result2.rows[0].username, 'namespace-with-promise')
  })

  await t.test('Should trigger a rollback when something goes wrong (with callback)', async (t) => {
    t.plan(9)

    await new Promise((resolve) => {
      const fastify = Fastify()
      t.after(() => fastify.close())

      fastify.register(fastifyPostgres, {
        connectionString,
        name: 'test'
      })

      fastify.ready((err) => {
        t.assert.ifError(err)

        fastify.pg.test.transact(
          (client) => {
            return client
              .query('INSERT INTO users(username) VALUES($1) RETURNING id', [
                'namespace-rollback-user-callback'
              ])
              .then((result) => {
                t.assert.ok(result)

                const userId = result.rows[0].id

                return client
                  .query('SELECT * FROM users WHERE id = $1', [userId])
                  .then((result) => {
                    t.assert.ok(result)
                    t.assert.strictEqual(result.rows[0].username, 'namespace-rollback-user-callback')
                  })
                  .then(() => {
                    throw new Error('We make it throw on purpose to trigger a rollback')
                  })
              })
          },
          function (err, result) {
            t.assert.ok(err)
            t.assert.strictEqual(err.message, 'We make it throw on purpose to trigger a rollback')
            t.assert.strictEqual(result, undefined)

            fastify.pg.test
              .query('SELECT * FROM users WHERE username = \'namespace-rollback-user-callback\'')
              .then((result) => {
                t.assert.ok(result)
                t.assert.strictEqual(result.rows.length, 0)
                resolve()
              })
              .catch((err) => {
                t.fail(err)
              })
          }
        )
      })
    })
  })

  await t.test('Should trigger a rollback when something goes wrong (with promises)', async (t) => {
    t.plan(9)

    const fastify = Fastify()
    t.after(() => fastify.close())

    await fastify.register(fastifyPostgres, {
      connectionString,
      name: 'test'
    })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    await t.assert.rejects(
      async () => await fastify.pg.test
        .transact(async (client) =>
          client
            .query('INSERT INTO users(username) VALUES($1) RETURNING id', [
              'namespace-rollback-user-promise'
            ])
            .then((result) => {
              t.assert.ok(result)

              const userId = result.rows[0].id

              return client
                .query('SELECT * FROM users WHERE id = $1', [userId])
                .then((result) => {
                  t.assert.ok(result)
                  t.assert.strictEqual(result.rows[0].username, 'namespace-rollback-user-promise')
                })
                .then(() => {
                  throw new Error('We make it throw on purpose to trigger a rollback')
                })
            })
        ),
      (err) => {
        t.assert.ok(err)
        t.assert.strictEqual(err.message, 'We make it throw on purpose to trigger a rollback')
        return true
      })

    const result = await fastify.pg.test
      .query('SELECT * FROM users WHERE username = \'namespace-rollback-user-promise\'')
    t.assert.ok(result)
    t.assert.strictEqual(result.rows.length, 0)
  })

  await t.test('Should throw if the pool connection throws an error', async (t) => {
    t.plan(4)

    const fastify = Fastify()

    await fastify.register(fastifyPostgres, {
      connectionString: connectionStringBadDbName,
      name: 'test'
    })

    const ready = await fastify.ready()
    t.assert.ok(ready)

    await t.assert.rejects(
      async () => await fastify.pg.test.transact((client) => client.query('SELECT NOW()')),
      (err) => {
        t.assert.ok(err)
        t.assert.strictEqual(err.message, `database "${BAD_DB_NAME}" does not exist`)
        return true
      }
    )
  })
})
