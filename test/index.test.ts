import t from 'tap'
import * as glob from 'glob'
import { compile } from '../src/compile'
import { spawnSync } from 'child_process'
import path from 'path'

// test dir structure
// examples/schema1.graphql
// examples/schema1.graphql.ts // generated
// examples/schema2.graphql
// examples/schema2.graphql.ts // generated
// examples/test-schema1.good.ts // test file
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
//   content can be anything that we want to fail compilation
// schema/schema-test.ts
//   tests that compile a small raw schema and expect a certain output
//   can go in this directory (i.e. checking correct support for various valid GQL schemas)
//   examples: no mutations, no query root, unions, enums, custom scalars, optionals etc.

// We do NOT need to use the output of `tsc`. We only care about the error reporting
// This means we can use a config that has `noemit: true`
// The rest can be handled by the swc-node loader included with tap, when you do a require
// directly on the .ts file of the test.
// https://github.com/jeremyben/tsc-prog

t.autoend(true)

function compileTs(path: string) {
  return spawnSync(
    `tsc`,
    ['--noEmit', '--skipLibCheck', '--strict', '--esModuleInterop', '--target', 'es5', path],
    {
      cwd: __dirname,
    }
  )
}

for (let schema of glob.sync(`${__dirname}/examples/*.graphql`)) {
  let schemaName = path.basename(schema)
  t.test(`schema ${schemaName}`, async t => {
    // t.autoend(true)

    t.before(async () => {
      await compile({ schema, output: `${schema}.api.ts` })
    })

    let schemaCoreName = path.basename(schema).split('.')[0]

    let goodExamples = glob.sync(`${__dirname}/examples/*-${schemaCoreName}.good.ts`)

    t.test('typechecks', t => {
      let output = compileTs(`${schema}.api.ts`)
      if (output.status) {
        t.fail(output.stdout.toString())
      }
      t.end()
    })

    for (let example of goodExamples) {
      let exampleName = path.basename(example)
      t.test(`compiles with example ${exampleName}`, async t => {
        let res = compileTs(example)
        if (res.status) {
          t.fail(res.stdout.toString())
        }
      })

      t.test(`runs the verifications in ${exampleName}`, async t => {
        let loadedExample = require(example)
        for (let test of loadedExample.default) test(t)
      })
    }
  })
}
