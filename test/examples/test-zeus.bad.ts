import { mutation, $, SpecialSkills } from './zeus.graphql.api'
import { verify } from './verify'

const tm = mutation(m => [
  m.addCard(
    {
      card: {
        Attack: 1,
        Defense: 2,
        name: 'Hi',
        description: $('description'),
        skills: [SpecialSkills.FIRE],
      },
    },
    c => [c.Attack, c.Defense, c.Children]
  ),
])

export default [
  verify({
    query: tm,
    string: '',
    schemaPath: 'zeus.graphql',
    variables: {},
  }),
]
