import type { PostgresDb } from '../../../index';

declare module 'fastify' {
  export interface FastifyInstance {
    pg: {
      sum: PostgresDb;
      sub: PostgresDb;
    };
  }
}
