import { mutation, $ } from './scalars.graphql.api'
import { verify } from './verify'

let createScalarMutation = mutation(m => [
  m.createObject(
    {
      input: {
        content: $('myVar'),
      },
    },
    s => [s.content]
  ),
])

let createEncompassingVariableMutation = mutation(m => [
  m.createObject(
    {
      input: $('myInput'),
    },
    s => [s.content]
  ),
])

let createManyMutation = mutation(m => [m.createMany({ inputs: $('myInputs') })])

export default [
  verify({
    query: createScalarMutation,
    variables: {
      myVar: { a: 'str' },
    },
    schemaPath: 'scalars.graphql',
    useOutputType: oType => {
      // val should be a string as JSONObject is {[key: string]: string}
      oType.createObject?.content?.key!.substring(10)
    },
  }),
  verify({
    query: createEncompassingVariableMutation,
    variables: {
      myInput: {
        content: { key: 'str' },
      },
    },
    schemaPath: 'scalars.graphql',
  }),
  verify({
    query: createManyMutation,
    variables: {
      myInputs: [
        {
          content: { key: 's' },
        },
      ],
    },
    schemaPath: 'scalars.graphql',
  }),
]
