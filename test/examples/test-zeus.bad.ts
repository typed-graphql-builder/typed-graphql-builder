import { mutation, $, SpecialSkills } from './zeus.graphql'
import { verify } from './verify'

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
    string: '',
    variables: {},
  }),
]
