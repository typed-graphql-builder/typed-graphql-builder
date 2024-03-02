import { verify } from './verify'
import { $, query } from './issue-69.graphql.api'

const EmptyVariablesQuery = query(q => [
  q.topLevelVariablesNotNullable({
    arg1: $('arg1'),
    arg2: undefined,
  }),
])

const GetAccessibleUsers = query(q => [
  q.optionalObjectVariablesRequired({
    arg2: $('arg2'),
    arg1: $('arg1'),
  }),
])

export default [
  verify({
    query: EmptyVariablesQuery,
    schemaPath: 'issue-69.graphql',
    variables: {},
  }),
  verify({
    query: GetAccessibleUsers,
    schemaPath: 'issue-69.graphql',
    variables: {},
  }),
]
