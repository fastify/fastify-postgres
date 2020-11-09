import fastify from 'fastify';
import { PoolClient, QueryResult } from 'pg';
import { expectType } from 'tsd';

import fastifyPostgres, { PostgresDb } from '../../index';

const app = fastify();

app.register(fastifyPostgres, {
  connectionString: 'postgres://user:password@host:port/db',
});

app.post('/insert-async', async () => {
  const insertQuery = `
    INSERT INTO routes(name)
    VALUES ('ochakovo')
    RETURNING 1 + 1 as sum;
  `;

  const transactionResult = await app.pg.transact((client) => {
    expectType<PoolClient>(client);

    return client.query<{ sum: number }>(insertQuery);
  });

  expectType<QueryResult<{ sum: number }>>(transactionResult);

  return transactionResult;
});

app.post('/insert-cb', (_req, reply) => {
  const insertQuery = `
    INSERT INTO routes(name)
    VALUES ('ochakovo')
    RETURNING 1 + 1 as sum;
  `;

  app.pg.transact(
    (client) => {
      expectType<PoolClient>(client);

      return client.query<{ sum: number }>(insertQuery);
    },
    (error, result) => {
      expectType<Error | null>(error);
      expectType<QueryResult<{ sum: number }> | undefined>(result);

      if (error) {
        reply.status(500).send(error);
        return;
      }

      reply.status(200).send(result);
    }
  );
});
