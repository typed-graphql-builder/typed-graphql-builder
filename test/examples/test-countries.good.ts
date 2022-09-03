import path from 'path'
import { query } from './countries.graphql.api'
import { verify } from './verify'

// Allow both overloads
let twoCountries = query(q => [
  q.countries(c => [c.name, c.capital]).as('c1'),
  q.countries({}, c => [c.name, c.capital]).as('c2'),
])

let twoCountriesString = `{
  c1: countries {
    name
    capital
  }
  c2: countries {
    name
    capital
  }
}`

export default [
  verify({
    query: twoCountries,
    variables: {},
    schemaPath: path.join(__dirname, 'countries.graphql'),
    string: twoCountriesString,
  }),
]
