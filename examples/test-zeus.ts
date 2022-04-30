import { TypedDocumentNode } from '@graphql-typed-document-node/core'
import { query, $, mutation } from './zeus'

type GetOutput<T extends TypedDocumentNode<any, any>> = T extends TypedDocumentNode<infer Out, any>
  ? Out
  : never

type GetInput<T extends TypedDocumentNode<any, any>> = T extends TypedDocumentNode<any, infer Inp>
  ? Inp
  : never

const tq = query(q => [
  q.cardById({ cardId: $('cid') }, c => [
    c.Attack,
    c.Defense.as('def'),
    c.attack({ cardID: $('cids') }, aCards => [aCards.Attack, aCards.Defense]),
  ]),

  q
    .cardById({ cardId: $('cid2') }, c => [
      c.Attack,
      c.Defense.as('def2'),
      c.attack({ cardID: $('cids2') }, aCards => [aCards.Attack, aCards.Defense]),
    ])
    .as('second'),

  q.drawCard(c => [c.Attack, c.cardImage(ci => [ci.bucket, ci.region, ci.key])]),
  q.drawChangeCard(cc => [
    cc.$on('EffectCard', sc => [sc.name, sc.effectSize]),
    cc.$on('SpecialCard', sc => [sc.name, sc.effect]),
  ]),
])

const tm = mutation(m => {
  let x = m.addCard(
    {
      card: {
        Attack: $('test'),
        Children: $('a'),
        Defense: 2,
        name: 'Hi',
        description: 'Lo',
        skills: [],
      },
    },
    c => [c.Attack, c.Defense]
  )
  return [x]
})

type OutTQ = GetOutput<typeof tq>
type InTQ = GetInput<typeof tq>

declare let out: OutTQ
declare let inp: InTQ
