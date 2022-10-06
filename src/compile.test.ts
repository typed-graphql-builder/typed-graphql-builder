import t from 'tap'
import { compileSchemaString } from './compile'

let { describe, it } = t.mocha

let s1 = `
schema {
  query: Query
}

type Query {
  test(s: String): String
}
`

let s2 = `
extend type Query {
  other(t: String): Int
}
`
t.autoend(true)

t.test('works with extended schemas', async t => {
  let res = compileSchemaString(s1, [s2])
    .split('\n')
    .filter(l => l.includes('this.$_select'))

  t.match(res[0], '"test"')
  t.match(res[1], '"other"')
})
