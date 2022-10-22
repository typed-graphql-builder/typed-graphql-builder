import * as fs from 'fs'

export const Preamble = fs
  .readFileSync(__dirname + '/preamble.src.ts', 'utf8')
  .split('/* BEGIN PREAMBLE */')[1]!
