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

test('use query util', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.register(fastifyPostgres, {
    connectionString: 'postgres://postgres@localhost/postgres'
  })

  fastify.ready(err => {
    t.error(err)
    fastify.pg.query('SELECT NOW()', (err, result) => {
      t.error(err)
      t.ok(result.rows)
      fastify.close()
    })
  })
})

test('use query util with promises', t => {
  t.plan(2)

  const fastify = Fastify()

  fastify.register(fastifyPostgres, {
    connectionString: 'postgres://postgres@localhost/postgres'
  })

  fastify.ready(err => {
    t.error(err)
    fastify.pg
      .query('SELECT NOW()')
      .then(result => {
        t.ok(result.rows)
        fastify.close()
      })
      .catch(err => {
        t.fail(err)
        fastify.close()
      })
  })
})

test('use native module', t => {
  t.plan(2)

  const fastify = Fastify()

  fastify.register(fastifyPostgres, {
    connectionString: 'postgres://postgres@localhost/postgres',
    native: true
  })

  fastify.ready(err => {
    t.error(err)
    fastify.pg
      .query('SELECT 1 AS one')
      .then(result => {
        t.ok(result.rows[0].one === 1)
        fastify.close()
      })
      .catch(err => {
        t.fail(err)
        fastify.close()
      })
  })
})

test('use alternative pg module', t => {
  const altPg = require('pg')
  t.plan(2)

  const fastify = Fastify()

  fastify.register(fastifyPostgres, {
    connectionString: 'postgres://postgres@localhost/postgres',
    pg: altPg
  })

  fastify.ready(err => {
    t.error(err)
    fastify.pg
      .query('SELECT 1 AS one')
      .then(result => {
        t.ok(result.rows[0].one === 1)
        fastify.close()
      })
      .catch(err => {
        t.fail(err)
        fastify.close()
      })
  })
})

test('fastify.pg.test namespace should exist', t => {
  t.plan(6)

  const fastify = Fastify()

  fastify.register(fastifyPostgres, {
    name: 'test',
    connectionString: 'postgres://postgres@localhost/postgres'
  })

  fastify.ready(err => {
    t.error(err)
    t.ok(fastify.pg)
    t.ok(fastify.pg.test)
    t.ok(fastify.pg.test.connect)
    t.ok(fastify.pg.test.pool)
    t.ok(fastify.pg.test.Client)
    fastify.close()
  })
})

test('fastify.pg.test should be able to connect and perform a query', t => {
  t.plan(4)

  const fastify = Fastify()

  fastify.register(fastifyPostgres, {
    name: 'test',
    connectionString: 'postgres://postgres@localhost/postgres'
  })

  fastify.ready(err => {
    t.error(err)
    fastify.pg.test.connect(onConnect)
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

test('fastify.pg.test use query util', t => {
  t.plan(3)

  const fastify = Fastify()

  fastify.register(fastifyPostgres, {
    name: 'test',
    connectionString: 'postgres://postgres@localhost/postgres'
  })

  fastify.ready(err => {
    t.error(err)
    fastify.pg.test.query('SELECT NOW()', (err, result) => {
      t.error(err)
      t.ok(result.rows)
      fastify.close()
    })
  })
})

test('fastify.pg.test use query util with promises', t => {
  t.plan(2)

  const fastify = Fastify()

  fastify.register(fastifyPostgres, {
    name: 'test',
    connectionString: 'postgres://postgres@localhost/postgres'
  })

  fastify.ready(err => {
    t.error(err)
    fastify.pg.test
      .query('SELECT NOW()')
      .then(result => {
        t.ok(result.rows)
        fastify.close()
      })
      .catch(err => {
        t.fail(err)
        fastify.close()
      })
  })
})

test('fastify.pg.test use native module', t => {
  t.plan(2)

  const fastify = Fastify()

  fastify.register(fastifyPostgres, {
    name: 'test',
    connectionString: 'postgres://postgres@localhost/postgres',
    native: true
  })

  fastify.ready(err => {
    t.error(err)
    fastify.pg.test
      .query('SELECT 1 AS one')
      .then(result => {
        t.ok(result.rows[0].one === 1)
        fastify.close()
      })
      .catch(err => {
        t.fail(err)
        fastify.close()
      })
  })
})

test('fastify.pg.test should throw with duplicate connection names', t => {
  t.plan(1)

  const fastify = Fastify()

  fastify.register(fastifyPostgres, {
    name: 'test',
    connectionString: 'postgres://postgres@localhost/postgres'
  })
    .register(fastifyPostgres, {
      name: 'test',
      connectionString: 'postgres://postgres@localhost/postgres'
    })

  fastify.ready(err => {
    t.is(err.message, 'Connection name has already been registered: test')
  })
})

test('fastify.pg.test use transact util with promise', t => {
  t.plan(3)

  const fastify = Fastify()
  t.tearDown(fastify.close.bind(fastify))

  fastify.register(fastifyPostgres, {
    name: 'test',
    connectionString: 'postgres://postgres@localhost/postgres'
  })

  fastify.ready(err => {
    t.error(err)
    fastify.pg.test
      .transact(client => client.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['with-promise']))
      .then(result => {
        t.equals(result.rows.length, 1)
        fastify.pg.test
          .query(`SELECT * FROM users WHERE username = 'with-promise'`)
          .then(result => {
            t.ok(result.rows[0].username === 'with-promise')
          }).catch(err => {
            t.fail(err)
          })
      })
      .catch(err => {
        t.fail(err)
      })
  })
})

test('fastify.pg.test use transact util with callback', t => {
  t.plan(4)

  const fastify = Fastify()
  t.tearDown(fastify.close.bind(fastify))

  fastify.register(fastifyPostgres, {
    name: 'test',
    connectionString: 'postgres://postgres@localhost/postgres'
  })

  fastify.ready(err => {
    t.error(err)

    fastify.pg.test
      .transact(client => client.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['with-callback']), function (err, res) {
        t.error(err)
        t.equals(res.rows.length, 1)

        fastify.pg.test
          .query(`SELECT * FROM users WHERE username = 'with-callback'`)
          .then(result => {
            t.ok(result.rows[0].username === 'with-callback')
          }).catch(err => {
            t.fail(err)
          })
      })
  })
})

test('fastify.pg.test use transact util with commit callback', t => {
  t.plan(4)

  const fastify = Fastify()
  t.tearDown(fastify.close.bind(fastify))

  fastify.register(fastifyPostgres, {
    name: 'test',
    connectionString: 'postgres://postgres@localhost/postgres'
  })

  fastify.ready(err => {
    t.error(err)

    fastify.pg.test.transact((client, commit) => {
      client.query('INSERT INTO users(username) VALUES($1) RETURNING id', ['commit-callback'], (err, id) => {
        commit(err, id)
      })
    }, function (err, res) {
      t.error(err)
      t.equals(res.rows.length, 1)

      fastify.pg.test
        .query(`SELECT * FROM users WHERE username = 'commit-callback'`)
        .then(result => {
          t.ok(result.rows[0].username === 'commit-callback')
        }).catch(err => {
          t.fail(err)
        })
    })
  })
})
