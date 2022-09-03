import path from 'path'
import { verify } from './verify'
import { query, order_by, $, booking_select_column } from './x.graphql.api'

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
      distinct_on: [booking_select_column.checkIn],
      where: {
        _and: [
          { createdAt: { _gte: $('startDate', false) } },
          { createdAt: { _lte: $('endDate', true) } },
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
    distinct_on: [checkIn]
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

function stringOrNull(): string | null {
  return null
}

export default [
  verify({
    query: orderByTest,
    schemaPath: path.join(__dirname, 'x.graphql'),
    variables: {
      myvar: order_by.asc_nulls_first,
    },
  }),
  verify({
    query: bookingsBetween,
    schemaPath: path.join(__dirname, 'x.graphql'),
    variables: {
      startDate: '2022-01-01',
      endDate: stringOrNull(),
    },
    string: bookingsBetweenString,
  }),
]
