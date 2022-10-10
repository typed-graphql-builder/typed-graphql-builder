// Default to string for all other scalars
const DEFAULT_SCALAR_MAPPING = [['.+', 'string']] as [string, string][]

type ScalarMapping = {
  nameRegex: string
  typePathPattern: string
}

type ResolvedScalar = {
  name: string
  importStatement?: string
  resolvedType: string
}

function pairsToScalarMap(scalarArgs?: [string, string][]): ScalarMapping[] {
  return (scalarArgs || DEFAULT_SCALAR_MAPPING).map(([nameRegex, typePathPattern]) => ({
    nameRegex,
    typePathPattern: typePathPattern ?? nameRegex,
  }))
}

function resolveFromPattern(scalarMap: ScalarMapping[], scalar: string): ResolvedScalar {
  for (let { nameRegex: regex, typePathPattern } of scalarMap) {
    let m = scalar.match(regex)
    if (scalar.match(regex)) {
      let resolvedTypePath = scalar.replace(new RegExp(regex), typePathPattern)
      return resolveFromTypePath(scalar, resolvedTypePath)
    }
  }

  return { resolvedType: 'unknown', name: scalar, importStatement: undefined }
}

function resolveFromTypePath(name: string, typePath: string) {
  let [importFile, importName] = typePath.split('#')
  if (!importName) {
    importName = importFile
    importFile = ''
  }

  let importStatement = importFile
    ? `import type { ${
        importName !== name ? `${importName} as ${name}` : importName
      } } from '${importFile}'`
    : undefined

  return { name, resolvedType: importStatement ? name : importName, importStatement }
}

export function getScalars(scalars: string[], scalarMapPairs?: [string, string][]) {
  let scalarMap = pairsToScalarMap(scalarMapPairs)
  let scalarInfo = scalars.map(s => resolveFromPattern(scalarMap, s))

  let map = scalarInfo.map(si => [si.name, si.resolvedType] as [string, string])
  let imports = scalarInfo.flatMap(si => (si.importStatement ? [si.importStatement] : []))

  return { map, imports }
}
