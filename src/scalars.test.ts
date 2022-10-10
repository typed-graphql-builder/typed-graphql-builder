import t from 'tap'
import { getScalars } from './scalars'

let scalarMapPairs = [
  ['Empty', ''],
  ['MyTest', 'string'],
  ['Another', './path/to/x#TypeName'],
  ['JSON(.+)', './jsons#JSON$1'],
  ['.+', 'unknown'],
] as [string, string][]

t.test('plain string scalar', async t => {
  let scalarInfo = getScalars(['MyTest'], scalarMapPairs)
  t.same(scalarInfo.map, [['MyTest', 'string']])
  t.same(scalarInfo.imports, [])
})

t.test('must not match subpattern', async t => {
  let scalarInfo = getScalars(['MyTest2'], scalarMapPairs)
  t.same(scalarInfo.map, [['MyTest2', 'unknown']])
  t.same(scalarInfo.imports, [])
})

t.test('scalar with import', async t => {
  let scalarInfo = getScalars(['Another'], scalarMapPairs)
  t.same(scalarInfo.map, [['Another', 'Another']])
  t.same(scalarInfo.imports, [`import type { TypeName as Another } from './path/to/x'`])
})

t.test('scalar with import and pattern', async t => {
  let scalarInfo = getScalars(['JSONTextDocument'], scalarMapPairs)
  t.same(scalarInfo.map, [['JSONTextDocument', 'JSONTextDocument']])
  t.same(scalarInfo.imports, [`import type { JSONTextDocument } from './jsons'`])
})

t.test('scalar not matching any other pattern', async t => {
  let scalarInfo = getScalars(['Blaha'], scalarMapPairs)
  t.same(scalarInfo.map, [['Blaha', 'unknown']])
  t.same(scalarInfo.imports, [])
})

t.test('replacement and rename patterns working', async t => {
  let scalarInfo = getScalars(['MyScalar'], [['(.+)', './scalars#Rename$1']])
  t.same(scalarInfo.map, [['MyScalar', 'MyScalar']])
  t.same(scalarInfo.imports, [`import type { RenameMyScalar as MyScalar } from './scalars'`])
})
