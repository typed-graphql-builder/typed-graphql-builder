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

export type ChangeCard = SpecialCard | undefined | EffectCard | undefined

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

export type Result<Obj> = Obj extends [any, infer Output]
  ? Result<Output>
  : Obj extends Array<infer Item>
  ? Array<Result<Item>>
  : Obj extends {}
  ? { [K in keyof Obj]: Result<Obj[K]> }
  : Obj

type Test = Result<Query>
