import fastify from 'fastify';
import * as pg from 'pg';
import { expectAssignable, expectType } from 'tsd';

import fastifyPostgres, { PostgresDb } from '../../index';

const app = fastify();

// Without parameters
app.register(fastifyPostgres);
app.register(fastifyPostgres, {});

// Own pg adapter
app.register(fastifyPostgres, { pg });

// Native libpq wrapper
app.register(fastifyPostgres, { native: true });

// Multiple databases
app.register(fastifyPostgres, { name: 'users' });
app.register(fastifyPostgres, { name: 'posts' });

// Pool options
app.register(fastifyPostgres, {
  user: 'dbuser',
  host: 'database.server.com',
  database: 'mydb',
  password: 'secretpassword',
  port: 3211,
});
app.register(fastifyPostgres, {
  connectionString: 'postgres://user:password@host:port/db',
});

// Plugin property available
app.after(() => {
  expectAssignable<PostgresDb>(app.pg);
  expectType<PostgresDb>(app.pg.users);
});
