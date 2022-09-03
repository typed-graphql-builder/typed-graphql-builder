import { verify } from './verify'
import { query, order_by, $ } from './x.graphql.api'

let orderByTest = query(q => [
  q.bookings({ order_by: [{ bookerName: $('myvar') }] as const }, o => [
    o.id,
    o.guestName,
    o.nights,
    o.bookerName,
  ]),
])

let bookingsBetween = query(q => [
  q.bookings(
    {
      where: {
        _and: [
          { createdAt: { _gte: $('startDate', true) } },
          { createdAt: { _lte: $('endDate', false) } },
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

let bookingsBetweenString = `query ($startDate: timestamptz!, $endDate: timestamptz) {
  bookings(
    where: {_and: [{createdAt: {_gte: $startDate}}, {createdAt: {_lte: $endDate}}]}
  ) {
    bookedAt
    bookerName
    nights
    connection {
      id
      createdAt
    }
  }
}`

export default [
  verify({
    query: orderByTest,
    variables: {
      myvar: order_by.asc_nulls_first,
    },
  }),
  verify({
    query: bookingsBetween,
    variables: {
      startDate: '2022-01-01',
      endDate: null,
    },
    string: bookingsBetweenString,
  }),
]
