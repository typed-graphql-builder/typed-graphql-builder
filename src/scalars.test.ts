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
