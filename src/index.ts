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
export type ${def.name.value} = {[Union]:{
  ${def.types?.map(t => `${printType(t, true)}:${printType(t, true)}`).join('\n')}
}}`
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
  export type $ROOT = {
    ${def.operationTypes.map(op => `${op.operation}: ${printType(op.type, true)}`).join('\n')}
  }`
}

function main() {
  const schemaData = fs.readFileSync('./examples/zeus.graphql', 'utf8')
  let res = gq.parse(schemaData)

  // console.log(res)

  const variableTypeTree: any = {}

  console.log(`
import { TypedDocumentNode } from "@graphql-typed-document-node/core"
import gql from "graphql-tag"

type ToUnionQuery<Members> = ToQuery<Pick<Members[keyof Members], keyof Members[keyof Members]>> & {
  [Name in keyof Members as \`...on \${string & Name}\`]: ToQuery<
    Omit<Members[Name], keyof Members[keyof Members]>
  >
}

export type ToQuery<Type> = Type extends string | number | undefined
  ? true
  : Type extends [infer Input, infer Output]
  ? [Input, ToQuery<Output>]
  : Type extends Array<infer Inner>
  ? ToQuery<Inner>
  : Type extends Array<infer Inner> | undefined
  ? ToQuery<Inner>
  : Type extends { [Union]: infer Members }
  ? ToUnionQuery<Members>
  : { [Field in keyof Type]?: ToQuery<Type[Field]> }

type ToUnionModel<Members> = ToModel<Pick<Members[keyof Members], keyof Members[keyof Members]>> & {
  [Name in keyof Members as \`...on \${string & Name}\`]: ToModel<
    Omit<Members[Name], keyof Members[keyof Members]>
  >
}

export type ToModel<Type> = Type extends string | number | undefined
  ? Type
  : Type extends [infer Input, infer Output]
  ? ToModel<Output>
  : Type extends Array<infer Inner>
  ? Array<ToModel<Inner>>
  : Type extends Array<infer Inner> | undefined
  ? Array<ToModel<Inner>> | undefined
  : Type extends { [Union]: infer Members }
  ? ToUnionModel<Members>
  : { [Field in keyof Type]?: ToModel<Type[Field]> }

type SelectUnionKeys<K> = K extends \`...on \${any}\` ? K : never

type FromUnionQuery<T> = T[SelectUnionKeys<keyof T>] & {
  [K in keyof T]: K extends \`...on \${any}\` ? never : T[K]
}

type QueryToValueMapper<Query, ValueDescriptor> = {
  [Key in keyof Query]: Key extends keyof ValueDescriptor
    ? Query[Key] extends true
      ? ValueDescriptor[Key]
      : ValueDescriptor[Key] extends Array<infer Inner>
      ? Array<
          Query[Key] extends [any, infer Outputs]
            ? QueryToValueMapper<Outputs, Inner>
            : QueryToValueMapper<Query[Key], Inner>
        >
      : ValueDescriptor[Key] extends Array<infer Inner> | undefined
      ?
          | Array<
              Query[Key] extends [any, infer Outputs]
                ? QueryToValueMapper<Outputs, Inner>
                : QueryToValueMapper<Query[Key], Inner>
            >
          | undefined
      : Query[Key] extends [any, infer Outputs]
      ? QueryToValueMapper<Outputs, ValueDescriptor[Key]>
      : QueryToValueMapper<Query[Key], ValueDescriptor[Key]>
    : never
}

const Union = '1fcbcbff-3e78-462f-b45c-668a3e09bfd7'
const Variable = '$1fcbcbff-3e78-462f-b45c-668a3e09bfd8'

type Variable<T, Name extends string> = {
  ' __zeus_name': Name
  ' __zeus_type': T
}

type QueryInputWithVariables<T> = T extends string | number | Array<any>
  ? Variable<T, any> | T
  : Variable<T, any> | { [K in keyof T]: QueryInputWithVariables<T[K]> } | T

type QueryWithVariables<T> = T extends [infer Input, infer Output]
  ? [QueryInputWithVariables<Input>, QueryWithVariables<Output>]
  : { [K in keyof T]: QueryWithVariables<T[K]> }

type ExtractVariables<Query> = Query extends Variable<infer VType, infer VName>
  ? { [key in VName]: VType }
  : Query extends [infer Inputs, infer Outputs]
  ? ExtractVariables<Inputs> & ExtractVariables<Outputs>
  : Query extends string | number | boolean
  ? {}
  : UnionToIntersection<{ [K in keyof Query]: ExtractVariables<Query[K]> }[keyof Query]>

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never

export const $ = <Type, Name extends string>(name: Name) => {
  return \`\${Variable}$\${name}\` as any as Variable<Type, Name>
}

function stringifyQuery(qType: string, query: any) {
  const vars = []

  function stringifyInput(input: any) {
    if (typeof input === 'string') {
      if (input.startsWith(Variable)) {
        const varName = input.substring(Variable.length)
        vars.push(varName)
        return varName
      } else {
        return JSON.stringify(input)
      }
    } else if (typeof input === 'number' || typeof input === 'boolean') {
      return JSON.stringify(input)
    } else if (Array.isArray(input)) {
      return \`[\${input.map(stringifyInput).join(',')}]\`
    } else {
      return \`{\${Object.entries(input).map(([k, v]) => \`\${k}:\${stringifyInput(v)}\`)}}\`
    }
  }
  function stringifyOutput(output: any) {
    if (output === true) return ''
    else
      return \`{\${Object.entries(output)
        .map(([k, v]) => stringifyField(k, v))
        .join(' ')}}\`
  }
  function stringifyField(key: string, field: any) {
    if (Array.isArray(field)) {
      return \`\${key}(\${stringifyInput(field[0])}) \${stringifyOutput(field[1])}\`
    } else {
      return \`\${key}\${stringifyOutput(field)}\`
    }
  }
  return \`\${qType}(\${vars.join(',')}){\${stringifyOutput(query)}}\`
}

export function query<Z extends QueryWithVariables<ToQuery<$ROOT['query']>>>(
  query: Z
): TypedDocumentNode<ToModel<Z>, ExtractVariables<Z>> {
  return gql(stringifyQuery('query', query))
}

export function mutation<Z extends QueryWithVariables<ToQuery<$ROOT['mutation']>>>(
  mutation: Z
): TypedDocumentNode<ToModel<Z>, ExtractVariables<Z>> {
  return gql(stringifyQuery('mutation', mutation))
}

export function subscription<Z extends QueryWithVariables<ToQuery<$ROOT['subscription']>>>(
  subscription: Z
): TypedDocumentNode<ToModel<Z>, ExtractVariables<Z>> {
  return gql(stringifyQuery('subscription', subscription))
}



  `)
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
        console.log(printSchema(def))
    }
  }
}

main()
