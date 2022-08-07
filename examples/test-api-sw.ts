import { query, $ } from './api-sw'

const planetQuery = query(q => [
  q.planet({ id: $('planet_id') }, p => [
    //
    p.id,
    p.name,
    p.population,
    p.terrains.as('terrain'),
  ]),
])

console.log(planetQuery.loc?.source.body)
