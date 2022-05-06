import t, { mocha } from 'tap'

const { describe, it } = mocha

// test dir structure
// util - contains the libs to run the tests
// runner - ???
// examples - contains the harness
// examples/schema1.graphql
// examples/schema1.graphql.ts
// examples/schema2.graphql
// examples/schema2.graphql.ts
// examples/test-schema1.good.ts
//   import * as s1 from './schema1.graphql.ts
//   export default tests = [
//     {
//       query: s1.query(q => [ ... ])
//       string: 'query Name { .... }',
//       verifyVariables: query => verifyVariables(query, {a: 1, b: 2})
//     },
//     ......
//   }
// examples/test-schema1.bad.ts
//   content can be anything that we want to fail compilation :D
describe('hello world', () => {
  it('works', () => {
    t.ok(true, 'Its allright 2')
  })
})
