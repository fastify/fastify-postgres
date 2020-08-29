import fastify from 'fastify';

import { fastifyPostgres } from '../../../index';

const app = fastify();

app.register(fastifyPostgres, {
  connectionString: 'postgres://user:password@host:port/db',
});

app.get('/calc', async () => {
  const client = await app.pg.connect();

  const sumResult = await client.query<{ sum: number }>('SELECT 2 + 2 as sum');

  client.release();

  return {
    sum: sumResult.rows,
  };
});

export { app };
