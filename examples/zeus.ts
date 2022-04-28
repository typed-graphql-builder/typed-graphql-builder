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
  return `${Variable}$${name}` as any as Variable<Type, Name>
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
      return `[${input.map(stringifyInput).join(',')}]`
    } else {
      return `{${Object.entries(input).map(([k, v]) => `${k}:${stringifyInput(v)}`)}}`
    }
  }
  function stringifyOutput(output: any) {
    if (output === true) return ''
    else
      return `{${Object.entries(output)
        .map(([k, v]) => stringifyField(k, v))
        .join(' ')}}`
  }
  function stringifyField(key: string, field: any) {
    if (Array.isArray(field)) {
      return `${key}(${stringifyInput(field[0])}) ${stringifyOutput(field[1])}`
    } else {
      return `${key}${stringifyOutput(field)}`
    }
  }
  return `${qType}(${vars.join(',')}){${stringifyOutput(query)}}`
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

/**
 * The query root
 */
export class Query extends $_Base<Query> {
  constructor() {
    super('Query')
  }

  cardById<Sel extends Selection<Card>>(
    args: {
      cardId: string | undefined
    },
    selectorFn: (s: Card) => [...Sel]
  ): Field<'cardById', JoinFields<Sel> | undefined> {
    const options = {
      argTypes: {
        cardId: 'string | undefined',
      },
      args,

      selection: selectorFn(new Card()),
    }
    return this.$_select('cardById' as const, options)
  }

  drawCard<Sel extends Selection<Card>>(
    selectorFn: (s: Card) => [...Sel]
  ): Field<'drawCard', JoinFields<Sel>> {
    const options = {
      selection: selectorFn(new Card()),
    }
    return this.$_select('drawCard' as const, options)
  }

  drawChangeCard<Sel extends Selection<ChangeCard>>(
    selectorFn: (s: ChangeCard) => [...Sel]
  ): Field<'drawChangeCard', JoinFields<Sel>> {
    const options = {
      selection: selectorFn(new ChangeCard()),
    }
    return this.$_select('drawChangeCard' as const, options)
  }

  listCards<Sel extends Selection<Card>>(
    selectorFn: (s: Card) => [...Sel]
  ): Field<'listCards', Array<JoinFields<Sel>>> {
    const options = {
      selection: selectorFn(new Card()),
    }
    return this.$_select('listCards' as const, options)
  }

  myStacks<Sel extends Selection<CardStack>>(
    selectorFn: (s: CardStack) => [...Sel]
  ): Field<'myStacks', Array<JoinFields<Sel>> | undefined> {
    const options = {
      selection: selectorFn(new CardStack()),
    }
    return this.$_select('myStacks' as const, options)
  }

  nameables<Sel extends Selection<Nameable>>(
    selectorFn: (s: Nameable) => [...Sel]
  ): Field<'nameables', Array<JoinFields<Sel>>> {
    const options = {
      selection: selectorFn(new Nameable()),
    }
    return this.$_select('nameables' as const, options)
  }
}

/**
 * Stack of cards
 */
export class CardStack extends $_Base<CardStack> {
  constructor() {
    super('CardStack')
  }

  cards<Sel extends Selection<Card>>(
    selectorFn: (s: Card) => [...Sel]
  ): Field<'cards', Array<JoinFields<Sel>> | undefined> {
    const options = {
      selection: selectorFn(new Card()),
    }
    return this.$_select('cards' as const, options)
  }

  get name(): Field<'name', string> {
    return this.$_select('name' as const)
  }
}

export enum SpecialSkills {
  /**
   * Lower enemy defense -5<br>
   */
  THUNDER = 'THUNDER',

  /**
   * Attack multiple Cards at once<br>
   */
  RAIN = 'RAIN',

  /**
   * 50% chance to avoid any attack<br>
   */
  FIRE = 'FIRE',
}

/**
 * Aws S3 File
 */
export class S3Object extends $_Base<S3Object> {
  constructor() {
    super('S3Object')
  }

  get bucket(): Field<'bucket', string> {
    return this.$_select('bucket' as const)
  }
  get key(): Field<'key', string> {
    return this.$_select('key' as const)
  }
  get region(): Field<'region', string> {
    return this.$_select('region' as const)
  }
}

export type JSON = unknown

export type ChangeCard = {
  [Union]: {
    SpecialCard: SpecialCard
    EffectCard: EffectCard
  }
}

export class Nameable extends $_Base<Nameable> {
  constructor() {
    super('Nameable')
  }
  get name(): Field<'name', string> {
    return this.$_select('name' as const)
  }
}

/**
 * Card used in card game<br>
 */
export class Card extends $_Base<Card> {
  constructor() {
    super('Card')
  }

  get Attack(): Field<'Attack', number> {
    return this.$_select('Attack' as const)
  }
  get Children(): Field<'Children', number | undefined> {
    return this.$_select('Children' as const)
  }
  get Defense(): Field<'Defense', number> {
    return this.$_select('Defense' as const)
  }
  attack<Sel extends Selection<Card>>(
    args: {
      cardID: Array<string>
    },
    selectorFn: (s: Card) => [...Sel]
  ): Field<'attack', Array<JoinFields<Sel>> | undefined> {
    const options = {
      argTypes: {
        cardID: 'Array<string>',
      },
      args,

      selection: selectorFn(new Card()),
    }
    return this.$_select('attack' as const, options)
  }

  cardImage<Sel extends Selection<S3Object>>(
    selectorFn: (s: S3Object) => [...Sel]
  ): Field<'cardImage', JoinFields<Sel> | undefined> {
    const options = {
      selection: selectorFn(new S3Object()),
    }
    return this.$_select('cardImage' as const, options)
  }

  get description(): Field<'description', string> {
    return this.$_select('description' as const)
  }
  get id(): Field<'id', string> {
    return this.$_select('id' as const)
  }
  get image(): Field<'image', string> {
    return this.$_select('image' as const)
  }
  info<Sel extends Selection<JSON>>(
    selectorFn: (s: JSON) => [...Sel]
  ): Field<'info', JoinFields<Sel>> {
    const options = {
      selection: selectorFn(new JSON()),
    }
    return this.$_select('info' as const, options)
  }

  get name(): Field<'name', string> {
    return this.$_select('name' as const)
  }
  skills<Sel extends Selection<SpecialSkills>>(
    selectorFn: (s: SpecialSkills) => [...Sel]
  ): Field<'skills', Array<JoinFields<Sel>> | undefined> {
    const options = {
      selection: selectorFn(new SpecialSkills()),
    }
    return this.$_select('skills' as const, options)
  }
}

export class Mutation extends $_Base<Mutation> {
  constructor() {
    super('Mutation')
  }

  addCard<Sel extends Selection<Card>>(
    args: {
      card: createCard
    },
    selectorFn: (s: Card) => [...Sel]
  ): Field<'addCard', JoinFields<Sel>> {
    const options = {
      argTypes: {
        card: 'createCard',
      },
      args,

      selection: selectorFn(new Card()),
    }
    return this.$_select('addCard' as const, options)
  }
}

export class Subscription extends $_Base<Subscription> {
  constructor() {
    super('Subscription')
  }

  deck<Sel extends Selection<Card>>(
    selectorFn: (s: Card) => [...Sel]
  ): Field<'deck', Array<JoinFields<Sel>> | undefined> {
    const options = {
      selection: selectorFn(new Card()),
    }
    return this.$_select('deck' as const, options)
  }
}

export class SpecialCard extends $_Base<SpecialCard> {
  constructor() {
    super('SpecialCard')
  }

  get effect(): Field<'effect', string> {
    return this.$_select('effect' as const)
  }
  get name(): Field<'name', string> {
    return this.$_select('name' as const)
  }
  get thing(): Field<'thing', string> {
    return this.$_select('thing' as const)
  }
}

export class EffectCard extends $_Base<EffectCard> {
  constructor() {
    super('EffectCard')
  }

  get effectSize(): Field<'effectSize', number> {
    return this.$_select('effectSize' as const)
  }
  get name(): Field<'name', string> {
    return this.$_select('name' as const)
  }
  thing<Sel extends Selection<Number>>(
    selectorFn: (s: Number) => [...Sel]
  ): Field<'thing', JoinFields<Sel>> {
    const options = {
      selection: selectorFn(new Number()),
    }
    return this.$_select('thing' as const, options)
  }
}

/**
 * create card inputs<br>
 */
export type createCard = {
  skills: Array<SpecialSkills> | undefined
  name: string
  description: string
  Children: number | undefined
  Attack: number
  Defense: number
}

export type $ROOT = {
  query: Query
  mutation: Mutation
  subscription: Subscription
}
