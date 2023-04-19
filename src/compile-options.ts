export type Args = {
  /**
   * The schema(s) to compile. Can be a path to a file or an URL to a server with introspection
   */
  schema: string | string[]
  /**
   * The path to the output file
   */
  output: string
  /**
   * If the schema is an URL, additional headers to send
   */
  headers?: string[]

  /**
   * A list of scalars and paths to their type definitions
   */
  scalar?: string[]

  /**
   * Should we include __typename in the fields?
   */
  includeTypename?: boolean
}

export type Options = {
  scalars?: [string, string][]
  includeTypename?: boolean
}
