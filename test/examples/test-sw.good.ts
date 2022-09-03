import path from 'path'
import { query, $ } from './sw.graphql.api'
import { verify } from './verify'

let planetQuery = query(q => [
  q.planet({ id: $('planet_id', true) }, p => [
    //
    p.id,
    p.name,
    p.population,
    p.terrains.as('terrain'),
  ]),
])

let planetQueryString = `query ($planet_id: ID) {
  planet(id: $planet_id) {
    id
    name
    population
    terrain: terrains
  }
}`

export default [
  verify({
    query: planetQuery,
    string: planetQueryString,
    schemaPath: path.join(__dirname, 'sw.graphql'),
    variables: {
      planet_id: 'id',
      // planet_id: 'works',
    },
  }),
]
