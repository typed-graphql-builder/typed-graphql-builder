import path from 'path'
import { verify } from './verify'
import { query, $ } from './x.graphql.api'

let bookingsBetween = query(q => [
  q.bookings(
    {
      where: {
        _and: [
          { createdAt: { _gte: $('startDate') } },
          { createdAt: { _lte: $('endDate') } },
        ] as const,
      },
    },
    b => [
      // select fields
      b.bookedAt,
      b.bookerName,
      b.nights,
      b.connection(c => [
        // nested fields
        c.id,
        c.createdAt,
      ]),
    ]
  ),
])

export default [
  verify({
    query: bookingsBetween,
    schemaPath: path.join(__dirname, 'x.graphql'),
    variables: {
      endDate: 1,
    }, // variable of incorrect type
  }),
]
