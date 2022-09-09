import { query, $ } from './zeus.graphql.api'
import { verify } from './verify'

let nestedVariable = query(q => [
  q.drawCard(c => [c.attack({ cardID: $('cardID') }, s => [s.name])]),
])

export default [
  verify({
    query: nestedVariable,
    schemaPath: 'zeus.graphql',
    variables: {}, // missing cardID
  }),
]
