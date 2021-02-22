'use strict'

const t = require('tap')
const test = t.test
const addHandler = require('../lib/add-handler')

test('addHandler - ', t => {
  test('when existing handler is not defined', t => {
    t.plan(1)

    const handlers = addHandler(
      undefined,
      'test'
    )

    t.same(handlers, ['test'])
  })
  test('when existing handler is a array', t => {
    t.plan(1)

    const handlers = addHandler(
      ['test'],
      'again'
    )

    t.same(handlers, ['test', 'again'])
  })
  test('when existing handler is a function', t => {
    t.plan(2)

    const stub = () => 'test'

    const handlers = addHandler(
      stub,
      'again'
    )

    t.same(handlers[0](), 'test')
    t.same(handlers[1], 'again')
  })

  t.end()
})
