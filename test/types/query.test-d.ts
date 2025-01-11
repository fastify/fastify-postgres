import fastify from 'fastify'
import { Client, Pool, PoolClient, QueryResult } from 'pg'
import { expectAssignable, expectType } from 'tsd'

import fastifyPostgres, { PostgresDb } from '../../index'

const app = fastify()

app.register(fastifyPostgres, {
  connectionString: 'postgres://user:password@host:port/db',
})

app.get('/calc', async () => {
  expectAssignable<PostgresDb>(app.pg)

  expectType<Pool>(app.pg.pool)
  expectType<Client>(app.pg.Client)

  const client = await app.pg.connect()
  expectType<PoolClient>(client)

  const sumResult = await client.query<{ sum: number }>('SELECT 2 + 2 as sum')
  expectType<QueryResult<{ sum: number }>>(sumResult)

  client.release()

  return {
    sum: sumResult.rows,
  }
})
