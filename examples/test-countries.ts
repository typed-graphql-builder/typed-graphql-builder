import { query } from './countries-schema'

query(q => [
  q.countries(c => [c.name, c.capital]).as('c1'),
  q.countries({}, c => [c.name, c.capital]).as('c2'),
])
