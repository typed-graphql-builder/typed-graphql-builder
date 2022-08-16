import { query } from './countries.graphql'

query(q => [
  q.countries(
    {
      filter: {},
    },
    c => [c.code, c.name]
  ),
])
