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

/**
 * The query root
 */
export class Query extends $Base<'Query'> {
  constructor() {
    super('Query')
  }

  cardById<Sel extends Selection<Card>>(
    args: {
      cardId: string | undefined
    },
    selectorFn: (s: Card) => [...Sel]
  ): $Field<'cardById', JoinFields<Sel> | undefined, 'Query'> {
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
  ): $Field<'drawCard', JoinFields<Sel>, 'Query'> {
    const options = {
      selection: selectorFn(new Card()),
    }
    return this.$_select('drawCard' as const, options)
  }

  drawChangeCard<Sel extends Selection<ChangeCard>>(
    selectorFn: (s: ChangeCard) => [...Sel]
  ): $Field<'drawChangeCard', JoinFields<Sel>, 'Query'> {
    const options = {
      selection: selectorFn(new ChangeCard()),
    }
    return this.$_select('drawChangeCard' as const, options)
  }

  listCards<Sel extends Selection<Card>>(
    selectorFn: (s: Card) => [...Sel]
  ): $Field<'listCards', Array<JoinFields<Sel>>, 'Query'> {
    const options = {
      selection: selectorFn(new Card()),
    }
    return this.$_select('listCards' as const, options)
  }

  myStacks<Sel extends Selection<CardStack>>(
    selectorFn: (s: CardStack) => [...Sel]
  ): $Field<'myStacks', Array<JoinFields<Sel>> | undefined, 'Query'> {
    const options = {
      selection: selectorFn(new CardStack()),
    }
    return this.$_select('myStacks' as const, options)
  }

  nameables<Sel extends Selection<Nameable>>(
    selectorFn: (s: Nameable) => [...Sel]
  ): $Field<'nameables', Array<JoinFields<Sel>>, 'Query'> {
    const options = {
      selection: selectorFn(new Nameable()),
    }
    return this.$_select('nameables' as const, options)
  }
}

/**
 * Stack of cards
 */
export class CardStack extends $Base<'CardStack'> {
  constructor() {
    super('CardStack')
  }

  cards<Sel extends Selection<Card>>(
    selectorFn: (s: Card) => [...Sel]
  ): $Field<'cards', Array<JoinFields<Sel>> | undefined, 'CardStack'> {
    const options = {
      selection: selectorFn(new Card()),
    }
    return this.$_select('cards' as const, options)
  }

  get name(): $Field<'name', string, 'CardStack'> {
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
export class S3Object extends $Base<'S3Object'> {
  constructor() {
    super('S3Object')
  }

  get bucket(): $Field<'bucket', string, 'S3Object'> {
    return this.$_select('bucket' as const)
  }
  get key(): $Field<'key', string, 'S3Object'> {
    return this.$_select('key' as const)
  }
  get region(): $Field<'region', string, 'S3Object'> {
    return this.$_select('region' as const)
  }
}

export type JSON = unknown

export class ChangeCard extends $Union<
  { SpecialCard: SpecialCard; EffectCard: EffectCard },
  'ChangeCard'
> {
  constructor() {
    super({ SpecialCard: SpecialCard, EffectCard: EffectCard })
  }
}

export class Nameable extends $Base<'Nameable'> {
  constructor() {
    super('Nameable')
  }
  get name(): $Field<'name', string, 'Nameable'> {
    return this.$_select('name' as const)
  }
}

/**
 * Card used in card game<br>
 */
export class Card extends $Base<'Card'> {
  constructor() {
    super('Card')
  }

  get Attack(): $Field<'Attack', number, 'Card'> {
    return this.$_select('Attack' as const)
  }
  get Children(): $Field<'Children', number | undefined, 'Card'> {
    return this.$_select('Children' as const)
  }
  get Defense(): $Field<'Defense', number, 'Card'> {
    return this.$_select('Defense' as const)
  }
  attack<Sel extends Selection<Card>>(
    args: {
      cardID: Array<string>
    },
    selectorFn: (s: Card) => [...Sel]
  ): $Field<'attack', Array<JoinFields<Sel>> | undefined, 'Card'> {
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
  ): $Field<'cardImage', JoinFields<Sel> | undefined, 'Card'> {
    const options = {
      selection: selectorFn(new S3Object()),
    }
    return this.$_select('cardImage' as const, options)
  }

  get description(): $Field<'description', string, 'Card'> {
    return this.$_select('description' as const)
  }
  get id(): $Field<'id', string, 'Card'> {
    return this.$_select('id' as const)
  }
  get image(): $Field<'image', string, 'Card'> {
    return this.$_select('image' as const)
  }
  get info(): $Field<'info', string, 'Card'> {
    return this.$_select('info' as const)
  }
  get name(): $Field<'name', string, 'Card'> {
    return this.$_select('name' as const)
  }
  get skills(): $Field<'skills', Array<SpecialSkills> | undefined, 'Card'> {
    return this.$_select('skills' as const)
  }
}

export class Mutation extends $Base<'Mutation'> {
  constructor() {
    super('Mutation')
  }

  addCard<Sel extends Selection<Card>>(
    args: {
      card: createCard
    },
    selectorFn: (s: Card) => [...Sel]
  ): $Field<'addCard', JoinFields<Sel>, 'Mutation'> {
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

export class Subscription extends $Base<'Subscription'> {
  constructor() {
    super('Subscription')
  }

  deck<Sel extends Selection<Card>>(
    selectorFn: (s: Card) => [...Sel]
  ): $Field<'deck', Array<JoinFields<Sel>> | undefined, 'Subscription'> {
    const options = {
      selection: selectorFn(new Card()),
    }
    return this.$_select('deck' as const, options)
  }
}

export class SpecialCard extends $Base<'SpecialCard'> {
  constructor() {
    super('SpecialCard')
  }

  get effect(): $Field<'effect', string, 'SpecialCard'> {
    return this.$_select('effect' as const)
  }
  get name(): $Field<'name', string, 'SpecialCard'> {
    return this.$_select('name' as const)
  }
  get thing(): $Field<'thing', string, 'SpecialCard'> {
    return this.$_select('thing' as const)
  }
}

export class EffectCard extends $Base<'EffectCard'> {
  constructor() {
    super('EffectCard')
  }

  get effectSize(): $Field<'effectSize', number, 'EffectCard'> {
    return this.$_select('effectSize' as const)
  }
  get name(): $Field<'name', string, 'EffectCard'> {
    return this.$_select('name' as const)
  }
  thing<Sel extends Selection<Number>>(
    selectorFn: (s: Number) => [...Sel]
  ): $Field<'thing', JoinFields<Sel>, 'EffectCard'> {
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

function query<Sel extends Selection<$ROOT['query']>>(fn: (root: $ROOT['query']) => Sel) {
  const field = new $Field<'_', JoinFields<Sel>, '_'>('_', '_', {
    selection: fn(new Query()),
  })

  return 'query' as any as TypedDocumentNode<JoinFields<Sel>, {}>
}

const cQ = query(q => [q.cardById({ cardId: 'a' }, c => [c.Attack, c.Defense])])
