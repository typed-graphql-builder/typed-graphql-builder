import { query, $, $$ } from './countries.graphql.api'
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

let countryQuery = query(q => [
  q.countries({ filter: { continent: { eq: $('continentCode') } } }, c => [
    c.code,
    c.capital,
    c.name,
    c.languages(l => [l.name]),
  ]),
])

let countryQueryString = `
query ($continentCode: String) {
  countries(filter: {continent: {eq: $continentCode}}) {
    code
    capital
    name
    languages {
      name
    }
  }
}`

let countryQueryRequiredVar = query(q => [
  q.countries({ filter: { continent: { eq: $$('continentCode') } } }, c => [
    c.code,
    c.capital,
    c.name,
    c.languages(l => [l.name]),
  ]),
])

let countryQueryStringRequired = `
query ($continentCode: String!) {
  countries(filter: {continent: {eq: $continentCode}}) {
    code
    capital
    name
    languages {
      name
    }
  }
}`

export default [
  verify({
    query: twoCountries,
    variables: {},
    schemaPath: 'countries.graphql',
    string: twoCountriesString,
  }),
  verify({
    query: countryQuery,
    variables: {
      continentCode: null,
    },
    schemaPath: 'countries.graphql',
    string: countryQueryString,
  }),
  verify({
    query: countryQueryRequiredVar,
    variables: {
      continentCode: 'x',
    },
    schemaPath: 'countries.graphql',
    string: countryQueryStringRequired,
  }),
]
