# Typed GraphQL Builder

A GraphQL query builder compat that replaces `gql` query strings or .graphql files in your code with pure TypeScript. Compatible with any `TypedDocumentNode`-compatible library such as Apollo Client, Urql, requst.

## Generating the API

```bash
npx typed-graphql-builder \
  --schema https://countries.trevorblades.com \
  --output generated-api.ts
```

The schema can be an URL to a GraphQL endpoint with introspection support or a path to a `.graphql` schema file.

The generated API depends on two small libraries that should be added to `package.json`

```json
"dependencies": {
  "@graphql-typed-document-node/core": "^3.x1.1",
  "graphql-tag": "^2.12.6",
}
```

## Writing queries

The generated API exports `query, mutation, subscription` to access the schema roots.

The `query` function gives us access to the root `query` object of our schema:

```typescript
import { query } from './generated-api'

const continentQuery = query(q => [
  q.continents(c => [
    //
    c.name,
    c.code,
  ]),
])
```

The above code will generate a query of type `TypedDocumentNode<{continents: Array<{name: string, country: string}>}, {}>` which corresponds to the following GraphQL query string:

```graphql
query {
  continents {
    name
    code
  }
}
```

We can use input variables using the `$` helper. Variable types are inferred automatically:

```typescript
import { $, query } from './generated-api'

const countryQuery = query(q => [
  q.countries({ filter: { continent: { eq: $('continentCode') } } }, c => [
    c.code,
    c.capital,
    c.name,
    c.languages(l => [l.name]),
  ]),
])
```

This will generate `TypedDocumentNode<{ countries: Array<{...}>}, { continentCode: string }>`, a typed document node that includes the input variable `continentCode`.

The GraphQL version of the above query is shown below:

```graphql
query ($continentCode: String) {
  countries(filter: { continent: { eq: $continentCode } }) {
    code
    capital
    name
    languages {
      name
    }
  }
}
```

## Using queries

The queries written above can be used with any client library that supports TypedDocumentNode. For example, if using Apollo's `useQuery`, we would write the following:

```typescript
const CountryListComponent = () => {
  const continents = useQuery(continentQuery)
  const [continent, setContinent] = useState('EU')

  const countryList = useQuery(countryQuery, {
    variables: {
      continent,
    },
  })

  // render the country list here
}
```
