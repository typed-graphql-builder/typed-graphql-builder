export const Preamble = `
import { TypedDocumentNode } from '@graphql-typed-document-node/core'
import gql from 'graphql-tag'

const Variable = '$1fcbcbff-3e78-462f-b45c-668a3e09bfd8'
const VariableType = '$1fcbcbff-3e78-462f-b45c-668a3e09bfd9'

type Variable<T, Name extends string> = {
  [Variable]: [Name]
  [VariableType]?: T
}

type VariabledInput<T> = T extends string | number | Array<any>
  ? Variable<T, any> | T
  : Variable<T, any> | { [K in keyof T]: VariabledInput<T[K]> } | T

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never

export const $ = <Type, Name extends string>(name: Name) => {
  return { [Variable]: 'name' } as any as Variable<Type, Name>
}

type SelectOptions = {
  argTypes?: { [key: string]: string }
  args?: { [key: string]: any }
  selection?: Selection<any>
}

class $Field<
  Name extends string,
  Type,
  Parent extends string,
  Vars = {},
  Alias extends string = Name
> {
  private kind: 'field' = 'field'
  private type!: Type

  private vars!: Vars

  constructor(private name: Name, private alias: Alias, public options: SelectOptions) {}

  as<Rename extends string>(alias: Rename): $Field<Name, Type, Parent, Vars, Rename> {
    return new $Field(this.name, alias, this.options)
  }
}

class $Base<Name extends string> {
  constructor(name: string) {}
  protected $_select<Key extends string>(
    name: Key,
    options: SelectOptions = {}
  ): $Field<Key, any, Name, any> {
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
  ): $UnionSelection<JoinFields<Sel>, ExtractVariables<Sel>> {
    const selection = selectorFn(new this.selectorClasses[alternative]())

    return new $UnionSelection(alternative as string, selection)
  }
}

class $UnionSelection<T, Vars> {
  public kind = 'union'
  private vars!: Vars
  constructor(public alternativeName: string, public alternativeSelection: Selection<T>) {}
}

type Selection<_any> = ReadonlyArray<$Field<any, any, any, any> | $UnionSelection<any, any>>

type JoinFields<X extends Selection<any>> = UnionToIntersection<
  {
    [I in keyof X & number]: X[I] extends $Field<any, infer Type, any, any, infer Alias>
      ? { [K in Alias]: Type }
      : never
  }[keyof X & number]
> &
  (
    | {}
    | {
        [I in keyof X & number]: X[I] extends $UnionSelection<infer Type, any> ? Type : never
      }[keyof X & number]
  )

type ExtractInputVariables<Inputs> = Inputs extends Variable<infer VType, infer VName>
  ? { [key in VName]: VType }
  : Inputs extends string | number | boolean
  ? {}
  : UnionToIntersection<{ [K in keyof Inputs]: ExtractInputVariables<Inputs[K]> }[keyof Inputs]>

type ExtractVariables<Sel extends Selection<any>, ExtraVars = {}> = UnionToIntersection<
  {
    [I in keyof Sel & number]: Sel[I] extends $Field<any, any, any, infer Vars, any>
      ? Vars
      : Sel[I] extends $UnionSelection<any, infer Vars>
      ? Vars
      : never
  }[keyof Sel & number]
> &
  ExtractInputVariables<ExtraVars>

export function query<Sel extends Selection<$RootTypes.query>>(
  selectFn: (q: $RootTypes.query) => Sel
) {
  let field = new $Field<'query', JoinFields<Sel>, '$Root', ExtractVariables<Sel>>(
    'query',
    'query',
    {
      selection: selectFn(new $Root.query()),
    }
  )
  return '' as any as TypedDocumentNode<JoinFields<Sel>, ExtractVariables<Sel>>
}

`
