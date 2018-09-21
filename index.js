'use strict'

const fp = require('fastify-plugin')
var pg = require('pg')

function transactionUtil (pool, query, values, cb) {
  pool.connect((err, client, done) => {
    if (err) return cb(err)

    const shouldAbort = (err) => {
      if (err) {
        client.query('ROLLBACK', () => {
          done()
        })
      }
      return !!err
    }

    client.query('BEGIN', (err) => {
      if (shouldAbort(err)) return cb(err)
      client.query(query, values, (err, res) => {
        if (shouldAbort(err)) return cb(err)

        client.query('COMMIT', (err) => {
          done()
          if (err) {
            return cb(err)
          }
          return cb(null, res)
        })
      })
    })
  })
}

function transact (query, values, cb) {
  if (!cb) {
    return new Promise((resolve, reject) => {
      transactionUtil(this, query, values, function (err, res) {
        if (err) { return reject(err) }
        return resolve(res)
      })
    })
  }

  return transactionUtil(this, query, values, cb)
}

function fastifyPostgres (fastify, options, next) {
  if (options.native) {
    delete options.native
    if (!pg.native) {
      console.warn('pg-native not installed, can\'t use native option - fallback to pg module')
    } else {
      pg = pg.native
    }
  }

  const name = options.name
  delete options.name

  const pool = new pg.Pool(options)
  const db = {
    connect: pool.connect.bind(pool),
    pool: pool,
    Client: pg.Client,
    query: pool.query.bind(pool),
    transact: transact.bind(pool)
  }

  if (name) {
    if (!fastify.pg) {
      fastify.decorate('pg', {})
    }

    if (fastify.pg[name]) {
      return next(new Error('Connection name has already been registered: ' + name))
    }

    fastify.pg[name] = db
  } else {
    if (fastify.pg) {
      next(new Error('fastify-postgres has already registered'))
    } else {
      fastify.pg = db
    }
  }

  fastify.addHook('onClose', (fastify, done) => pool.end(done))

  next()
}

module.exports = fp(fastifyPostgres, {
  fastify: '>=1.1.0',
  name: 'fastify-postgres'
})
