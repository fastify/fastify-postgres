import fastify from 'fastify'
import * as pg from 'pg'
import { expect } from 'tstyche'
import fastifyPostgres, { PostgresDb } from '..'

const app = fastify()

// Without parameters
app.register(fastifyPostgres)
app.register(fastifyPostgres, {})

// Own pg adapter
app.register(fastifyPostgres, { pg })

// Native libpq wrapper
app.register(fastifyPostgres, { native: true })

// Multiple databases
app.register(fastifyPostgres, { name: 'users' })
app.register(fastifyPostgres, { name: 'posts' })

// Pool options
app.register(fastifyPostgres, {
  user: 'dbuser',
  host: 'database.server.com',
  database: 'mydb',
  password: 'secretpassword',
  port: 3211,
})
app.register(fastifyPostgres, {
  connectionString: 'postgres://user:password@host:port/db',
})

// Plugin property available
app.after(() => {
  expect(app.pg).type.toBeAssignableTo<PostgresDb | undefined>()
  expect(app.pg.users).type.toBe<PostgresDb | undefined>()
  expect(app.pg.posts).type.toBe<PostgresDb | undefined>()
})
