import { query, $, QueryOutputType } from './sw.graphql.api'
import { verify } from './verify'

let planetQuery = query(q => [
  q.planet({ id: $('planet_id') }, p => [
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

const nodeQuery = query(q => [
  q.node({ id: 'sample' }, n => [
    n.$on('Person', p => [
      //
      p.id,
      p.name,
    ]),
  ]),
])

const nodeQueryString = `query {
  node(id: "sample") {
    ... on Person {
      id
      name
    }
  }
}`

const multiChoiceQuery = query(q => [
  q.node({ id: 'x' }, n => [
    n.id,
    n.$on('Person', p => [p.birthYear, p.__typename]),
    n.$on('Planet', p => [p.climates, p.__typename]),
  ]),
])

type PersonOrPlanet = QueryOutputType<typeof multiChoiceQuery>

declare let v: PersonOrPlanet

export function test() {
  let personOrPlanet = v.node!
  switch (personOrPlanet.__typename) {
    case 'Person':
      return personOrPlanet.birthYear
    case 'Planet':
      return personOrPlanet.climates?.toString()
  }
}

export default [
  verify({
    query: planetQuery,
    string: planetQueryString,
    schemaPath: 'sw.graphql',
    variables: {
      planet_id: 'str',
    },
  }),
  verify({
    query: nodeQuery,
    string: nodeQueryString,
    schemaPath: 'sw.graphql',
    variables: {},
  }),
]
