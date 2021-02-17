module.exports = (existingHandler, newHandler) => {
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
