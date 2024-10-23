'use strict'

const { test } = require('node:test')
const addHandler = require('../lib/add-handler')

test('The addHandler lib should return the right handlers structure', async t => {
  await t.test('When the existingHandler argument is undefined', t => {
    t.plan(1)

    const handlers = addHandler(
      undefined,
      'test'
    )

    t.assert.deepStrictEqual(handlers, ['test'])
  })

  await t.test('When the existingHandler argument is an array', t => {
    t.plan(1)

    const handlers = addHandler(
      ['test'],
      'again'
    )

    t.assert.deepStrictEqual(handlers, ['test', 'again'])
  })

  await t.test('When the existingHandler argument is a function', t => {
    t.plan(2)

    const stub = () => 'test'

    const handlers = addHandler(
      stub,
      'again'
    )

    t.assert.deepStrictEqual(handlers[0](), 'test')
    t.assert.deepStrictEqual(handlers[1], 'again')
  })
})
