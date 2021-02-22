'use strict'

module.exports = function addHandler (existingHandler, newHandler) {
  if (Array.isArray(existingHandler)) {
    return [
      ...existingHandler,
      newHandler
    ]
  } else if (typeof existingHandler === 'function') {
    return [existingHandler, newHandler]
  } else {
    return [newHandler]
  }
}
