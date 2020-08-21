import type { FastifyPluginCallback } from 'fastify';
import type PgAdapter from 'pg';
import type {
  Client as PgClient,
  Pool as PgPool,
  PoolClient as PgPoolClient,
  PoolConfig as PgPoolConfig,
} from 'pg';

type CallbackArgs<TResult> =
  | [error: null, result: TResult]
  | [error: unknown, result: undefined];

declare function transact<TResult>(
  fn: (client: PgPoolClient) => Promise<TResult>,
): Promise<TResult>;

declare function transact<TResult>(
  fn: (client: PgPoolClient) => Promise<TResult>,
  cb: (...args: CallbackArgs<TResult>) => void,
): void;

type PostgresDb = {
  pool: PgPool;
  Client: PgClient;
  query: PgPool['query'];
  connect: PgPool['connect'];
  transact: typeof transact;
};

type Options = {
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
};

declare const PostgresPlugin: FastifyPluginCallback<Options & PgPoolConfig>;

export type { PostgresDb };
export default PostgresPlugin;
