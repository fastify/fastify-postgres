import fastify from 'fastify'

import { fastifyPostgres } from '../../../index'

const app = fastify()

app.register(fastifyPostgres, {
  connectionString: 'postgres://user:password@host:port/db',
})

app.post('/init-async', async () => {
  const createTableQuery = `
    CREATE TABLE routes (
      id bigserial primary key,
      name varchar(80) NOT NULL,
      created_at timestamp default NULL
    );
  `

  return app.pg.transact(async (client) => {
    const result = await client.query(createTableQuery)

    return result
  })
})

app.post('/init-cb', (_req, reply) => {
  const createTableQuery = `
    CREATE TABLE routes (
      id bigserial primary key,
      name varchar(80) NOT NULL,
      created_at timestamp default NULL
    );
  `

  app.pg.transact(
    (client) => {
      return client.query(createTableQuery)
    },
    (error, result) => {
      if (error) {
        reply.status(500).send(error)
        return
      }

      reply.status(200).send(result)
    }
  )
})

app.post('/transact-route', { pg: { transact: true } }, async (req, _reply) => {
  const createTableQuery = `
    CREATE TABLE routes (
      id bigserial primary key,
      name varchar(80) NOT NULL,
      created_at timestamp default NULL
    );
  `

  return req.pg?.query(createTableQuery)
})

app.post(
  '/transact-route-alternate',
  { pg: { transact: 'primary' } },
  async (req, _reply) => {
    const createTableQuery = `
    CREATE TABLE routes (
      id bigserial primary key,
      name varchar(80) NOT NULL,
      created_at timestamp default NULL
    );
  `

    return req.pg?.query(createTableQuery)
  }
)

export { app }
