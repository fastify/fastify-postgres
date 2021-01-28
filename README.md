# fastify-postgres

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
![CI
workflow](https://github.com/fastify/fastify-postgres/workflows/CI%20workflow/badge.svg)

Fastify PostgreSQL connection plugin, with this you can share the same PostgreSQL connection pool in every part of your server.
Under the hood the [node-postgres](https://github.com/brianc/node-postgres) is used, the options that you pass to `register` will be passed to the PostgreSQL pool builder.

## Install
```
npm i pg fastify-postgres --save
```
## Usage
Add it to you project with `register` and you are done!
This plugin will add the `pg` namespace in your Fastify instance, with the following properties:
```
connect: the function to get a connection from the pool
pool: the pool instance
Client: a client constructor for a single query
query: a utility to perform a query _without_ a transaction
transact: a utility to perform multiple queries _with_ a transaction
```

Example:
```js
const fastify = require('fastify')()

fastify.register(require('fastify-postgres'), {
  connectionString: 'postgres://postgres@localhost/postgres'
})

fastify.get('/user/:id', (req, reply) => {
  fastify.pg.connect(onConnect)

  function onConnect (err, client, release) {
    if (err) return reply.send(err)

    client.query(
      'SELECT id, username, hash, salt FROM users WHERE id=$1', [req.params.id],
      function onResult (err, result) {
        release()
        reply.send(err || result)
      }
    )
  }
})

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```

Async await is supported as well!
```js
const fastify = require('fastify')()

fastify.register(require('fastify-postgres'), {
  connectionString: 'postgres://postgres@localhost/postgres'
})

fastify.get('/user/:id', async (req, reply) => {
  const client = await fastify.pg.connect()
  const { rows } = await client.query(
    'SELECT id, username, hash, salt FROM users WHERE id=$1', [req.params.id],
  )
  client.release()
  return rows
})

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```
Use of `pg.query`
```js
const fastify = require('fastify')()

fastify.register(require('fastify-postgres'), {
  connectionString: 'postgres://postgres@localhost/postgres'
})

fastify.get('/user/:id', (req, reply) => {
  fastify.pg.query(
    'SELECT id, username, hash, salt FROM users WHERE id=$1', [req.params.id],
    function onResult (err, result) {
      reply.send(err || result)
    }
  )
})

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```

Use of `pg.transact`
```js
const fastify = require('fastify')()

fastify.register(require('fastify-postgres'), {
  connectionString: 'postgres://postgres@localhost/postgres'
})

fastify.post('/user/:username', (req, reply) => {
  // will return a promise, fastify will send the result automatically
  return fastify.pg.transact(async client => {
    // will resolve to an id, or reject with an error
    const id = await client.query('INSERT INTO users(username) VALUES($1) RETURNING id', [req.params.username])

    // potentially do something with id

    return id
  })
})

/* or with a transaction callback

fastify.pg.transact(client => {
    return client.query('INSERT INTO users(username) VALUES($1) RETURNING id', [req.params.username])
  },
  function onResult (err, result) {
    reply.send(err || result)
  }
})

*/

/* or with a commit callback

fastify.pg.transact((client, commit) => {
  client.query('INSERT INTO users(username) VALUES($1) RETURNING id', [req.params.username], (err, id) => {
    commit(err, id)
  });
})

*/

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```

As you can see there is no need to close the client, since is done internally. Promises and async await are supported as well.

### Name option
If you need to have multiple databases set up, then you can name each one of them by passing `name: 'foo'`. It will then be accessible as `fastify.pg.foo`.
You can use both unnamed and named postgres connections at once. There can be only one unnamed connection, and it will be accessible as `fastify.pg`.

```js
const fastify = require('fastify')()

fastify.register(require('fastify-postgres'), {
  connectionString: 'postgres://postgres@localhost/postgres',
  name: 'foo'
})

fastify.get('/user/:id', (req, reply) => {
  fastify.pg.foo.query(
    'SELECT id, username, hash, salt FROM users WHERE id=$1', [req.params.id],
    function onResult (err, result) {
      reply.send(err || result)
    }
  )
})

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```

### Native option
If you want to gain the maximum performances you can install [pg-native](https://github.com/brianc/node-pg-native), and pass `native: true` to the plugin options.
*Note: it requires PostgreSQL client libraries & tools installed, see [instructions](https://github.com/brianc/node-pg-native#install).*
Note: trying to use native options without successfully installation of `pg-native` will get a warning and fallback to regular `pg` module.

```js
const fastify = require('fastify')()

fastify.register(require('fastify-postgres'), {
  connectionString: 'postgres://postgres@localhost/postgres',
  native: true
})

fastify.get('/user/:id', (req, reply) => {
  fastify.pg.query(
    'SELECT id, username, hash, salt FROM users WHERE id=$1', [req.params.id],
    function onResult (err, result) {
      reply.send(err || result)
    }
  )
})

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```

### `pg` option
If you want to provide your own `pg` module, for example to support packages like [`pg-range`](https://www.npmjs.com/package/pg-range), you can provide an optional `pg` option with the patched library to use:

```js
const fastify = require('fastify')()
const pg = require("pg");
require("pg-range").install(pg)

fastify.register(require('fastify-postgres'), {
  connectionString: 'postgres://postgres@localhost/postgres',
  pg: pg
})

fastify.get('/user/:id', (req, reply) => {
  fastify.pg.query(
    'SELECT id, username, hash, salt FROM users WHERE id=$1', [req.params.id],
    function onResult (err, result) {
      reply.send(err || result)
    }
  )
})

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```

## TypeScript Usage

Install the compiler and typings for pg module:

```shell script
npm install --save-dev typescript @types/pg
```

More examples in the [examples/typescript](./examples/typescript) directory.

## Development and Testing

### Docker approach

First, start postgres with:

```
$ npm run postgres
```

Then you can, in another terminal, find the running docker, init the DB, then run the tests:

```
$ docker ps
CONTAINER ID        IMAGE                 COMMAND                  CREATED             STATUS              PORTS                    NAMES
28341f85c4cd        postgres:9.6-alpine   "docker-entrypoint.s…"   3 minutes ago       Up 3 minutes        0.0.0.0:5432->5432/tcp   jovial_shockley

$ docker exec -ti jovial_shockley /usr/local/bin/psql -d postgres -U postgres  -c 'CREATE TABLE users(id serial PRIMARY KEY, username VARCHAR (50) NOT NULL);'
CREATE TABLE

$ npm test
```

### Custom Postgres approach

1. Set up a database of your choice oin a postgres server of your choice
2. Create the required table using
    ```sql
    CREATE TABLE users(id serial PRIMARY KEY, username VARCHAR (50) NOT NULL);
    ```
3. Specify a connection string to it in a `DATABASE_TEST_URL` environment variable when you run the tests
    ```bash
    DATABASE_TEST_URL="postgres://username:password@localhost/something_thats_a_test_database" npm test
    ```

## Acknowledgements

This project is kindly sponsored by:
- [nearForm](http://nearform.com)
- [LetzDoIt](http://www.letzdoitapp.com/)

## License

Licensed under [MIT](./LICENSE).
