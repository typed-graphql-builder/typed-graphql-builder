import * as gq from 'graphql'
import * as fs from 'fs/promises'
import { Preamble } from './preamble.lib'
import { postamble } from './postamble'

import { request } from 'undici'

async function fetchOrRead(schemaUrl: string) {
  if (/^https?/.test(schemaUrl)) {
    let res = await request(schemaUrl)
    return await res.body.text()
  } else {
    return await fs.readFile(schemaUrl, 'utf8')
  }
}

/**
 * Compiles the given schema file or URL and writes to the specified output file
 */
export async function compile(args: { schema: string; output: string }) {
  const schemaData = await fetchOrRead(args.schema)

  let outputScript = ''
  const write = (s: string) => {
    outputScript += s + '\n'
  }

  const outputObjectTypeNames = new Set()

  let res = gq.parse(schemaData)

  const atomicTypes = new Map(
    res.definitions
      .flatMap(def => {
        if (def.kind === gq.Kind.SCALAR_TYPE_DEFINITION) return [[def.name.value, 'string']]
        if (def.kind === gq.Kind.ENUM_TYPE_DEFINITION) return [[def.name.value, def.name.value]]
        return []
      })
      .concat([
        ['Int', 'number'],
        ['Float', 'number'],
        ['ID', 'string'],
        ['String', 'string'],
        ['Boolean', 'boolean'],
      ]) as [string, string][]
  )

  const inheritanceMap = new Map(
    res.definitions.flatMap(def => {
      if (def.kind === gq.Kind.OBJECT_TYPE_DEFINITION) {
        return [[def.name.value, def.interfaces?.map(ifc => ifc.name.value)]]
      }
      return []
    })
  )

  function isAtomic(typeName: string) {
    return !!atomicTypes.get(typeName)
  }

  function toTSType(scalar: string) {
    return atomicTypes.get(scalar) ?? scalar
  }

  function printAtomicTypes() {
    return `type $Atomic = ${Array.from(new Set(atomicTypes.values())).join(' | ')}
`
  }
  function printTypeWrapped(
    wrappedType: string,
    wrapperDef: gq.TypeNode,
    notNull: boolean = false
  ): string {
    switch (wrapperDef.kind) {
      case gq.Kind.NON_NULL_TYPE:
        return `${printTypeWrapped(wrappedType, wrapperDef.type, true)}`
      case gq.Kind.LIST_TYPE:
        return `Array<${printTypeWrapped(wrappedType, wrapperDef.type)}>${
          !notNull ? ' | undefined' : ''
        }`
      case gq.Kind.NAMED_TYPE:
        return `${toTSType(wrappedType)}${!notNull ? ' | undefined' : ''}`
    }
  }

  function printType(def: gq.TypeNode, notNull: boolean = false): string {
    switch (def.kind) {
      case gq.Kind.NON_NULL_TYPE:
        return `${printType(def.type, true)}`
      case gq.Kind.LIST_TYPE:
        return `Array<${printType(def.type)}>${!notNull ? ' | undefined' : ''}`
      case gq.Kind.NAMED_TYPE:
        return `${toTSType(def.name.value)}${!notNull ? ' | undefined' : ''}`
    }
  }

  function printTypeGql(def: gq.TypeNode, notNull: boolean = false): string {
    switch (def.kind) {
      case gq.Kind.NON_NULL_TYPE:
        return `${printTypeGql(def.type, true)}`
      case gq.Kind.LIST_TYPE:
        return `[${printTypeGql(def.type)}]${notNull ? '!' : ''}`
      case gq.Kind.NAMED_TYPE:
        return `${def.name.value}${notNull ? '!' : ''}`
    }
  }

  function printTypeBase(def: gq.TypeNode): string {
    switch (def.kind) {
      case gq.Kind.NON_NULL_TYPE:
        return `${printTypeBase(def.type)}`
      case gq.Kind.LIST_TYPE:
        return `${printTypeBase(def.type)}`
      case gq.Kind.NAMED_TYPE:
        return `${def.name.value}`
    }
  }

  function printInputField(def: gq.InputValueDefinitionNode) {
    const maybe = def.type.kind !== gq.Kind.NON_NULL_TYPE ? '?' : ''
    return `${def.name.value}${maybe}: ${printType(def.type)}`
  }

  function printDocumentation(description?: gq.StringValueNode) {
    return description?.value.length ?? 0 > 0
      ? `
/**
 * ${description?.value}
 */`
      : ''
  }

  function printObjectType(def: gq.ObjectTypeDefinitionNode) {
    const className = def.name.value
    return `
${printDocumentation(def.description)}
export class ${className} extends $Base<"${className}"> {
  constructor() {
    super("${className}")
  }

  ${def.fields?.map(f => printField(f, className)).join('\n')}
}`
  }

  function generateFieldDefinition(field: gq.FieldDefinitionNode, includeArgs: boolean) {
    const methodArgs: string[] = []
    const fieldTypeName = printTypeBase(field.type)
    let hasArgs = false,
      hasSelector = false
    if (field.arguments?.length && includeArgs) {
      hasArgs = true
      methodArgs.push(`args: Args`)
    }
    if (!isAtomic(fieldTypeName)) {
      hasSelector = true

      methodArgs.push(`selectorFn: (s: ${fieldTypeName}) => [...Sel]`)
    }
    if (methodArgs.length > 0) {
      let extractArgs = ''
      let methodArgsSerialized = methodArgs.join(', ')
      const argsType = `{
        ${(field.arguments ?? []).map(arg => printInputField(arg)).join('\n')},
      }`
      const generics = (hasArgs ? [`Args extends VariabledInput<${argsType}>`] : []).concat(
        hasSelector ? [`Sel extends Selection<${fieldTypeName}>`] : []
      )

      return `${field.name.value}<${generics.join(',')}>(${methodArgsSerialized}):$Field<"${
        field.name.value
      }", ${hasSelector ? printTypeWrapped('GetOutput<Sel>', field.type) : printType(field.type)} ${
        hasArgs ? `, GetVariables<${hasSelector ? 'Sel' : '[]'}, Args>` : ''
      }>`
    }
  }
  function printField(field: gq.FieldDefinitionNode, parentName: string) {
    const fieldTypeName = printTypeBase(field.type)

    let hasArgs = !!field.arguments?.length,
      hasSelector = !isAtomic(fieldTypeName)

    if (hasArgs || hasSelector) {
      let extractArgs = ''

      let validDefinitions = generateFieldDefinition(field, true)

      const hasOnlyMaybeInputs = (field.arguments ?? []).every(
        def => def.type.kind !== gq.Kind.NON_NULL_TYPE
      )
      if (hasOnlyMaybeInputs && hasArgs && hasSelector) {
        validDefinitions +=
          '\n' +
          generateFieldDefinition(field, false) +
          '\n' +
          `${field.name.value}(arg1: any, arg2?: any)`
        extractArgs = `const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };\n`
      }
      return `
      ${printDocumentation(field.description)}
      ${validDefinitions} {
      ${extractArgs}
      const options = {
        ${
          hasArgs
            ? `argTypes: {
              ${field.arguments
                ?.map(arg => `${arg.name.value}: "${printTypeGql(arg.type)}"`)
                .join(',\n')}
            },`
            : ''
        }
        ${hasArgs ? `args,` : ''}

        ${hasSelector ? `selection: selectorFn(new ${fieldTypeName})` : ''}
      };
      return this.$_select("${field.name.value}", options) as any
    }
  `
    } else {
      return `
      ${printDocumentation(field.description)}
      get ${field.name.value}(): $Field<"${field.name.value}", ${printType(field.type)}>  {
       return this.$_select("${field.name.value}") as any
      }`
    }
  }

  function printInterface(def: gq.InterfaceTypeDefinitionNode) {
    const className = def.name.value

    return `
${printDocumentation(def.description)}
export class ${className} extends $Base<"${className}"> {
  constructor() {
    super("${className}")
  }
  ${def.fields?.map(f => printField(f, className)).join('\n')}
}`
  }

  function printInputObjectType(def: gq.InputObjectTypeDefinitionNode) {
    return `
${printDocumentation(def.description)}
export type ${def.name.value} = {
  ${def.fields?.map(field => printInputField(field)).join(',\n')}
}
    `
  }

  function printInputTypeMap(defs: gq.InputObjectTypeDefinitionNode[]) {
    return `
const $InputTypes: {[key: string]: {[key: string]: string}} = {
  ${defs
    .map(
      def => `  ${def.name.value}: {
    ${def.fields?.map(field => `${field.name.value}: "${printTypeGql(field.type)}"`).join(',\n')}
  }`
    )
    .join(',\n')}
}
`
  }

  function printScalar(def: gq.ScalarTypeDefinitionNode) {
    return `
${printDocumentation(def.description)}
export type ${def.name.value} = unknown
`
  }

  function printUnion(def: gq.UnionTypeDefinitionNode) {
    // TODO: collect all interfaces that the named type implements too
    const baseTypes = def.types?.map(t => printTypeBase(t)) ?? []
    const additionalTypes = Array.from(
      new Set(baseTypes.concat(baseTypes.flatMap(bt => inheritanceMap.get(bt) ?? [])))
    )

    const UnionObject = `{${additionalTypes.map(t => `${t}: ${t}`)}}`
    return `
${printDocumentation(def.description)}
export class ${def.name.value} extends $Union<${UnionObject}, "${def.name.value}"> {
  constructor() {
    super(${UnionObject})
  }
}`
  }

  function printEnumValue(def: gq.EnumValueDefinitionNode) {
    return `${printDocumentation(def.description)}
  ${def.name.value} = "${def.name.value}"`
  }
  function printEnum(def: gq.EnumTypeDefinitionNode) {
    return `
  ${printDocumentation(def.description)}
export enum ${def.name.value} {
  ${def.values?.map(printEnumValue).join(',\n')}
}
  `
  }

  function printSchema(def: gq.SchemaDefinitionNode) {
    return `
  const $Root = {
    ${def.operationTypes.map(op => `${op.operation}: ${printType(op.type, true)}`).join(',\n')}
  }

  namespace $RootTypes {
    ${def.operationTypes
      .map(op => `export type ${op.operation} = ${printType(op.type, true)}`)
      .join('\n')}
  }
  `
  }

  write(Preamble)
  write(printAtomicTypes())

  let rootNode: gq.SchemaDefinitionNode | null = null
  for (let def of res.definitions) {
    switch (def.kind) {
      case gq.Kind.OBJECT_TYPE_DEFINITION:
        write(printObjectType(def))
        outputObjectTypeNames.add(def.name.value)
        break
      case gq.Kind.INPUT_OBJECT_TYPE_DEFINITION:
        write(printInputObjectType(def))
        break
      case gq.Kind.SCALAR_TYPE_DEFINITION:
        write(printScalar(def))
        break
      case gq.Kind.UNION_TYPE_DEFINITION:
        write(printUnion(def))
        break
      case gq.Kind.ENUM_TYPE_DEFINITION:
        write(printEnum(def))
        break
      case gq.Kind.INTERFACE_TYPE_DEFINITION:
        write(printInterface(def))
        break
      case gq.Kind.SCHEMA_DEFINITION:
        rootNode = def
    }
  }

  if (!rootNode) {
    if (!outputObjectTypeNames.has('Query')) {
      console.error('Could not find toplevel root node or an output objet type named `Query`')
      process.exit(1)
    }
    rootNode = {
      kind: gq.Kind.SCHEMA_DEFINITION,
      operationTypes: [
        {
          kind: gq.Kind.OPERATION_TYPE_DEFINITION,
          operation: gq.OperationTypeNode.QUERY,
          type: {
            kind: gq.Kind.NAMED_TYPE,
            name: {
              kind: gq.Kind.NAME,
              value: 'Query',
            },
          },
        },
        ...(outputObjectTypeNames.has('Mutation')
          ? [
              {
                kind: gq.Kind.OPERATION_TYPE_DEFINITION as const,
                operation: gq.OperationTypeNode.MUTATION,
                type: {
                  kind: gq.Kind.NAMED_TYPE as const,
                  name: {
                    kind: gq.Kind.NAME as const,
                    value: 'Mutation',
                  },
                },
              },
            ]
          : []),
      ],
    }
  }
  write(printSchema(rootNode))
  write(postamble(rootNode.operationTypes.map(o => o.operation.toString())))
  write(
    printInputTypeMap(
      res.definitions.filter(def => def.kind === gq.Kind.INPUT_OBJECT_TYPE_DEFINITION) as any[]
    )
  )

  if (args.output === '') {
    console.log(outputScript)
  } else {
    await fs.writeFile(args.output, outputScript)
  }
}
