#!/usr/bin/env node

import * as yargs from 'yargs'
import { compile } from './compile'

async function main() {
  const args = await yargs.options({
    schema: {
      type: 'string',
      describe: 'The path or URL to the schema',
      required: true,
    },

    output: {
      type: 'string',
      describe: 'The output TypeScript file',
      required: true,
    },
  }).argv

  return compile(args)
}

main()
