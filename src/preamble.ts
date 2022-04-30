export const Preamble = `
import { TypedDocumentNode } from '@graphql-typed-document-node/core'
import gql from 'graphql-tag'

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
  return (Variable + '$' + 'name') as any as Variable<Type, Name>
}

type SelectOptions = {
  argTypes?: { [key: string]: string }
  args?: { [key: string]: any }
  selection?: Selection<any>
}

class $Field<Name extends string, Type, Parent extends string, Alias extends string = Name> {
  private kind: 'field' = 'field'
  private type!: Type

  constructor(private name: Name, private alias: Alias, public options: SelectOptions) {}

  as<Rename extends string>(alias: Rename): $Field<Name, Type, Parent, Rename> {
    return new $Field(this.name, alias, this.options)
  }
}

class $Base<Name extends string> {
  constructor(name: string) {}
  protected $_select<Key extends string>(
    name: Key,
    options: SelectOptions = {}
  ): $Field<Key, any, Name, Key> {
    return new $Field(name, name, options)
  }
}

class $Union<T, Name extends String> {
  private type!: T
  private name!: Name

  constructor(private selectorClasses: { [K in keyof T]: { new (): T[K] } }) {}
  $on<Type extends keyof T, Sel extends Selection<T[Type]>>(
    alternative: Type,
    selectorFn: (selector: T[Type]) => Sel
  ): $UnionSelection<JoinFields<Sel>> {
    const selection = selectorFn(new this.selectorClasses[alternative]())

    return new $UnionSelection(alternative as string, selection)
  }
}

class $UnionSelection<T> {
  public kind = 'union'
  constructor(public alternativeName: string, public alternativeSelection: Selection<T>) {}
}

type Selection<_any> = ReadonlyArray<$Field<any, any, any> | $UnionSelection<any>>

type JoinFields<X extends Selection<any>> = UnionToIntersection<
  {
    [I in keyof X]: X[I] extends $Field<any, infer Type, any, infer Alias>
      ? { [K in Alias]: Type }
      : never
  }[keyof X & number]
> &
  { [I in keyof X]: X[I] extends $UnionSelection<infer Type> ? Type : never }[keyof X]

`
