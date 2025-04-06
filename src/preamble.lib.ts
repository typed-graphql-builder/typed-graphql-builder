// @ts-ignore
import * as fs from 'fs'
// @ts-ignore
import * as path from 'path'

// This will be replaced by Vite's plugin during build
// but will work in Node.js runtime for tests
let preamblePath = path.join(__dirname, './preamble.src.ts')
let preambleContent = fs.readFileSync(preamblePath, 'utf8')
export const Preamble = preambleContent.split('/* BEGIN PREAMBLE */')[1]!
