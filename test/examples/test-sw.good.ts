import { query, $ } from './sw.graphql'
import { verify } from './verify'

const planetQuery = query(q => [
  q.planet({ id: $('planet_id') }, p => [
    //
    p.id,
    p.name,
    p.population,
    p.terrains.as('terrain'),
  ]),
])

export default [
  verify({
    query: planetQuery,
    variables: {
      planet_id: 'str',
    },
  }),
]
