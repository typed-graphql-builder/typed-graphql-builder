import { verify } from './verify'
import { query, mutation, SpecialSkills, fragment, Card, $ } from './zeus.graphql'

const cardFragment = fragment(Card, c => [
  c.Attack, //
  c.Defense.as('def'),
])

const tq = query(q => [
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

const tm = mutation(m => [
  m.addCard(
    {
      card: {
        Attack: 1,
        Defense: 2,
        name: 'Hi',
        description: 'Lo',
        skills: [SpecialSkills.FIRE],
        conditions: {
          _and: [
            { field1: { eq: $('hiz') } }, //
            { field2: { eq: $('bye') } },
          ] as const,
        },
      },
    },
    c => [c.Attack, c.Defense, c.Children]
  ),
])

export default [
  verify({
    query: tm,
    // string: '',
    variables: {
      hiz: 1,
      bye: 2,
    },
  }),
  verify({
    query: tq,
    // string: 'whatever',
    variables: {
      cid: '1',
      cid2: '1',
      cids: ['2'],
      cids2: ['4'],
    },
  }),
]
