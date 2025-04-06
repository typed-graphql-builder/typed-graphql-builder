import { defineConfig, Plugin } from 'vite'
import { dependencies } from './package.json'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'
import fs from 'fs'
import path from 'path'

// Create an array of all dependencies
const external = [...Object.keys(dependencies), 'fs', 'fs/promises', 'path', 'child_process', 'os']

// Custom plugin to handle preamble.lib.ts transformation
function preamblePlugin(): Plugin {
  return {
    name: 'vite-plugin-preamble',
    transform(code, id) {
      // Only transform the preamble.lib.ts file
      if (id.endsWith('preamble.lib.ts')) {
        // Get the content of preamble.src.ts
        const preambleSrcPath = path.join(path.dirname(id), 'preamble.src.ts')
        const preambleContent = fs.readFileSync(preambleSrcPath, 'utf8')

        // Use the same extraction logic as in the original file
        // This avoids duplicating the extraction logic
        const extractedPreamble = preambleContent.split('/* BEGIN PREAMBLE */')[1]

        // Replace the file reading code with a direct string assignment
        return `
// This file is transformed by vite-plugin-preamble
export const Preamble = ${JSON.stringify(extractedPreamble)};
`
      }
      return null
    },
  }
}

export default defineConfig({
  build: {
    lib: {
      entry: {
        compile: resolve(__dirname, 'src/compile.ts'),
        cli: resolve(__dirname, 'src/cli.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'js'}`,
    },
    rollupOptions: {
      external,
    },
    sourcemap: true,
    outDir: 'dist',
  },
  plugins: [
    preamblePlugin(),
    dts({
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    }),
  ],
  resolve: {
    conditions: ['node'],
  },
})
