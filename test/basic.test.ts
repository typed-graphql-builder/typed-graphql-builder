import t, { mocha } from 'tap'

const { describe, it } = mocha

// test dir structure
// util - contains the libs to run the tests
// runner - ???
// examples - contains the harness
// See https://github.com/brianc/node-sql/blob/master/test/dialects/select-tests.js for what we're looking for
// examples/schema1.graphql
// examples/schema1.graphql.ts
// examples/schema2.graphql
// examples/schema2.graphql.ts
// examples/test-schema1.good.ts
//   import * as s1 from './schema1.graphql.ts'
//   import {verify} from './utils'
//
//   export default tests = [
//     verify({
//       query: s1.query(q => [ ... ])
//       string: 'query Name { .... }',
//       variables: {a: 1, b: 2}
//     }),
//     ......
//   }
// examples/test-schema1.bad.ts
//   content can be anything that we want to fail compilation :D
// schema/schema-test.ts
//   tests that compile a small raw schema and expect a certain output
//   can go in this directory (i.e. checking correct support for various valid GQL schemas)
//   examples: no mutations, no query root, unions, enums, custom scalars, optionals etc.

import { exec, execSync } from 'child_process'

execSync('tsc', {
  cwd: __dirname,
})

// We do NOT need to use the output of `tsc`. We only care about the error reporting
// This means we can use a config that has `noemit: true`
// The rest can be handled by the swc-node loader included with tap, when you do a require
// directly on the .ts file of the test.
// https://github.com/jeremyben/tsc-prog

describe('hello world', () => {
  it('works', () => {
    t.ok(true, 'Its allright 2')
    // runCompilerForCheckOnly('./file.ts')
    // const queries = require('./file.ts') as someArray[];
    // run asserts on the queries
  })
})
