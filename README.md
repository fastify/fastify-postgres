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
Client: a clinet constructor for a single query
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

## Acknowledgements

This project is kindly sponsored by:
- [nearForm](http://nearform.com)
- [LetzDoIt](http://www.letzdoitapp.com/)

## License

Licensed under [MIT](./LICENSE).
