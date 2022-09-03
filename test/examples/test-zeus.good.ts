import { verify } from './verify'
import { query, mutation, SpecialSkills, fragment, Card, $ } from './zeus.graphql.api'

const cardFragment = fragment(Card, c => [
  c.Attack, //
  c.Defense.as('def'),
])

let tq = query(q => [
  q.cardById({ cardId: $('cid', false) }, c => [
    ...cardFragment,
    c.attack({ cardID: $('cids') }, aCards => [
      aCards.Attack, //
      aCards.Defense,
    ]),
  ]),

  q
    .cardById({ cardId: $('cid2') }, c => [
      ...cardFragment,
      c.attack({ cardID: $('cids2') }, aCards => [
        aCards.Attack, //
        aCards.Defense,
      ]),
    ])
    .as('second'),

  q.drawCard(c => [
    c.Attack, //
    c.cardImage(ci => [
      ci.bucket, //
      ci.region,
      ci.key,
    ]),
  ]),

  q.drawChangeCard(cc => [
    cc.$on('EffectCard', sc => [
      sc.name, //
      sc.effectSize,
    ]),
    cc.$on('SpecialCard', sc => [
      sc.name, //
      sc.effect,
    ]),
  ]),
])

let tqString = `query ($cid: String, $cids: [String!]!, $cid2: String!, $cids2: [String!]!) {
  cardById(cardId: $cid) {
    Attack
    def: Defense
    attack(cardID: $cids) {
      Attack
      Defense
    }
  }
  second: cardById(cardId: $cid2) {
    Attack
    def: Defense
    attack(cardID: $cids2) {
      Attack
      Defense
    }
  }
  drawCard {
    Attack
    cardImage {
      bucket
      region
      key
    }
  }
  drawChangeCard {
    ... on EffectCard {
      name
      effectSize
    }
    ... on SpecialCard {
      name
      effect
    }
  }
}`

let tm = mutation(m => [
  m.addCard(
    {
      card: {
        Attack: 1,
        Defense: 2,
        name: 'Hi',
        description: 'Lo',
        skills: [$('skill')] as const,
      },
    },
    c => [c.Attack, c.Defense, c.Children]
  ),
])

let tmString = `
mutation ($skill: [SpecialSkills!]!) {
  addCard(
    card: {Attack: 1, Defense: 2, name: "Hi", description: "Lo", skills: [$skill]}
  ) {
    Attack
    Defense
    Children
  }
}`

let tmWithoutVariable = mutation(m => [
  m.addCard(
    {
      card: {
        Attack: 1,
        Defense: 2,
        name: 'Hi',
        description: 'Lo',
        skills: [SpecialSkills.FIRE],
      },
    },
    c => [c.Attack, c.Defense, c.Children]
  ),
])

let tmWithoutVariableString = `
mutation {
  addCard(
    card: {Attack: 1, Defense: 2, name: "Hi", description: "Lo", skills: [FIRE]}
  ) {
    Attack
    Defense
    Children
  }
}`

let nestedVariable = query(q => [
  q.drawCard(c => [c.attack({ cardID: $('cardID') }, s => [s.name])]),
])

export default [
  verify({
    query: tm,
    string: tmString,
    variables: {
      skill: SpecialSkills.RAIN,
    },
  }),
  verify({
    query: tmWithoutVariable,
    string: tmWithoutVariableString,
    variables: {},
  }),
  verify({
    query: nestedVariable,
    variables: {
      cardID: [],
    },
  }),
  verify({
    query: tq,
    string: tqString,
    variables: {
      // cid can be nullable
      cid: null,
      cid2: '1',
      cids: ['2'],
      cids2: ['works'],
      // cids2: ['4'],
    },
  }),
]
