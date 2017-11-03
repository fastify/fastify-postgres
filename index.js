'use strict'

const fp = require('fastify-plugin')
let pg = require('pg')

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

  if (!fastify.pg) {
    fastify.decorate('pg', {});
  }

  fastify.pg[name] = {
    connect: pool.connect.bind(pool),
    pool: pool,
    Client: pg.Client,
    query: pool.query.bind(pool)
  };

  fastify.addHook('onClose', (fastify, done) => pool.end(done))

  next()
}

module.exports = fp(fastifyPostgres, '>=0.13.1')
