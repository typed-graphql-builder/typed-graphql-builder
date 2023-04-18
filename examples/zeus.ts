

import type { TypedDocumentNode } from '@graphql-typed-document-node/core'
import { gql } from 'graphql-tag'

/* tslint:disable */
/* eslint-disable */

const VariableName = ' $1fcbcbff-3e78-462f-b45c-668a3e09bfd8'

class Variable<T, Name extends string> {
  private [VariableName]: Name
  // @ts-ignore
  private _type?: T

  // @ts-ignore
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
  // @ts-ignore
  constructor(private $$name: Name) {}

  protected $_select<Key extends string>(
    name: Key,
    options: SelectOptions = {}
  ): $Field<Key, any, any> {
    return new $Field(name, options)
  }
}

// @ts-ignore
class $Union<T, Name extends String> extends $Base<Name> {
  // @ts-ignore
  private $$type!: T
  // @ts-ignore
  private $$name!: Name

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

// @ts-ignore
class $Interface<T, Name extends string> extends $Base<Name> {
  // @ts-ignore
  private $$type!: T
  // @ts-ignore
  private $$name!: Name

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
  // @ts-ignore
  private vars!: Vars
  constructor(public alternativeName: string, public alternativeSelection: Selection<T>) {}
}

type Selection<_any> = ReadonlyArray<$Field<any, any, any> | $UnionSelection<any, any>>

type NeverNever<T> = [T] extends [never] ? {} : T

type Simplify<T> = { [K in keyof T]: T[K] } & {}

export type GetOutput<X extends Selection<any>> = Simplify<
  UnionToIntersection<
    {
      [I in keyof X]: X[I] extends $Field<infer Name, infer Type, any>
        ? { [K in Name]: Type }
        : never
    }[keyof X & number]
  > &
    NeverNever<
      {
        [I in keyof X]: X[I] extends $UnionSelection<infer Type, any> ? Type : never
      }[keyof X & number]
    >
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

  const type = array ? arrRegex.exec(input)![1]! : input
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
              let argTypeForKey = argTypes[key]
              if (!argTypeForKey) {
                throw new Error(`Argument type for ${key} not found`)
              }
              const cleanType = argTypeForKey.replace('[', '').replace(']', '').replace(/!/g, '')
              return (
                key +
                ':' +
                stringifyArgs(val, $InputTypes[cleanType]!, getArgVarType(argTypeForKey))
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

export type QueryOutputType<T extends TypedDocumentNode<any>> = T extends TypedDocumentNode<
  infer Out
>
  ? Out
  : never

export type QueryInputType<T extends TypedDocumentNode<any>> = T extends TypedDocumentNode<
  any,
  infer In
>
  ? In
  : never

export function fragment<T, Sel extends Selection<T>>(
  GQLType: { new (): T },
  selectFn: (selector: T) => [...Sel]
) {
  return selectFn(new GQLType())
}

type $Atomic = string | SpecialSkills | number | boolean

let $Enums = new Set<string>(["SpecialSkills"])



/**
 * The query root
 */
export class Query extends $Base<"Query"> {
  constructor() {
    super("Query")
  }

  
      
      cardById<Args extends VariabledInput<{
        cardId?: string | null | undefined,
      }>,Sel extends Selection<Card>>(args: Args, selectorFn: (s: Card) => [...Sel]):$Field<"cardById", GetOutput<Sel> | undefined , GetVariables<Sel, Args>>
cardById<Sel extends Selection<Card>>(selectorFn: (s: Card) => [...Sel]):$Field<"cardById", GetOutput<Sel> | undefined , GetVariables<Sel>>
cardById(arg1: any, arg2?: any) {
      const { args, selectorFn } = !arg2 ? { args: {}, selectorFn: arg1 } : { args: arg1, selectorFn: arg2 };

      const options = {
        argTypes: {
              cardId: "String"
            },
        args,

        selection: selectorFn(new Card)
      };
      return this.$_select("cardById", options) as any
    }
  

      
/**
 * Draw a card<br>
 */
      drawCard<Sel extends Selection<Card>>(selectorFn: (s: Card) => [...Sel]):$Field<"drawCard", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Card)
      };
      return this.$_select("drawCard", options) as any
    }
  

      
      drawChangeCard<Sel extends Selection<ChangeCard>>(selectorFn: (s: ChangeCard) => [...Sel]):$Field<"drawChangeCard", GetOutput<Sel> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new ChangeCard)
      };
      return this.$_select("drawChangeCard", options) as any
    }
  

      
/**
 * list All Cards availble<br>
 */
      listCards<Sel extends Selection<Card>>(selectorFn: (s: Card) => [...Sel]):$Field<"listCards", Array<GetOutput<Sel>> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Card)
      };
      return this.$_select("listCards", options) as any
    }
  

      
      myStacks<Sel extends Selection<CardStack>>(selectorFn: (s: CardStack) => [...Sel]):$Field<"myStacks", Array<GetOutput<Sel>> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new CardStack)
      };
      return this.$_select("myStacks", options) as any
    }
  

      
      nameables<Sel extends Selection<Nameable>>(selectorFn: (s: Nameable) => [...Sel]):$Field<"nameables", Array<GetOutput<Sel>> , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Nameable)
      };
      return this.$_select("nameables", options) as any
    }
  
}


/**
 * Stack of cards
 */
export class CardStack extends $Base<"CardStack"> {
  constructor() {
    super("CardStack")
  }

  
      
/**
 * The list of cards
 */
      cards<Sel extends Selection<Card>>(selectorFn: (s: Card) => [...Sel]):$Field<"cards", Array<GetOutput<Sel>> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Card)
      };
      return this.$_select("cards", options) as any
    }
  

      
/**
 * The card name
 */
      get name(): $Field<"name", string>  {
       return this.$_select("name") as any
      }
}

  
export enum SpecialSkills {
  
/**
 * Lower enemy defense -5<br>
 */
  THUNDER = "THUNDER",

/**
 * Attack multiple Cards at once<br>
 */
  RAIN = "RAIN",

/**
 * 50% chance to avoid any attack<br>
 */
  FIRE = "FIRE"
}
  


/**
 * Aws S3 File
 */
export class S3Object extends $Base<"S3Object"> {
  constructor() {
    super("S3Object")
  }

  
      
      get bucket(): $Field<"bucket", string>  {
       return this.$_select("bucket") as any
      }

      
      get key(): $Field<"key", string>  {
       return this.$_select("key") as any
      }

      
      get region(): $Field<"region", string>  {
       return this.$_select("region") as any
      }
}


export type JSON = string



export class ChangeCard extends $Union<{SpecialCard: SpecialCard,EffectCard: EffectCard,Nameable: Nameable}, "ChangeCard"> {
  constructor() {
    super({SpecialCard: SpecialCard,EffectCard: EffectCard,Nameable: Nameable}, "ChangeCard")
  }
}


export class Nameable extends $Interface<{CardStack: CardStack,Card: Card,SpecialCard: SpecialCard,EffectCard: EffectCard}, "Nameable"> {
  constructor() {
    super({CardStack: CardStack,Card: Card,SpecialCard: SpecialCard,EffectCard: EffectCard}, "Nameable")
  }
  
      
      get name(): $Field<"name", string>  {
       return this.$_select("name") as any
      }
}


/**
 * Card used in card game<br>
 */
export class Card extends $Base<"Card"> {
  constructor() {
    super("Card")
  }

  
      
/**
 * The attack power<br>
 */
      get Attack(): $Field<"Attack", number>  {
       return this.$_select("Attack") as any
      }

      
/**
 * <div>How many children the greek god had</div>
 */
      get Children(): $Field<"Children", number | null | undefined>  {
       return this.$_select("Children") as any
      }

      
/**
 * The defense power<br>
 */
      get Defense(): $Field<"Defense", number>  {
       return this.$_select("Defense") as any
      }

      
/**
 * Attack other cards on the table , returns Cards after attack<br>
 */
      attack<Args extends VariabledInput<{
        cardID: Readonly<Array<string>>,
      }>,Sel extends Selection<Card>>(args: Args, selectorFn: (s: Card) => [...Sel]):$Field<"attack", Array<GetOutput<Sel>> | undefined , GetVariables<Sel, Args>> {
      
      const options = {
        argTypes: {
              cardID: "[String!]!"
            },
        args,

        selection: selectorFn(new Card)
      };
      return this.$_select("attack", options) as any
    }
  

      
/**
 * Put your description here
 */
      cardImage<Sel extends Selection<S3Object>>(selectorFn: (s: S3Object) => [...Sel]):$Field<"cardImage", GetOutput<Sel> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new S3Object)
      };
      return this.$_select("cardImage", options) as any
    }
  

      
/**
 * Description of a card<br>
 */
      get description(): $Field<"description", string>  {
       return this.$_select("description") as any
      }

      
      get id(): $Field<"id", string>  {
       return this.$_select("id") as any
      }

      
      get image(): $Field<"image", string>  {
       return this.$_select("image") as any
      }

      
      get info(): $Field<"info", string>  {
       return this.$_select("info") as any
      }

      
/**
 * The name of a card<br>
 */
      get name(): $Field<"name", string>  {
       return this.$_select("name") as any
      }

      
      get skills(): $Field<"skills", Readonly<Array<SpecialSkills>> | null | undefined>  {
       return this.$_select("skills") as any
      }
}


export class Mutation extends $Base<"Mutation"> {
  constructor() {
    super("Mutation")
  }

  
      
/**
 * add Card to Cards database<br>
 */
      addCard<Args extends VariabledInput<{
        card: createCard,
      }>,Sel extends Selection<Card>>(args: Args, selectorFn: (s: Card) => [...Sel]):$Field<"addCard", GetOutput<Sel> , GetVariables<Sel, Args>> {
      
      const options = {
        argTypes: {
              card: "createCard!"
            },
        args,

        selection: selectorFn(new Card)
      };
      return this.$_select("addCard", options) as any
    }
  
}


export class Subscription extends $Base<"Subscription"> {
  constructor() {
    super("Subscription")
  }

  
      
      deck<Sel extends Selection<Card>>(selectorFn: (s: Card) => [...Sel]):$Field<"deck", Array<GetOutput<Sel>> | undefined , GetVariables<Sel>> {
      
      const options = {
        
        

        selection: selectorFn(new Card)
      };
      return this.$_select("deck", options) as any
    }
  
}


export class SpecialCard extends $Base<"SpecialCard"> {
  constructor() {
    super("SpecialCard")
  }

  
      
      get effect(): $Field<"effect", string>  {
       return this.$_select("effect") as any
      }

      
      get name(): $Field<"name", string>  {
       return this.$_select("name") as any
      }
}


export class EffectCard extends $Base<"EffectCard"> {
  constructor() {
    super("EffectCard")
  }

  
      
      get effectSize(): $Field<"effectSize", number>  {
       return this.$_select("effectSize") as any
      }

      
      get name(): $Field<"name", string>  {
       return this.$_select("name") as any
      }
}


/**
 * create card inputs<br>
 */
export type createCard = {
  Attack: number,
Children?: number | null | undefined,
Defense: number,
conditions?: ConditionType | null | undefined,
description: string,
name: string,
skills?: Readonly<Array<SpecialSkills>> | null | undefined
}
    


export type ConditionType = {
  _and?: Readonly<Array<ConditionType | null | undefined>> | null | undefined,
_or?: Readonly<Array<ConditionType | null | undefined>> | null | undefined,
field1?: CheckType | null | undefined,
field2?: CheckType | null | undefined
}
    


export type CheckType = {
  eq?: number | null | undefined,
gt?: number | null | undefined,
lt?: number | null | undefined
}
    

  const $Root = {
    query: Query,
mutation: Mutation,
subscription: Subscription
  }

  namespace $RootTypes {
    export type query = Query
export type mutation = Mutation
export type subscription = Subscription
  }
  

export function query<Sel extends Selection<$RootTypes.query>>(
  name: string,
  selectFn: (q: $RootTypes.query) => [...Sel]
): TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
export function query<Sel extends Selection<$RootTypes.query>>(
  selectFn: (q: $RootTypes.query) => [...Sel]
): TypedDocumentNode<GetOutput<Sel>, Simplify<GetVariables<Sel>>>
export function query<Sel extends Selection<$RootTypes.query>>(name: any, selectFn?: any) {
  if (!selectFn) {
    selectFn = name
    name = ''
  }
  let field = new $Field<'query', GetOutput<Sel>, GetVariables<Sel>>('query', {
    selection: selectFn(new $Root.query()),
  })
  const str = fieldToQuery(`query ${name}`, field)

  return gql(str) as any
}


export function mutation<Sel extends Selection<$RootTypes.mutation>>(
  name: string,
  selectFn: (q: $RootTypes.mutation) => [...Sel]
): TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
export function mutation<Sel extends Selection<$RootTypes.mutation>>(
  selectFn: (q: $RootTypes.mutation) => [...Sel]
): TypedDocumentNode<GetOutput<Sel>, Simplify<GetVariables<Sel>>>
export function mutation<Sel extends Selection<$RootTypes.query>>(name: any, selectFn?: any) {
  if (!selectFn) {
    selectFn = name
    name = ''
  }
  let field = new $Field<'mutation', GetOutput<Sel>, GetVariables<Sel>>('mutation', {
    selection: selectFn(new $Root.mutation()),
  })
  const str = fieldToQuery(`mutation ${name}`, field)

  return gql(str) as any
}


export function subscription<Sel extends Selection<$RootTypes.subscription>>(
  name: string,
  selectFn: (q: $RootTypes.subscription) => [...Sel]
): TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
export function subscription<Sel extends Selection<$RootTypes.subscription>>(
  selectFn: (q: $RootTypes.subscription) => [...Sel]
): TypedDocumentNode<GetOutput<Sel>, Simplify<GetVariables<Sel>>>
export function subscription<Sel extends Selection<$RootTypes.query>>(name: any, selectFn?: any) {
  if (!selectFn) {
    selectFn = name
    name = ''
  }
  let field = new $Field<'subscription', GetOutput<Sel>, GetVariables<Sel>>('subscription', {
    selection: selectFn(new $Root.subscription()),
  })
  const str = fieldToQuery(`subscription ${name}`, field)

  return gql(str) as any
}


const $InputTypes: {[key: string]: {[key: string]: string}} = {
    createCard: {
    Attack: "Int!",
Children: "Int",
Defense: "Int!",
conditions: "ConditionType",
description: "String!",
name: "String!",
skills: "[SpecialSkills!]"
  },
  ConditionType: {
    _and: "[ConditionType]",
_or: "[ConditionType]",
field1: "CheckType",
field2: "CheckType"
  },
  CheckType: {
    eq: "Int",
gt: "Int",
lt: "Int"
  }
}

