import { query, $$ } from './zeus.graphql.api'
import { verify } from './verify'

let notNullableVariable = query(q => [
  // cannot use option when already NonNullable
  q.cardById({ cardId: $$('cardID') }, c => [c.id]),
])

export default [
  verify({
    query: notNullableVariable,
    schemaPath: 'zeus.graphql',
    variables: {
      cardID: null,
    }, // missing cardID
  }),
]
