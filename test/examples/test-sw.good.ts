import { query, $ } from './sw.graphql.api'
import { verify } from './verify'

let planetQuery = query(q => [
  q.planet({ id: $('planet_id', false) }, p => [
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
    variables: {
      planet_id: null,
      // planet_id: 'works',
    },
  }),
]
