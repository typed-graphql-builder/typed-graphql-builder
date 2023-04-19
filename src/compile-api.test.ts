import t from 'tap'
import { compileSchemas } from './compile-api'

// ------------------------------------------------------------------------------

let s1 = `
schema {
  query: Query
}

type Query {
  a(s: String): String
  test(s: String): String
}
`

let s2 = `
extend type Query {
  other(t: String): Int
  a(s: String): Int
}
`

t.test('works with extended schemas', async t => {
  let code = compileSchemas([s1, s2])

  let res = code.split('\n').filter(l => l.includes('this.$_select'))

  // Sorted alphabetically and contains only one occurrence of "a"
  t.match(res[0], '"a"')
  t.match(res[1], '"other"')
  t.match(res[2], '"test"')
})

// ------------------------------------------------------------------------------

let schemaScalars = `
scalar A
scalar B

type Query {
  test(s: String): A
}
`
t.test('works with custom scalars', async t => {
  let res = compileSchemas([schemaScalars], {
    scalars: [['(.+)', './scalars#$1']],
  })

  let importList = res.split('\n').filter(l => l.startsWith('import') && l.includes('scalars'))

  t.same(importList, [`import type { A } from './scalars'`, `import type { B } from './scalars'`])
})
