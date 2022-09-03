import { query, $ } from './zeus.graphql.api'
import { verify } from './verify'
import path from 'path'

let nestedVariable = query(q => [q.cardById({ cardId: $('required') }, c => [c.id])])

export default [
  verify({
    query: nestedVariable,
    schemaPath: path.join(__dirname, 'zeus.graphql'),
    variables: {}, // missing required variable
  }),
]
