# fastify-postgres

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)  [![Build Status](https://travis-ci.org/fastify/fastify-postgres.svg?branch=master)](https://travis-ci.org/fastify/fastify-postgres)

Fastify PostgreSQL connection plugin, with this you can share the same PostgreSQL connection pool in every part of your server.  
Under the hood the [node-postgres](https://github.com/brianc/node-postgres) is used, the options that you pass to `register` will be passed to the PostgreSQL pool builder.

## Install
```
npm i fastify-postgres --save
```
## Usage
Add it to you project with `register` and you are done!  
This plugin will add the `pg` namespace in your Fastify instance, with the following properties:
```
connect: the function to get a connection from the pool
pool: the pool instance
Client: a client constructor for a single query
query: an utility to perform a query without a transaction
```

Example:
```js
const fastify = require('fastify')

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
const fastify = require('fastify')

fastify.register(require('fastify-postgres'), {
  connectionString: 'postgres://postgres@localhost/postgres'
})

fastify.get('/user/:id', async (req, reply) => {
  const client = await fastify.pg.connect()
  const { result } = await client.query(
    'SELECT id, username, hash, salt FROM users WHERE id=$1', [req.params.id],
  )
  client.release()
  return result
})

fastify.listen(3000, err => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
```
Use of `pg.query`
```js
const fastify = require('fastify')

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
As you can see there is no need to close the client, since is done internally. Promises and async await are supported as well.

### Native option
Use native libpq to gain high performance; it will use [pg-native](https://github.com/brianc/node-pg-native) instead of [pg](https://github.com/brianc/node-pg).  
Note: it requires PostgreSQL client libraries & tools installed, see 
[instructions](https://github.com/brianc/node-pg-native#install).

```js
const fastify = require('fastify')

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

## Acknowledgements

This project is kindly sponsored by:
- [nearForm](http://nearform.com)
- [LetzDoIt](http://www.letzdoitapp.com/)

## License

Licensed under [MIT](./LICENSE).
