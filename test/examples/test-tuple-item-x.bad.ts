// Todo: add big query tests

import { verify } from './verify'
import { query, $ } from './x.graphql.api'

// cannot use $ if array consistens of atomic types
let bookingsBetween = query(q => [
  q.bookings({ distinct_on: [$('works')] as const }, b => [
    // select fields
    b.bookedAt,
    b.bookerName,
    b.nights,
    b.connection(c => [
      // nested fields
      c.id,
      c.createdAt,
    ]),
  ]),
])

export default [
  verify({
    query: bookingsBetween,
    variables: {},
    schemaPath: 'x.graphql',
  }),
]
