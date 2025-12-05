import t from 'tap'
import * as glob from 'glob'
import { compile } from '../src/compile-api'
import { spawnSync, SpawnSyncOptionsWithBufferEncoding } from 'child_process'
import path from 'path'
import os from 'os'
import fs from 'fs/promises'

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

function spawn(cmd: string, args: string[], options?: SpawnSyncOptionsWithBufferEncoding) {
  return spawnSync(
    path.join(
      process.cwd(),
      'node_modules',
      '.bin',
      os.platform() === 'win32' ? cmd + '.cmd' : cmd
    ),
    args,
    options
  )
}

function getTscMajorVersion(): number {
  const result = spawn('tsc', ['--version'], { cwd: __dirname })
  const version = result.stdout?.toString() || ''
  const match = version.match(/Version (\d+)/)
  return match?.[1] ? parseInt(match[1], 10) : 0
}

const tscMajorVersion = getTscMajorVersion()

function compileTs(_file: string) {
  const args = [
    '--noEmit',
    '--skipLibCheck',
    '--strict',
    '--esModuleInterop',
    '--target',
    'es2019',
    '--moduleResolution',
    'node',
    '--noUncheckedIndexedAccess',
    '--noUnusedLocals',
    '--noUnusedParameters',
    '--noImplicitReturns',
    '--forceConsistentCasingInFileNames',
    _file,
  ]

  // TS 6.0+ requires --ignoreConfig when passing files on command line
  if (tscMajorVersion >= 6) {
    args.unshift('--ignoreConfig')
  }

  return spawn(`tsc`, args, {
    cwd: __dirname,
  })
}

for (let schema of glob.sync(`./examples/*.graphql`, { cwd: __dirname })) {
  let schemaName = path.basename(schema)
  t.test(`schema ${schemaName}`, async t => {
    // t.autoend(true)

    t.before(async () => {
      let extraOptionsPath = path.join(__dirname, `examples`, `${schemaName}.opts.json`)

      let extraOptions = await fs.readFile(extraOptionsPath, 'utf8').then(
        opts => {
          try {
            return JSON.parse(opts)
          } catch (e) {
            console.error(`Eror parsing schema options for ${schemaName}: ${opts}`)
            return {}
          }
        },
        _ => ({})
      )

      await compile({
        schema: path.join(__dirname, schema),
        output: path.join(__dirname, 'examples', `${schemaName}.api.ts`),
        includeTypename: true,
        ...extraOptions,
      })
    })

    let schemaCoreName = path.basename(schema).split('.')[0]

    t.test('typechecks', t => {
      let output = compileTs(`${schema}.api.ts`)
      if (output.status) {
        t.fail(output.stdout.toString())
      }
      t.end()
    })

    let goodExamples = glob.sync(`./examples/*-${schemaCoreName}.good.ts`, { cwd: __dirname })

    for (let example of goodExamples) {
      let exampleName = path.basename(example)
      t.test(`compiles with example ${exampleName}`, async t => {
        let res = compileTs(example)
        if (res.status) {
          console.error(res.stdout.toString())
          t.fail(res.stdout.toString())
        }
      })

      t.test(`runs the verifications in ${exampleName}`, async t => {
        let loadedExample = require(example)
        for (let test of loadedExample.default) test(t)
      })
    }

    let badExamples = glob.sync(`./examples/*-${schemaCoreName}.bad.ts`, { cwd: __dirname })
    for (let example of badExamples) {
      let exampleName = path.basename(example)
      t.test(`compile fails with example ${exampleName}`, async t => {
        let res = compileTs(example)
        if (res.status) {
          t.pass('failed to compile ' + res.stdout.toString().substring(0, 255))
        } else {
          t.fail('bad example compiled with no errors')
        }
      })
    }
  })
}
