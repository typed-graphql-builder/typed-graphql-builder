import { $$, query } from './countries.graphql.api'

query('MyName', q => [
  // multi-arg
  q.countries(
    {
      filter: {
        code: $$('test'),
        extraArg: 1,
      },
    },
    c => [c.code, c.name]
  ),
])
