type $Atomic = string
let $InputTypes: { [key: string]: any } = {}
let $Enums = new Set()

/* BEGIN PREAMBLE */
import { TypedDocumentNode } from '@graphql-typed-document-node/core'
import gql from 'graphql-tag'

/* tslint:disable */
/* eslint-disable */

const VariableName = ' $1fcbcbff-3e78-462f-b45c-668a3e09bfd8'
const VariableType = ' $1fcbcbff-3e78-462f-b45c-668a3e09bfd9'
const VariableNullable = ' $1fcbcbff-3e78-462f-b45c-668a3e09bff1'

class Variable<T, Name extends string, Nullable extends boolean> {
  private [VariableName]: Name
  private [VariableNullable]: Nullable
  private [VariableType]?: T

  constructor(name: Name, nullable: Nullable) {
    this[VariableName] = name
    this[VariableNullable] = nullable
  }
}

// the array wrapper prevents distributive conditional types
// https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
type VariabledInput<T> = [T] extends [$Atomic | undefined]
  ? Variable<T, any, true> | Variable<T, any, false> | T
  : T extends ReadonlyArray<infer R> | undefined
  ? Variable<T, any, true> | Variable<T, any, false> | ReadonlyArray<VariabledInput<R>> | T
  : T extends Array<infer R> | undefined
  ? Variable<T, any, true> | Variable<T, any, false> | Array<VariabledInput<R>> | T
  : Variable<T, any, true> | Variable<T, any, false> | { [K in keyof T]: VariabledInput<T[K]> } | T

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never

/**
 * Creates a new query variable
 *
 * @param name The variable name
 */
export const $ = <Type, Name extends string, Nullable extends boolean = false>(
  name: Name,
  nullable?: Type extends null ? Nullable : Nullable extends true ? never : Nullable
): Nullable extends true
  ? Variable<NonNullable<Type>, Name, true>
  : Variable<NonNullable<Type>, Name, false> => {
  return new Variable(name, nullable === true) as any
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
  constructor(private $$name: Name) {}

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

type PossiblyOptionalVar<
  VName extends string,
  VType,
  VNullable extends boolean
> = undefined extends VType
  ? { [key in VName]?: VType }
  : { [key in VName]: VNullable extends true ? VType | null : VType }

type ExtractInputVariables<Inputs> = Inputs extends Variable<
  infer VType,
  infer VName,
  infer VNullable
>
  ? PossiblyOptionalVar<VName, VType, VNullable>
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
  const variables = new Map<string, { type: string; nullable: boolean }>()

  function stringifyArgs(
    args: Variable<unknown, any, any>,
    argTypes: { [key: string]: string },
    argVarType?: string
  ): string {
    switch (typeof args) {
      case 'string':
        const cleanType = argVarType!.replace('[', '').replace(']', '').replace('!', '')
        if ($Enums.has(cleanType!)) return args
        else return JSON.stringify(args)
      case 'number':
      case 'boolean':
        return JSON.stringify(args)
      default:
        if (VariableName in (args as any)) {
          if (!argVarType) throw new Error('Cannot use variabe as sole unnamed field argument')
          const argVarName = args[VariableName]
          variables.set(argVarName, { type: argVarType, nullable: args[VariableNullable] })
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

  function extractTextAndVars(field: $Field<any, any, any> | $UnionSelection<any, any>) {
    if (field.kind === 'field') {
      let retVal = field.name
      if (field.alias) retVal = field.alias + ':' + retVal
      const args = field.options.args,
        argTypes = field.options.argTypes
      if (args && Object.keys(args).length > 0) {
        retVal += '(' + stringifyArgs(args as any, argTypes!) + ')'
      }
      let sel = field.options.selection
      if (sel) {
        retVal += '{'
        for (let subField of sel) {
          retVal += extractTextAndVars(subField)
        }
        retVal += '}'
      }
      return retVal + ' '
    } else if (field.kind === 'union') {
      let retVal = '... on ' + field.alternativeName + ' {'
      for (let subField of field.alternativeSelection) {
        retVal += extractTextAndVars(subField)
      }
      retVal += '}'

      return retVal + ' '
    }
  }

  const queryRaw = extractTextAndVars(field)!

  const queryBody = queryRaw.substring(queryRaw.indexOf('{'))

  const varList = Array.from(variables.entries())
  let ret = prefix
  if (varList.length) {
    ret +=
      '(' +
      varList
        .map(([name, spec]) => {
          let base = `\$${name}: ${spec.type}`
          if (spec.nullable === false && !base.endsWith('!')) base += '!'
          return base
        })
        .join(',') +
      ')'
  }
  ret += queryBody

  return ret
}

export function fragment<T, Sel extends Selection<T>>(
  GQLType: { new (): T },
  selectFn: (selector: T) => [...Sel]
) {
  return selectFn(new GQLType())
}
