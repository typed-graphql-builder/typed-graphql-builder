import { TypedDocumentNode } from '@graphql-typed-document-node/core'
import { query, $, mutation, SpecialSkills, fragment, Card } from './zeus'

const cardFragment = fragment(Card, c => [
  c.Attack, //
  c.Defense.as('def'),
])

function verify<Inp, Out>(opts: {
  query: TypedDocumentNode<Out, Inp>
  string: string
  variables: Inp
}) {
  return () => {
    return opts
  }
}

/*
Expected query:

query($cid:String, $cids:String!, $cid2:String, $cids2:String!) {
  cardById(cardId:$cid) {
    Attack
    def:Defense
    attack(cardID:$cids) {
      Attack
      Defense
    }
  }
  second:cardById(cardId:$cid2){
    Attack
    def:Defense
    attack(cardID:$cids2) {
      Attack
      Defense
    }
  }
  drawCard{
    Attack
    cardImage{
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
}
*/

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

/*
Expected mutation:
mutation ($hiz:Int, $bye:Int) {
  addCard(card:{
    Attack:1,
    Defense:2,
    name:"Hi",
    description:"Lo",
    skills:["FIRE"],
    conditions:{
      _and:[
        {field1:{eq:$hiz}},
        {field2:{eq:$bye}}
      ]
    }
  }){
    Attack
    Defense
    Children
  }
}
 */
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

type GetInput<X> = X extends TypedDocumentNode<infer Out, infer In> ? In : never
type GetOutput<X> = X extends TypedDocumentNode<infer Out, infer In> ? Out : never

type test = GetInput<typeof tm>
type testO = GetOutput<typeof tq>

console.log(tq.loc?.source.body, tm.loc?.source.body)

verify({
  query: tq,
  string: 'whatever',
  variables: {
    cid: '1',
    cid2: '1',
    cids: ['2'],
    cids2: ['4'],
  },
})
