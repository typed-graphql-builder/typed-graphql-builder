import type { TypedDocumentNode } from '@graphql-typed-document-node/core'
import { print, parse, validate, buildSchema } from 'graphql'
import fs from 'fs'
import path from 'path'

export function verify<Inp, Out>(opts: {
  query: TypedDocumentNode<Out, Inp>
  string?: string
  schemaPath: string
  variables: Inp
}) {
  return (t: Tap.Test) => {
    if (opts.string) {
      let str = opts.string
      try {
        str = print(parse(opts.string))
      } catch (e) {}
      let q = opts.query.loc?.source.body
      try {
        q = print(opts.query)
      } catch (e) {}

      const schemaFile = fs.readFileSync(path.join(__dirname, opts.schemaPath), {
        encoding: 'utf-8',
      })
      const schema = buildSchema(schemaFile)
      const errors = validate(schema, opts.query)
      t.equal(errors.length, 0, `verify doc against schema. errors: ${errors[0]}`)

      t.equal(str, q)
    }
  }
}
