// Todo: add big query tests

import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { verify } from './verify'
import { query, order_by, $, $$, mutation } from './x.graphql.api'

let orderByTest = query(q => [
  q.bookings(
    {
      order_by: [
        {
          bookerName: $$('myvar'),
          checkOut: $('optional'),
          bookedAt: order_by.desc,
        },
      ],
    },
    o => [o.id, o.guestName, o.nights, o.bookerName]
  ),
])


let genericWhere = query(q => [
  // does not seem to generate the correct variable type
  q.aggregateBookings({ where: $('where') }, a => [a.aggregate(a => [a.count(a.count)])])
])

type GetInputOfTypedDocumentNode<T extends TypedDocumentNode<any, any>> = T extends TypedDocumentNode<any, infer Input> ? Input : never

type InputOfGenericWhere = GetInputOfTypedDocumentNode<typeof genericWhere>

let example1: InputOfGenericWhere = {
  where: {
    createdAt: {
      _eq: '2024-01-01'
    }
  }
}

type xdotwhere = typeof example1.where

let example2: xdotwhere = {
  createdAt: {
    _eq: '2024-01-01'
  }
}


let bookingsBetween = query(q => [
  q.bookings(
    {
      where: {
        _and: [
          { createdAt: { _gte: $$('startDate') } },
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

const upsertBookingChannelMutation = mutation(m => [
  m.insert_booking_channel_one(
    {
      object: $$('bc'),
    },
    b => [b.name]
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

let orderByTestString = `query ($myvar: order_by!, $optional: order_by) {
  bookings(order_by: [{bookerName: $myvar, checkOut: $optional, bookedAt: desc}]) {
    id
    guestName
    nights
    bookerName
  }
}`

const nullableArgument = mutation(m => [
  m.updateBooking(
    {
      pk_columns: { id: $$('id') },
      _set: {
        bookedAt: null,
      },
    },
    r => [r.id]
  ),
])

const nullableArgumentString = `mutation ($id: uuid!) {
  updateBooking(pk_columns: {id: $id}, _set: {bookedAt: null}) {
    id
  }
}`

export default [
  verify({
    query: orderByTest,
    schemaPath: 'x.graphql',
    string: orderByTestString,
    variables: {
      myvar: order_by.asc_nulls_first,
    },
  }),
  verify({
    query: bookingsBetween,
    variables: {
      startDate: '2022-01-01',
      endDate: '2022-12-30',
    },
    schemaPath: 'x.graphql',
    string: bookingsBetweenString,
  }),
  verify({
    query: upsertBookingChannelMutation,
    variables: { bc: { name: 'hello' } },
    schemaPath: 'x.graphql',
  }),
  verify({
    query: nullableArgument,
    variables: {
      id: 'abc',
    },
    schemaPath: 'x.graphql',
    string: nullableArgumentString,
  }),

  verify({
    query: genericWhere,
    variables: {
      where: {
        createdAt: { _eq: '2024-01-01' },
      },
    },
    schemaPath: 'x.graphql',
  }),
]
