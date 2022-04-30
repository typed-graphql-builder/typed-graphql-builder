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
  public kind: 'field' = 'field'
  public type!: Type

  public vars!: Vars

  constructor(public name: Name, private alias: Alias, public options: SelectOptions) {}

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
  public kind: 'union' = 'union'
  private vars!: Vars
  constructor(public alternativeName: string, public alternativeSelection: Selection<T>) {}
}

type Selection<_any> = ReadonlyArray<$Field<any, any, any, any> | $UnionSelection<any, any>>

type NeverNever<T> = [T] extends [never] ? {} : T

type JoinFields<X extends Selection<any>> = UnionToIntersection<
  {
    [I in keyof X]: X[I] extends $Field<any, infer Type, any, any, infer Alias>
      ? { [K in Alias]: Type }
      : never
  }[keyof X & number]
> &
  NeverNever<
    {
      [I in keyof X]: X[I] extends $UnionSelection<infer Type, any> ? Type : never
    }[keyof X & number]
  >
type ExtractInputVariables<Inputs> = Inputs extends Variable<infer VType, infer VName>
  ? { [key in VName]: VType }
  : Inputs extends string | number | boolean
  ? {}
  : UnionToIntersection<{ [K in keyof Inputs]: ExtractInputVariables<Inputs[K]> }[keyof Inputs]>

type ExtractVariables<Sel extends Selection<any>, ExtraVars = {}> = UnionToIntersection<
  {
    [I in keyof Sel]: Sel[I] extends $Field<any, any, any, infer Vars, any>
      ? Vars
      : Sel[I] extends $UnionSelection<any, infer Vars>
      ? Vars
      : never
  }[keyof Sel & number]
> &
  ExtractInputVariables<ExtraVars>

function fieldToQuery(prefix: string, field: $Field<any, any, any, any, any>) {
  const variables = new Map<string, string>()

  function extractTextAndVars(field: $Field<any, any, any, any, any> | $UnionSelection<any, any>) {
    if (field.kind === 'field') {
      let retVal = field.name
      const args = field.options.args,
        argTypes = field.options.argTypes
      if (args) {
        retVal += '('
        for (let [argName, argVal] of Object.entries(args)) {
          if (Variable in argVal) {
            const argVarName = argVal[Variable]
            const argVarType = argTypes[argName]
            variables.set(argVarName, argVarType)
            retVal += argName + ': $' + argVarName
          } else {
            retVal += argName + ': ' + JSON.stringify(argVal)
          }
        }
        retVal += ')'
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
      let retVal = '... on ' + field.alternativeName + ':{'
      for (let subField of field.alternativeSelection) {
        retVal += extractTextAndVars(subField)
      }
      retVal += '}'

      return retVal + ' '
    }
  }

  const queryRaw = extractTextAndVars(field)

  const queryBody = queryRaw.substring(queryRaw.indexOf('{'))

  const varList = Array.from(variables.entries())
  let ret = 'query'
  if (varList.length) {
    ret += '(' + varList.map(([name, kind]) => '$' + name + ':' + kind).join(',') + ')'
  }
  ret += queryBody

  return ret
}

export function query<Sel extends Selection<$RootTypes.query>>(
  selectFn: (q: $RootTypes.query) => [...Sel]
) {
  let field = new $Field<'query', JoinFields<Sel>, '$Root', ExtractVariables<Sel>>(
    'query',
    'query',
    {
      selection: selectFn(new $Root.query()),
    }
  )
  return gql(fieldToQuery('query', field)) as any as TypedDocumentNode<
    JoinFields<Sel>,
    ExtractVariables<Sel>
  >
}

export function mutation<Sel extends Selection<$RootTypes.mutation>>(
  selectFn: (q: $RootTypes.mutation) => [...Sel]
) {
  let field = new $Field<'mutation', JoinFields<Sel>, '$Root', ExtractVariables<Sel>>(
    'mutation',
    'mutation',
    {
      selection: selectFn(new $Root.mutation()),
    }
  )
  return gql(fieldToQuery('mutation', field)) as any as TypedDocumentNode<
    JoinFields<Sel>,
    ExtractVariables<Sel>
  >
}

export function subscription<Sel extends Selection<$RootTypes.subscription>>(
  selectFn: (q: $RootTypes.mutation) => [...Sel]
) {
  let field = new $Field<'subscription', JoinFields<Sel>, '$Root', ExtractVariables<Sel>>(
    'subscription',
    'subscription',
    {
      selection: selectFn(new $Root.mutation()),
    }
  )
  return gql(fieldToQuery('subscription', field)) as any as TypedDocumentNode<
    JoinFields<Sel>,
    ExtractVariables<Sel>
  >
}

`
