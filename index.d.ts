import { FastifyPluginCallback } from 'fastify'
import * as Pg from 'pg'

declare module 'fastify' {
  export interface FastifyInstance {
    pg: fastifyPostgres.PostgresDb & Record<string, fastifyPostgres.PostgresDb>;
  }

  export interface FastifyRequest {
    pg?: Pg.PoolClient;
  }

  export interface RouteShorthandOptions {
    pg?: fastifyPostgres.FastifyPostgresRouteOptions;
  }
}

type FastifyPostgres = FastifyPluginCallback<fastifyPostgres.PostgresPluginOptions>

declare namespace fastifyPostgres {
  export type PostgresDb = {
    pool: Pg.Pool;
    Client: Pg.Client;
    query: Pg.Pool['query'];
    connect: Pg.Pool['connect'];
    transact: typeof transact;
  }

  export type FastifyPostgresRouteOptions = {
    transact: boolean | string;
  }

  export type PostgresPluginOptions = {
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
  } & Pg.PoolConfig

  export function transact<TResult> (
    fn: (client: Pg.PoolClient) => Promise<TResult>
  ): Promise<TResult>

  export function transact<TResult> (
    fn: (client: Pg.PoolClient) => Promise<TResult>,
    cb: (error: Error | null, result?: TResult) => void
  ): void

  export const fastifyPostgres: FastifyPostgres
  export { fastifyPostgres as default }
}

declare function fastifyPostgres (...params: Parameters<FastifyPostgres>): ReturnType<FastifyPostgres>
export = fastifyPostgres
