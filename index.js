'use strict'

const fp = require('fastify-plugin')
var pg = require('pg')

function transactionHelper (query, values, cb = null) {
  return new Promise((resolve, reject) => {
    this.connect((err, client, done) => {
      if (err) reject(err)

      const shouldAbort = (err) => {
        if (err) {
          client.query('ROLLBACK', () => {
            done()
          })
        }
        return !!err
      }

      client.query('BEGIN', (err) => {
        if (shouldAbort(err)) return cb ? cb(err) : reject(err)
        client.query(query, values, (err, res) => {
          if (shouldAbort(err)) return cb ? cb(err) : reject(err)

          client.query('COMMIT', (err) => {
            done()
            if (err) {
              return cb ? cb(err) : reject(err)
            }
            return cb ? cb(null, res) : resolve(res)
          })
        })
      })
    })
  })
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
    transact: transactionHelper.bind(pool)
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
