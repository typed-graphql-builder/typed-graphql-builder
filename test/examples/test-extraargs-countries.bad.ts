import { $$, query } from './countries.graphql.api'

query('MyName', q => [q.continent({ code: $$('test'), extraArg: 1 }, c => [c.code, c.name])])
