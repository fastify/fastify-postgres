import { FastifyPluginCallback } from 'fastify';
import * as Pg from 'pg';

declare function transact<TResult>(
  fn: (client: Pg.PoolClient) => Promise<TResult>
): Promise<TResult>;

declare function transact<TResult>(
  fn: (client: Pg.PoolClient) => Promise<TResult>,
  cb: (error: Error | null, result?: TResult) => void
): void;

type PostgresDb = {
  pool: Pg.Pool;
  Client: Pg.Client;
  query: Pg.Pool['query'];
  connect: Pg.Pool['connect'];
  transact: typeof transact;
};

type PostgresPluginOptions = {
  /**
   * Custom pg
   */
  pg?: typeof Pg;

  /**
   * Use pg-native
   */
  native?: boolean;

  /**
   * Instance name of fastify-postgres
   */
  name?: string;
} & Pg.PoolConfig;

declare const fastifyPostgres: FastifyPluginCallback<PostgresPluginOptions>;

declare module 'fastify' {
  export interface FastifyInstance {
    pg: PostgresDb & Record<string, PostgresDb>;
  }
}

export { fastifyPostgres, PostgresDb, PostgresPluginOptions };
export default fastifyPostgres;
