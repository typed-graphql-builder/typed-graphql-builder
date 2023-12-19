import { all, query, $, $$ } from './countries.graphql.api'
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

let namedQuery = query('MyName', q => [q.continent({ code: $$('test') }, c => [c.code, c.name])])

let namedQueryString = `
query MyName($test: ID!) {
  continent(code: $test) {
    code
    name
  }
}
`

let allQuery = query('AllFields', q => [
  q.countries(all),
])

let allQueryString = `
query AllFields {
  countries {
    capital
    code
    currency
    emoji
    emojiU
    name
    native
    phone
    __typename
  }
}
`

let nestedAllQuery = query('NestedAllFields', q => [
  q.countries(c => [
    c.capital,
    c.languages(all),
  ]),
])

let nestedAllQueryString = `
query NestedAllFields {
  countries {
    capital
    languages {
      code
      name
      native
      rtl
      __typename
    }
  }
}
`

let doubleAllQuery = query('DoubleAllFields', q => [
  q.countries(c => [
    ...all(c),
    c.languages(all),
  ]),
])

let doubleAllQueryString = `
query DoubleAllFields {
  countries {
    capital
    code
    currency
    emoji
    emojiU
    name
    native
    phone
    __typename
    languages {
      code
      name
      native
      rtl
      __typename
    }
  }
}
`

let filterVariableQuery = query('FilterVariable', q => [
  q.countries({filter: $('filter')}, c => [c.capital, c.code])
])

let filterVariableQueryString = `
query FilterVariable($filter: CountryFilterInput) {
  countries(filter: $filter) {
    capital
    code
  }
}
`

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
  verify({
    query: namedQuery,
    string: namedQueryString,
    schemaPath: 'countries.graphql',
    variables: {
      test: 'x',
    },
  }),
  verify({
    query: allQuery,
    string: allQueryString,
    schemaPath: 'countries.graphql',
    variables: {},
  }),
  verify({
    query: nestedAllQuery,
    string: nestedAllQueryString,
    schemaPath: 'countries.graphql',
    variables: {},
  }),
  verify({
    query: doubleAllQuery,
    string: doubleAllQueryString,
    schemaPath: 'countries.graphql',
    variables: {},
  }),
  verify({
    query: filterVariableQuery,
    string: filterVariableQueryString,
    schemaPath: 'countries.graphql',
    variables: {
      filter: {
        code: { eq: 'x' },
      },
    },
  }),
]
