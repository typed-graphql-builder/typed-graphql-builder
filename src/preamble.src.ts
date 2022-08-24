type $Atomic = string
let $InputTypes: { [key: string]: any } = {}

/* BEGIN PREAMBLE */
import { TypedDocumentNode } from '@graphql-typed-document-node/core'
import gql from 'graphql-tag'

/* tslint:disable */
/* eslint-disable */

function fnvhash(data: string) {
  let hash = 0x811c9dc5
  for (let k = 0; k < data.length; ++k) {
    hash = hash ^ data.charCodeAt(k)
    hash += (hash << 24) + (hash << 8) + (hash << 7) + (hash << 4) + (hash << 1)
  }
  return ((hash & 0xffffffff) >>> 0).toString(36)
}

const FragmentName = ' $1fcbcbff-3e78-462f-b45c-668a3e09bfd1'
const FragmentData = ' $1fcbcbff-3e78-462f-b45c-668a3e09bfd2'
const FragmentType = ' $1fcbcbff-3e78-462f-b45c-668a3e09bfd3'

const TypeName = ' $1fcbcbff-3e78-462f-b45c-668a3e09bfd4'

const VariableName = ' $1fcbcbff-3e78-462f-b45c-668a3e09bfd8'
const VariableType = ' $1fcbcbff-3e78-462f-b45c-668a3e09bfd9'

class Variable<T, Name extends string> {
  private [VariableName]: Name
  private [VariableType]?: T

  constructor(name: Name) {
    this[VariableName] = name
  }
}

type VariabledInput<T> = T extends $Atomic | undefined
  ? Variable<NonNullable<T>, any> | T
  : T extends ReadonlyArray<infer R> | undefined
  ? Variable<NonNullable<T>, any> | ReadonlyArray<VariabledInput<NonNullable<R>>> | T
  : T extends Array<infer R> | undefined
  ? Variable<NonNullable<T>, any> | Array<VariabledInput<NonNullable<R>>> | T
  : Variable<NonNullable<T>, any> | { [K in keyof T]: VariabledInput<T[K]> } | T

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never

export const $ = <Type, Name extends string>(name: Name) => {
  return new Variable(name) as Variable<Type, Name>
}

type SelectOptions = {
  argTypes?: { [key: string]: string }
  args?: { [key: string]: any }
  selection?: Selection<any>
}

class $Field<Name extends string, Type, Vars = {}> {
  public kind: 'field' = 'field'
  public type!: Type

  public vars!: Vars
  public alias: string | null = null

  constructor(public name: Name, public options: SelectOptions) {}

  as<Rename extends string>(alias: Rename): $Field<Rename, Type, Vars> {
    const f = new $Field(this.name, this.options)
    f.alias = alias
    return f as any
  }
}

class $Base<Name extends string> {
  public [TypeName]: string

  constructor(name: Name) {
    this[TypeName] = name
  }

  protected $_select<Key extends string>(
    name: Key,
    options: SelectOptions = {}
  ): $Field<Key, any, any> {
    return new $Field(name, options)
  }
}

class $Union<T, Name extends String> {
  private type!: T
  private name!: Name

  constructor(private selectorClasses: { [K in keyof T]: { new (): T[K] } }) {}
  $on<Type extends keyof T, Sel extends Selection<T[Type]>>(
    alternative: Type,
    selectorFn: (selector: T[Type]) => [...Sel]
  ): $UnionSelection<GetOutput<Sel>, GetVariables<Sel>> {
    const selection = selectorFn(new this.selectorClasses[alternative]())

    return new $UnionSelection(alternative as string, selection)
  }
}

class $UnionSelection<T, Vars> {
  public kind: 'union' = 'union'
  private vars!: Vars
  constructor(public alternativeName: string, public alternativeSelection: Selection<T>) {}
}

type Selection<_any> = ReadonlyArray<$Field<any, any, any> | $UnionSelection<any, any>>

type NeverNever<T> = [T] extends [never] ? {} : T

export type GetOutput<X extends Selection<any>> = UnionToIntersection<
  {
    [I in keyof X]: X[I] extends $Field<infer Name, infer Type, any> ? { [K in Name]: Type } : never
  }[keyof X & number]
> &
  NeverNever<
    {
      [I in keyof X]: X[I] extends $UnionSelection<infer Type, any> ? Type : never
    }[keyof X & number]
  >

type ExtractInputVariables<Inputs> = Inputs extends Variable<infer VType, infer VName>
  ? { [key in VName]: VType }
  : Inputs extends $Atomic
  ? {}
  : Inputs extends any[] | readonly any[]
  ? UnionToIntersection<
      { [K in keyof Inputs]: ExtractInputVariables<Inputs[K]> }[keyof Inputs & number]
    >
  : UnionToIntersection<{ [K in keyof Inputs]: ExtractInputVariables<Inputs[K]> }[keyof Inputs]>

export type GetVariables<Sel extends Selection<any>, ExtraVars = {}> = UnionToIntersection<
  {
    [I in keyof Sel]: Sel[I] extends $Field<any, any, infer Vars>
      ? Vars
      : Sel[I] extends $UnionSelection<any, infer Vars>
      ? Vars
      : never
  }[keyof Sel & number]
> &
  ExtractInputVariables<ExtraVars>

function fieldToQuery(prefix: string, field: $Field<any, any, any>) {
  const variables = new Map<string, string>()
  const fragments = new Map<string, string>()

  function stringifyArgs(
    args: any,
    argTypes: { [key: string]: string },
    argVarType?: string
  ): string {
    switch (typeof args) {
      case 'string':
      case 'number':
      case 'boolean':
        return JSON.stringify(args)
      default:
        if (VariableName in (args as any)) {
          if (!argVarType) throw new Error('Cannot use variabe as sole unnamed field argument')
          const argVarName = (args as any)[VariableName]
          variables.set(argVarName, argVarType)
          return '$' + argVarName
        }
        if (Array.isArray(args))
          return '[' + args.map(arg => stringifyArgs(arg, argTypes, argVarType)).join(',') + ']'
        if (args == null) return 'null'
        const wrapped = (content: string) => (argVarType ? '{' + content + '}' : content)
        return wrapped(
          Array.from(Object.entries(args))
            .map(([key, val]) => {
              if (!argTypes[key]) {
                throw new Error(`Argument type for ${key} not found`)
              }
              const cleanType = argTypes[key].replace('[', '').replace(']', '').replace('!', '')
              return key + ':' + stringifyArgs(val, $InputTypes[cleanType], argTypes[key])
            })
            .join(',')
        )
    }
  }

  function extractTextAndVars(field: $Field<any, any, any> | $UnionSelection<any, any>): string {
    if (field.kind === 'field') {
      let retVal = field.name
      if (field.alias) retVal = field.alias + ':' + retVal
      const args = field.options.args,
        argTypes = field.options.argTypes
      if (args && Object.keys(args).length > 0) {
        retVal += ' (' + stringifyArgs(args, argTypes!) + ')'
      }
      let sel = field.options.selection
      if (sel) {
        retVal += ' {' + sel.map(extractTextAndVars).join(' ') + '} '
      }
      return retVal
    } else if (field.kind === 'union') {
      return `... on ${field.alternativeName} { ${field.alternativeSelection
        .map(extractTextAndVars)
        .join(' ')} } `
    } else if (field[FragmentType]) {
      let fragmentBody = (field[FragmentData] as any[]).map(extractTextAndVars).join(' ')

      let fragmentName = field[FragmentName] + '_' + fnvhash(fragmentBody)
      fragments.set(
        fragmentName,
        `fragment ${fragmentName} on ${field[FragmentType]} { ${fragmentBody} } `
      )
      return '...' + fragmentName + ' '
    } else {
      throw new Error('Unknown field kind')
    }
  }

  const queryRaw = extractTextAndVars(field)!

  const queryBody = queryRaw.substring(queryRaw.indexOf('{'))

  const varList = Array.from(variables.entries())
  let ret = prefix
  if (varList.length) {
    ret += '(' + varList.map(([name, kind]) => '$' + name + ':' + kind).join(',') + ')'
  }
  ret += queryBody

  let fullQuery = Array.from(fragments.values()).join(' ') + ' ' + ret
  console.log(fullQuery)
  return fullQuery
}

export function fragment<T extends $Base<any>, Sel extends Selection<T>>(
  GQLType: { new (): T },
  selectFn: (selector: T) => [...Sel]
) {
  let t = new GQLType()

  return {
    // TODO: unique name based on content hash
    [FragmentName]: t[TypeName],
    [FragmentData]: selectFn(t),
    [FragmentType]: t[TypeName],
    [Symbol.iterator]: function* () {
      yield this
    },
  } as unknown as Sel
}
