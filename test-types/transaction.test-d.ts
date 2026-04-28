import fastify from 'fastify'
import { PoolClient, QueryResult } from 'pg'
import { expect } from 'tstyche'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fastifyPostgres, { PostgresDb } from '../index'

const app = fastify()

app.register(fastifyPostgres, {
  connectionString: 'postgres://user:password@host:port/db',
})

app.post('/insert-async', async () => {
  const insertQuery = `
    INSERT INTO routes(name)
    VALUES ('ochakovo')
    RETURNING 1 + 1 as sum;
  `

  const transactionResult = await app.pg.transact((client) => {
    expect(client).type.toBeAssignableTo<PoolClient>()

    return client.query<{ sum: number }>(insertQuery)
  })

  expect(transactionResult).type.toBeAssignableTo<QueryResult<{ sum: number }>>()

  return transactionResult
})

app.post('/insert-cb', (_req, reply) => {
  const insertQuery = `
    INSERT INTO routes(name)
    VALUES ('ochakovo')
    RETURNING 1 + 1 as sum;
  `

  app.pg.transact(
    (client) => {
      expect(client).type.toBeAssignableTo<PoolClient>()

      return client.query<{ sum: number }>(insertQuery)
    },
    (error, result) => {
      expect(error).type.toBeAssignableTo<Error | null>()
      expect(result).type.toBeAssignableTo<QueryResult<{ sum: number }> | undefined>()

      if (error) {
        reply.status(500).send(error)
        return
      }

      reply.status(200).send(result)
    }
  )
})

app.post('/transact-route', { pg: { transact: true } }, async (req, _reply) => {
  const insertQuery = `
    INSERT INTO routes(name)
    VALUES ('ochakovo')
    RETURNING 1 + 1 as sum;
  `

  return req.pg?.query(insertQuery)
})

app.post(
  '/transact-route-alternate',
  { pg: { transact: 'primary' } },
  async (req, _reply) => {
    const insertQuery = `
    INSERT INTO routes(name)
    VALUES ('ochakovo')
    RETURNING 1 + 1 as sum;
  `

    return req.pg?.query(insertQuery)
  }
)
