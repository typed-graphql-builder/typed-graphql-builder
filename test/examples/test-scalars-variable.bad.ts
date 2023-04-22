import { mutation, $ } from './scalars.graphql.api'

let createScalarMutation = () =>
  mutation(m => [
    m.createObject(
      {
        input: {
          content: {
            scalarContent: $('variable'),
          },
        },
      },
      () => []
    ),
  ])

export default [
  (t: Tap.Test) =>
    t.throws(createScalarMutation, 'Scalar type JSONObject can only be passed as variable'),
]
