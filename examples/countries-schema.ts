

import { TypedDocumentNode } from '@graphql-typed-document-node/core'
import { gql } from 'graphql-tag'

/* tslint:disable */
/* eslint-disable */

const VariableName = ' $1fcbcbff-3e78-462f-b45c-668a3e09bfd8'

class Variable<T, Name extends string> {
  private [VariableName]: Name
  private _type?: T

  constructor(name: Name, private readonly isRequired?: boolean) {
    this[VariableName] = name
  }
}

type ArrayInput<I> = [I] extends [$Atomic | null | undefined]
  ? never
  : ReadonlyArray<VariabledInput<I>>

// the array wrapper prevents distributive conditional types
// https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
type VariabledInput<T> = [T] extends [$Atomic | null | undefined]
  ? Variable<T, any> | T
  : T extends ReadonlyArray<infer I>
  ? Variable<T, any> | T | ArrayInput<I>
  : T extends Record<string, any>
  ? Variable<T, any> | { [K in keyof T]: VariabledInput<T[K]> } | T
  : never

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never

/**
 * Creates a new query variable
 *
 * @param name The variable name
 */
export const $ = <Type, Name extends string>(name: Name): Variable<Type, Name> => {
  return new Variable(name)
}

/**
 * Creates a new query variable. A value will be required even if the input is optional
 *
 * @param name The variable name
 */
export const $$ = <Type, Name extends string>(name: Name): Variable<NonNullable<Type>, Name> => {
  return new Variable(name, true)
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

class $Interface<T, Name extends string> extends $Base<Name> {
  private type!: T
  private name!: Name

  constructor(private selectorClasses: { [K in keyof T]: { new (): T[K] } }, $$name: Name) {
    super($$name)
  }
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

type PossiblyOptionalVar<VName extends string, VType> = undefined extends VType
  ? { [key in VName]?: VType }
  : { [key in VName]: VType }

type ExtractInputVariables<Inputs> = Inputs extends Variable<infer VType, infer VName>
  ? PossiblyOptionalVar<VName, VType>
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

type ArgVarType = {
  type: string
  isRequired: boolean
  array: {
    isRequired: boolean
  } | null
}

const arrRegex = /\[(.*?)\]/

/**
 * Converts graphql string type to `ArgVarType`
 * @param input
 * @returns
 */
function getArgVarType(input: string): ArgVarType {
  const array = input.includes('[')
    ? {
        isRequired: input.endsWith('!'),
      }
    : null

  const type = array ? arrRegex.exec(input)![1] : input
  const isRequired = type.endsWith('!')

  return {
    array,
    isRequired: isRequired,
    type: type.replace('!', ''),
  }
}

function fieldToQuery(prefix: string, field: $Field<any, any, any>) {
  const variables = new Map<string, { variable: Variable<any, any>; type: ArgVarType }>()

  function stringifyArgs(
    args: any,
    argTypes: { [key: string]: string },
    argVarType?: ArgVarType
  ): string {
    switch (typeof args) {
      case 'string':
        const cleanType = argVarType!.type
        if ($Enums.has(cleanType!)) return args
        else return JSON.stringify(args)
      case 'number':
      case 'boolean':
        return JSON.stringify(args)
      default:
        if (VariableName in (args as any)) {
          if (!argVarType) throw new Error('Cannot use variabe as sole unnamed field argument')
          const variable = args as Variable<any, any>
          const argVarName = variable[VariableName]
          variables.set(argVarName, { type: argVarType, variable: variable })
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
              return (
                key + ':' + stringifyArgs(val, $InputTypes[cleanType], getArgVarType(argTypes[key]))
              )
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
        retVal += '(' + stringifyArgs(args, argTypes!) + ')'
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
    } else {
      throw new Error('Uknown field kind')
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
        .map(([name, { type: kind, variable }]) => {
          let type = kind.array ? '[' : ''
          type += kind.type
          if (kind.isRequired) type += '!'
          if (kind.array) type += kind.array.isRequired ? ']!' : ']'

          if (!type.endsWith('!') && (variable as any).isRequired === true) {
            type += '!'
          }

          return '$' + name + ':' + type
        })
        .join(',') +
      ')'
  }
  ret += queryBody

  return ret
}

export type OutputTypeOf<T> = T extends $Base<any>
  ? { [K in keyof T]?: OutputTypeOf<T[K]> }
  : [T] extends [$Field<any, infer FieldType, any>]
  ? FieldType
  : [T] extends [(selFn: (arg: infer Inner) => any) => any]
  ? OutputTypeOf<Inner>
  : [T] extends [(args: any, selFn: (arg: infer Inner) => any) => any]
  ? OutputTypeOf<Inner>
  : never

export function fragment<T, Sel extends Selection<T>>(
  GQLType: { new (): T },
  selectFn: (selector: T) => [...Sel]
) {
  return selectFn(new GQLType())
}

type $Atomic = string | number | boolean

let $Enums = new Set<string>([])



export type _Any = string



export class _Entity extends $Union<{Country: Country,Continent: Continent,Language: Language}, "_Entity"> {
  constructor() {
    super({Country: Country,Continent: Continent,Language: Language})
  }
}


export class _Service extends $Base<"_Service"> {
  constructor() {
    super("_Service")
  }

  
      
/**
 * The sdl representing the federated service capabilities. Includes federation
directives, removes federation types, and includes rest of full schema after
schema directives have been applied
 */
      get sdl(): $Field<"sdl", string | null | undefined>  {
       return this.$_select("sdl") as any
      }
}


export class Continent extends $Base<"Continent"> {
  constructor() {
    super("Continent")
  }

  
      
      get code(): $Field<"code", string>  {
       return this.$_select("code") as any
      }

      
      countries<Sel extends Selection<Country>>(selectorFn: (s: Country) => [...Sel]):$Field<"countries", Array<GetOutput<Sel>> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Country)
      };
      return this.$_select("countries", options) as any
    }
  

      
      get name(): $Field<"name", string>  {
       return this.$_select("name") as any
      }
}


export type ContinentFilterInput = {
  code?: StringQueryOperatorInput | null | undefined
}
    


export class Country extends $Base<"Country"> {
  constructor() {
    super("Country")
  }

  
      
      get capital(): $Field<"capital", string | null | undefined>  {
       return this.$_select("capital") as any
      }

      
      get code(): $Field<"code", string>  {
       return this.$_select("code") as any
      }

      
      continent<Sel extends Selection<Continent>>(selectorFn: (s: Continent) => [...Sel]):$Field<"continent", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Continent)
      };
      return this.$_select("continent", options) as any
    }
  

      
      get currency(): $Field<"currency", string | null | undefined>  {
       return this.$_select("currency") as any
      }

      
      get emoji(): $Field<"emoji", string>  {
       return this.$_select("emoji") as any
      }

      
      get emojiU(): $Field<"emojiU", string>  {
       return this.$_select("emojiU") as any
      }

      
      languages<Sel extends Selection<Language>>(selectorFn: (s: Language) => [...Sel]):$Field<"languages", Array<GetOutput<Sel>> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Language)
      };
      return this.$_select("languages", options) as any
    }
  

      
      get name(): $Field<"name", string>  {
       return this.$_select("name") as any
      }

      
      get native(): $Field<"native", string>  {
       return this.$_select("native") as any
      }

      
      get phone(): $Field<"phone", string>  {
       return this.$_select("phone") as any
      }

      
      states<Sel extends Selection<State>>(selectorFn: (s: State) => [...Sel]):$Field<"states", Array<GetOutput<Sel>> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new State)
      };
      return this.$_select("states", options) as any
    }
  
}


export type CountryFilterInput = {
  code?: StringQueryOperatorInput | null | undefined,
continent?: StringQueryOperatorInput | null | undefined,
currency?: StringQueryOperatorInput | null | undefined
}
    


export class Language extends $Base<"Language"> {
  constructor() {
    super("Language")
  }

  
      
      get code(): $Field<"code", string>  {
       return this.$_select("code") as any
      }

      
      get name(): $Field<"name", string | null | undefined>  {
       return this.$_select("name") as any
      }

      
      get native(): $Field<"native", string | null | undefined>  {
       return this.$_select("native") as any
      }

      
      get rtl(): $Field<"rtl", boolean>  {
       return this.$_select("rtl") as any
      }
}


export type LanguageFilterInput = {
  code?: StringQueryOperatorInput | null | undefined
}
    


export class Query extends $Base<"Query"> {
  constructor() {
    super("Query")
  }

  
      
      _entities<Args extends VariabledInput<{
        representations: Readonly<Array<string>>,
      }>,Sel extends Selection<_Entity>>(args: Args, selectorFn: (s: _Entity) => [...Sel]):$Field<"_entities", Array<GetOutput<Sel> | undefined> , GetVariables<Sel, Args>> {
      
      const options = {
        argTypes: {
              representations: "[_Any!]!"
            },
        args,

        selection: selectorFn(new _Entity)
      };
      return this.$_select("_entities", options) as any
    }
  

      
      _service<Sel extends Selection<_Service>>(selectorFn: (s: _Service) => [...Sel]):$Field<"_service", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new _Service)
      };
      return this.$_select("_service", options) as any
    }
  

      
      continent<Args extends VariabledInput<{
        code: string,
      }>,Sel extends Selection<Continent>>(args: Args, selectorFn: (s: Continent) => [...Sel]):$Field<"continent", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      
      const options = {
        argTypes: {
              code: "ID!"
            },
        args,

        selection: selectorFn(new Continent)
      };
      return this.$_select("continent", options) as any
    }
  

      
      continents<Args extends VariabledInput<{
        filter?: ContinentFilterInput | null | undefined,
      }>,Sel extends Selection<Continent>>(args: Args, selectorFn: (s: Continent) => [...Sel]):$Field<"continents", Array<GetOutput<Sel>> , GetVariables<Sel, Args>>
continents<Sel extends Selection<Continent>>(selectorFn: (s: Continent) => [...Sel]):$Field<"continents", Array<GetOutput<Sel>> , GetVariables<Sel>>
continents(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              filter: "ContinentFilterInput"
            },
        args,

        selection: selectorFn(new Continent)
      };
      return this.$_select("continents", options) as any
    }
  

      
      countries<Args extends VariabledInput<{
        filter?: CountryFilterInput | null | undefined,
      }>,Sel extends Selection<Country>>(args: Args, selectorFn: (s: Country) => [...Sel]):$Field<"countries", Array<GetOutput<Sel>> , GetVariables<Sel, Args>>
countries<Sel extends Selection<Country>>(selectorFn: (s: Country) => [...Sel]):$Field<"countries", Array<GetOutput<Sel>> , GetVariables<Sel>>
countries(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              filter: "CountryFilterInput"
            },
        args,

        selection: selectorFn(new Country)
      };
      return this.$_select("countries", options) as any
    }
  

      
      country<Args extends VariabledInput<{
        code: string,
      }>,Sel extends Selection<Country>>(args: Args, selectorFn: (s: Country) => [...Sel]):$Field<"country", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      
      const options = {
        argTypes: {
              code: "ID!"
            },
        args,

        selection: selectorFn(new Country)
      };
      return this.$_select("country", options) as any
    }
  

      
      language<Args extends VariabledInput<{
        code: string,
      }>,Sel extends Selection<Language>>(args: Args, selectorFn: (s: Language) => [...Sel]):$Field<"language", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      
      const options = {
        argTypes: {
              code: "ID!"
            },
        args,

        selection: selectorFn(new Language)
      };
      return this.$_select("language", options) as any
    }
  

      
      languages<Args extends VariabledInput<{
        filter?: LanguageFilterInput | null | undefined,
      }>,Sel extends Selection<Language>>(args: Args, selectorFn: (s: Language) => [...Sel]):$Field<"languages", Array<GetOutput<Sel>> , GetVariables<Sel, Args>>
languages<Sel extends Selection<Language>>(selectorFn: (s: Language) => [...Sel]):$Field<"languages", Array<GetOutput<Sel>> , GetVariables<Sel>>
languages(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              filter: "LanguageFilterInput"
            },
        args,

        selection: selectorFn(new Language)
      };
      return this.$_select("languages", options) as any
    }
  
}


export class State extends $Base<"State"> {
  constructor() {
    super("State")
  }

  
      
      get code(): $Field<"code", string | null | undefined>  {
       return this.$_select("code") as any
      }

      
      country<Sel extends Selection<Country>>(selectorFn: (s: Country) => [...Sel]):$Field<"country", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Country)
      };
      return this.$_select("country", options) as any
    }
  

      
      get name(): $Field<"name", string>  {
       return this.$_select("name") as any
      }
}


export type StringQueryOperatorInput = {
  eq?: string | null | undefined,
glob?: string | null | undefined,
in?: Readonly<Array<string | null | undefined>> | null | undefined,
ne?: string | null | undefined,
nin?: Readonly<Array<string | null | undefined>> | null | undefined,
regex?: string | null | undefined
}
    

  const $Root = {
    query: Query
  }

  namespace $RootTypes {
    export type query = Query
  }
  

export function query<Sel extends Selection<$RootTypes.query>>(
  selectFn: (q: $RootTypes.query) => [...Sel]
) {
  let field = new $Field<'query', GetOutput<Sel>, GetVariables<Sel>>('query', {
    selection: selectFn(new $Root.query()),
  })
  const str = fieldToQuery('query', field)

  return gql(str) as any as TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
}


const $InputTypes: {[key: string]: {[key: string]: string}} = {
    ContinentFilterInput: {
    code: "StringQueryOperatorInput"
  },
  CountryFilterInput: {
    code: "StringQueryOperatorInput",
continent: "StringQueryOperatorInput",
currency: "StringQueryOperatorInput"
  },
  LanguageFilterInput: {
    code: "StringQueryOperatorInput"
  },
  StringQueryOperatorInput: {
    eq: "String",
glob: "String",
in: "[String]",
ne: "String",
nin: "[String]",
regex: "String"
  }
}

