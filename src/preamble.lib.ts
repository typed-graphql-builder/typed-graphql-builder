// The ignore pragmas are needed for the parcel types transformer, which
// doesn't understand the fs module.

//@ts-ignore
import * as fs from 'fs'

export const Preamble = fs
  //@ts-ignore
  .readFileSync(__dirname + '/preamble.src.ts', 'utf8')
  .split('/* BEGIN PREAMBLE */')[1]!
