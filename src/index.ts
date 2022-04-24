import * as gq from 'graphql'
import * as fs from 'fs'

function translateScalar(scalar: string) {
  switch (scalar) {
    case 'Int':
      return 'number'
    case 'Float':
      return 'number'
    case 'ID':
      return 'string'
    case 'String':
      return 'string'
    case 'Boolean':
      return 'boolean'
    default:
      return scalar
  }
}

function printType(def: gq.TypeNode, notNull: boolean = false): string {
  switch (def.kind) {
    case gq.Kind.NON_NULL_TYPE:
      return `${printType(def.type, true)}`
    case gq.Kind.LIST_TYPE:
      return `Array<${printType(def.type)}>${!notNull ? ' | undefined' : ''}`
    case gq.Kind.NAMED_TYPE:
      return `${translateScalar(def.name.value)}${!notNull ? ' | undefined' : ''}`
  }
}

function printInputValue(def: gq.InputValueDefinitionNode) {
  return `${def.name.value}: ${printType(def.type)}`
}

function printDocumentation(description?: gq.StringValueNode) {
  return description?.value.length ?? 0 > 0
    ? `
/**
 * ${description?.value}
 */`
    : ''
}
function printField(field: gq.FieldDefinitionNode) {
  if (field.arguments?.length) {
    return `${field.name.value}: [{
      ${field.arguments.map(arg => printInputValue(arg)).join('\n')},
    },
    ${printType(field.type)}
  ],`
  } else {
    return `${field.name.value}: ${printType(field.type)},`
  }
}

function printObjectType(def: gq.ObjectTypeDefinitionNode) {
  return `
${printDocumentation(def.description)}
export type ${def.name.value} = {
  ${def.fields?.map(printField).join('\n')}
}`
}

function printInterface(def: gq.InterfaceTypeDefinitionNode) {
  return `
${printDocumentation(def.description)}
export type ${def.name.value} = {
  ${def.fields?.map(printField).join('\n')}
}`
}

function printInputObjectType(def: gq.InputObjectTypeDefinitionNode) {
  return `
${printDocumentation(def.description)}
export type ${def.name.value} = {
  ${def.fields?.map(field => printInputValue(field)).join(',\n')}
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
  return `
${printDocumentation(def.description)}
export type ${def.name.value} =
  ${def.types?.map(t => printType(t)).join(' |\n')}
`
}

function printEnumValue(def: gq.EnumValueDefinitionNode) {
  return `${printDocumentation(def.description)}
  ${def.name.value} = "${def.name.value}"
`
}
function printEnum(def: gq.EnumTypeDefinitionNode) {
  return `
  ${printDocumentation(def.description)}
export enum ${def.name.value} {
  ${def.values?.map(printEnumValue).join(',\n')}
}
  `
}

// function printSchema(def: gq.SchemaDefinitionNode) {
//   def.operationTypes.map(op => op.operation.
// }

function main() {
  const schemaData = fs.readFileSync('./examples/zeus.graphql', 'utf8')
  let res = gq.parse(schemaData)

  // console.log(res)

  for (let def of res.definitions) {
    // console.log('---->', def.kind)
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
      // console.log(printSchema(def))
    }
  }
}

main()
