'use strict'

const fp = require('fastify-plugin')
const promisify = require('util.promisify')
const pg = require('pg')

function fastifyPostgres (fastify, options, next) {
  const pool = new pg.Pool(options)

  fastify.decorate('pg', {
    connect: pool.connect.bind(pool),
    pool: pool,
    Client: pg.Client,
    query: promisify(query)
  })

  function query (text, value, callback) {
    if (typeof value === 'function') {
      callback = value
      value = null
    }

    pool.connect(onConnect)

    function onConnect (err, client, release) {
      if (err) return callback(err)

      if (value) {
        client.query(text, value, onResult)
      } else {
        client.query(text, onResult)
      }

      function onResult (err, result) {
        release()
        callback(err, result)
      }
    }
  }

  fastify.addHook('onClose', onClose)

  next()
}

function onClose (fastify, done) {
  fastify.pg.pool.end(done)
}

module.exports = fp(fastifyPostgres, '>=0.13.1')
