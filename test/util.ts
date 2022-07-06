import { TypedDocumentNode } from '@graphql-typed-document-node/core'

export function verify<Inp, Out>(opts: {
  query: TypedDocumentNode<Out, Inp>
  string: string
  variables: Inp
}) {
  return () => {
    return opts
  }
}
