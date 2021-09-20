'use strict'

const { test } = require('tap')
const addHandler = require('../lib/add-handler')

test('The addHandler lib should return the right handlers structure', t => {
  t.test('When the existingHandler argument is undefined', t => {
    t.plan(1)

    const handlers = addHandler(
      undefined,
      'test'
    )

    t.same(handlers, ['test'])
  })

  t.test('When the existingHandler argument is an array', t => {
    t.plan(1)

    const handlers = addHandler(
      ['test'],
      'again'
    )

    t.same(handlers, ['test', 'again'])
  })

  t.test('When the existingHandler argument is a function', t => {
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
