import { type } from 'os'
import { $$, ExactArgNames, query, Query, Variable } from './countries.graphql.api'
import type { Mutation } from './scalars.graphql.api';

query('MyName', q => [q.continent({ code: $$('test'), extraArg: 1 }, c => [c.code, c.name])])


type Devariable<T> =
  T extends Variable<any, any>
    ? never
    :
  T extends string | number | null | undefined | boolean
    ? T
    :  T extends ReadonlyArray<infer U>
    ? ReadonlyArray<Devariable<U>>
    : { [K in keyof T]: Devariable<T[K]> }


type NonFnArg<A extends any[]> = A[0] extends Function ? never : A[0];

type ArgFinder<T> = T extends {
  (...args: infer A1): any;
  (...args: infer A2): any
} ? NonFnArg<A1> | NonFnArg<A2> : T extends {
  (...args: infer A1): any
} ? NonFnArg<A1> : never;


type QueryInput<FnType> = Devariable<ArgFinder<FnType>>

// example usage
type Arg = QueryInput<typeof Query.prototype.countries>

type Lol = QueryInput<typeof Query.prototype.language>

declare let arg: Arg;

arg.filter?.code?.eq