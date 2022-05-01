import * as gq from 'graphql'
import * as fs from 'fs'
import { Preamble } from './preamble'
import gql from 'graphql-tag'

function main() {
  const schemaData = fs.readFileSync('./examples/zeus.graphql', 'utf8')
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

  function isAtomic(typeName: string) {
    return !!atomicTypes.get(typeName)
  }

  function toTSType(scalar: string) {
    return atomicTypes.get(scalar) ?? scalar
  }

  function printAtomicTypes() {
    return `type $Atomic = ${Array.from(new Set(atomicTypes.values())).join(' | ')}`
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

  function printInputField(def: gq.InputValueDefinitionNode, quoteType = false) {
    const q = quoteType ? '"' : ''
    return `${def.name.value}: ${q}${printType(def.type)}${q}`
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

  function printField(field: gq.FieldDefinitionNode, parentName: string) {
    const methodArgs: string[] = []

    // const fieldType = printType(field.type)
    const fieldTypeName = printTypeBase(field.type)

    let hasArgs = false,
      hasSelector = false
    if (field.arguments?.length) {
      hasArgs = true
      methodArgs.push(`args: Args`)
    }
    if (!isAtomic(fieldTypeName)) {
      hasSelector = true

      methodArgs.push(`selectorFn: (s: ${fieldTypeName}) => [...Sel]`)
    }
    if (methodArgs.length > 0) {
      const argsType = `{
        ${(field.arguments ?? []).map(arg => printInputField(arg)).join('\n')},
      }`
      const generics = (hasArgs ? [`Args extends VariabledInput<${argsType}>`] : []).concat(
        hasSelector ? [`Sel extends Selection<${fieldTypeName}>`] : []
      )
      return `
      ${printDocumentation(field.description)}
      ${field.name.value}<${generics.join(',')}>(${methodArgs.join(', ')}):$Field<"${
        field.name.value
      }", ${printTypeWrapped('GetOutput<Sel>', field.type)} ${
        hasArgs ? `, GetVariables<${hasSelector ? 'Sel' : '{}'}, Args>` : ''
      }> {
      const options = {
        ${
          hasArgs
            ? `argTypes: {
              ${field.arguments?.map(arg => printInputField(arg, true)).join('\n')}
            },`
            : ''
        }
        ${hasArgs ? `args,` : ''}

        ${hasSelector ? `selection: selectorFn(new ${fieldTypeName})` : ''}
      };
      return this.$_select("${field.name.value}" as const, options)
    }
  `
    } else {
      return `
      ${printDocumentation(field.description)}
      get ${field.name.value}(): $Field<"${field.name.value}", ${printType(field.type)}>  {
       return this.$_select("${field.name.value}" as const)
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
const $InputTypes = {
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
    const UnionObject = `{${def.types?.map(t => `${printTypeBase(t)}: ${printTypeBase(t)}`)}}`
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

  console.log(Preamble)
  console.log(printAtomicTypes())

  for (let def of res.definitions) {
    switch (def.kind) {
      case gq.Kind.OBJECT_TYPE_DEFINITION:
        // the interfaces this object implements are def.interfaces
        console.log(printObjectType(def))
        break
      case gq.Kind.INPUT_OBJECT_TYPE_DEFINITION:
        console.log(printInputObjectType(def))
        break
      case gq.Kind.SCALAR_TYPE_DEFINITION:
        console.log(printScalar(def))
        break
      case gq.Kind.UNION_TYPE_DEFINITION:
        console.log(printUnion(def))
        break
      case gq.Kind.ENUM_TYPE_DEFINITION:
        console.log(printEnum(def))
        break
      case gq.Kind.INTERFACE_TYPE_DEFINITION:
        console.log(printInterface(def))
        break
      case gq.Kind.SCHEMA_DEFINITION:
        console.log(printSchema(def))
    }
  }

  console.log(
    printInputTypeMap(
      res.definitions.filter(def => def.kind === gq.Kind.INPUT_OBJECT_TYPE_DEFINITION) as any[]
    )
  )
}

main()
