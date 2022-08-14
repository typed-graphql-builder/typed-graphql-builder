import { TypedDocumentNode } from '@graphql-typed-document-node/core'
import assert from 'assert'
import { query } from './x.graphql'

export function verify<Inp, Out>(opts: {
  query: TypedDocumentNode<Out, Inp>
  string?: string
  variables: Inp
}) {
  return () => {
    if (opts.string) {
      assert.equal(opts.string, opts.query.loc?.source.body)
    }
  }
}
