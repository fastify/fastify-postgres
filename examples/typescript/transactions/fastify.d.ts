import type { PostgresDb } from '../../../index';

declare module 'fastify' {
  export interface FastifyInstance {
    pg: PostgresDb;
  }
}
