import { TypedDocumentNode } from '@graphql-typed-document-node/core'
import gql from 'graphql-tag'

type ToUnionQuery<Members> = ToQuery<Pick<Members[keyof Members], keyof Members[keyof Members]>> & {
  [Name in keyof Members as `...on ${string & Name}`]: ToQuery<
    Omit<Members[Name], keyof Members[keyof Members]>
  >
}

export type ToQuery<Type> = Type extends string | number | undefined
  ? true
  : Type extends [infer Input, infer Output]
  ? [Input, ToQuery<Output>]
  : Type extends Array<infer Inner>
  ? ToQuery<Inner>
  : Type extends Array<infer Inner> | undefined
  ? ToQuery<Inner>
  : Type extends { [Union]: infer Members }
  ? ToUnionQuery<Members>
  : { [Field in keyof Type]?: ToQuery<Type[Field]> }

type ToUnionModel<Members> = ToModel<Pick<Members[keyof Members], keyof Members[keyof Members]>> & {
  [Name in keyof Members as `...on ${string & Name}`]: ToModel<
    Omit<Members[Name], keyof Members[keyof Members]>
  >
}

export type ToModel<Type> = Type extends string | number | undefined
  ? Type
  : Type extends [infer Input, infer Output]
  ? ToModel<Output>
  : Type extends Array<infer Inner>
  ? Array<ToModel<Inner>>
  : Type extends Array<infer Inner> | undefined
  ? Array<ToModel<Inner>> | undefined
  : Type extends { [Union]: infer Members }
  ? ToUnionModel<Members>
  : { [Field in keyof Type]?: ToModel<Type[Field]> }

type SelectUnionKeys<K> = K extends `...on ${any}` ? K : never

type FromUnionQuery<T> = T[SelectUnionKeys<keyof T>] & {
  [K in keyof T]: K extends `...on ${any}` ? never : T[K]
}

type QueryToValueMapper<Query, ValueDescriptor> = {
  [Key in keyof Query]: Key extends keyof ValueDescriptor
    ? Query[Key] extends true
      ? ValueDescriptor[Key]
      : ValueDescriptor[Key] extends Array<infer Inner>
      ? Array<
          Query[Key] extends [any, infer Outputs]
            ? QueryToValueMapper<Outputs, Inner>
            : QueryToValueMapper<Query[Key], Inner>
        >
      : ValueDescriptor[Key] extends Array<infer Inner> | undefined
      ?
          | Array<
              Query[Key] extends [any, infer Outputs]
                ? QueryToValueMapper<Outputs, Inner>
                : QueryToValueMapper<Query[Key], Inner>
            >
          | undefined
      : Query[Key] extends [any, infer Outputs]
      ? QueryToValueMapper<Outputs, ValueDescriptor[Key]>
      : QueryToValueMapper<Query[Key], ValueDescriptor[Key]>
    : never
}

const Union = '1fcbcbff-3e78-462f-b45c-668a3e09bfd7'
const Variable = '$1fcbcbff-3e78-462f-b45c-668a3e09bfd8'

type Variable<T, Name extends string> = {
  ' __zeus_name': Name
  ' __zeus_type': T
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

/**
 * The query root
 */
export type Query = {
  cardById: [
    {
      cardId: string | undefined
    },
    Card | undefined
  ]
  drawCard: Card
  drawChangeCard: ChangeCard
  listCards: Array<Card>
  myStacks: Array<CardStack> | undefined
  nameables: Array<Nameable>
}

/**
 * Stack of cards
 */
export type CardStack = {
  cards: Array<Card> | undefined
  name: string
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
export type S3Object = {
  bucket: string
  key: string
  region: string
}

export type JSON = unknown

export type ChangeCard = {
  [Union]: {
    SpecialCard: SpecialCard
    EffectCard: EffectCard
  }
}

export type Nameable = {
  name: string
}

/**
 * Card used in card game<br>
 */
export type Card = {
  Attack: number
  Children: number | undefined
  Defense: number
  attack: [
    {
      cardID: Array<string>
    },
    Array<Card> | undefined
  ]
  cardImage: S3Object | undefined
  description: string
  id: string
  image: string
  info: JSON
  name: string
  skills: Array<SpecialSkills> | undefined
}

export type Mutation = {
  addCard: [
    {
      card: createCard
    },
    Card
  ]
}

export type Subscription = {
  deck: Array<Card> | undefined
}

export type SpecialCard = {
  effect: string
  name: string
}

export type EffectCard = {
  effectSize: number
  name: string
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
