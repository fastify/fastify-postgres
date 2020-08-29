import fastify from 'fastify';

import { fastifyPostgres } from '../../../index';

const app = fastify();

app.register(fastifyPostgres, {
  name: 'sum',
  connectionString: 'postgres://user:password@host:port/sub-db',
});

app.register(fastifyPostgres, {
  name: 'sub',
  connectionString: 'postgres://user:password@host:port/sub-db',
});

app.get('/calc', async () => {
  const sumClient = await app.pg.sum.connect();
  const subClient = await app.pg.sub.connect();

  const sumResult = await sumClient.query<{ sum: number }>(
    'SELECT 2 + 2 as sum'
  );
  const subResult = await subClient.query<{ sub: number }>(
    'SELECT 6 - 3 as sub'
  );

  sumClient.release();
  subClient.release();

  return {
    sum: sumResult.rows,
    sub: subResult.rows,
  };
});

export { app };
