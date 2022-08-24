import { verify } from './verify'
import { query, mutation, SpecialSkills, fragment, Card, $ } from './zeus.graphql.api'

const cardFragment = fragment(Card, c => [
  c.Attack, //
  c.Defense.as('def'),
])

let tq = query(q => [
  q.cardById({ cardId: $('cid') }, c => [
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

let tqString = `
fragment Card_190nlxk on Card {
  Attack
  def: Defense
}

query ($cid: String, $cids: [String!]!, $cid2: String, $cids2: [String!]!) {
  cardById(cardId: $cid) {
    ...Card_190nlxk
    attack(cardID: $cids) {
      Attack
      Defense
    }
  }
  second: cardById(cardId: $cid2) {
    ...Card_190nlxk
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
        skills: [SpecialSkills.FIRE],
      },
    },
    c => [c.Attack, c.Defense, c.Children]
  ),
])

let tmString = `mutation {
  addCard(
    card: {Attack: 1, Defense: 2, name: "Hi", description: "Lo", skills: ["FIRE"]}
  ) {
    Attack
    Defense
    Children
  }
}`

export default [
  verify({
    query: tm,
    string: tmString,
    variables: {},
  }),
  verify({
    query: tq,
    string: tqString,
    variables: {
      cid: '1',
      cid2: '1',
      cids: ['2'],
      cids2: ['4'],
    },
  }),
]
