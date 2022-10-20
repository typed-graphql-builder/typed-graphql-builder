

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
        if (args == null) return 'null'
        if (VariableName in (args as any)) {
          if (!argVarType) throw new Error('Cannot use variabe as sole unnamed field argument')
          const variable = args as Variable<any, any>
          const argVarName = variable[VariableName]
          variables.set(argVarName, { type: argVarType, variable: variable })
          return '$' + argVarName
        }
        if (Array.isArray(args))
          return '[' + args.map(arg => stringifyArgs(arg, argTypes, argVarType)).join(',') + ']'
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

type $Atomic = number | string | boolean

let $Enums = new Set<string>([])



/**
 * A single film.
 */
export class Film extends $Base<"Film"> {
  constructor() {
    super("Film")
  }

  
      
      characterConnection<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<FilmCharactersConnection>>(args: Args, selectorFn: (s: FilmCharactersConnection) => [...Sel]):$Field<"characterConnection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
characterConnection<Sel extends Selection<FilmCharactersConnection>>(selectorFn: (s: FilmCharactersConnection) => [...Sel]):$Field<"characterConnection", GetOutput<Sel> | undefined , GetVariables<Sel>>
characterConnection(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new FilmCharactersConnection)
      };
      return this.$_select("characterConnection", options) as any
    }
  

      
/**
 * The ISO 8601 date format of the time that this resource was created.
 */
      get created(): $Field<"created", string | null | undefined>  {
       return this.$_select("created") as any
      }

      
/**
 * The name of the director of this film.
 */
      get director(): $Field<"director", string | null | undefined>  {
       return this.$_select("director") as any
      }

      
/**
 * The ISO 8601 date format of the time that this resource was edited.
 */
      get edited(): $Field<"edited", string | null | undefined>  {
       return this.$_select("edited") as any
      }

      
/**
 * The episode number of this film.
 */
      get episodeID(): $Field<"episodeID", number | null | undefined>  {
       return this.$_select("episodeID") as any
      }

      
/**
 * The ID of an object
 */
      get id(): $Field<"id", string>  {
       return this.$_select("id") as any
      }

      
/**
 * The opening paragraphs at the beginning of this film.
 */
      get openingCrawl(): $Field<"openingCrawl", string | null | undefined>  {
       return this.$_select("openingCrawl") as any
      }

      
      planetConnection<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<FilmPlanetsConnection>>(args: Args, selectorFn: (s: FilmPlanetsConnection) => [...Sel]):$Field<"planetConnection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
planetConnection<Sel extends Selection<FilmPlanetsConnection>>(selectorFn: (s: FilmPlanetsConnection) => [...Sel]):$Field<"planetConnection", GetOutput<Sel> | undefined , GetVariables<Sel>>
planetConnection(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new FilmPlanetsConnection)
      };
      return this.$_select("planetConnection", options) as any
    }
  

      
/**
 * The name(s) of the producer(s) of this film.
 */
      get producers(): $Field<"producers", Readonly<Array<string | null | undefined>> | null | undefined>  {
       return this.$_select("producers") as any
      }

      
/**
 * The ISO 8601 date format of film release at original creator country.
 */
      get releaseDate(): $Field<"releaseDate", string | null | undefined>  {
       return this.$_select("releaseDate") as any
      }

      
      speciesConnection<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<FilmSpeciesConnection>>(args: Args, selectorFn: (s: FilmSpeciesConnection) => [...Sel]):$Field<"speciesConnection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
speciesConnection<Sel extends Selection<FilmSpeciesConnection>>(selectorFn: (s: FilmSpeciesConnection) => [...Sel]):$Field<"speciesConnection", GetOutput<Sel> | undefined , GetVariables<Sel>>
speciesConnection(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new FilmSpeciesConnection)
      };
      return this.$_select("speciesConnection", options) as any
    }
  

      
      starshipConnection<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<FilmStarshipsConnection>>(args: Args, selectorFn: (s: FilmStarshipsConnection) => [...Sel]):$Field<"starshipConnection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
starshipConnection<Sel extends Selection<FilmStarshipsConnection>>(selectorFn: (s: FilmStarshipsConnection) => [...Sel]):$Field<"starshipConnection", GetOutput<Sel> | undefined , GetVariables<Sel>>
starshipConnection(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new FilmStarshipsConnection)
      };
      return this.$_select("starshipConnection", options) as any
    }
  

      
/**
 * The title of this film.
 */
      get title(): $Field<"title", string | null | undefined>  {
       return this.$_select("title") as any
      }

      
      vehicleConnection<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<FilmVehiclesConnection>>(args: Args, selectorFn: (s: FilmVehiclesConnection) => [...Sel]):$Field<"vehicleConnection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
vehicleConnection<Sel extends Selection<FilmVehiclesConnection>>(selectorFn: (s: FilmVehiclesConnection) => [...Sel]):$Field<"vehicleConnection", GetOutput<Sel> | undefined , GetVariables<Sel>>
vehicleConnection(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new FilmVehiclesConnection)
      };
      return this.$_select("vehicleConnection", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class FilmCharactersConnection extends $Base<"FilmCharactersConnection"> {
  constructor() {
    super("FilmCharactersConnection")
  }

  
      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      characters<Sel extends Selection<Person>>(selectorFn: (s: Person) => [...Sel]):$Field<"characters", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Person)
      };
      return this.$_select("characters", options) as any
    }
  

      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<FilmCharactersEdge>>(selectorFn: (s: FilmCharactersEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new FilmCharactersEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class FilmCharactersEdge extends $Base<"FilmCharactersEdge"> {
  constructor() {
    super("FilmCharactersEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Person>>(selectorFn: (s: Person) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Person)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class FilmPlanetsConnection extends $Base<"FilmPlanetsConnection"> {
  constructor() {
    super("FilmPlanetsConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<FilmPlanetsEdge>>(selectorFn: (s: FilmPlanetsEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new FilmPlanetsEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      planets<Sel extends Selection<Planet>>(selectorFn: (s: Planet) => [...Sel]):$Field<"planets", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Planet)
      };
      return this.$_select("planets", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class FilmPlanetsEdge extends $Base<"FilmPlanetsEdge"> {
  constructor() {
    super("FilmPlanetsEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Planet>>(selectorFn: (s: Planet) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Planet)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class FilmsConnection extends $Base<"FilmsConnection"> {
  constructor() {
    super("FilmsConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<FilmsEdge>>(selectorFn: (s: FilmsEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new FilmsEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      films<Sel extends Selection<Film>>(selectorFn: (s: Film) => [...Sel]):$Field<"films", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Film)
      };
      return this.$_select("films", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class FilmsEdge extends $Base<"FilmsEdge"> {
  constructor() {
    super("FilmsEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Film>>(selectorFn: (s: Film) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Film)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class FilmSpeciesConnection extends $Base<"FilmSpeciesConnection"> {
  constructor() {
    super("FilmSpeciesConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<FilmSpeciesEdge>>(selectorFn: (s: FilmSpeciesEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new FilmSpeciesEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      species<Sel extends Selection<Species>>(selectorFn: (s: Species) => [...Sel]):$Field<"species", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Species)
      };
      return this.$_select("species", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class FilmSpeciesEdge extends $Base<"FilmSpeciesEdge"> {
  constructor() {
    super("FilmSpeciesEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Species>>(selectorFn: (s: Species) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Species)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class FilmStarshipsConnection extends $Base<"FilmStarshipsConnection"> {
  constructor() {
    super("FilmStarshipsConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<FilmStarshipsEdge>>(selectorFn: (s: FilmStarshipsEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new FilmStarshipsEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      starships<Sel extends Selection<Starship>>(selectorFn: (s: Starship) => [...Sel]):$Field<"starships", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Starship)
      };
      return this.$_select("starships", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class FilmStarshipsEdge extends $Base<"FilmStarshipsEdge"> {
  constructor() {
    super("FilmStarshipsEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Starship>>(selectorFn: (s: Starship) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Starship)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class FilmVehiclesConnection extends $Base<"FilmVehiclesConnection"> {
  constructor() {
    super("FilmVehiclesConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<FilmVehiclesEdge>>(selectorFn: (s: FilmVehiclesEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new FilmVehiclesEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      vehicles<Sel extends Selection<Vehicle>>(selectorFn: (s: Vehicle) => [...Sel]):$Field<"vehicles", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Vehicle)
      };
      return this.$_select("vehicles", options) as any
    }
  
}


/**
 * An edge in a connection.
 */
export class FilmVehiclesEdge extends $Base<"FilmVehiclesEdge"> {
  constructor() {
    super("FilmVehiclesEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Vehicle>>(selectorFn: (s: Vehicle) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Vehicle)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * An object with an ID
 */
export class Node extends $Interface<{Film: Film,Person: Person,Planet: Planet,Species: Species,Starship: Starship,Vehicle: Vehicle}, "Node"> {
  constructor() {
    super({Film: Film,Person: Person,Planet: Planet,Species: Species,Starship: Starship,Vehicle: Vehicle}, "Node")
  }
}


/**
 * Information about pagination in a connection.
 */
export class PageInfo extends $Base<"PageInfo"> {
  constructor() {
    super("PageInfo")
  }

  
      
/**
 * When paginating forwards, the cursor to continue.
 */
      get endCursor(): $Field<"endCursor", string | null | undefined>  {
       return this.$_select("endCursor") as any
      }

      
/**
 * When paginating forwards, are there more items?
 */
      get hasNextPage(): $Field<"hasNextPage", boolean>  {
       return this.$_select("hasNextPage") as any
      }

      
/**
 * When paginating backwards, are there more items?
 */
      get hasPreviousPage(): $Field<"hasPreviousPage", boolean>  {
       return this.$_select("hasPreviousPage") as any
      }

      
/**
 * When paginating backwards, the cursor to continue.
 */
      get startCursor(): $Field<"startCursor", string | null | undefined>  {
       return this.$_select("startCursor") as any
      }
}


/**
 * A connection to a list of items.
 */
export class PeopleConnection extends $Base<"PeopleConnection"> {
  constructor() {
    super("PeopleConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<PeopleEdge>>(selectorFn: (s: PeopleEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PeopleEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      people<Sel extends Selection<Person>>(selectorFn: (s: Person) => [...Sel]):$Field<"people", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Person)
      };
      return this.$_select("people", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class PeopleEdge extends $Base<"PeopleEdge"> {
  constructor() {
    super("PeopleEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Person>>(selectorFn: (s: Person) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Person)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * An individual person or character within the Star Wars universe.
 */
export class Person extends $Base<"Person"> {
  constructor() {
    super("Person")
  }

  
      
/**
 * The birth year of the person, using the in-universe standard of BBY or ABY -
Before the Battle of Yavin or After the Battle of Yavin. The Battle of Yavin is
a battle that occurs at the end of Star Wars episode IV: A New Hope.
 */
      get birthYear(): $Field<"birthYear", string | null | undefined>  {
       return this.$_select("birthYear") as any
      }

      
/**
 * The ISO 8601 date format of the time that this resource was created.
 */
      get created(): $Field<"created", string | null | undefined>  {
       return this.$_select("created") as any
      }

      
/**
 * The ISO 8601 date format of the time that this resource was edited.
 */
      get edited(): $Field<"edited", string | null | undefined>  {
       return this.$_select("edited") as any
      }

      
/**
 * The eye color of this person. Will be "unknown" if not known or "n/a" if the
person does not have an eye.
 */
      get eyeColor(): $Field<"eyeColor", string | null | undefined>  {
       return this.$_select("eyeColor") as any
      }

      
      filmConnection<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<PersonFilmsConnection>>(args: Args, selectorFn: (s: PersonFilmsConnection) => [...Sel]):$Field<"filmConnection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
filmConnection<Sel extends Selection<PersonFilmsConnection>>(selectorFn: (s: PersonFilmsConnection) => [...Sel]):$Field<"filmConnection", GetOutput<Sel> | undefined , GetVariables<Sel>>
filmConnection(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new PersonFilmsConnection)
      };
      return this.$_select("filmConnection", options) as any
    }
  

      
/**
 * The gender of this person. Either "Male", "Female" or "unknown",
"n/a" if the person does not have a gender.
 */
      get gender(): $Field<"gender", string | null | undefined>  {
       return this.$_select("gender") as any
      }

      
/**
 * The hair color of this person. Will be "unknown" if not known or "n/a" if the
person does not have hair.
 */
      get hairColor(): $Field<"hairColor", string | null | undefined>  {
       return this.$_select("hairColor") as any
      }

      
/**
 * The height of the person in centimeters.
 */
      get height(): $Field<"height", number | null | undefined>  {
       return this.$_select("height") as any
      }

      
/**
 * A planet that this person was born on or inhabits.
 */
      homeworld<Sel extends Selection<Planet>>(selectorFn: (s: Planet) => [...Sel]):$Field<"homeworld", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Planet)
      };
      return this.$_select("homeworld", options) as any
    }
  

      
/**
 * The ID of an object
 */
      get id(): $Field<"id", string>  {
       return this.$_select("id") as any
      }

      
/**
 * The mass of the person in kilograms.
 */
      get mass(): $Field<"mass", number | null | undefined>  {
       return this.$_select("mass") as any
      }

      
/**
 * The name of this person.
 */
      get name(): $Field<"name", string | null | undefined>  {
       return this.$_select("name") as any
      }

      
/**
 * The skin color of this person.
 */
      get skinColor(): $Field<"skinColor", string | null | undefined>  {
       return this.$_select("skinColor") as any
      }

      
/**
 * The species that this person belongs to, or null if unknown.
 */
      species<Sel extends Selection<Species>>(selectorFn: (s: Species) => [...Sel]):$Field<"species", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Species)
      };
      return this.$_select("species", options) as any
    }
  

      
      starshipConnection<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<PersonStarshipsConnection>>(args: Args, selectorFn: (s: PersonStarshipsConnection) => [...Sel]):$Field<"starshipConnection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
starshipConnection<Sel extends Selection<PersonStarshipsConnection>>(selectorFn: (s: PersonStarshipsConnection) => [...Sel]):$Field<"starshipConnection", GetOutput<Sel> | undefined , GetVariables<Sel>>
starshipConnection(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new PersonStarshipsConnection)
      };
      return this.$_select("starshipConnection", options) as any
    }
  

      
      vehicleConnection<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<PersonVehiclesConnection>>(args: Args, selectorFn: (s: PersonVehiclesConnection) => [...Sel]):$Field<"vehicleConnection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
vehicleConnection<Sel extends Selection<PersonVehiclesConnection>>(selectorFn: (s: PersonVehiclesConnection) => [...Sel]):$Field<"vehicleConnection", GetOutput<Sel> | undefined , GetVariables<Sel>>
vehicleConnection(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new PersonVehiclesConnection)
      };
      return this.$_select("vehicleConnection", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class PersonFilmsConnection extends $Base<"PersonFilmsConnection"> {
  constructor() {
    super("PersonFilmsConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<PersonFilmsEdge>>(selectorFn: (s: PersonFilmsEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PersonFilmsEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      films<Sel extends Selection<Film>>(selectorFn: (s: Film) => [...Sel]):$Field<"films", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Film)
      };
      return this.$_select("films", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class PersonFilmsEdge extends $Base<"PersonFilmsEdge"> {
  constructor() {
    super("PersonFilmsEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Film>>(selectorFn: (s: Film) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Film)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class PersonStarshipsConnection extends $Base<"PersonStarshipsConnection"> {
  constructor() {
    super("PersonStarshipsConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<PersonStarshipsEdge>>(selectorFn: (s: PersonStarshipsEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PersonStarshipsEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      starships<Sel extends Selection<Starship>>(selectorFn: (s: Starship) => [...Sel]):$Field<"starships", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Starship)
      };
      return this.$_select("starships", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class PersonStarshipsEdge extends $Base<"PersonStarshipsEdge"> {
  constructor() {
    super("PersonStarshipsEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Starship>>(selectorFn: (s: Starship) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Starship)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class PersonVehiclesConnection extends $Base<"PersonVehiclesConnection"> {
  constructor() {
    super("PersonVehiclesConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<PersonVehiclesEdge>>(selectorFn: (s: PersonVehiclesEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PersonVehiclesEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      vehicles<Sel extends Selection<Vehicle>>(selectorFn: (s: Vehicle) => [...Sel]):$Field<"vehicles", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Vehicle)
      };
      return this.$_select("vehicles", options) as any
    }
  
}


/**
 * An edge in a connection.
 */
export class PersonVehiclesEdge extends $Base<"PersonVehiclesEdge"> {
  constructor() {
    super("PersonVehiclesEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Vehicle>>(selectorFn: (s: Vehicle) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Vehicle)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A large mass, planet or planetoid in the Star Wars Universe, at the time of
0 ABY.
 */
export class Planet extends $Base<"Planet"> {
  constructor() {
    super("Planet")
  }

  
      
/**
 * The climates of this planet.
 */
      get climates(): $Field<"climates", Readonly<Array<string | null | undefined>> | null | undefined>  {
       return this.$_select("climates") as any
      }

      
/**
 * The ISO 8601 date format of the time that this resource was created.
 */
      get created(): $Field<"created", string | null | undefined>  {
       return this.$_select("created") as any
      }

      
/**
 * The diameter of this planet in kilometers.
 */
      get diameter(): $Field<"diameter", number | null | undefined>  {
       return this.$_select("diameter") as any
      }

      
/**
 * The ISO 8601 date format of the time that this resource was edited.
 */
      get edited(): $Field<"edited", string | null | undefined>  {
       return this.$_select("edited") as any
      }

      
      filmConnection<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<PlanetFilmsConnection>>(args: Args, selectorFn: (s: PlanetFilmsConnection) => [...Sel]):$Field<"filmConnection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
filmConnection<Sel extends Selection<PlanetFilmsConnection>>(selectorFn: (s: PlanetFilmsConnection) => [...Sel]):$Field<"filmConnection", GetOutput<Sel> | undefined , GetVariables<Sel>>
filmConnection(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new PlanetFilmsConnection)
      };
      return this.$_select("filmConnection", options) as any
    }
  

      
/**
 * A number denoting the gravity of this planet, where "1" is normal or 1 standard
G. "2" is twice or 2 standard Gs. "0.5" is half or 0.5 standard Gs.
 */
      get gravity(): $Field<"gravity", string | null | undefined>  {
       return this.$_select("gravity") as any
      }

      
/**
 * The ID of an object
 */
      get id(): $Field<"id", string>  {
       return this.$_select("id") as any
      }

      
/**
 * The name of this planet.
 */
      get name(): $Field<"name", string | null | undefined>  {
       return this.$_select("name") as any
      }

      
/**
 * The number of standard days it takes for this planet to complete a single orbit
of its local star.
 */
      get orbitalPeriod(): $Field<"orbitalPeriod", number | null | undefined>  {
       return this.$_select("orbitalPeriod") as any
      }

      
/**
 * The average population of sentient beings inhabiting this planet.
 */
      get population(): $Field<"population", number | null | undefined>  {
       return this.$_select("population") as any
      }

      
      residentConnection<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<PlanetResidentsConnection>>(args: Args, selectorFn: (s: PlanetResidentsConnection) => [...Sel]):$Field<"residentConnection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
residentConnection<Sel extends Selection<PlanetResidentsConnection>>(selectorFn: (s: PlanetResidentsConnection) => [...Sel]):$Field<"residentConnection", GetOutput<Sel> | undefined , GetVariables<Sel>>
residentConnection(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new PlanetResidentsConnection)
      };
      return this.$_select("residentConnection", options) as any
    }
  

      
/**
 * The number of standard hours it takes for this planet to complete a single
rotation on its axis.
 */
      get rotationPeriod(): $Field<"rotationPeriod", number | null | undefined>  {
       return this.$_select("rotationPeriod") as any
      }

      
/**
 * The percentage of the planet surface that is naturally occurring water or bodies
of water.
 */
      get surfaceWater(): $Field<"surfaceWater", number | null | undefined>  {
       return this.$_select("surfaceWater") as any
      }

      
/**
 * The terrains of this planet.
 */
      get terrains(): $Field<"terrains", Readonly<Array<string | null | undefined>> | null | undefined>  {
       return this.$_select("terrains") as any
      }
}


/**
 * A connection to a list of items.
 */
export class PlanetFilmsConnection extends $Base<"PlanetFilmsConnection"> {
  constructor() {
    super("PlanetFilmsConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<PlanetFilmsEdge>>(selectorFn: (s: PlanetFilmsEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PlanetFilmsEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      films<Sel extends Selection<Film>>(selectorFn: (s: Film) => [...Sel]):$Field<"films", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Film)
      };
      return this.$_select("films", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class PlanetFilmsEdge extends $Base<"PlanetFilmsEdge"> {
  constructor() {
    super("PlanetFilmsEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Film>>(selectorFn: (s: Film) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Film)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class PlanetResidentsConnection extends $Base<"PlanetResidentsConnection"> {
  constructor() {
    super("PlanetResidentsConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<PlanetResidentsEdge>>(selectorFn: (s: PlanetResidentsEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PlanetResidentsEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      residents<Sel extends Selection<Person>>(selectorFn: (s: Person) => [...Sel]):$Field<"residents", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Person)
      };
      return this.$_select("residents", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class PlanetResidentsEdge extends $Base<"PlanetResidentsEdge"> {
  constructor() {
    super("PlanetResidentsEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Person>>(selectorFn: (s: Person) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Person)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class PlanetsConnection extends $Base<"PlanetsConnection"> {
  constructor() {
    super("PlanetsConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<PlanetsEdge>>(selectorFn: (s: PlanetsEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PlanetsEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      planets<Sel extends Selection<Planet>>(selectorFn: (s: Planet) => [...Sel]):$Field<"planets", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Planet)
      };
      return this.$_select("planets", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class PlanetsEdge extends $Base<"PlanetsEdge"> {
  constructor() {
    super("PlanetsEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Planet>>(selectorFn: (s: Planet) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Planet)
      };
      return this.$_select("node", options) as any
    }
  
}


export class Root extends $Base<"Root"> {
  constructor() {
    super("Root")
  }

  
      
      allFilms<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<FilmsConnection>>(args: Args, selectorFn: (s: FilmsConnection) => [...Sel]):$Field<"allFilms", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
allFilms<Sel extends Selection<FilmsConnection>>(selectorFn: (s: FilmsConnection) => [...Sel]):$Field<"allFilms", GetOutput<Sel> | undefined , GetVariables<Sel>>
allFilms(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new FilmsConnection)
      };
      return this.$_select("allFilms", options) as any
    }
  

      
      allPeople<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<PeopleConnection>>(args: Args, selectorFn: (s: PeopleConnection) => [...Sel]):$Field<"allPeople", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
allPeople<Sel extends Selection<PeopleConnection>>(selectorFn: (s: PeopleConnection) => [...Sel]):$Field<"allPeople", GetOutput<Sel> | undefined , GetVariables<Sel>>
allPeople(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new PeopleConnection)
      };
      return this.$_select("allPeople", options) as any
    }
  

      
      allPlanets<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<PlanetsConnection>>(args: Args, selectorFn: (s: PlanetsConnection) => [...Sel]):$Field<"allPlanets", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
allPlanets<Sel extends Selection<PlanetsConnection>>(selectorFn: (s: PlanetsConnection) => [...Sel]):$Field<"allPlanets", GetOutput<Sel> | undefined , GetVariables<Sel>>
allPlanets(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new PlanetsConnection)
      };
      return this.$_select("allPlanets", options) as any
    }
  

      
      allSpecies<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<SpeciesConnection>>(args: Args, selectorFn: (s: SpeciesConnection) => [...Sel]):$Field<"allSpecies", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
allSpecies<Sel extends Selection<SpeciesConnection>>(selectorFn: (s: SpeciesConnection) => [...Sel]):$Field<"allSpecies", GetOutput<Sel> | undefined , GetVariables<Sel>>
allSpecies(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new SpeciesConnection)
      };
      return this.$_select("allSpecies", options) as any
    }
  

      
      allStarships<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<StarshipsConnection>>(args: Args, selectorFn: (s: StarshipsConnection) => [...Sel]):$Field<"allStarships", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
allStarships<Sel extends Selection<StarshipsConnection>>(selectorFn: (s: StarshipsConnection) => [...Sel]):$Field<"allStarships", GetOutput<Sel> | undefined , GetVariables<Sel>>
allStarships(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new StarshipsConnection)
      };
      return this.$_select("allStarships", options) as any
    }
  

      
      allVehicles<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<VehiclesConnection>>(args: Args, selectorFn: (s: VehiclesConnection) => [...Sel]):$Field<"allVehicles", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
allVehicles<Sel extends Selection<VehiclesConnection>>(selectorFn: (s: VehiclesConnection) => [...Sel]):$Field<"allVehicles", GetOutput<Sel> | undefined , GetVariables<Sel>>
allVehicles(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new VehiclesConnection)
      };
      return this.$_select("allVehicles", options) as any
    }
  

      
      film<Args extends VariabledInput<{
        id?: string | null | undefined
filmID?: string | null | undefined,
      }>,Sel extends Selection<Film>>(args: Args, selectorFn: (s: Film) => [...Sel]):$Field<"film", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
film<Sel extends Selection<Film>>(selectorFn: (s: Film) => [...Sel]):$Field<"film", GetOutput<Sel> | undefined , GetVariables<Sel>>
film(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              id: "ID",
filmID: "ID"
            },
        args,

        selection: selectorFn(new Film)
      };
      return this.$_select("film", options) as any
    }
  

      
/**
 * Fetches an object given its ID
 */
      node<Args extends VariabledInput<{
        id: string,
      }>,Sel extends Selection<Node>>(args: Args, selectorFn: (s: Node) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      
      const options = {
        argTypes: {
              id: "ID!"
            },
        args,

        selection: selectorFn(new Node)
      };
      return this.$_select("node", options) as any
    }
  

      
      person<Args extends VariabledInput<{
        id?: string | null | undefined
personID?: string | null | undefined,
      }>,Sel extends Selection<Person>>(args: Args, selectorFn: (s: Person) => [...Sel]):$Field<"person", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
person<Sel extends Selection<Person>>(selectorFn: (s: Person) => [...Sel]):$Field<"person", GetOutput<Sel> | undefined , GetVariables<Sel>>
person(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              id: "ID",
personID: "ID"
            },
        args,

        selection: selectorFn(new Person)
      };
      return this.$_select("person", options) as any
    }
  

      
      planet<Args extends VariabledInput<{
        id?: string | null | undefined
planetID?: string | null | undefined,
      }>,Sel extends Selection<Planet>>(args: Args, selectorFn: (s: Planet) => [...Sel]):$Field<"planet", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
planet<Sel extends Selection<Planet>>(selectorFn: (s: Planet) => [...Sel]):$Field<"planet", GetOutput<Sel> | undefined , GetVariables<Sel>>
planet(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              id: "ID",
planetID: "ID"
            },
        args,

        selection: selectorFn(new Planet)
      };
      return this.$_select("planet", options) as any
    }
  

      
      species<Args extends VariabledInput<{
        id?: string | null | undefined
speciesID?: string | null | undefined,
      }>,Sel extends Selection<Species>>(args: Args, selectorFn: (s: Species) => [...Sel]):$Field<"species", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
species<Sel extends Selection<Species>>(selectorFn: (s: Species) => [...Sel]):$Field<"species", GetOutput<Sel> | undefined , GetVariables<Sel>>
species(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              id: "ID",
speciesID: "ID"
            },
        args,

        selection: selectorFn(new Species)
      };
      return this.$_select("species", options) as any
    }
  

      
      starship<Args extends VariabledInput<{
        id?: string | null | undefined
starshipID?: string | null | undefined,
      }>,Sel extends Selection<Starship>>(args: Args, selectorFn: (s: Starship) => [...Sel]):$Field<"starship", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
starship<Sel extends Selection<Starship>>(selectorFn: (s: Starship) => [...Sel]):$Field<"starship", GetOutput<Sel> | undefined , GetVariables<Sel>>
starship(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              id: "ID",
starshipID: "ID"
            },
        args,

        selection: selectorFn(new Starship)
      };
      return this.$_select("starship", options) as any
    }
  

      
      vehicle<Args extends VariabledInput<{
        id?: string | null | undefined
vehicleID?: string | null | undefined,
      }>,Sel extends Selection<Vehicle>>(args: Args, selectorFn: (s: Vehicle) => [...Sel]):$Field<"vehicle", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
vehicle<Sel extends Selection<Vehicle>>(selectorFn: (s: Vehicle) => [...Sel]):$Field<"vehicle", GetOutput<Sel> | undefined , GetVariables<Sel>>
vehicle(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              id: "ID",
vehicleID: "ID"
            },
        args,

        selection: selectorFn(new Vehicle)
      };
      return this.$_select("vehicle", options) as any
    }
  
}


/**
 * A type of person or character within the Star Wars Universe.
 */
export class Species extends $Base<"Species"> {
  constructor() {
    super("Species")
  }

  
      
/**
 * The average height of this species in centimeters.
 */
      get averageHeight(): $Field<"averageHeight", number | null | undefined>  {
       return this.$_select("averageHeight") as any
      }

      
/**
 * The average lifespan of this species in years, null if unknown.
 */
      get averageLifespan(): $Field<"averageLifespan", number | null | undefined>  {
       return this.$_select("averageLifespan") as any
      }

      
/**
 * The classification of this species, such as "mammal" or "reptile".
 */
      get classification(): $Field<"classification", string | null | undefined>  {
       return this.$_select("classification") as any
      }

      
/**
 * The ISO 8601 date format of the time that this resource was created.
 */
      get created(): $Field<"created", string | null | undefined>  {
       return this.$_select("created") as any
      }

      
/**
 * The designation of this species, such as "sentient".
 */
      get designation(): $Field<"designation", string | null | undefined>  {
       return this.$_select("designation") as any
      }

      
/**
 * The ISO 8601 date format of the time that this resource was edited.
 */
      get edited(): $Field<"edited", string | null | undefined>  {
       return this.$_select("edited") as any
      }

      
/**
 * Common eye colors for this species, null if this species does not typically
have eyes.
 */
      get eyeColors(): $Field<"eyeColors", Readonly<Array<string | null | undefined>> | null | undefined>  {
       return this.$_select("eyeColors") as any
      }

      
      filmConnection<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<SpeciesFilmsConnection>>(args: Args, selectorFn: (s: SpeciesFilmsConnection) => [...Sel]):$Field<"filmConnection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
filmConnection<Sel extends Selection<SpeciesFilmsConnection>>(selectorFn: (s: SpeciesFilmsConnection) => [...Sel]):$Field<"filmConnection", GetOutput<Sel> | undefined , GetVariables<Sel>>
filmConnection(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new SpeciesFilmsConnection)
      };
      return this.$_select("filmConnection", options) as any
    }
  

      
/**
 * Common hair colors for this species, null if this species does not typically
have hair.
 */
      get hairColors(): $Field<"hairColors", Readonly<Array<string | null | undefined>> | null | undefined>  {
       return this.$_select("hairColors") as any
      }

      
/**
 * A planet that this species originates from.
 */
      homeworld<Sel extends Selection<Planet>>(selectorFn: (s: Planet) => [...Sel]):$Field<"homeworld", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Planet)
      };
      return this.$_select("homeworld", options) as any
    }
  

      
/**
 * The ID of an object
 */
      get id(): $Field<"id", string>  {
       return this.$_select("id") as any
      }

      
/**
 * The language commonly spoken by this species.
 */
      get language(): $Field<"language", string | null | undefined>  {
       return this.$_select("language") as any
      }

      
/**
 * The name of this species.
 */
      get name(): $Field<"name", string | null | undefined>  {
       return this.$_select("name") as any
      }

      
      personConnection<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<SpeciesPeopleConnection>>(args: Args, selectorFn: (s: SpeciesPeopleConnection) => [...Sel]):$Field<"personConnection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
personConnection<Sel extends Selection<SpeciesPeopleConnection>>(selectorFn: (s: SpeciesPeopleConnection) => [...Sel]):$Field<"personConnection", GetOutput<Sel> | undefined , GetVariables<Sel>>
personConnection(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new SpeciesPeopleConnection)
      };
      return this.$_select("personConnection", options) as any
    }
  

      
/**
 * Common skin colors for this species, null if this species does not typically
have skin.
 */
      get skinColors(): $Field<"skinColors", Readonly<Array<string | null | undefined>> | null | undefined>  {
       return this.$_select("skinColors") as any
      }
}


/**
 * A connection to a list of items.
 */
export class SpeciesConnection extends $Base<"SpeciesConnection"> {
  constructor() {
    super("SpeciesConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<SpeciesEdge>>(selectorFn: (s: SpeciesEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new SpeciesEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      species<Sel extends Selection<Species>>(selectorFn: (s: Species) => [...Sel]):$Field<"species", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Species)
      };
      return this.$_select("species", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class SpeciesEdge extends $Base<"SpeciesEdge"> {
  constructor() {
    super("SpeciesEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Species>>(selectorFn: (s: Species) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Species)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class SpeciesFilmsConnection extends $Base<"SpeciesFilmsConnection"> {
  constructor() {
    super("SpeciesFilmsConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<SpeciesFilmsEdge>>(selectorFn: (s: SpeciesFilmsEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new SpeciesFilmsEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      films<Sel extends Selection<Film>>(selectorFn: (s: Film) => [...Sel]):$Field<"films", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Film)
      };
      return this.$_select("films", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class SpeciesFilmsEdge extends $Base<"SpeciesFilmsEdge"> {
  constructor() {
    super("SpeciesFilmsEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Film>>(selectorFn: (s: Film) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Film)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class SpeciesPeopleConnection extends $Base<"SpeciesPeopleConnection"> {
  constructor() {
    super("SpeciesPeopleConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<SpeciesPeopleEdge>>(selectorFn: (s: SpeciesPeopleEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new SpeciesPeopleEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      people<Sel extends Selection<Person>>(selectorFn: (s: Person) => [...Sel]):$Field<"people", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Person)
      };
      return this.$_select("people", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class SpeciesPeopleEdge extends $Base<"SpeciesPeopleEdge"> {
  constructor() {
    super("SpeciesPeopleEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Person>>(selectorFn: (s: Person) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Person)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A single transport craft that has hyperdrive capability.
 */
export class Starship extends $Base<"Starship"> {
  constructor() {
    super("Starship")
  }

  
      
/**
 * The Maximum number of Megalights this starship can travel in a standard hour.
A "Megalight" is a standard unit of distance and has never been defined before
within the Star Wars universe. This figure is only really useful for measuring
the difference in speed of starships. We can assume it is similar to AU, the
distance between our Sun (Sol) and Earth.
 */
      get MGLT(): $Field<"MGLT", number | null | undefined>  {
       return this.$_select("MGLT") as any
      }

      
/**
 * The maximum number of kilograms that this starship can transport.
 */
      get cargoCapacity(): $Field<"cargoCapacity", number | null | undefined>  {
       return this.$_select("cargoCapacity") as any
      }

      
/**
 * The maximum length of time that this starship can provide consumables for its
entire crew without having to resupply.
 */
      get consumables(): $Field<"consumables", string | null | undefined>  {
       return this.$_select("consumables") as any
      }

      
/**
 * The cost of this starship new, in galactic credits.
 */
      get costInCredits(): $Field<"costInCredits", number | null | undefined>  {
       return this.$_select("costInCredits") as any
      }

      
/**
 * The ISO 8601 date format of the time that this resource was created.
 */
      get created(): $Field<"created", string | null | undefined>  {
       return this.$_select("created") as any
      }

      
/**
 * The number of personnel needed to run or pilot this starship.
 */
      get crew(): $Field<"crew", string | null | undefined>  {
       return this.$_select("crew") as any
      }

      
/**
 * The ISO 8601 date format of the time that this resource was edited.
 */
      get edited(): $Field<"edited", string | null | undefined>  {
       return this.$_select("edited") as any
      }

      
      filmConnection<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<StarshipFilmsConnection>>(args: Args, selectorFn: (s: StarshipFilmsConnection) => [...Sel]):$Field<"filmConnection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
filmConnection<Sel extends Selection<StarshipFilmsConnection>>(selectorFn: (s: StarshipFilmsConnection) => [...Sel]):$Field<"filmConnection", GetOutput<Sel> | undefined , GetVariables<Sel>>
filmConnection(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new StarshipFilmsConnection)
      };
      return this.$_select("filmConnection", options) as any
    }
  

      
/**
 * The class of this starships hyperdrive.
 */
      get hyperdriveRating(): $Field<"hyperdriveRating", number | null | undefined>  {
       return this.$_select("hyperdriveRating") as any
      }

      
/**
 * The ID of an object
 */
      get id(): $Field<"id", string>  {
       return this.$_select("id") as any
      }

      
/**
 * The length of this starship in meters.
 */
      get length(): $Field<"length", number | null | undefined>  {
       return this.$_select("length") as any
      }

      
/**
 * The manufacturers of this starship.
 */
      get manufacturers(): $Field<"manufacturers", Readonly<Array<string | null | undefined>> | null | undefined>  {
       return this.$_select("manufacturers") as any
      }

      
/**
 * The maximum speed of this starship in atmosphere. null if this starship is
incapable of atmosphering flight.
 */
      get maxAtmospheringSpeed(): $Field<"maxAtmospheringSpeed", number | null | undefined>  {
       return this.$_select("maxAtmospheringSpeed") as any
      }

      
/**
 * The model or official name of this starship. Such as "T-65 X-wing" or "DS-1
Orbital Battle Station".
 */
      get model(): $Field<"model", string | null | undefined>  {
       return this.$_select("model") as any
      }

      
/**
 * The name of this starship. The common name, such as "Death Star".
 */
      get name(): $Field<"name", string | null | undefined>  {
       return this.$_select("name") as any
      }

      
/**
 * The number of non-essential people this starship can transport.
 */
      get passengers(): $Field<"passengers", string | null | undefined>  {
       return this.$_select("passengers") as any
      }

      
      pilotConnection<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<StarshipPilotsConnection>>(args: Args, selectorFn: (s: StarshipPilotsConnection) => [...Sel]):$Field<"pilotConnection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
pilotConnection<Sel extends Selection<StarshipPilotsConnection>>(selectorFn: (s: StarshipPilotsConnection) => [...Sel]):$Field<"pilotConnection", GetOutput<Sel> | undefined , GetVariables<Sel>>
pilotConnection(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new StarshipPilotsConnection)
      };
      return this.$_select("pilotConnection", options) as any
    }
  

      
/**
 * The class of this starship, such as "Starfighter" or "Deep Space Mobile
Battlestation"
 */
      get starshipClass(): $Field<"starshipClass", string | null | undefined>  {
       return this.$_select("starshipClass") as any
      }
}


/**
 * A connection to a list of items.
 */
export class StarshipFilmsConnection extends $Base<"StarshipFilmsConnection"> {
  constructor() {
    super("StarshipFilmsConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<StarshipFilmsEdge>>(selectorFn: (s: StarshipFilmsEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new StarshipFilmsEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      films<Sel extends Selection<Film>>(selectorFn: (s: Film) => [...Sel]):$Field<"films", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Film)
      };
      return this.$_select("films", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class StarshipFilmsEdge extends $Base<"StarshipFilmsEdge"> {
  constructor() {
    super("StarshipFilmsEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Film>>(selectorFn: (s: Film) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Film)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class StarshipPilotsConnection extends $Base<"StarshipPilotsConnection"> {
  constructor() {
    super("StarshipPilotsConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<StarshipPilotsEdge>>(selectorFn: (s: StarshipPilotsEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new StarshipPilotsEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      pilots<Sel extends Selection<Person>>(selectorFn: (s: Person) => [...Sel]):$Field<"pilots", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Person)
      };
      return this.$_select("pilots", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class StarshipPilotsEdge extends $Base<"StarshipPilotsEdge"> {
  constructor() {
    super("StarshipPilotsEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Person>>(selectorFn: (s: Person) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Person)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class StarshipsConnection extends $Base<"StarshipsConnection"> {
  constructor() {
    super("StarshipsConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<StarshipsEdge>>(selectorFn: (s: StarshipsEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new StarshipsEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      starships<Sel extends Selection<Starship>>(selectorFn: (s: Starship) => [...Sel]):$Field<"starships", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Starship)
      };
      return this.$_select("starships", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class StarshipsEdge extends $Base<"StarshipsEdge"> {
  constructor() {
    super("StarshipsEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Starship>>(selectorFn: (s: Starship) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Starship)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A single transport craft that does not have hyperdrive capability
 */
export class Vehicle extends $Base<"Vehicle"> {
  constructor() {
    super("Vehicle")
  }

  
      
/**
 * The maximum number of kilograms that this vehicle can transport.
 */
      get cargoCapacity(): $Field<"cargoCapacity", number | null | undefined>  {
       return this.$_select("cargoCapacity") as any
      }

      
/**
 * The maximum length of time that this vehicle can provide consumables for its
entire crew without having to resupply.
 */
      get consumables(): $Field<"consumables", string | null | undefined>  {
       return this.$_select("consumables") as any
      }

      
/**
 * The cost of this vehicle new, in Galactic Credits.
 */
      get costInCredits(): $Field<"costInCredits", number | null | undefined>  {
       return this.$_select("costInCredits") as any
      }

      
/**
 * The ISO 8601 date format of the time that this resource was created.
 */
      get created(): $Field<"created", string | null | undefined>  {
       return this.$_select("created") as any
      }

      
/**
 * The number of personnel needed to run or pilot this vehicle.
 */
      get crew(): $Field<"crew", string | null | undefined>  {
       return this.$_select("crew") as any
      }

      
/**
 * The ISO 8601 date format of the time that this resource was edited.
 */
      get edited(): $Field<"edited", string | null | undefined>  {
       return this.$_select("edited") as any
      }

      
      filmConnection<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<VehicleFilmsConnection>>(args: Args, selectorFn: (s: VehicleFilmsConnection) => [...Sel]):$Field<"filmConnection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
filmConnection<Sel extends Selection<VehicleFilmsConnection>>(selectorFn: (s: VehicleFilmsConnection) => [...Sel]):$Field<"filmConnection", GetOutput<Sel> | undefined , GetVariables<Sel>>
filmConnection(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new VehicleFilmsConnection)
      };
      return this.$_select("filmConnection", options) as any
    }
  

      
/**
 * The ID of an object
 */
      get id(): $Field<"id", string>  {
       return this.$_select("id") as any
      }

      
/**
 * The length of this vehicle in meters.
 */
      get length(): $Field<"length", number | null | undefined>  {
       return this.$_select("length") as any
      }

      
/**
 * The manufacturers of this vehicle.
 */
      get manufacturers(): $Field<"manufacturers", Readonly<Array<string | null | undefined>> | null | undefined>  {
       return this.$_select("manufacturers") as any
      }

      
/**
 * The maximum speed of this vehicle in atmosphere.
 */
      get maxAtmospheringSpeed(): $Field<"maxAtmospheringSpeed", number | null | undefined>  {
       return this.$_select("maxAtmospheringSpeed") as any
      }

      
/**
 * The model or official name of this vehicle. Such as "All-Terrain Attack
Transport".
 */
      get model(): $Field<"model", string | null | undefined>  {
       return this.$_select("model") as any
      }

      
/**
 * The name of this vehicle. The common name, such as "Sand Crawler" or "Speeder
bike".
 */
      get name(): $Field<"name", string | null | undefined>  {
       return this.$_select("name") as any
      }

      
/**
 * The number of non-essential people this vehicle can transport.
 */
      get passengers(): $Field<"passengers", string | null | undefined>  {
       return this.$_select("passengers") as any
      }

      
      pilotConnection<Args extends VariabledInput<{
        after?: string | null | undefined
first?: number | null | undefined
before?: string | null | undefined
last?: number | null | undefined,
      }>,Sel extends Selection<VehiclePilotsConnection>>(args: Args, selectorFn: (s: VehiclePilotsConnection) => [...Sel]):$Field<"pilotConnection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
pilotConnection<Sel extends Selection<VehiclePilotsConnection>>(selectorFn: (s: VehiclePilotsConnection) => [...Sel]):$Field<"pilotConnection", GetOutput<Sel> | undefined , GetVariables<Sel>>
pilotConnection(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              after: "String",
first: "Int",
before: "String",
last: "Int"
            },
        args,

        selection: selectorFn(new VehiclePilotsConnection)
      };
      return this.$_select("pilotConnection", options) as any
    }
  

      
/**
 * The class of this vehicle, such as "Wheeled" or "Repulsorcraft".
 */
      get vehicleClass(): $Field<"vehicleClass", string | null | undefined>  {
       return this.$_select("vehicleClass") as any
      }
}


/**
 * A connection to a list of items.
 */
export class VehicleFilmsConnection extends $Base<"VehicleFilmsConnection"> {
  constructor() {
    super("VehicleFilmsConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<VehicleFilmsEdge>>(selectorFn: (s: VehicleFilmsEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new VehicleFilmsEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      films<Sel extends Selection<Film>>(selectorFn: (s: Film) => [...Sel]):$Field<"films", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Film)
      };
      return this.$_select("films", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class VehicleFilmsEdge extends $Base<"VehicleFilmsEdge"> {
  constructor() {
    super("VehicleFilmsEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Film>>(selectorFn: (s: Film) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Film)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class VehiclePilotsConnection extends $Base<"VehiclePilotsConnection"> {
  constructor() {
    super("VehiclePilotsConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<VehiclePilotsEdge>>(selectorFn: (s: VehiclePilotsEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new VehiclePilotsEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      pilots<Sel extends Selection<Person>>(selectorFn: (s: Person) => [...Sel]):$Field<"pilots", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Person)
      };
      return this.$_select("pilots", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }
}


/**
 * An edge in a connection.
 */
export class VehiclePilotsEdge extends $Base<"VehiclePilotsEdge"> {
  constructor() {
    super("VehiclePilotsEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Person>>(selectorFn: (s: Person) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Person)
      };
      return this.$_select("node", options) as any
    }
  
}


/**
 * A connection to a list of items.
 */
export class VehiclesConnection extends $Base<"VehiclesConnection"> {
  constructor() {
    super("VehiclesConnection")
  }

  
      
/**
 * A list of edges.
 */
      edges<Sel extends Selection<VehiclesEdge>>(selectorFn: (s: VehiclesEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new VehiclesEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
/**
 * Information to aid in pagination.
 */
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  

      
/**
 * A count of the total number of objects in this connection, ignoring pagination.
This allows a client to fetch the first five objects by passing "5" as the
argument to "first", then fetch the total count so it could display "5 of 83",
for example.
 */
      get totalCount(): $Field<"totalCount", number | null | undefined>  {
       return this.$_select("totalCount") as any
      }

      
/**
 * A list of all of the objects returned in the connection. This is a convenience
field provided for quickly exploring the API; rather than querying for
"{ edges { node } }" when no edge data is needed, this field can be be used
instead. Note that when clients like Relay need to fetch the "cursor" field on
the edge to enable efficient pagination, this shortcut cannot be used, and the
full "{ edges { node } }" version should be used instead.
 */
      vehicles<Sel extends Selection<Vehicle>>(selectorFn: (s: Vehicle) => [...Sel]):$Field<"vehicles", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Vehicle)
      };
      return this.$_select("vehicles", options) as any
    }
  
}


/**
 * An edge in a connection.
 */
export class VehiclesEdge extends $Base<"VehiclesEdge"> {
  constructor() {
    super("VehiclesEdge")
  }

  
      
/**
 * A cursor for use in pagination
 */
      get cursor(): $Field<"cursor", string>  {
       return this.$_select("cursor") as any
      }

      
/**
 * The item at the end of the edge
 */
      node<Sel extends Selection<Vehicle>>(selectorFn: (s: Vehicle) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Vehicle)
      };
      return this.$_select("node", options) as any
    }
  
}

  const $Root = {
    query: Root
  }

  namespace $RootTypes {
    export type query = Root
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
  
}

