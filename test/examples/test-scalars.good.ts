import { mutation, $ } from './scalars.graphql.api'
import { verify } from './verify'

let createScalarMutation = () =>
  mutation(m => [
    m.createObject(
      {
        input: {
          content: $('myVar'),
        },
      },
      s => [s.content]
    ),
  ])

export default [
  verify({
    query: createScalarMutation(),
    variables: {
      myVar: { a: 'str' },
    },
    schemaPath: 'scalars.graphql',
    useOutputType: oType => {
      // val should be a string as JSONObject is {[key: string]: string}
      oType.createObject?.content?.key!.substring(10)
    },
  }),
]
