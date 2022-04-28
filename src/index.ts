import * as gq from 'graphql'
import * as fs from 'fs'

function isScalar(scalar: string) {
  switch (scalar) {
    case 'number':
    case 'string':
    case 'boolean':
      return true

    default:
      return false
  }
}

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
      return `${translateScalar(wrappedType)}${!notNull ? ' | undefined' : ''}`
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

function printTypeBase(def: gq.TypeNode): string {
  switch (def.kind) {
    case gq.Kind.NON_NULL_TYPE:
      return `${printTypeBase(def.type)}`
    case gq.Kind.LIST_TYPE:
      return `${printTypeBase(def.type)}`
    case gq.Kind.NAMED_TYPE:
      return `${translateScalar(def.name.value)}`
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
export class ${className} extends $_Base<${className}> {
  constructor() {
    super("${className}")
  }

  ${def.fields?.map(printField).join('\n')}
}`
}

function printField(field: gq.FieldDefinitionNode) {
  const methodArgs: string[] = []

  // const fieldType = printType(field.type)
  const fieldTypeName = printTypeBase(field.type)

  let hasArgs = false,
    hasSelector = false
  if (field.arguments?.length) {
    hasArgs = true
    methodArgs.push(`args: {
      ${field.arguments.map(arg => printInputField(arg)).join('\n')},
    }`)
  }
  if (!isScalar(fieldTypeName)) {
    hasSelector = true

    methodArgs.push(`selectorFn: (s: ${fieldTypeName}) => [...Sel]`)
  }
  if (methodArgs.length > 0) {
    return `${field.name.value}<Sel extends Selection<${fieldTypeName}>>(${methodArgs.join(
      ', '
    )}):Field<"${field.name.value}", ${printTypeWrapped('JoinFields<Sel>', field.type)}> {
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
    return `get ${field.name.value}(): Field<"${field.name.value}", ${printType(field.type)}>  {
       return this.$_select("${field.name.value}" as const)
    }`
  }
}

function printInterface(def: gq.InterfaceTypeDefinitionNode) {
  const className = def.name.value

  return `
${printDocumentation(def.description)}
export class ${className} extends $_Base<${className}> {
  constructor() {
    super("${className}")
  }
  ${def.fields?.map(printField).join('\n')}
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

const Union = '1fcbcbff-3e78-462f-b45c-668a3e09bfd7'
const Variable = '$1fcbcbff-3e78-462f-b45c-668a3e09bfd8'

type Variable<T, Name extends string> = {
  ' __var_name': Name
  ' __var_type': T
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



type Field<Name extends string, Type> = {
  name: Name
  ' _type'?: Type
}

type JoinFields<X extends Field<any, any>[]> = UnionToIntersection<
  {
    [I in keyof X]: X[I] extends Field<infer Name, infer Type> ? { [K in Name]: Type } : never
  }[keyof X & number]
>

type FieldOrReturn<T> = T extends (...args: any) => infer Ret ? Ret : T
type Selection<Obj> = Array<
  { [K in keyof Obj & string]: FieldOrReturn<Obj[K]> }[keyof Obj & string]
>

class $_Base<T> {
  constructor(name: string) {}
  protected $_select(...args: any): any {}
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
