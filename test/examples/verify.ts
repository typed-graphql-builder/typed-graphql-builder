import { TypedDocumentNode } from '@graphql-typed-document-node/core'
import { print, parse } from 'graphql'

export function verify<Inp, Out>(opts: {
  query: TypedDocumentNode<Out, Inp>
  string?: string
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

      t.equal(str, q)
    }
  }
}
