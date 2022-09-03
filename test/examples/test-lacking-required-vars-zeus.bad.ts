import { query, $ } from './zeus.graphql.api'
import { verify } from './verify'

let nestedVariable = query(q => [q.cardById({ cardId: $('required') }, c => [c.id])])

export default [
  verify({
    query: nestedVariable,
    variables: {}, // missing required variable
  }),
]
