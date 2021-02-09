'use strict'

const defaultPg = require('pg')
const fp = require('fastify-plugin')

function transactionUtil (pool, fn, cb) {
  pool.connect((err, client, done) => {
    if (err) return cb(err)

    const shouldAbort = (err) => {
      if (err) {
        client.query('ROLLBACK', done)
      }

      return !!err
    }

    const commit = (err, res) => {
      if (shouldAbort(err)) return cb(err)

      client.query('COMMIT', (err) => {
        done()
        if (err) return cb(err)

        return cb(null, res)
      })
    }

    client.query('BEGIN', (err) => {
      if (shouldAbort(err)) return cb(err)

      const promise = fn(client, commit)

      if (promise && typeof promise.then === 'function') {
        promise.then((res) => commit(null, res), (e) => commit(e))
      }
    })
  })
}

function transact (fn, cb) {
  if (cb && typeof cb === 'function') {
    return transactionUtil(this, fn, cb)
  }

  return new Promise((resolve, reject) => {
    transactionUtil(this, fn, function (err, res) {
      if (err) return reject(err)

      return resolve(res)
    })
  })
}

// Re-usable code adds the handlers nicely
const addHandler = (existingHandler, newHandler) => {
  if (Array.isArray(existingHandler)) {
    existingHandler.push(newHandler)
  } else if (typeof existingHandler === 'function') {
    existingHandler = [existingHandler, newHandler]
  } else {
    existingHandler = [newHandler]
  }

  return existingHandler
}

function fastifyPostgres (fastify, options, next) {
  let pg = defaultPg

  if (options.pg) {
    pg = options.pg
  }

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

  fastify.addHook('onClose', (fastify, done) => pool.end(done))

  if (name) {
    if (db[name]) {
      return next(new Error(`fastify-postgres '${name}' is a reserved keyword`))
    } else if (!fastify.pg) {
      fastify.decorate('pg', {})
    } else if (fastify.pg[name]) {
      return next(new Error(`fastify-postgres '${name}' instance name has already been registered`))
    }

    fastify.pg[name] = db
  } else {
    if (!fastify.pg) {
      fastify.decorate('pg', db)
    } else if (fastify.pg.pool) {
      return next(new Error('fastify-postgres has already been registered'))
    } else {
      Object.assign(fastify.pg, db)
    }
  }

  fastify.addHook('onRoute', routeOptions => {
    const useTransaction = routeOptions.useTransaction || (routeOptions.options && routeOptions.options.useTransaction)

    if (useTransaction) {
      // This will rollback the transaction if the handler fails at some point
      const onError = async (req, reply, error) => {
        req.transactionFailed = true

        try {
          await req.pg.query('ROLLBACK')
        } catch (err) {
          await req.pg.query('ROLLBACK')
        }
      }

      routeOptions.onError = addHandler(routeOptions.onError, onError)
    }

    const preHandler = async (req, reply) => {
      const client = await pool.connect()
      req.pg = client

      if (useTransaction) {
        await req.pg.query('BEGIN')
      }
    }

    // This will commit the transaction (or rollback if that fails) and also always
    // release the client, regardless of error state or useTransaction value
    const onSend = async (req, reply, payload) => {
      try {
        if (!req.transactionFailed && useTransaction) {
          await req.pg.query('COMMIT')
        }
      } catch (err) {
        if (useTransaction) {
          await req.pg.query('ROLLBACK')
        }
      } finally {
        req.pg.release()
      }
    }

    // Add these handlers
    routeOptions.preHandler = addHandler(routeOptions.preHandler, preHandler)
    routeOptions.onSend = addHandler(routeOptions.onSend, onSend)
  })

  next()
}

module.exports = fp(fastifyPostgres, {
  fastify: '>=1.1.0',
  name: 'fastify-postgres'
})
