'use strict'

const defaultPg = require('pg')
const fp = require('fastify-plugin')

const addHandler = require('./lib/add-handler.js')

const transactionFailedSymbol = Symbol('transactionFailed')

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

function extractRequestClient (req, transact) {
  if (typeof transact !== 'string') {
    return req.pg
  }

  const requestClient = req.pg[transact]
  if (!requestClient) {
    throw new Error(`request client '${transact}' does not exist`)
  }
  return requestClient
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
    pool,
    Client: pg.Client,
    query: pool.query.bind(pool),
    transact: transact.bind(pool)
  }

  fastify.addHook('onClose', (_fastify, done) => pool.end(done))

  if (name) {
    if (db[name]) {
      return next(new Error(`fastify-postgres '${name}' is a reserved keyword`))
    } else if (!fastify.pg) {
      fastify.decorate('pg', Object.create(null))
    } else if (fastify.pg[name]) {
      return next(new Error(`fastify-postgres '${name}' instance name has already been registered`))
    }

    fastify.pg[name] = db
  } else {
    if (fastify.pg) {
      if (fastify.pg.pool) {
        return next(new Error('fastify-postgres has already been registered'))
      }

      Object.assign(fastify.pg, db)
    } else {
      fastify.decorate('pg', db)
    }
  }

  if (!fastify.hasRequestDecorator('pg')) {
    fastify.decorateRequest('pg', null)
  }

  fastify.addHook('onRoute', routeOptions => {
    const transact = routeOptions?.pg?.transact

    if (
      !transact ||
      (typeof transact === 'string' && transact !== name) ||
      (name && transact === true)
    ) {
      return
    }

    const preHandler = async (req) => {
      const client = await pool.connect()

      if (name) {
        if (!req.pg) {
          req.pg = Object.create(null)
        }

        if (client[name]) {
          client.release()
          throw new Error(`pg client '${name}' is a reserved keyword`)
        } else if (req.pg[name]) {
          client.release()
          throw new Error(`request client '${name}' has already been registered`)
        }

        req.pg[name] = client
      } else {
        if (req.pg) {
          client.release()
          throw new Error('request client has already been registered')
        } else {
          req.pg = client
        }
      }

      await client.query('BEGIN')
    }

    const onError = (req, _reply, _error, done) => {
      req[transactionFailedSymbol] = true
      extractRequestClient(req, transact).query('ROLLBACK', done)
    }

    const onSend = async (req) => {
      const requestClient = extractRequestClient(req, transact)
      if (requestClient) {
        try {
          if (!req[transactionFailedSymbol]) {
            await requestClient.query('COMMIT')
          }
        } finally {
          requestClient.release()
        }
      }
    }

    routeOptions.preHandler = addHandler(routeOptions.preHandler, preHandler)
    routeOptions.onError = addHandler(routeOptions.onError, onError)
    routeOptions.onSend = addHandler(routeOptions.onSend, onSend)
  })

  next()
}

module.exports = fp(fastifyPostgres, {
  fastify: '5.x',
  name: '@fastify/postgres'
})
module.exports.default = fastifyPostgres
module.exports.fastifyPostgres = fastifyPostgres
