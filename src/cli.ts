#!/usr/bin/env node

import * as yargs from 'yargs'
import { compile } from './compile'
import { UserFacingError } from './user-error'

async function main() {
  const args = await yargs.usage('Compiles a GraphQL schema to a TypeScript API').options({
    schema: {
      type: 'array',
      string: true,
      describe: 'Path (or glob) to local schema file or URL to a server with introspection',
      required: true,
    },
    headers: {
      type: 'array',
      describe: 'Additional headers to send to the server if passing a server URL',
      default: [] as string[],
    },
    schemaExtensions: {
      type: 'array',
      describe: 'Additional schemas that extend the base',
      required: false,
    },
    output: {
      type: 'string',
      describe: 'The output TypeScript file',
      required: true,
    },
  }).argv

  try {
    await compile(args)
  } catch (e) {
    if (UserFacingError.is(e)) {
      console.error(e.message)
      process.exit(1)
    } else {
      throw e
    }
  }
}

main()
