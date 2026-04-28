import fastify from 'fastify'
import { type Client, type Pool, type PoolClient, type QueryResult } from 'pg'
import { expect } from 'tstyche'
import fastifyPostgres, { type PostgresDb } from '..'

const app = fastify()

app.register(fastifyPostgres, {
  connectionString: 'postgres://user:password@host:port/db',
})

app.get('/calc', async () => {
  expect(app.pg).type.toBeAssignableTo<PostgresDb>()

  expect(app.pg.pool).type.toBeAssignableTo<Pool>()
  expect(app.pg.Client).type.toBeAssignableTo<Client>()

  const client = await app.pg.connect()
  expect(client).type.toBeAssignableTo<PoolClient>()

  const sumResult = await client.query<{ sum: number }>('SELECT 2 + 2 as sum')
  expect(sumResult).type.toBeAssignableTo<QueryResult<{ sum: number }>>()

  client.release()

  return { sum: sumResult.rows }
})
