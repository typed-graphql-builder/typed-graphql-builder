import path from 'path'
import { verify } from './verify'
import { query, mutation, SpecialSkills, fragment, Card, $ } from './zeus.graphql.api'

const cardFragment = fragment(Card, c => [
  c.Attack, //
  c.Defense.as('def'),
])

let tq = query(q => [
  q.cardById({ cardId: $('cid', true) }, c => [
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
        skills: $('skills'),
      },
    },
    c => [c.Attack, c.Defense, c.Children]
  ),
])

let addCardMutation = mutation(m => [
  m.addCard(
    {
      card: $('new_card'),
    },
    c => [c.Attack, c.Defense, c.Children]
  ),
])

let addCardMutationNullable = mutation(m => [
  m.addCard(
    {
      card: {
        Attack: 1,
        Defense: 2,
        name: 'Hi',
        description: 'Lo',
        skills: $('addCard_skills', true),
      },
    },
    c => [c.Attack, c.Defense, c.Children]
  ),
])

let tmString = `
mutation ($skills: [SpecialSkills!]!) {
  addCard(
    card: {Attack: 1, Defense: 2, name: "Hi", description: "Lo", skills: $skills}
  ) {
    Attack
    Defense
    Children
  }
}`

let addCardMutationString = `
mutation ($new_card: createCard!) {
  addCard(card: $new_card) {
    Attack
    Defense
    Children
  }
}`

let addCardMutationNullableString = `
mutation ($addCard_skills: [SpecialSkills!]) {
  addCard(
    card: {Attack: 1, Defense: 2, name: "Hi", description: "Lo", skills: $addCard_skills}
  ) {
    Attack
    Defense
    Children
  }
}
`

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

function stringOrNull(): string | null {
  return 'works'
}

export default [
  verify({
    query: tm,
    string: tmString,
    schemaPath: path.join(__dirname, 'zeus.graphql'),
    variables: {
      skills: [SpecialSkills.RAIN],
    },
  }),
  verify({
    query: addCardMutation,
    string: addCardMutationString,
    schemaPath: path.join(__dirname, 'zeus.graphql'),
    variables: {
      new_card: {
        Attack: 2,
        Defense: 3,
        description: '',
        name: '',
        Children: null,
        skills: [],
      },
    },
  }),
  verify({
    query: addCardMutationNullable,
    string: addCardMutationNullableString,
    schemaPath: path.join(__dirname, 'zeus.graphql'),
    variables: {
      addCard_skills: null,
    },
  }),
  verify({
    query: tmWithoutVariable,
    string: tmWithoutVariableString,
    schemaPath: path.join(__dirname, 'zeus.graphql'),
    variables: {},
  }),
  verify({
    query: nestedVariable,
    schemaPath: path.join(__dirname, 'zeus.graphql'),
    variables: {
      cardID: [],
    },
  }),
  verify({
    query: tq,
    string: tqString,
    schemaPath: path.join(__dirname, 'zeus.graphql'),
    variables: {
      // cid can be nullable
      // cid: null,
      cid: stringOrNull(),
      cid2: '1',
      cids: ['2'],
      cids2: ['works'],
      // cids2: ['4'],
    },
  }),
]
