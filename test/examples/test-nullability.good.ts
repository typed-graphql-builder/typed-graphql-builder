import { query } from './nullability.graphql.api'
import { verify } from './verify'

const basicQuery = query(q => [q.posts(p => [p.id, p.author(a => [a.name])])])

export default [
  verify({
    query: basicQuery,
    schemaPath: 'nullability.graphql',
    variables: {},
    useOutputType: output => {
      let posts = output.posts
      if (posts === null) {
        return
      }
      let firstPost = posts[0]
      // Array access can be undefined.
      if (firstPost === undefined) {
        return
      }
      let author = firstPost.author
      if (author === null) {
        return
      }
      let name = author.name
      return name + 'test'
    },
  }),
]
