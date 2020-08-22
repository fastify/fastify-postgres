import type { FastifyPluginCallback } from 'fastify';
import type PgAdapter from 'pg';
import type {
  Client as PgClient,
  Pool as PgPool,
  PoolClient as PgPoolClient,
  PoolConfig as PgPoolConfig,
} from 'pg';

declare function transact<TResult>(
  fn: (client: PgPoolClient) => Promise<TResult>
): Promise<TResult>;

declare function transact<TResult>(
  fn: (client: PgPoolClient) => Promise<TResult>,
  cb: (error: Error | null, result?: TResult) => void
): void;

type PostgresDb = {
  pool: PgPool;
  Client: PgClient;
  query: PgPool['query'];
  connect: PgPool['connect'];
  transact: typeof transact;
};

type PostgresPluginOptions = {
  /**
   * Custom pg adapter
   */
  pg?: typeof PgAdapter;

  /**
   * Use pg-native
   */
  native?: boolean;

  /**
   * Instance name of fastify-postgres
   */
  name?: string;
} & PgPoolConfig;

declare const PostgresPlugin: FastifyPluginCallback<PostgresPluginOptions>;

export type { PostgresDb, PostgresPluginOptions };
export default PostgresPlugin;
