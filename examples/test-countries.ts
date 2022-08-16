import { query } from './countries-schema'

query(q => [q.countries({}, c => [c.code, c.name])])
