'use strict'

const fp = require('fastify-plugin')

function fastifyPostgres (fastify, options, next) {
  let pg
  if (options.native) {
    pg = require('pg-native')
  } else {
    pg = require('pg')
  }

  const pool = new pg.Pool(options)

  fastify.decorate('pg', {
    connect: pool.connect.bind(pool),
    pool: pool,
    Client: pg.Client,
    query: pool.query.bind(pool)
  })

  fastify.addHook('onClose', onClose)

  next()
}

function onClose (fastify, done) {
  fastify.pg.pool.end(done)
}

module.exports = fp(fastifyPostgres, '>=0.13.1')
