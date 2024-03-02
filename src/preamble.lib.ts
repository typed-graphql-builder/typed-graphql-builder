// @ts-ignore
import * as fs from 'fs'
declare let __dirname: string

export const Preamble = fs
  .readFileSync(__dirname + '/preamble.src.ts', 'utf8')
  .split('/* BEGIN PREAMBLE */')[1]!
