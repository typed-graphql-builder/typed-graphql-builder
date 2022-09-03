import { query, $ } from './zeus.graphql.api'
import { verify } from './verify'
import path from 'path'

let nestedVariable = query(q => [
  q.drawCard(c => [c.attack({ cardID: $('cardID') }, s => [s.name])]),
])

export default [
  verify({
    query: nestedVariable,
    schemaPath: path.join(__dirname, 'zeus.graphql'),
    variables: {}, // missing cardID
  }),
]
