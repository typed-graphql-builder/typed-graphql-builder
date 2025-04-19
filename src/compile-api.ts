import * as gq from 'graphql'
import * as fs from 'fs/promises'
import { request } from 'undici'
import { glob } from 'glob'

import { UserFacingError } from './user-error'
import { compileSchemaDefinitions } from './compile'
import type { Args, Options } from './compile-options'

/**
 * Compiles the given schema file or URL and writes to the specified output file
 */
export async function compile(args: Args) {
  let schemaData = await fetchOrRead(args)

  let scalars = args.scalar?.map(s => s.split('=') as [string, string])
  let outputScript = compileSchemas(schemaData, {
    scalars,
    includeTypename: args.includeTypename,
  })

  if (args.output === '') {
    console.log(outputScript)
  } else {
    await fs.writeFile(args.output, outputScript)
  }
}

const UrlRegex = /^https?:\/\//

async function fetchOrRead(args: Args) {
  let loadedSchemas = []
  let schemas = Array.isArray(args.schema) ? args.schema : [args.schema]

  for (let schemaSpec of schemas) {
    if (UrlRegex.test(schemaSpec)) {
      let headers = args.headers?.flatMap(h => h.split(':')) ?? []

      let res = await request(schemaSpec, {
        method: 'POST',
        headers: [...headers, 'content-type', 'application/json'],
        body: JSON.stringify({
          operationName: 'IntrospectionQuery',
          query: gq.getIntrospectionQuery(),
        }),
      })
      let body: any = await res.body.json()
      if (body.errors) {
        throw new UserFacingError(
          `Error introspecting schema from ${args.schema}: ${JSON.stringify(body.errors, null, 2)}`
        )
      }
      loadedSchemas.push(gq.printSchema(gq.buildClientSchema(body.data)))
    } else if (args.schema === '') {
      let res = ''
      for await (let data of process.stdin) {
        res += String(data)
      }
      loadedSchemas.push(res)
    } else {
      for (let fileName of glob.sync(schemaSpec)) {
        loadedSchemas.push(await fs.readFile(fileName, 'utf8'))
      }
    }
  }
  return loadedSchemas
}

/**
 * Compiles a schema string directly to output TypeScript code
 */
export function compileSchemas(schemaStrings: string | string[], options: Options = {}): string {
  let schemaArray = Array.isArray(schemaStrings) ? schemaStrings : [schemaStrings]

  let schemas = schemaArray.map(schemaString => gq.parse(schemaString, { noLocation: false }))

  let schemaDefinitions = schemas.flatMap(s => s.definitions)

  return compileSchemaDefinitions(schemaDefinitions, options)
}
