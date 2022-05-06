import t, { mocha } from 'tap'

const { describe, it } = mocha

describe('hello world', () => {
  it('works', () => {
    t.ok(true, 'Its allright 2')
  })
})
