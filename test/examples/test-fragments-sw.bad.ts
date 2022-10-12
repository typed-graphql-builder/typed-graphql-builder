import { query, $ } from './sw.graphql.api'
import { verify } from './verify'

let nodeQuery = query(q => [
  q.node({id: "sample"}, n => [
    n.$on("Person", p => [
      //
      p.id,
      p.name
    ])
  ])
])

let nodeQueryString = `query {
  node(id: "sample") {
    ... on Person {
      id
      name
    }
  }
}`

export default [
  verify({
    query: nodeQuery,
    string: nodeQueryString,
    schemaPath: 'sw.graphql',
    variables: {},
  }),
]
