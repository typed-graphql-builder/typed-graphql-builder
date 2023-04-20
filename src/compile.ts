import * as gq from 'graphql'
import { DefinitionNode } from 'graphql'
import { Preamble } from './preamble.lib'
import { postamble } from './postamble'
import { UserFacingError } from './user-error'
import { getScalars } from './scalars'
import { Options } from './compile-options'

type SupportedExtensibleNodes =
  | gq.InterfaceTypeDefinitionNode
  | gq.ObjectTypeDefinitionNode
  | gq.InputObjectTypeDefinitionNode

type FieldOf<T extends SupportedExtensibleNodes> = T extends
  | gq.ObjectTypeDefinitionNode
  | gq.InterfaceTypeDefinitionNode
  ? gq.FieldDefinitionNode
  : T extends gq.InputObjectTypeDefinitionNode
  ? gq.InputValueDefinitionNode
  : never

/**
 * Compile a list of schema definitions with the specified options into an output script string
 */
export function compileSchemaDefinitions(
  schemaDefinitions: DefinitionNode[],
  options: Options = {}
) {
  let outputScript = ''

  function write(s: string) {
    outputScript += s + '\n'
  }

  const outputObjectTypeNames = new Set()

  const enumTypes = schemaDefinitions.flatMap(def => {
    if (def.kind === gq.Kind.ENUM_TYPE_DEFINITION) return [def.name.value]
    return []
  })

  const scalarTypeNames = schemaDefinitions.flatMap(def => {
    if (def.kind === gq.Kind.SCALAR_TYPE_DEFINITION) return [def.name.value]
    return []
  })

  const scalars = getScalars(scalarTypeNames, options.scalars)

  const schemaExtensionsMap = schemaDefinitions.filter(gq.isTypeExtensionNode).reduce((acc, el) => {
    if (acc.has(el.name.value)) {
      acc.get(el.name.value)!.push(el)
    } else {
      acc.set(el.name.value, [el])
    }
    return acc
  }, new Map<string, gq.TypeExtensionNode[]>())

  function getExtendedFields<T extends SupportedExtensibleNodes>(sd: T) {
    let fieldExtensions = (schemaExtensionsMap.get(sd.name.value) || []).flatMap(
      n => (n as any).fields || []
    ) as FieldOf<T>[]

    let fieldList = ((sd.fields || []) as FieldOf<T>[]).concat(fieldExtensions)

    fieldList.sort((f1, f2) =>
      f1.name.value < f2.name.value ? -1 : f1.name.value > f2.name.value ? 1 : 0
    )

    if (options.includeTypename && sd.kind != gq.Kind.INTERFACE_TYPE_DEFINITION) {
      fieldList.push({
        kind: gq.Kind.FIELD_DEFINITION,
        name: { kind: gq.Kind.NAME, value: '__typename' },
        type: { kind: gq.Kind.NAMED_TYPE, name: { value: 'String', kind: gq.Kind.NAME } },
        description: { kind: gq.Kind.STRING, value: '' },
        directives: [],
      } as any)
    }

    // Override duplicate fields
    return fieldList.filter((f, ix) => fieldList[ix + 1]?.name.value !== f.name.value)
  }

  const atomicTypes = new Map(
    scalars.map
      .filter(([_, mapping]) => mapping !== 'unknown' && mapping !== 'any')
      .concat(enumTypes.map(et => [et, et]))
      .concat([
        ['Int', 'number'],
        ['Float', 'number'],
        ['ID', 'string'],
        ['String', 'string'],
        ['Boolean', 'boolean'],
      ]) as [string, string][]
  )

  const scalarMap = new Map(scalars.map)

  const inheritanceMap = new Map(
    schemaDefinitions.flatMap(def => {
      if (def.kind === gq.Kind.OBJECT_TYPE_DEFINITION) {
        return [[def.name.value, def.interfaces?.map(ifc => ifc.name.value)]]
      }
      return []
    })
  )

  // reverse map to answer "who implements this"
  const reverseInheritanceMap = new Map<string, string[]>()
  for (const [key, values] of inheritanceMap) {
    if (!values) continue
    for (const value of values) {
      reverseInheritanceMap.set(value, (reverseInheritanceMap.get(value) ?? []).concat(key))
    }
  }

  function gqlTypeHasSelector(typeName: string) {
    return !atomicTypes.get(typeName) && !scalarMap.get(typeName)
  }

  function toTSType(scalar: string) {
    return atomicTypes.get(scalar) ?? scalar
  }

  function printAtomicTypes() {
    return `type $Atomic = ${Array.from(new Set(atomicTypes.values())).join(' | ')}
`
  }

  function printEnumList() {
    return `let $Enums = new Set<string>(${JSON.stringify(enumTypes)})
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
        return `Readonly<Array<${printType(def.type)}>>${!notNull ? ' | null | undefined' : ''}`
      case gq.Kind.NAMED_TYPE:
        return `${toTSType(def.name.value)}${!notNull ? ' | null | undefined' : ''}`
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
    const canBeOmitted = def.type.kind !== gq.Kind.NON_NULL_TYPE || def.defaultValue !== undefined
    return `${def.name.value}${canBeOmitted ? '?' : ''}: ${printType(def.type)}`
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

  ${getExtendedFields(def)
    .map(f => printField(f, `"${className}"`))
    .join('\n')}
}`
  }

  function generateFunctionFieldDefinition(
    field: gq.FieldDefinitionNode,
    includeArgs: boolean
  ): string {
    const methodArgs: string[] = []
    const fieldTypeName = printTypeBase(field.type)
    let hasArgs = false,
      hasSelector = false
    if (field.arguments?.length && includeArgs) {
      hasArgs = true
      methodArgs.push(`args: Args`)
    }
    if (gqlTypeHasSelector(fieldTypeName)) {
      hasSelector = true

      methodArgs.push(`selectorFn: (s: ${fieldTypeName}) => [...Sel]`)
    }
    if (methodArgs.length > 0) {
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
        hasArgs ? `, GetVariables<${hasSelector ? 'Sel' : '[]'}, Args>` : ', GetVariables<Sel>'
      }>`
    } else {
      throw new Error('Attempting to generate function field definition for non-function field')
    }
  }

  function printField(field: gq.FieldDefinitionNode, typename: string) {
    const fieldTypeName = printTypeBase(field.type)

    let hasArgs = !!field.arguments?.length,
      hasSelector = gqlTypeHasSelector(fieldTypeName)

    if (hasArgs || hasSelector) {
      let extractArgs = ''

      let validDefinitions = generateFunctionFieldDefinition(field, true)

      const hasOnlyMaybeInputs = (field.arguments ?? []).every(
        def => def.type.kind !== gq.Kind.NON_NULL_TYPE
      )
      if (hasOnlyMaybeInputs && hasArgs && hasSelector) {
        validDefinitions +=
          '\n' +
          generateFunctionFieldDefinition(field, false) +
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
      let fieldType = field.name.value === '__typename' ? typename : printType(field.type)
      return `
      ${printDocumentation(field.description)}
      get ${field.name.value}(): $Field<"${field.name.value}", ${fieldType}>  {
       return this.$_select("${field.name.value}") as any
      }`
    }
  }

  function printInterface(def: gq.InterfaceTypeDefinitionNode) {
    const className = def.name.value

    const additionalTypes = reverseInheritanceMap.get(className) ?? []
    const typenameList = additionalTypes.map(t => `"${t}"`).join(' | ')

    const InterfaceObject = `{${additionalTypes.map(t => `${t}: ${t}`)}}`
    return `
${printDocumentation(def.description)}
export class ${def.name.value} extends $Interface<${InterfaceObject}, "${def.name.value}"> {
  constructor() {
    super(${InterfaceObject}, "${def.name.value}")
  }
  ${getExtendedFields(def)
    .map(f => printField(f, typenameList))
    .join('\n')}
}`
  }

  function printInputObjectType(def: gq.InputObjectTypeDefinitionNode) {
    return `
${printDocumentation(def.description)}
export type ${def.name.value} = {
  ${getExtendedFields(def)
    .map(field => printInputField(field))
    .join(',\n')}
}
    `
  }

  function printInputTypeMap(defs: gq.InputObjectTypeDefinitionNode[]) {
    return `
const $InputTypes: {[key: string]: {[key: string]: string}} = {
  ${defs
    .map(
      def => `  ${def.name.value}: {
    ${getExtendedFields(def)
      .map(field => `${field.name.value}: "${printTypeGql(field.type)}"`)
      .join(',\n')}
  }`
    )
    .join(',\n')}
}
`
  }

  function printScalar(def: gq.ScalarTypeDefinitionNode) {
    let typeName = def.name.value
    if (scalarMap.get(typeName) === typeName) return ''

    return `
${printDocumentation(def.description)}
export type ${def.name.value} = ${scalarMap.get(typeName) ?? 'unknown'}
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
    super(${UnionObject}, "${def.name.value}")
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

  // main

  write(scalars.imports.join('\n'))
  write(Preamble)
  write(printAtomicTypes())
  write(printEnumList())

  let rootNode: gq.SchemaDefinitionNode | null = null

  for (let def of schemaDefinitions) {
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
      throw new UserFacingError(
        'Could not find toplevel root node or an output objet type named `Query`'
      )
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
      schemaDefinitions.filter(def => def.kind === gq.Kind.INPUT_OBJECT_TYPE_DEFINITION) as any[]
    )
  )

  return outputScript
}
