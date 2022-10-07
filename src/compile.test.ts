import t from 'tap'
import { compileSchemas } from './compile'

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
  let res = compileSchemas([s1, s2])
    .split('\n')
    .filter(l => l.includes('this.$_select'))

  t.match(res[0], '"test"')
  t.match(res[1], '"other"')
})
