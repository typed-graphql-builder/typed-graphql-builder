import { TypedDocumentNode } from '@graphql-typed-document-node/core'
import gql from 'graphql-tag'

/* tslint:disable */

const VariableName = ' $1fcbcbff-3e78-462f-b45c-668a3e09bfd8'
const VariableType = ' $1fcbcbff-3e78-462f-b45c-668a3e09bfd9'

class Variable<T, Name extends string> {
  private [VariableName]: Name
  private [VariableType]?: T

  constructor(name: Name) {
    this[VariableName] = name
  }
}

type VariabledInput<T> = T extends $Atomic | undefined
  ? Variable<NonNullable<T>, any> | T
  : T extends Array<infer R> | undefined
  ? Variable<NonNullable<T>, any> | Array<VariabledInput<NonNullable<R>>> | T
  : Variable<NonNullable<T>, any> | { [K in keyof T]: VariabledInput<T[K]> } | T

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never

export const $ = <Type, Name extends string>(name: Name) => {
  return new Variable(name) as Variable<Type, Name>
}

type SelectOptions = {
  argTypes?: { [key: string]: string }
  args?: { [key: string]: any }
  selection?: Selection<any>
}

class $Field<Name extends string, Type, Vars = {}> {
  public kind: 'field' = 'field'
  public type!: Type

  public vars!: Vars
  public alias: string | null = null

  constructor(public name: Name, public options: SelectOptions) {}

  as<Rename extends string>(alias: Rename): $Field<Rename, Type, Vars> {
    const f = new $Field(this.name, this.options)
    f.alias = alias
    return f as any
  }
}

class $Base<Name extends string> {
  constructor(private $$name: Name) {}

  protected $_select<Key extends string>(
    name: Key,
    options: SelectOptions = {}
  ): $Field<Key, any, any> {
    return new $Field(name, options)
  }
}

class $Union<T, Name extends String> {
  private type!: T
  private name!: Name

  constructor(private selectorClasses: { [K in keyof T]: { new (): T[K] } }) {}
  $on<Type extends keyof T, Sel extends Selection<T[Type]>>(
    alternative: Type,
    selectorFn: (selector: T[Type]) => [...Sel]
  ): $UnionSelection<GetOutput<Sel>, GetVariables<Sel>> {
    const selection = selectorFn(new this.selectorClasses[alternative]())

    return new $UnionSelection(alternative as string, selection)
  }
}

class $UnionSelection<T, Vars> {
  public kind: 'union' = 'union'
  private vars!: Vars
  constructor(public alternativeName: string, public alternativeSelection: Selection<T>) {}
}

type Selection<_any> = ReadonlyArray<$Field<any, any, any> | $UnionSelection<any, any>>

type NeverNever<T> = [T] extends [never] ? {} : T

export type GetOutput<X extends Selection<any>> = UnionToIntersection<
  {
    [I in keyof X]: X[I] extends $Field<infer Name, infer Type, any> ? { [K in Name]: Type } : never
  }[keyof X & number]
> &
  NeverNever<
    {
      [I in keyof X]: X[I] extends $UnionSelection<infer Type, any> ? Type : never
    }[keyof X & number]
  >

type ExtractInputVariables<Inputs> = Inputs extends Variable<infer VType, infer VName>
  ? { [key in VName]: VType }
  : Inputs extends $Atomic
  ? {}
  : Inputs extends [...Array<any>]
  ? UnionToIntersection<
      { [K in keyof Inputs]: ExtractInputVariables<Inputs[K]> }[keyof Inputs & number]
    >
  : UnionToIntersection<{ [K in keyof Inputs]: ExtractInputVariables<Inputs[K]> }[keyof Inputs]>

export type GetVariables<Sel extends Selection<any>, ExtraVars = {}> = UnionToIntersection<
  {
    [I in keyof Sel]: Sel[I] extends $Field<any, any, infer Vars>
      ? Vars
      : Sel[I] extends $UnionSelection<any, infer Vars>
      ? Vars
      : never
  }[keyof Sel & number]
> &
  ExtractInputVariables<ExtraVars>

function fieldToQuery(prefix: string, field: $Field<any, any, any>) {
  const variables = new Map<string, string>()

  function stringifyArgs(
    args: any,
    argTypes: { [key: string]: string },
    argVarType?: string
  ): string {
    switch (typeof args) {
      case 'string':
      case 'number':
      case 'boolean':
        return JSON.stringify(args)
      default:
        if (VariableName in (args as any)) {
          if (!argVarType) throw new Error('Cannot use variabe as sole unnamed field argument')
          const argVarName = (args as any)[VariableName]
          variables.set(argVarName, argVarType)
          return '$' + argVarName
        }
        if (Array.isArray(args))
          return '[' + args.map(arg => stringifyArgs(arg, argTypes, argVarType)).join(',') + ']'
        if (args == null) return 'null'
        const wrapped = (content: string) => (argVarType ? '{' + content + '}' : content)
        return wrapped(
          Array.from(Object.entries(args))
            .map(([key, val]) => {
              if (!argTypes[key]) {
                throw new Error(`Argument type for ${key} not found`)
              }
              const cleanType = argTypes[key].replace('[', '').replace(']', '').replace('!', '')
              return key + ':' + stringifyArgs(val, $InputTypes[cleanType], cleanType)
            })
            .join(',')
        )
    }
  }

  function extractTextAndVars(field: $Field<any, any, any> | $UnionSelection<any, any>) {
    if (field.kind === 'field') {
      let retVal = field.name
      if (field.alias) retVal = field.alias + ':' + retVal
      const args = field.options.args,
        argTypes = field.options.argTypes
      if (args) {
        retVal += '(' + stringifyArgs(args, argTypes!) + ')'
      }
      let sel = field.options.selection
      if (sel) {
        retVal += '{'
        for (let subField of sel) {
          retVal += extractTextAndVars(subField)
        }
        retVal += '}'
      }
      return retVal + ' '
    } else if (field.kind === 'union') {
      let retVal = '... on ' + field.alternativeName + ' {'
      for (let subField of field.alternativeSelection) {
        retVal += extractTextAndVars(subField)
      }
      retVal += '}'

      return retVal + ' '
    }
  }

  const queryRaw = extractTextAndVars(field)!

  const queryBody = queryRaw.substring(queryRaw.indexOf('{'))

  const varList = Array.from(variables.entries())
  let ret = prefix
  if (varList.length) {
    ret += '(' + varList.map(([name, kind]) => '$' + name + ':' + kind).join(',') + ')'
  }
  ret += queryBody

  return ret
}

export function fragment<T, Sel extends Selection<T>>(
  GQLType: { new (): T },
  selectFn: (selector: T) => [...Sel]
) {
  return selectFn(new GQLType())
}

type $Atomic =
  | string
  | booking_channel_constraint
  | booking_channel_enum
  | booking_channel_select_column
  | booking_channel_update_column
  | booking_constraint
  | booking_select_column
  | booking_status_enum
  | booking_update_column
  | bookingStatus_constraint
  | bookingStatus_select_column
  | bookingStatus_update_column
  | classification_constraint
  | classification_enum
  | classification_select_column
  | classification_update_column
  | connection_constraint
  | connection_select_column
  | connection_update_column
  | currency_constraint
  | currency_enum
  | currency_select_column
  | currency_update_column
  | entity_constraint
  | entity_select_column
  | entity_status_enum
  | entity_update_column
  | entityStatus_constraint
  | entityStatus_select_column
  | entityStatus_update_column
  | integration_constraint
  | integration_select_column
  | integration_type_enum
  | integration_update_column
  | integrationType_constraint
  | integrationType_select_column
  | integrationType_update_column
  | issue_constraint
  | issue_select_column
  | issue_update_column
  | job_constraint
  | job_method_enum
  | job_select_column
  | job_status_enum
  | job_update_column
  | jobMethod_constraint
  | jobMethod_select_column
  | jobMethod_update_column
  | jobStatus_constraint
  | jobStatus_select_column
  | jobStatus_update_column
  | line_constraint
  | line_select_column
  | line_update_column
  | metric_constraint
  | metric_select_column
  | metric_update_column
  | normalized_type_enum
  | normalizedType_constraint
  | normalizedType_select_column
  | normalizedType_update_column
  | order_by
  | payment_constraint
  | payment_select_column
  | payment_status_enum
  | payment_update_column
  | paymentStatus_constraint
  | paymentStatus_select_column
  | paymentStatus_update_column
  | paymentType_constraint
  | paymentType_select_column
  | paymentType_update_column
  | subclassification_constraint
  | subclassification_enum
  | subclassification_select_column
  | subclassification_update_column
  | tag_constraint
  | tag_select_column
  | tag_update_column
  | team_constraint
  | team_select_column
  | team_update_column
  | teamUser_constraint
  | teamUser_select_column
  | teamUser_update_column
  | unit_constraint
  | unit_select_column
  | unit_update_column
  | user_constraint
  | user_select_column
  | user_status_enum
  | user_update_column
  | userStatus_constraint
  | userStatus_select_column
  | userStatus_update_column
  | webhook_constraint
  | webhook_select_column
  | webhook_update_column
  | number
  | boolean

export type _text = unknown

/**
 * Boolean expression to compare columns of type "_text". All fields are combined with logical 'AND'.
 */
export type _text_comparison_exp = {
  _eq?: string | undefined
  _gt?: string | undefined
  _gte?: string | undefined
  _in?: Array<string> | undefined
  _is_null?: boolean | undefined
  _lt?: string | undefined
  _lte?: string | undefined
  _neq?: string | undefined
  _nin?: Array<string> | undefined
}

/**
 * columns and relationships of "booking"
 */
export class booking extends $Base<'booking'> {
  constructor() {
    super('booking')
  }

  get bookedAt(): $Field<'bookedAt', string | undefined> {
    return this.$_select('bookedAt') as any
  }

  get bookerName(): $Field<'bookerName', string | undefined> {
    return this.$_select('bookerName') as any
  }

  get bookingChannel(): $Field<'bookingChannel', booking_channel_enum | undefined> {
    return this.$_select('bookingChannel') as any
  }

  get checkIn(): $Field<'checkIn', string | undefined> {
    return this.$_select('checkIn') as any
  }

  get checkOut(): $Field<'checkOut', string | undefined> {
    return this.$_select('checkOut') as any
  }

  get confirmationCode(): $Field<'confirmationCode', string | undefined> {
    return this.$_select('confirmationCode') as any
  }

  /**
   * An object relationship
   */
  connection<Sel extends Selection<connection>>(
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'connection', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new connection()),
    }
    return this.$_select('connection', options) as any
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get currency(): $Field<'currency', currency_enum | undefined> {
    return this.$_select('currency') as any
  }

  /**
   * An object relationship
   */
  entity<Sel extends Selection<entity>>(
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'entity', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new entity()),
    }
    return this.$_select('entity', options) as any
  }

  get entityId(): $Field<'entityId', string | undefined> {
    return this.$_select('entityId') as any
  }

  get guestName(): $Field<'guestName', string | undefined> {
    return this.$_select('guestName') as any
  }

  get guests(): $Field<'guests', number | undefined> {
    return this.$_select('guests') as any
  }

  get id(): $Field<'id', string> {
    return this.$_select('id') as any
  }

  get isOTA(): $Field<'isOTA', boolean | undefined> {
    return this.$_select('isOTA') as any
  }

  /**
   * An array relationship
   */
  lines<
    Args extends VariabledInput<{
      distinct_on?: Array<line_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<line_order_by> | undefined
      where?: line_bool_exp | undefined
    }>,
    Sel extends Selection<line>
  >(
    args: Args,
    selectorFn: (s: line) => [...Sel]
  ): $Field<'lines', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[line_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[line_order_by!]',
        where: 'line_bool_exp',
      },
      args,

      selection: selectorFn(new line()),
    }
    return this.$_select('lines', options) as any
  }

  /**
   * An aggregate relationship
   */
  lines_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<line_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<line_order_by> | undefined
      where?: line_bool_exp | undefined
    }>,
    Sel extends Selection<line_aggregate>
  >(
    args: Args,
    selectorFn: (s: line_aggregate) => [...Sel]
  ): $Field<'lines_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[line_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[line_order_by!]',
        where: 'line_bool_exp',
      },
      args,

      selection: selectorFn(new line_aggregate()),
    }
    return this.$_select('lines_aggregate', options) as any
  }

  metadata<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'metadata', string | undefined, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('metadata', options) as any
  }

  get nights(): $Field<'nights', number | undefined> {
    return this.$_select('nights') as any
  }

  /**
   * An object relationship
   */
  otaBooking<Sel extends Selection<booking>>(
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'otaBooking', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new booking()),
    }
    return this.$_select('otaBooking', options) as any
  }

  get otaBookingId(): $Field<'otaBookingId', string | undefined> {
    return this.$_select('otaBookingId') as any
  }

  /**
   * An array relationship
   */
  relatedBookings<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_order_by> | undefined
      where?: booking_bool_exp | undefined
    }>,
    Sel extends Selection<booking>
  >(
    args: Args,
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'relatedBookings', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_order_by!]',
        where: 'booking_bool_exp',
      },
      args,

      selection: selectorFn(new booking()),
    }
    return this.$_select('relatedBookings', options) as any
  }

  /**
   * An aggregate relationship
   */
  relatedBookings_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_order_by> | undefined
      where?: booking_bool_exp | undefined
    }>,
    Sel extends Selection<booking_aggregate>
  >(
    args: Args,
    selectorFn: (s: booking_aggregate) => [...Sel]
  ): $Field<'relatedBookings_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_order_by!]',
        where: 'booking_bool_exp',
      },
      args,

      selection: selectorFn(new booking_aggregate()),
    }
    return this.$_select('relatedBookings_aggregate', options) as any
  }

  get status(): $Field<'status', booking_status_enum | undefined> {
    return this.$_select('status') as any
  }

  /**
   * An array relationship
   */
  tags<
    Args extends VariabledInput<{
      distinct_on?: Array<tag_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<tag_order_by> | undefined
      where?: tag_bool_exp | undefined
    }>,
    Sel extends Selection<tag>
  >(
    args: Args,
    selectorFn: (s: tag) => [...Sel]
  ): $Field<'tags', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[tag_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[tag_order_by!]',
        where: 'tag_bool_exp',
      },
      args,

      selection: selectorFn(new tag()),
    }
    return this.$_select('tags', options) as any
  }

  /**
   * An aggregate relationship
   */
  tags_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<tag_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<tag_order_by> | undefined
      where?: tag_bool_exp | undefined
    }>,
    Sel extends Selection<tag_aggregate>
  >(
    args: Args,
    selectorFn: (s: tag_aggregate) => [...Sel]
  ): $Field<'tags_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[tag_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[tag_order_by!]',
        where: 'tag_bool_exp',
      },
      args,

      selection: selectorFn(new tag_aggregate()),
    }
    return this.$_select('tags_aggregate', options) as any
  }

  /**
   * An object relationship
   */
  team<Sel extends Selection<team>>(
    selectorFn: (s: team) => [...Sel]
  ): $Field<'team', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team()),
    }
    return this.$_select('team', options) as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  /**
   * An object relationship
   */
  unit<Sel extends Selection<unit>>(
    selectorFn: (s: unit) => [...Sel]
  ): $Field<'unit', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new unit()),
    }
    return this.$_select('unit', options) as any
  }

  get unitId(): $Field<'unitId', string | undefined> {
    return this.$_select('unitId') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * aggregated selection of "booking"
 */
export class booking_aggregate extends $Base<'booking_aggregate'> {
  constructor() {
    super('booking_aggregate')
  }

  aggregate<Sel extends Selection<booking_aggregate_fields>>(
    selectorFn: (s: booking_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new booking_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<booking>>(
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new booking()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "booking"
 */
export class booking_aggregate_fields extends $Base<'booking_aggregate_fields'> {
  constructor() {
    super('booking_aggregate_fields')
  }

  avg<Sel extends Selection<booking_avg_fields>>(
    selectorFn: (s: booking_avg_fields) => [...Sel]
  ): $Field<'avg', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new booking_avg_fields()),
    }
    return this.$_select('avg', options) as any
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<booking_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[booking_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<booking_max_fields>>(
    selectorFn: (s: booking_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new booking_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<booking_min_fields>>(
    selectorFn: (s: booking_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new booking_min_fields()),
    }
    return this.$_select('min', options) as any
  }

  stddev<Sel extends Selection<booking_stddev_fields>>(
    selectorFn: (s: booking_stddev_fields) => [...Sel]
  ): $Field<'stddev', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new booking_stddev_fields()),
    }
    return this.$_select('stddev', options) as any
  }

  stddev_pop<Sel extends Selection<booking_stddev_pop_fields>>(
    selectorFn: (s: booking_stddev_pop_fields) => [...Sel]
  ): $Field<'stddev_pop', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new booking_stddev_pop_fields()),
    }
    return this.$_select('stddev_pop', options) as any
  }

  stddev_samp<Sel extends Selection<booking_stddev_samp_fields>>(
    selectorFn: (s: booking_stddev_samp_fields) => [...Sel]
  ): $Field<'stddev_samp', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new booking_stddev_samp_fields()),
    }
    return this.$_select('stddev_samp', options) as any
  }

  sum<Sel extends Selection<booking_sum_fields>>(
    selectorFn: (s: booking_sum_fields) => [...Sel]
  ): $Field<'sum', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new booking_sum_fields()),
    }
    return this.$_select('sum', options) as any
  }

  var_pop<Sel extends Selection<booking_var_pop_fields>>(
    selectorFn: (s: booking_var_pop_fields) => [...Sel]
  ): $Field<'var_pop', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new booking_var_pop_fields()),
    }
    return this.$_select('var_pop', options) as any
  }

  var_samp<Sel extends Selection<booking_var_samp_fields>>(
    selectorFn: (s: booking_var_samp_fields) => [...Sel]
  ): $Field<'var_samp', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new booking_var_samp_fields()),
    }
    return this.$_select('var_samp', options) as any
  }

  variance<Sel extends Selection<booking_variance_fields>>(
    selectorFn: (s: booking_variance_fields) => [...Sel]
  ): $Field<'variance', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new booking_variance_fields()),
    }
    return this.$_select('variance', options) as any
  }
}

/**
 * order by aggregate values of table "booking"
 */
export type booking_aggregate_order_by = {
  avg?: booking_avg_order_by | undefined
  count?: order_by | undefined
  max?: booking_max_order_by | undefined
  min?: booking_min_order_by | undefined
  stddev?: booking_stddev_order_by | undefined
  stddev_pop?: booking_stddev_pop_order_by | undefined
  stddev_samp?: booking_stddev_samp_order_by | undefined
  sum?: booking_sum_order_by | undefined
  var_pop?: booking_var_pop_order_by | undefined
  var_samp?: booking_var_samp_order_by | undefined
  variance?: booking_variance_order_by | undefined
}

/**
 * append existing jsonb value of filtered columns with new jsonb value
 */
export type booking_append_input = {
  metadata?: string | undefined
}

/**
 * input type for inserting array relation for remote table "booking"
 */
export type booking_arr_rel_insert_input = {
  data: Array<booking_insert_input>
  on_conflict?: booking_on_conflict | undefined
}

/**
 * aggregate avg on columns
 */
export class booking_avg_fields extends $Base<'booking_avg_fields'> {
  constructor() {
    super('booking_avg_fields')
  }

  get guests(): $Field<'guests', number | undefined> {
    return this.$_select('guests') as any
  }

  get nights(): $Field<'nights', number | undefined> {
    return this.$_select('nights') as any
  }
}

/**
 * order by avg() on columns of table "booking"
 */
export type booking_avg_order_by = {
  guests?: order_by | undefined
  nights?: order_by | undefined
}

/**
 * Boolean expression to filter rows from the table "booking". All fields are combined with a logical 'AND'.
 */
export type booking_bool_exp = {
  _and?: Array<booking_bool_exp> | undefined
  _not?: booking_bool_exp | undefined
  _or?: Array<booking_bool_exp> | undefined
  bookedAt?: timestamptz_comparison_exp | undefined
  bookerName?: String_comparison_exp | undefined
  bookingChannel?: booking_channel_enum_comparison_exp | undefined
  checkIn?: timestamptz_comparison_exp | undefined
  checkOut?: timestamptz_comparison_exp | undefined
  confirmationCode?: String_comparison_exp | undefined
  connection?: connection_bool_exp | undefined
  connectionId?: uuid_comparison_exp | undefined
  createdAt?: timestamptz_comparison_exp | undefined
  currency?: currency_enum_comparison_exp | undefined
  entity?: entity_bool_exp | undefined
  entityId?: uuid_comparison_exp | undefined
  guestName?: String_comparison_exp | undefined
  guests?: Int_comparison_exp | undefined
  id?: uuid_comparison_exp | undefined
  isOTA?: Boolean_comparison_exp | undefined
  lines?: line_bool_exp | undefined
  metadata?: jsonb_comparison_exp | undefined
  nights?: Int_comparison_exp | undefined
  otaBooking?: booking_bool_exp | undefined
  otaBookingId?: uuid_comparison_exp | undefined
  relatedBookings?: booking_bool_exp | undefined
  status?: booking_status_enum_comparison_exp | undefined
  tags?: tag_bool_exp | undefined
  team?: team_bool_exp | undefined
  teamId?: uuid_comparison_exp | undefined
  uniqueRef?: String_comparison_exp | undefined
  unit?: unit_bool_exp | undefined
  unitId?: uuid_comparison_exp | undefined
  updatedAt?: timestamptz_comparison_exp | undefined
}

/**
 * columns and relationships of "booking_channel"
 */
export class booking_channel extends $Base<'booking_channel'> {
  constructor() {
    super('booking_channel')
  }

  get name(): $Field<'name', string> {
    return this.$_select('name') as any
  }
}

/**
 * aggregated selection of "booking_channel"
 */
export class booking_channel_aggregate extends $Base<'booking_channel_aggregate'> {
  constructor() {
    super('booking_channel_aggregate')
  }

  aggregate<Sel extends Selection<booking_channel_aggregate_fields>>(
    selectorFn: (s: booking_channel_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new booking_channel_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<booking_channel>>(
    selectorFn: (s: booking_channel) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new booking_channel()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "booking_channel"
 */
export class booking_channel_aggregate_fields extends $Base<'booking_channel_aggregate_fields'> {
  constructor() {
    super('booking_channel_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<booking_channel_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[booking_channel_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<booking_channel_max_fields>>(
    selectorFn: (s: booking_channel_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new booking_channel_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<booking_channel_min_fields>>(
    selectorFn: (s: booking_channel_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new booking_channel_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * Boolean expression to filter rows from the table "booking_channel". All fields are combined with a logical 'AND'.
 */
export type booking_channel_bool_exp = {
  _and?: Array<booking_channel_bool_exp> | undefined
  _not?: booking_channel_bool_exp | undefined
  _or?: Array<booking_channel_bool_exp> | undefined
  name?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "booking_channel"
 */
export enum booking_channel_constraint {
  /**
   * unique or primary key constraint
   */
  booking_channel_pkey = 'booking_channel_pkey',
}

export enum booking_channel_enum {
  airbnb = 'airbnb',

  bookingcom = 'bookingcom',

  direct = 'direct',

  expedia = 'expedia',

  tripadvisor = 'tripadvisor',

  vrbo = 'vrbo',
}

/**
 * Boolean expression to compare columns of type "booking_channel_enum". All fields are combined with logical 'AND'.
 */
export type booking_channel_enum_comparison_exp = {
  _eq?: booking_channel_enum | undefined
  _in?: Array<booking_channel_enum> | undefined
  _is_null?: boolean | undefined
  _neq?: booking_channel_enum | undefined
  _nin?: Array<booking_channel_enum> | undefined
}

/**
 * input type for inserting data into table "booking_channel"
 */
export type booking_channel_insert_input = {
  name?: string | undefined
}

/**
 * aggregate max on columns
 */
export class booking_channel_max_fields extends $Base<'booking_channel_max_fields'> {
  constructor() {
    super('booking_channel_max_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * aggregate min on columns
 */
export class booking_channel_min_fields extends $Base<'booking_channel_min_fields'> {
  constructor() {
    super('booking_channel_min_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * response of any mutation on the table "booking_channel"
 */
export class booking_channel_mutation_response extends $Base<'booking_channel_mutation_response'> {
  constructor() {
    super('booking_channel_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<booking_channel>>(
    selectorFn: (s: booking_channel) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new booking_channel()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "booking_channel"
 */
export type booking_channel_on_conflict = {
  constraint: booking_channel_constraint
  update_columns: Array<booking_channel_update_column>
  where?: booking_channel_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "booking_channel".
 */
export type booking_channel_order_by = {
  name?: order_by | undefined
}

/**
 * primary key columns input for table: booking_channel
 */
export type booking_channel_pk_columns_input = {
  name: string
}

/**
 * select columns of table "booking_channel"
 */
export enum booking_channel_select_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * input type for updating data in table "booking_channel"
 */
export type booking_channel_set_input = {
  name?: string | undefined
}

/**
 * update columns of table "booking_channel"
 */
export enum booking_channel_update_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * unique or primary key constraints on table "booking"
 */
export enum booking_constraint {
  /**
   * unique or primary key constraint
   */
  booking_pkey = 'booking_pkey',
}

/**
 * delete the field or element with specified path (for JSON arrays, negative integers count from the end)
 */
export type booking_delete_at_path_input = {
  metadata?: Array<string> | undefined
}

/**
 * delete the array element with specified index (negative integers count from the
end). throws an error if top level container is not an array
 */
export type booking_delete_elem_input = {
  metadata?: number | undefined
}

/**
 * delete key/value pair or string element. key/value pairs are matched based on their key value
 */
export type booking_delete_key_input = {
  metadata?: string | undefined
}

/**
 * input type for incrementing numeric columns in table "booking"
 */
export type booking_inc_input = {
  guests?: number | undefined
  nights?: number | undefined
}

/**
 * input type for inserting data into table "booking"
 */
export type booking_insert_input = {
  bookedAt?: string | undefined
  bookerName?: string | undefined
  bookingChannel?: booking_channel_enum | undefined
  checkIn?: string | undefined
  checkOut?: string | undefined
  confirmationCode?: string | undefined
  connection?: connection_obj_rel_insert_input | undefined
  connectionId?: string | undefined
  createdAt?: string | undefined
  currency?: currency_enum | undefined
  entity?: entity_obj_rel_insert_input | undefined
  entityId?: string | undefined
  guestName?: string | undefined
  guests?: number | undefined
  id?: string | undefined
  isOTA?: boolean | undefined
  lines?: line_arr_rel_insert_input | undefined
  metadata?: string | undefined
  nights?: number | undefined
  otaBooking?: booking_obj_rel_insert_input | undefined
  otaBookingId?: string | undefined
  relatedBookings?: booking_arr_rel_insert_input | undefined
  status?: booking_status_enum | undefined
  tags?: tag_arr_rel_insert_input | undefined
  team?: team_obj_rel_insert_input | undefined
  teamId?: string | undefined
  uniqueRef?: string | undefined
  unit?: unit_obj_rel_insert_input | undefined
  unitId?: string | undefined
  updatedAt?: string | undefined
}

/**
 * aggregate max on columns
 */
export class booking_max_fields extends $Base<'booking_max_fields'> {
  constructor() {
    super('booking_max_fields')
  }

  get bookedAt(): $Field<'bookedAt', string | undefined> {
    return this.$_select('bookedAt') as any
  }

  get bookerName(): $Field<'bookerName', string | undefined> {
    return this.$_select('bookerName') as any
  }

  get checkIn(): $Field<'checkIn', string | undefined> {
    return this.$_select('checkIn') as any
  }

  get checkOut(): $Field<'checkOut', string | undefined> {
    return this.$_select('checkOut') as any
  }

  get confirmationCode(): $Field<'confirmationCode', string | undefined> {
    return this.$_select('confirmationCode') as any
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get entityId(): $Field<'entityId', string | undefined> {
    return this.$_select('entityId') as any
  }

  get guestName(): $Field<'guestName', string | undefined> {
    return this.$_select('guestName') as any
  }

  get guests(): $Field<'guests', number | undefined> {
    return this.$_select('guests') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get nights(): $Field<'nights', number | undefined> {
    return this.$_select('nights') as any
  }

  get otaBookingId(): $Field<'otaBookingId', string | undefined> {
    return this.$_select('otaBookingId') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get unitId(): $Field<'unitId', string | undefined> {
    return this.$_select('unitId') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * order by max() on columns of table "booking"
 */
export type booking_max_order_by = {
  bookedAt?: order_by | undefined
  bookerName?: order_by | undefined
  checkIn?: order_by | undefined
  checkOut?: order_by | undefined
  confirmationCode?: order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  entityId?: order_by | undefined
  guestName?: order_by | undefined
  guests?: order_by | undefined
  id?: order_by | undefined
  nights?: order_by | undefined
  otaBookingId?: order_by | undefined
  teamId?: order_by | undefined
  uniqueRef?: order_by | undefined
  unitId?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * aggregate min on columns
 */
export class booking_min_fields extends $Base<'booking_min_fields'> {
  constructor() {
    super('booking_min_fields')
  }

  get bookedAt(): $Field<'bookedAt', string | undefined> {
    return this.$_select('bookedAt') as any
  }

  get bookerName(): $Field<'bookerName', string | undefined> {
    return this.$_select('bookerName') as any
  }

  get checkIn(): $Field<'checkIn', string | undefined> {
    return this.$_select('checkIn') as any
  }

  get checkOut(): $Field<'checkOut', string | undefined> {
    return this.$_select('checkOut') as any
  }

  get confirmationCode(): $Field<'confirmationCode', string | undefined> {
    return this.$_select('confirmationCode') as any
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get entityId(): $Field<'entityId', string | undefined> {
    return this.$_select('entityId') as any
  }

  get guestName(): $Field<'guestName', string | undefined> {
    return this.$_select('guestName') as any
  }

  get guests(): $Field<'guests', number | undefined> {
    return this.$_select('guests') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get nights(): $Field<'nights', number | undefined> {
    return this.$_select('nights') as any
  }

  get otaBookingId(): $Field<'otaBookingId', string | undefined> {
    return this.$_select('otaBookingId') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get unitId(): $Field<'unitId', string | undefined> {
    return this.$_select('unitId') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * order by min() on columns of table "booking"
 */
export type booking_min_order_by = {
  bookedAt?: order_by | undefined
  bookerName?: order_by | undefined
  checkIn?: order_by | undefined
  checkOut?: order_by | undefined
  confirmationCode?: order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  entityId?: order_by | undefined
  guestName?: order_by | undefined
  guests?: order_by | undefined
  id?: order_by | undefined
  nights?: order_by | undefined
  otaBookingId?: order_by | undefined
  teamId?: order_by | undefined
  uniqueRef?: order_by | undefined
  unitId?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * response of any mutation on the table "booking"
 */
export class booking_mutation_response extends $Base<'booking_mutation_response'> {
  constructor() {
    super('booking_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<booking>>(
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new booking()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * input type for inserting object relation for remote table "booking"
 */
export type booking_obj_rel_insert_input = {
  data: booking_insert_input
  on_conflict?: booking_on_conflict | undefined
}

/**
 * on conflict condition type for table "booking"
 */
export type booking_on_conflict = {
  constraint: booking_constraint
  update_columns: Array<booking_update_column>
  where?: booking_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "booking".
 */
export type booking_order_by = {
  bookedAt?: order_by | undefined
  bookerName?: order_by | undefined
  bookingChannel?: order_by | undefined
  checkIn?: order_by | undefined
  checkOut?: order_by | undefined
  confirmationCode?: order_by | undefined
  connection?: connection_order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  currency?: order_by | undefined
  entity?: entity_order_by | undefined
  entityId?: order_by | undefined
  guestName?: order_by | undefined
  guests?: order_by | undefined
  id?: order_by | undefined
  isOTA?: order_by | undefined
  lines_aggregate?: line_aggregate_order_by | undefined
  metadata?: order_by | undefined
  nights?: order_by | undefined
  otaBooking?: booking_order_by | undefined
  otaBookingId?: order_by | undefined
  relatedBookings_aggregate?: booking_aggregate_order_by | undefined
  status?: order_by | undefined
  tags_aggregate?: tag_aggregate_order_by | undefined
  team?: team_order_by | undefined
  teamId?: order_by | undefined
  uniqueRef?: order_by | undefined
  unit?: unit_order_by | undefined
  unitId?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * primary key columns input for table: booking
 */
export type booking_pk_columns_input = {
  id: string
}

/**
 * prepend existing jsonb value of filtered columns with new jsonb value
 */
export type booking_prepend_input = {
  metadata?: string | undefined
}

/**
 * select columns of table "booking"
 */
export enum booking_select_column {
  /**
   * column name
   */
  bookedAt = 'bookedAt',

  /**
   * column name
   */
  bookerName = 'bookerName',

  /**
   * column name
   */
  bookingChannel = 'bookingChannel',

  /**
   * column name
   */
  checkIn = 'checkIn',

  /**
   * column name
   */
  checkOut = 'checkOut',

  /**
   * column name
   */
  confirmationCode = 'confirmationCode',

  /**
   * column name
   */
  connectionId = 'connectionId',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  currency = 'currency',

  /**
   * column name
   */
  entityId = 'entityId',

  /**
   * column name
   */
  guestName = 'guestName',

  /**
   * column name
   */
  guests = 'guests',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  isOTA = 'isOTA',

  /**
   * column name
   */
  metadata = 'metadata',

  /**
   * column name
   */
  nights = 'nights',

  /**
   * column name
   */
  otaBookingId = 'otaBookingId',

  /**
   * column name
   */
  status = 'status',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  uniqueRef = 'uniqueRef',

  /**
   * column name
   */
  unitId = 'unitId',

  /**
   * column name
   */
  updatedAt = 'updatedAt',
}

/**
 * input type for updating data in table "booking"
 */
export type booking_set_input = {
  bookedAt?: string | undefined
  bookerName?: string | undefined
  bookingChannel?: booking_channel_enum | undefined
  checkIn?: string | undefined
  checkOut?: string | undefined
  confirmationCode?: string | undefined
  connectionId?: string | undefined
  createdAt?: string | undefined
  currency?: currency_enum | undefined
  entityId?: string | undefined
  guestName?: string | undefined
  guests?: number | undefined
  id?: string | undefined
  isOTA?: boolean | undefined
  metadata?: string | undefined
  nights?: number | undefined
  otaBookingId?: string | undefined
  status?: booking_status_enum | undefined
  teamId?: string | undefined
  uniqueRef?: string | undefined
  unitId?: string | undefined
  updatedAt?: string | undefined
}

export enum booking_status_enum {
  booked = 'booked',

  cancelled = 'cancelled',

  inquired = 'inquired',

  inquiry = 'inquiry',

  payed = 'payed',
}

/**
 * Boolean expression to compare columns of type "booking_status_enum". All fields are combined with logical 'AND'.
 */
export type booking_status_enum_comparison_exp = {
  _eq?: booking_status_enum | undefined
  _in?: Array<booking_status_enum> | undefined
  _is_null?: boolean | undefined
  _neq?: booking_status_enum | undefined
  _nin?: Array<booking_status_enum> | undefined
}

/**
 * aggregate stddev on columns
 */
export class booking_stddev_fields extends $Base<'booking_stddev_fields'> {
  constructor() {
    super('booking_stddev_fields')
  }

  get guests(): $Field<'guests', number | undefined> {
    return this.$_select('guests') as any
  }

  get nights(): $Field<'nights', number | undefined> {
    return this.$_select('nights') as any
  }
}

/**
 * order by stddev() on columns of table "booking"
 */
export type booking_stddev_order_by = {
  guests?: order_by | undefined
  nights?: order_by | undefined
}

/**
 * aggregate stddev_pop on columns
 */
export class booking_stddev_pop_fields extends $Base<'booking_stddev_pop_fields'> {
  constructor() {
    super('booking_stddev_pop_fields')
  }

  get guests(): $Field<'guests', number | undefined> {
    return this.$_select('guests') as any
  }

  get nights(): $Field<'nights', number | undefined> {
    return this.$_select('nights') as any
  }
}

/**
 * order by stddev_pop() on columns of table "booking"
 */
export type booking_stddev_pop_order_by = {
  guests?: order_by | undefined
  nights?: order_by | undefined
}

/**
 * aggregate stddev_samp on columns
 */
export class booking_stddev_samp_fields extends $Base<'booking_stddev_samp_fields'> {
  constructor() {
    super('booking_stddev_samp_fields')
  }

  get guests(): $Field<'guests', number | undefined> {
    return this.$_select('guests') as any
  }

  get nights(): $Field<'nights', number | undefined> {
    return this.$_select('nights') as any
  }
}

/**
 * order by stddev_samp() on columns of table "booking"
 */
export type booking_stddev_samp_order_by = {
  guests?: order_by | undefined
  nights?: order_by | undefined
}

/**
 * aggregate sum on columns
 */
export class booking_sum_fields extends $Base<'booking_sum_fields'> {
  constructor() {
    super('booking_sum_fields')
  }

  get guests(): $Field<'guests', number | undefined> {
    return this.$_select('guests') as any
  }

  get nights(): $Field<'nights', number | undefined> {
    return this.$_select('nights') as any
  }
}

/**
 * order by sum() on columns of table "booking"
 */
export type booking_sum_order_by = {
  guests?: order_by | undefined
  nights?: order_by | undefined
}

/**
 * update columns of table "booking"
 */
export enum booking_update_column {
  /**
   * column name
   */
  bookedAt = 'bookedAt',

  /**
   * column name
   */
  bookerName = 'bookerName',

  /**
   * column name
   */
  bookingChannel = 'bookingChannel',

  /**
   * column name
   */
  checkIn = 'checkIn',

  /**
   * column name
   */
  checkOut = 'checkOut',

  /**
   * column name
   */
  confirmationCode = 'confirmationCode',

  /**
   * column name
   */
  connectionId = 'connectionId',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  currency = 'currency',

  /**
   * column name
   */
  entityId = 'entityId',

  /**
   * column name
   */
  guestName = 'guestName',

  /**
   * column name
   */
  guests = 'guests',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  isOTA = 'isOTA',

  /**
   * column name
   */
  metadata = 'metadata',

  /**
   * column name
   */
  nights = 'nights',

  /**
   * column name
   */
  otaBookingId = 'otaBookingId',

  /**
   * column name
   */
  status = 'status',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  uniqueRef = 'uniqueRef',

  /**
   * column name
   */
  unitId = 'unitId',

  /**
   * column name
   */
  updatedAt = 'updatedAt',
}

/**
 * aggregate var_pop on columns
 */
export class booking_var_pop_fields extends $Base<'booking_var_pop_fields'> {
  constructor() {
    super('booking_var_pop_fields')
  }

  get guests(): $Field<'guests', number | undefined> {
    return this.$_select('guests') as any
  }

  get nights(): $Field<'nights', number | undefined> {
    return this.$_select('nights') as any
  }
}

/**
 * order by var_pop() on columns of table "booking"
 */
export type booking_var_pop_order_by = {
  guests?: order_by | undefined
  nights?: order_by | undefined
}

/**
 * aggregate var_samp on columns
 */
export class booking_var_samp_fields extends $Base<'booking_var_samp_fields'> {
  constructor() {
    super('booking_var_samp_fields')
  }

  get guests(): $Field<'guests', number | undefined> {
    return this.$_select('guests') as any
  }

  get nights(): $Field<'nights', number | undefined> {
    return this.$_select('nights') as any
  }
}

/**
 * order by var_samp() on columns of table "booking"
 */
export type booking_var_samp_order_by = {
  guests?: order_by | undefined
  nights?: order_by | undefined
}

/**
 * aggregate variance on columns
 */
export class booking_variance_fields extends $Base<'booking_variance_fields'> {
  constructor() {
    super('booking_variance_fields')
  }

  get guests(): $Field<'guests', number | undefined> {
    return this.$_select('guests') as any
  }

  get nights(): $Field<'nights', number | undefined> {
    return this.$_select('nights') as any
  }
}

/**
 * order by variance() on columns of table "booking"
 */
export type booking_variance_order_by = {
  guests?: order_by | undefined
  nights?: order_by | undefined
}

/**
 * columns and relationships of "booking_status"
 */
export class bookingStatus extends $Base<'bookingStatus'> {
  constructor() {
    super('bookingStatus')
  }

  get name(): $Field<'name', string> {
    return this.$_select('name') as any
  }
}

/**
 * aggregated selection of "booking_status"
 */
export class bookingStatus_aggregate extends $Base<'bookingStatus_aggregate'> {
  constructor() {
    super('bookingStatus_aggregate')
  }

  aggregate<Sel extends Selection<bookingStatus_aggregate_fields>>(
    selectorFn: (s: bookingStatus_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new bookingStatus_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<bookingStatus>>(
    selectorFn: (s: bookingStatus) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new bookingStatus()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "booking_status"
 */
export class bookingStatus_aggregate_fields extends $Base<'bookingStatus_aggregate_fields'> {
  constructor() {
    super('bookingStatus_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<bookingStatus_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[bookingStatus_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<bookingStatus_max_fields>>(
    selectorFn: (s: bookingStatus_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new bookingStatus_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<bookingStatus_min_fields>>(
    selectorFn: (s: bookingStatus_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new bookingStatus_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * Boolean expression to filter rows from the table "booking_status". All fields are combined with a logical 'AND'.
 */
export type bookingStatus_bool_exp = {
  _and?: Array<bookingStatus_bool_exp> | undefined
  _not?: bookingStatus_bool_exp | undefined
  _or?: Array<bookingStatus_bool_exp> | undefined
  name?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "booking_status"
 */
export enum bookingStatus_constraint {
  /**
   * unique or primary key constraint
   */
  booking_status_pkey = 'booking_status_pkey',
}

/**
 * input type for inserting data into table "booking_status"
 */
export type bookingStatus_insert_input = {
  name?: string | undefined
}

/**
 * aggregate max on columns
 */
export class bookingStatus_max_fields extends $Base<'bookingStatus_max_fields'> {
  constructor() {
    super('bookingStatus_max_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * aggregate min on columns
 */
export class bookingStatus_min_fields extends $Base<'bookingStatus_min_fields'> {
  constructor() {
    super('bookingStatus_min_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * response of any mutation on the table "booking_status"
 */
export class bookingStatus_mutation_response extends $Base<'bookingStatus_mutation_response'> {
  constructor() {
    super('bookingStatus_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<bookingStatus>>(
    selectorFn: (s: bookingStatus) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new bookingStatus()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "booking_status"
 */
export type bookingStatus_on_conflict = {
  constraint: bookingStatus_constraint
  update_columns: Array<bookingStatus_update_column>
  where?: bookingStatus_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "booking_status".
 */
export type bookingStatus_order_by = {
  name?: order_by | undefined
}

/**
 * primary key columns input for table: bookingStatus
 */
export type bookingStatus_pk_columns_input = {
  name: string
}

/**
 * select columns of table "booking_status"
 */
export enum bookingStatus_select_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * input type for updating data in table "booking_status"
 */
export type bookingStatus_set_input = {
  name?: string | undefined
}

/**
 * update columns of table "booking_status"
 */
export enum bookingStatus_update_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * Boolean expression to compare columns of type "Boolean". All fields are combined with logical 'AND'.
 */
export type Boolean_comparison_exp = {
  _eq?: boolean | undefined
  _gt?: boolean | undefined
  _gte?: boolean | undefined
  _in?: Array<boolean> | undefined
  _is_null?: boolean | undefined
  _lt?: boolean | undefined
  _lte?: boolean | undefined
  _neq?: boolean | undefined
  _nin?: Array<boolean> | undefined
}

/**
 * columns and relationships of "classification"
 */
export class classification extends $Base<'classification'> {
  constructor() {
    super('classification')
  }

  get name(): $Field<'name', string> {
    return this.$_select('name') as any
  }
}

/**
 * aggregated selection of "classification"
 */
export class classification_aggregate extends $Base<'classification_aggregate'> {
  constructor() {
    super('classification_aggregate')
  }

  aggregate<Sel extends Selection<classification_aggregate_fields>>(
    selectorFn: (s: classification_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new classification_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<classification>>(
    selectorFn: (s: classification) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new classification()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "classification"
 */
export class classification_aggregate_fields extends $Base<'classification_aggregate_fields'> {
  constructor() {
    super('classification_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<classification_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[classification_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<classification_max_fields>>(
    selectorFn: (s: classification_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new classification_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<classification_min_fields>>(
    selectorFn: (s: classification_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new classification_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * Boolean expression to filter rows from the table "classification". All fields are combined with a logical 'AND'.
 */
export type classification_bool_exp = {
  _and?: Array<classification_bool_exp> | undefined
  _not?: classification_bool_exp | undefined
  _or?: Array<classification_bool_exp> | undefined
  name?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "classification"
 */
export enum classification_constraint {
  /**
   * unique or primary key constraint
   */
  classification_pkey = 'classification_pkey',
}

export enum classification_enum {
  adjustment = 'adjustment',

  commission = 'commission',

  exception = 'exception',

  paymentFee = 'paymentFee',

  revenue = 'revenue',

  securityDeposit = 'securityDeposit',

  tax = 'tax',
}

/**
 * Boolean expression to compare columns of type "classification_enum". All fields are combined with logical 'AND'.
 */
export type classification_enum_comparison_exp = {
  _eq?: classification_enum | undefined
  _in?: Array<classification_enum> | undefined
  _is_null?: boolean | undefined
  _neq?: classification_enum | undefined
  _nin?: Array<classification_enum> | undefined
}

/**
 * input type for inserting data into table "classification"
 */
export type classification_insert_input = {
  name?: string | undefined
}

/**
 * aggregate max on columns
 */
export class classification_max_fields extends $Base<'classification_max_fields'> {
  constructor() {
    super('classification_max_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * aggregate min on columns
 */
export class classification_min_fields extends $Base<'classification_min_fields'> {
  constructor() {
    super('classification_min_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * response of any mutation on the table "classification"
 */
export class classification_mutation_response extends $Base<'classification_mutation_response'> {
  constructor() {
    super('classification_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<classification>>(
    selectorFn: (s: classification) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new classification()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "classification"
 */
export type classification_on_conflict = {
  constraint: classification_constraint
  update_columns: Array<classification_update_column>
  where?: classification_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "classification".
 */
export type classification_order_by = {
  name?: order_by | undefined
}

/**
 * primary key columns input for table: classification
 */
export type classification_pk_columns_input = {
  name: string
}

/**
 * select columns of table "classification"
 */
export enum classification_select_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * input type for updating data in table "classification"
 */
export type classification_set_input = {
  name?: string | undefined
}

/**
 * update columns of table "classification"
 */
export enum classification_update_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * columns and relationships of "connection"
 */
export class connection extends $Base<'connection'> {
  constructor() {
    super('connection')
  }

  /**
   * An array relationship
   */
  bookings<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_order_by> | undefined
      where?: booking_bool_exp | undefined
    }>,
    Sel extends Selection<booking>
  >(
    args: Args,
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'bookings', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_order_by!]',
        where: 'booking_bool_exp',
      },
      args,

      selection: selectorFn(new booking()),
    }
    return this.$_select('bookings', options) as any
  }

  /**
   * An aggregate relationship
   */
  bookings_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_order_by> | undefined
      where?: booking_bool_exp | undefined
    }>,
    Sel extends Selection<booking_aggregate>
  >(
    args: Args,
    selectorFn: (s: booking_aggregate) => [...Sel]
  ): $Field<'bookings_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_order_by!]',
        where: 'booking_bool_exp',
      },
      args,

      selection: selectorFn(new booking_aggregate()),
    }
    return this.$_select('bookings_aggregate', options) as any
  }

  get createdAt(): $Field<'createdAt', string> {
    return this.$_select('createdAt') as any
  }

  credentials<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'credentials', string | undefined, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('credentials', options) as any
  }

  /**
   * An array relationship
   */
  entities<
    Args extends VariabledInput<{
      distinct_on?: Array<entity_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<entity_order_by> | undefined
      where?: entity_bool_exp | undefined
    }>,
    Sel extends Selection<entity>
  >(
    args: Args,
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'entities', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[entity_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[entity_order_by!]',
        where: 'entity_bool_exp',
      },
      args,

      selection: selectorFn(new entity()),
    }
    return this.$_select('entities', options) as any
  }

  /**
   * An aggregate relationship
   */
  entities_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<entity_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<entity_order_by> | undefined
      where?: entity_bool_exp | undefined
    }>,
    Sel extends Selection<entity_aggregate>
  >(
    args: Args,
    selectorFn: (s: entity_aggregate) => [...Sel]
  ): $Field<'entities_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[entity_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[entity_order_by!]',
        where: 'entity_bool_exp',
      },
      args,

      selection: selectorFn(new entity_aggregate()),
    }
    return this.$_select('entities_aggregate', options) as any
  }

  get id(): $Field<'id', string> {
    return this.$_select('id') as any
  }

  /**
   * An object relationship
   */
  integration<Sel extends Selection<integration>>(
    selectorFn: (s: integration) => [...Sel]
  ): $Field<'integration', GetOutput<Sel>> {
    const options = {
      selection: selectorFn(new integration()),
    }
    return this.$_select('integration', options) as any
  }

  get integrationId(): $Field<'integrationId', string> {
    return this.$_select('integrationId') as any
  }

  /**
   * An array relationship
   */
  jobs<
    Args extends VariabledInput<{
      distinct_on?: Array<job_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<job_order_by> | undefined
      where?: job_bool_exp | undefined
    }>,
    Sel extends Selection<job>
  >(
    args: Args,
    selectorFn: (s: job) => [...Sel]
  ): $Field<'jobs', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[job_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[job_order_by!]',
        where: 'job_bool_exp',
      },
      args,

      selection: selectorFn(new job()),
    }
    return this.$_select('jobs', options) as any
  }

  /**
   * An aggregate relationship
   */
  jobs_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<job_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<job_order_by> | undefined
      where?: job_bool_exp | undefined
    }>,
    Sel extends Selection<job_aggregate>
  >(
    args: Args,
    selectorFn: (s: job_aggregate) => [...Sel]
  ): $Field<'jobs_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[job_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[job_order_by!]',
        where: 'job_bool_exp',
      },
      args,

      selection: selectorFn(new job_aggregate()),
    }
    return this.$_select('jobs_aggregate', options) as any
  }

  /**
   * An array relationship
   */
  lines<
    Args extends VariabledInput<{
      distinct_on?: Array<line_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<line_order_by> | undefined
      where?: line_bool_exp | undefined
    }>,
    Sel extends Selection<line>
  >(
    args: Args,
    selectorFn: (s: line) => [...Sel]
  ): $Field<'lines', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[line_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[line_order_by!]',
        where: 'line_bool_exp',
      },
      args,

      selection: selectorFn(new line()),
    }
    return this.$_select('lines', options) as any
  }

  /**
   * An aggregate relationship
   */
  lines_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<line_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<line_order_by> | undefined
      where?: line_bool_exp | undefined
    }>,
    Sel extends Selection<line_aggregate>
  >(
    args: Args,
    selectorFn: (s: line_aggregate) => [...Sel]
  ): $Field<'lines_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[line_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[line_order_by!]',
        where: 'line_bool_exp',
      },
      args,

      selection: selectorFn(new line_aggregate()),
    }
    return this.$_select('lines_aggregate', options) as any
  }

  /**
   * An array relationship
   */
  metrics<
    Args extends VariabledInput<{
      distinct_on?: Array<metric_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<metric_order_by> | undefined
      where?: metric_bool_exp | undefined
    }>,
    Sel extends Selection<metric>
  >(
    args: Args,
    selectorFn: (s: metric) => [...Sel]
  ): $Field<'metrics', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[metric_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[metric_order_by!]',
        where: 'metric_bool_exp',
      },
      args,

      selection: selectorFn(new metric()),
    }
    return this.$_select('metrics', options) as any
  }

  /**
   * An aggregate relationship
   */
  metrics_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<metric_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<metric_order_by> | undefined
      where?: metric_bool_exp | undefined
    }>,
    Sel extends Selection<metric_aggregate>
  >(
    args: Args,
    selectorFn: (s: metric_aggregate) => [...Sel]
  ): $Field<'metrics_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[metric_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[metric_order_by!]',
        where: 'metric_bool_exp',
      },
      args,

      selection: selectorFn(new metric_aggregate()),
    }
    return this.$_select('metrics_aggregate', options) as any
  }

  get name(): $Field<'name', string> {
    return this.$_select('name') as any
  }

  /**
   * An array relationship
   */
  payments<
    Args extends VariabledInput<{
      distinct_on?: Array<payment_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<payment_order_by> | undefined
      where?: payment_bool_exp | undefined
    }>,
    Sel extends Selection<payment>
  >(
    args: Args,
    selectorFn: (s: payment) => [...Sel]
  ): $Field<'payments', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[payment_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[payment_order_by!]',
        where: 'payment_bool_exp',
      },
      args,

      selection: selectorFn(new payment()),
    }
    return this.$_select('payments', options) as any
  }

  /**
   * An aggregate relationship
   */
  payments_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<payment_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<payment_order_by> | undefined
      where?: payment_bool_exp | undefined
    }>,
    Sel extends Selection<payment_aggregate>
  >(
    args: Args,
    selectorFn: (s: payment_aggregate) => [...Sel]
  ): $Field<'payments_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[payment_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[payment_order_by!]',
        where: 'payment_bool_exp',
      },
      args,

      selection: selectorFn(new payment_aggregate()),
    }
    return this.$_select('payments_aggregate', options) as any
  }

  persistentState<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'persistentState', string | undefined, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('persistentState', options) as any
  }

  get status(): $Field<'status', string | undefined> {
    return this.$_select('status') as any
  }

  /**
   * An array relationship
   */
  tags<
    Args extends VariabledInput<{
      distinct_on?: Array<tag_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<tag_order_by> | undefined
      where?: tag_bool_exp | undefined
    }>,
    Sel extends Selection<tag>
  >(
    args: Args,
    selectorFn: (s: tag) => [...Sel]
  ): $Field<'tags', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[tag_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[tag_order_by!]',
        where: 'tag_bool_exp',
      },
      args,

      selection: selectorFn(new tag()),
    }
    return this.$_select('tags', options) as any
  }

  /**
   * An aggregate relationship
   */
  tags_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<tag_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<tag_order_by> | undefined
      where?: tag_bool_exp | undefined
    }>,
    Sel extends Selection<tag_aggregate>
  >(
    args: Args,
    selectorFn: (s: tag_aggregate) => [...Sel]
  ): $Field<'tags_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[tag_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[tag_order_by!]',
        where: 'tag_bool_exp',
      },
      args,

      selection: selectorFn(new tag_aggregate()),
    }
    return this.$_select('tags_aggregate', options) as any
  }

  /**
   * An object relationship
   */
  team<Sel extends Selection<team>>(
    selectorFn: (s: team) => [...Sel]
  ): $Field<'team', GetOutput<Sel>> {
    const options = {
      selection: selectorFn(new team()),
    }
    return this.$_select('team', options) as any
  }

  get teamId(): $Field<'teamId', string> {
    return this.$_select('teamId') as any
  }

  /**
   * An array relationship
   */
  units<
    Args extends VariabledInput<{
      distinct_on?: Array<unit_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<unit_order_by> | undefined
      where?: unit_bool_exp | undefined
    }>,
    Sel extends Selection<unit>
  >(
    args: Args,
    selectorFn: (s: unit) => [...Sel]
  ): $Field<'units', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[unit_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[unit_order_by!]',
        where: 'unit_bool_exp',
      },
      args,

      selection: selectorFn(new unit()),
    }
    return this.$_select('units', options) as any
  }

  /**
   * An aggregate relationship
   */
  units_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<unit_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<unit_order_by> | undefined
      where?: unit_bool_exp | undefined
    }>,
    Sel extends Selection<unit_aggregate>
  >(
    args: Args,
    selectorFn: (s: unit_aggregate) => [...Sel]
  ): $Field<'units_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[unit_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[unit_order_by!]',
        where: 'unit_bool_exp',
      },
      args,

      selection: selectorFn(new unit_aggregate()),
    }
    return this.$_select('units_aggregate', options) as any
  }

  get webhookKey(): $Field<'webhookKey', string | undefined> {
    return this.$_select('webhookKey') as any
  }
}

/**
 * aggregated selection of "connection"
 */
export class connection_aggregate extends $Base<'connection_aggregate'> {
  constructor() {
    super('connection_aggregate')
  }

  aggregate<Sel extends Selection<connection_aggregate_fields>>(
    selectorFn: (s: connection_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new connection_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<connection>>(
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new connection()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "connection"
 */
export class connection_aggregate_fields extends $Base<'connection_aggregate_fields'> {
  constructor() {
    super('connection_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<connection_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[connection_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<connection_max_fields>>(
    selectorFn: (s: connection_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new connection_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<connection_min_fields>>(
    selectorFn: (s: connection_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new connection_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * order by aggregate values of table "connection"
 */
export type connection_aggregate_order_by = {
  count?: order_by | undefined
  max?: connection_max_order_by | undefined
  min?: connection_min_order_by | undefined
}

/**
 * append existing jsonb value of filtered columns with new jsonb value
 */
export type connection_append_input = {
  credentials?: string | undefined
  persistentState?: string | undefined
}

/**
 * input type for inserting array relation for remote table "connection"
 */
export type connection_arr_rel_insert_input = {
  data: Array<connection_insert_input>
  on_conflict?: connection_on_conflict | undefined
}

/**
 * Boolean expression to filter rows from the table "connection". All fields are combined with a logical 'AND'.
 */
export type connection_bool_exp = {
  _and?: Array<connection_bool_exp> | undefined
  _not?: connection_bool_exp | undefined
  _or?: Array<connection_bool_exp> | undefined
  bookings?: booking_bool_exp | undefined
  createdAt?: timestamptz_comparison_exp | undefined
  credentials?: jsonb_comparison_exp | undefined
  entities?: entity_bool_exp | undefined
  id?: uuid_comparison_exp | undefined
  integration?: integration_bool_exp | undefined
  integrationId?: uuid_comparison_exp | undefined
  jobs?: job_bool_exp | undefined
  lines?: line_bool_exp | undefined
  metrics?: metric_bool_exp | undefined
  name?: String_comparison_exp | undefined
  payments?: payment_bool_exp | undefined
  persistentState?: jsonb_comparison_exp | undefined
  status?: String_comparison_exp | undefined
  tags?: tag_bool_exp | undefined
  team?: team_bool_exp | undefined
  teamId?: uuid_comparison_exp | undefined
  units?: unit_bool_exp | undefined
  webhookKey?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "connection"
 */
export enum connection_constraint {
  /**
   * unique or primary key constraint
   */
  connection_pkey = 'connection_pkey',
}

/**
 * delete the field or element with specified path (for JSON arrays, negative integers count from the end)
 */
export type connection_delete_at_path_input = {
  credentials?: Array<string> | undefined
  persistentState?: Array<string> | undefined
}

/**
 * delete the array element with specified index (negative integers count from the
end). throws an error if top level container is not an array
 */
export type connection_delete_elem_input = {
  credentials?: number | undefined
  persistentState?: number | undefined
}

/**
 * delete key/value pair or string element. key/value pairs are matched based on their key value
 */
export type connection_delete_key_input = {
  credentials?: string | undefined
  persistentState?: string | undefined
}

/**
 * input type for inserting data into table "connection"
 */
export type connection_insert_input = {
  bookings?: booking_arr_rel_insert_input | undefined
  createdAt?: string | undefined
  credentials?: string | undefined
  entities?: entity_arr_rel_insert_input | undefined
  id?: string | undefined
  integration?: integration_obj_rel_insert_input | undefined
  integrationId?: string | undefined
  jobs?: job_arr_rel_insert_input | undefined
  lines?: line_arr_rel_insert_input | undefined
  metrics?: metric_arr_rel_insert_input | undefined
  name?: string | undefined
  payments?: payment_arr_rel_insert_input | undefined
  persistentState?: string | undefined
  status?: string | undefined
  tags?: tag_arr_rel_insert_input | undefined
  team?: team_obj_rel_insert_input | undefined
  teamId?: string | undefined
  units?: unit_arr_rel_insert_input | undefined
  webhookKey?: string | undefined
}

/**
 * aggregate max on columns
 */
export class connection_max_fields extends $Base<'connection_max_fields'> {
  constructor() {
    super('connection_max_fields')
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get integrationId(): $Field<'integrationId', string | undefined> {
    return this.$_select('integrationId') as any
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }

  get status(): $Field<'status', string | undefined> {
    return this.$_select('status') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get webhookKey(): $Field<'webhookKey', string | undefined> {
    return this.$_select('webhookKey') as any
  }
}

/**
 * order by max() on columns of table "connection"
 */
export type connection_max_order_by = {
  createdAt?: order_by | undefined
  id?: order_by | undefined
  integrationId?: order_by | undefined
  name?: order_by | undefined
  status?: order_by | undefined
  teamId?: order_by | undefined
  webhookKey?: order_by | undefined
}

/**
 * aggregate min on columns
 */
export class connection_min_fields extends $Base<'connection_min_fields'> {
  constructor() {
    super('connection_min_fields')
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get integrationId(): $Field<'integrationId', string | undefined> {
    return this.$_select('integrationId') as any
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }

  get status(): $Field<'status', string | undefined> {
    return this.$_select('status') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get webhookKey(): $Field<'webhookKey', string | undefined> {
    return this.$_select('webhookKey') as any
  }
}

/**
 * order by min() on columns of table "connection"
 */
export type connection_min_order_by = {
  createdAt?: order_by | undefined
  id?: order_by | undefined
  integrationId?: order_by | undefined
  name?: order_by | undefined
  status?: order_by | undefined
  teamId?: order_by | undefined
  webhookKey?: order_by | undefined
}

/**
 * response of any mutation on the table "connection"
 */
export class connection_mutation_response extends $Base<'connection_mutation_response'> {
  constructor() {
    super('connection_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<connection>>(
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new connection()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * input type for inserting object relation for remote table "connection"
 */
export type connection_obj_rel_insert_input = {
  data: connection_insert_input
  on_conflict?: connection_on_conflict | undefined
}

/**
 * on conflict condition type for table "connection"
 */
export type connection_on_conflict = {
  constraint: connection_constraint
  update_columns: Array<connection_update_column>
  where?: connection_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "connection".
 */
export type connection_order_by = {
  bookings_aggregate?: booking_aggregate_order_by | undefined
  createdAt?: order_by | undefined
  credentials?: order_by | undefined
  entities_aggregate?: entity_aggregate_order_by | undefined
  id?: order_by | undefined
  integration?: integration_order_by | undefined
  integrationId?: order_by | undefined
  jobs_aggregate?: job_aggregate_order_by | undefined
  lines_aggregate?: line_aggregate_order_by | undefined
  metrics_aggregate?: metric_aggregate_order_by | undefined
  name?: order_by | undefined
  payments_aggregate?: payment_aggregate_order_by | undefined
  persistentState?: order_by | undefined
  status?: order_by | undefined
  tags_aggregate?: tag_aggregate_order_by | undefined
  team?: team_order_by | undefined
  teamId?: order_by | undefined
  units_aggregate?: unit_aggregate_order_by | undefined
  webhookKey?: order_by | undefined
}

/**
 * primary key columns input for table: connection
 */
export type connection_pk_columns_input = {
  id: string
}

/**
 * prepend existing jsonb value of filtered columns with new jsonb value
 */
export type connection_prepend_input = {
  credentials?: string | undefined
  persistentState?: string | undefined
}

/**
 * select columns of table "connection"
 */
export enum connection_select_column {
  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  credentials = 'credentials',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  integrationId = 'integrationId',

  /**
   * column name
   */
  name = 'name',

  /**
   * column name
   */
  persistentState = 'persistentState',

  /**
   * column name
   */
  status = 'status',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  webhookKey = 'webhookKey',
}

/**
 * input type for updating data in table "connection"
 */
export type connection_set_input = {
  createdAt?: string | undefined
  credentials?: string | undefined
  id?: string | undefined
  integrationId?: string | undefined
  name?: string | undefined
  persistentState?: string | undefined
  status?: string | undefined
  teamId?: string | undefined
  webhookKey?: string | undefined
}

/**
 * update columns of table "connection"
 */
export enum connection_update_column {
  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  credentials = 'credentials',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  integrationId = 'integrationId',

  /**
   * column name
   */
  name = 'name',

  /**
   * column name
   */
  persistentState = 'persistentState',

  /**
   * column name
   */
  status = 'status',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  webhookKey = 'webhookKey',
}

/**
 * columns and relationships of "currency"
 */
export class currency extends $Base<'currency'> {
  constructor() {
    super('currency')
  }

  get name(): $Field<'name', string> {
    return this.$_select('name') as any
  }
}

/**
 * aggregated selection of "currency"
 */
export class currency_aggregate extends $Base<'currency_aggregate'> {
  constructor() {
    super('currency_aggregate')
  }

  aggregate<Sel extends Selection<currency_aggregate_fields>>(
    selectorFn: (s: currency_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new currency_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<currency>>(
    selectorFn: (s: currency) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new currency()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "currency"
 */
export class currency_aggregate_fields extends $Base<'currency_aggregate_fields'> {
  constructor() {
    super('currency_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<currency_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[currency_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<currency_max_fields>>(
    selectorFn: (s: currency_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new currency_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<currency_min_fields>>(
    selectorFn: (s: currency_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new currency_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * Boolean expression to filter rows from the table "currency". All fields are combined with a logical 'AND'.
 */
export type currency_bool_exp = {
  _and?: Array<currency_bool_exp> | undefined
  _not?: currency_bool_exp | undefined
  _or?: Array<currency_bool_exp> | undefined
  name?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "currency"
 */
export enum currency_constraint {
  /**
   * unique or primary key constraint
   */
  currency_pkey = 'currency_pkey',
}

export enum currency_enum {
  aed = 'aed',

  afn = 'afn',

  all = 'all',

  amd = 'amd',

  ang = 'ang',

  aoa = 'aoa',

  ars = 'ars',

  aud = 'aud',

  awg = 'awg',

  azn = 'azn',

  bam = 'bam',

  bbd = 'bbd',

  bdt = 'bdt',

  bgn = 'bgn',

  bhd = 'bhd',

  bif = 'bif',

  bmd = 'bmd',

  bnd = 'bnd',

  bob = 'bob',

  bov = 'bov',

  brl = 'brl',

  bsd = 'bsd',

  btn = 'btn',

  bwp = 'bwp',

  byr = 'byr',

  bzd = 'bzd',

  cad = 'cad',

  cdf = 'cdf',

  che = 'che',

  chf = 'chf',

  chw = 'chw',

  clf = 'clf',

  clp = 'clp',

  cny = 'cny',

  cop = 'cop',

  cou = 'cou',

  crc = 'crc',

  cuc = 'cuc',

  cup = 'cup',

  cve = 'cve',

  czk = 'czk',

  djf = 'djf',

  dkk = 'dkk',

  dop = 'dop',

  dzd = 'dzd',

  egp = 'egp',

  ern = 'ern',

  etb = 'etb',

  eur = 'eur',

  fjd = 'fjd',

  fkp = 'fkp',

  gbp = 'gbp',

  gel = 'gel',

  ghs = 'ghs',

  gip = 'gip',

  gmd = 'gmd',

  gnf = 'gnf',

  gtq = 'gtq',

  gyd = 'gyd',

  hkd = 'hkd',

  hnl = 'hnl',

  hrk = 'hrk',

  htg = 'htg',

  huf = 'huf',

  idr = 'idr',

  ils = 'ils',

  inr = 'inr',

  iqd = 'iqd',

  irr = 'irr',

  isk = 'isk',

  jmd = 'jmd',

  jod = 'jod',

  jpy = 'jpy',

  kes = 'kes',

  kgs = 'kgs',

  khr = 'khr',

  kmf = 'kmf',

  kpw = 'kpw',

  krw = 'krw',

  kwd = 'kwd',

  kyd = 'kyd',

  kzt = 'kzt',

  lak = 'lak',

  lbp = 'lbp',

  lkr = 'lkr',

  lrd = 'lrd',

  lsl = 'lsl',

  ltl = 'ltl',

  lvl = 'lvl',

  lyd = 'lyd',

  mad = 'mad',

  mdl = 'mdl',

  mga = 'mga',

  mkd = 'mkd',

  mmk = 'mmk',

  mnt = 'mnt',

  mop = 'mop',

  mro = 'mro',

  mur = 'mur',

  mvr = 'mvr',

  mwk = 'mwk',

  mxn = 'mxn',

  mxv = 'mxv',

  myr = 'myr',

  mzn = 'mzn',

  nad = 'nad',

  ngn = 'ngn',

  nio = 'nio',

  nok = 'nok',

  npr = 'npr',

  nzd = 'nzd',

  omr = 'omr',

  pab = 'pab',

  pen = 'pen',

  pgk = 'pgk',

  php = 'php',

  pkr = 'pkr',

  pln = 'pln',

  pyg = 'pyg',

  qar = 'qar',

  ron = 'ron',

  rsd = 'rsd',

  rub = 'rub',

  rwf = 'rwf',

  sar = 'sar',

  sbd = 'sbd',

  scr = 'scr',

  sdg = 'sdg',

  sek = 'sek',

  sgd = 'sgd',

  shp = 'shp',

  sll = 'sll',

  sos = 'sos',

  srd = 'srd',

  ssp = 'ssp',

  std = 'std',

  syp = 'syp',

  szl = 'szl',

  thb = 'thb',

  tjs = 'tjs',

  tmt = 'tmt',

  tnd = 'tnd',

  top = 'top',

  try = 'try',

  ttd = 'ttd',

  twd = 'twd',

  tzs = 'tzs',

  uah = 'uah',

  ugx = 'ugx',

  usd = 'usd',

  usn = 'usn',

  uss = 'uss',

  uyi = 'uyi',

  uyu = 'uyu',

  uzs = 'uzs',

  vef = 'vef',

  vnd = 'vnd',

  vuv = 'vuv',

  wst = 'wst',

  xaf = 'xaf',

  xag = 'xag',

  xau = 'xau',

  xba = 'xba',

  xbb = 'xbb',

  xbc = 'xbc',

  xbd = 'xbd',

  xcd = 'xcd',

  xdr = 'xdr',

  xfu = 'xfu',

  xof = 'xof',

  xpd = 'xpd',

  xpf = 'xpf',

  xpt = 'xpt',

  xts = 'xts',

  xxx = 'xxx',

  yer = 'yer',

  zar = 'zar',

  zmw = 'zmw',
}

/**
 * Boolean expression to compare columns of type "currency_enum". All fields are combined with logical 'AND'.
 */
export type currency_enum_comparison_exp = {
  _eq?: currency_enum | undefined
  _in?: Array<currency_enum> | undefined
  _is_null?: boolean | undefined
  _neq?: currency_enum | undefined
  _nin?: Array<currency_enum> | undefined
}

/**
 * input type for inserting data into table "currency"
 */
export type currency_insert_input = {
  name?: string | undefined
}

/**
 * aggregate max on columns
 */
export class currency_max_fields extends $Base<'currency_max_fields'> {
  constructor() {
    super('currency_max_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * aggregate min on columns
 */
export class currency_min_fields extends $Base<'currency_min_fields'> {
  constructor() {
    super('currency_min_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * response of any mutation on the table "currency"
 */
export class currency_mutation_response extends $Base<'currency_mutation_response'> {
  constructor() {
    super('currency_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<currency>>(
    selectorFn: (s: currency) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new currency()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "currency"
 */
export type currency_on_conflict = {
  constraint: currency_constraint
  update_columns: Array<currency_update_column>
  where?: currency_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "currency".
 */
export type currency_order_by = {
  name?: order_by | undefined
}

/**
 * primary key columns input for table: currency
 */
export type currency_pk_columns_input = {
  name: string
}

/**
 * select columns of table "currency"
 */
export enum currency_select_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * input type for updating data in table "currency"
 */
export type currency_set_input = {
  name?: string | undefined
}

/**
 * update columns of table "currency"
 */
export enum currency_update_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * columns and relationships of "entity"
 */
export class entity extends $Base<'entity'> {
  constructor() {
    super('entity')
  }

  /**
   * An array relationship
   */
  bookings<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_order_by> | undefined
      where?: booking_bool_exp | undefined
    }>,
    Sel extends Selection<booking>
  >(
    args: Args,
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'bookings', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_order_by!]',
        where: 'booking_bool_exp',
      },
      args,

      selection: selectorFn(new booking()),
    }
    return this.$_select('bookings', options) as any
  }

  /**
   * An aggregate relationship
   */
  bookings_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_order_by> | undefined
      where?: booking_bool_exp | undefined
    }>,
    Sel extends Selection<booking_aggregate>
  >(
    args: Args,
    selectorFn: (s: booking_aggregate) => [...Sel]
  ): $Field<'bookings_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_order_by!]',
        where: 'booking_bool_exp',
      },
      args,

      selection: selectorFn(new booking_aggregate()),
    }
    return this.$_select('bookings_aggregate', options) as any
  }

  /**
   * An object relationship
   */
  connection<Sel extends Selection<connection>>(
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'connection', GetOutput<Sel>> {
    const options = {
      selection: selectorFn(new connection()),
    }
    return this.$_select('connection', options) as any
  }

  get connectionId(): $Field<'connectionId', string> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string> {
    return this.$_select('createdAt') as any
  }

  get description(): $Field<'description', string> {
    return this.$_select('description') as any
  }

  diffJson<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'diffJson', string | undefined, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('diffJson', options) as any
  }

  get hash(): $Field<'hash', string | undefined> {
    return this.$_select('hash') as any
  }

  get id(): $Field<'id', string> {
    return this.$_select('id') as any
  }

  /**
   * An object relationship
   */
  job<Sel extends Selection<job>>(
    selectorFn: (s: job) => [...Sel]
  ): $Field<'job', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new job()),
    }
    return this.$_select('job', options) as any
  }

  get jobId(): $Field<'jobId', string | undefined> {
    return this.$_select('jobId') as any
  }

  json<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'json', string | undefined, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('json', options) as any
  }

  normalizedJson<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'normalizedJson', string | undefined, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('normalizedJson', options) as any
  }

  get normalizedType(): $Field<'normalizedType', normalized_type_enum | undefined> {
    return this.$_select('normalizedType') as any
  }

  get parsedAt(): $Field<'parsedAt', string | undefined> {
    return this.$_select('parsedAt') as any
  }

  /**
   * An array relationship
   */
  payments<
    Args extends VariabledInput<{
      distinct_on?: Array<payment_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<payment_order_by> | undefined
      where?: payment_bool_exp | undefined
    }>,
    Sel extends Selection<payment>
  >(
    args: Args,
    selectorFn: (s: payment) => [...Sel]
  ): $Field<'payments', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[payment_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[payment_order_by!]',
        where: 'payment_bool_exp',
      },
      args,

      selection: selectorFn(new payment()),
    }
    return this.$_select('payments', options) as any
  }

  /**
   * An aggregate relationship
   */
  payments_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<payment_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<payment_order_by> | undefined
      where?: payment_bool_exp | undefined
    }>,
    Sel extends Selection<payment_aggregate>
  >(
    args: Args,
    selectorFn: (s: payment_aggregate) => [...Sel]
  ): $Field<'payments_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[payment_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[payment_order_by!]',
        where: 'payment_bool_exp',
      },
      args,

      selection: selectorFn(new payment_aggregate()),
    }
    return this.$_select('payments_aggregate', options) as any
  }

  /**
   * An object relationship
   */
  predecessorEntity<Sel extends Selection<entity>>(
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'predecessorEntity', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new entity()),
    }
    return this.$_select('predecessorEntity', options) as any
  }

  get predecessorEntityId(): $Field<'predecessorEntityId', string | undefined> {
    return this.$_select('predecessorEntityId') as any
  }

  get status(): $Field<'status', entity_status_enum> {
    return this.$_select('status') as any
  }

  get statusText(): $Field<'statusText', string | undefined> {
    return this.$_select('statusText') as any
  }

  /**
   * An array relationship
   */
  successorEntities<
    Args extends VariabledInput<{
      distinct_on?: Array<entity_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<entity_order_by> | undefined
      where?: entity_bool_exp | undefined
    }>,
    Sel extends Selection<entity>
  >(
    args: Args,
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'successorEntities', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[entity_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[entity_order_by!]',
        where: 'entity_bool_exp',
      },
      args,

      selection: selectorFn(new entity()),
    }
    return this.$_select('successorEntities', options) as any
  }

  /**
   * An aggregate relationship
   */
  successorEntities_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<entity_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<entity_order_by> | undefined
      where?: entity_bool_exp | undefined
    }>,
    Sel extends Selection<entity_aggregate>
  >(
    args: Args,
    selectorFn: (s: entity_aggregate) => [...Sel]
  ): $Field<'successorEntities_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[entity_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[entity_order_by!]',
        where: 'entity_bool_exp',
      },
      args,

      selection: selectorFn(new entity_aggregate()),
    }
    return this.$_select('successorEntities_aggregate', options) as any
  }

  /**
   * An object relationship
   */
  team<Sel extends Selection<team>>(
    selectorFn: (s: team) => [...Sel]
  ): $Field<'team', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team()),
    }
    return this.$_select('team', options) as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get type(): $Field<'type', string> {
    return this.$_select('type') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  /**
   * An array relationship
   */
  units<
    Args extends VariabledInput<{
      distinct_on?: Array<unit_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<unit_order_by> | undefined
      where?: unit_bool_exp | undefined
    }>,
    Sel extends Selection<unit>
  >(
    args: Args,
    selectorFn: (s: unit) => [...Sel]
  ): $Field<'units', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[unit_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[unit_order_by!]',
        where: 'unit_bool_exp',
      },
      args,

      selection: selectorFn(new unit()),
    }
    return this.$_select('units', options) as any
  }

  /**
   * An aggregate relationship
   */
  units_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<unit_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<unit_order_by> | undefined
      where?: unit_bool_exp | undefined
    }>,
    Sel extends Selection<unit_aggregate>
  >(
    args: Args,
    selectorFn: (s: unit_aggregate) => [...Sel]
  ): $Field<'units_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[unit_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[unit_order_by!]',
        where: 'unit_bool_exp',
      },
      args,

      selection: selectorFn(new unit_aggregate()),
    }
    return this.$_select('units_aggregate', options) as any
  }

  get updatedAt(): $Field<'updatedAt', string> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * aggregated selection of "entity"
 */
export class entity_aggregate extends $Base<'entity_aggregate'> {
  constructor() {
    super('entity_aggregate')
  }

  aggregate<Sel extends Selection<entity_aggregate_fields>>(
    selectorFn: (s: entity_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new entity_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<entity>>(
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new entity()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "entity"
 */
export class entity_aggregate_fields extends $Base<'entity_aggregate_fields'> {
  constructor() {
    super('entity_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<entity_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[entity_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<entity_max_fields>>(
    selectorFn: (s: entity_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new entity_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<entity_min_fields>>(
    selectorFn: (s: entity_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new entity_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * order by aggregate values of table "entity"
 */
export type entity_aggregate_order_by = {
  count?: order_by | undefined
  max?: entity_max_order_by | undefined
  min?: entity_min_order_by | undefined
}

/**
 * append existing jsonb value of filtered columns with new jsonb value
 */
export type entity_append_input = {
  diffJson?: string | undefined
  json?: string | undefined
  normalizedJson?: string | undefined
}

/**
 * input type for inserting array relation for remote table "entity"
 */
export type entity_arr_rel_insert_input = {
  data: Array<entity_insert_input>
  on_conflict?: entity_on_conflict | undefined
}

/**
 * Boolean expression to filter rows from the table "entity". All fields are combined with a logical 'AND'.
 */
export type entity_bool_exp = {
  _and?: Array<entity_bool_exp> | undefined
  _not?: entity_bool_exp | undefined
  _or?: Array<entity_bool_exp> | undefined
  bookings?: booking_bool_exp | undefined
  connection?: connection_bool_exp | undefined
  connectionId?: uuid_comparison_exp | undefined
  createdAt?: timestamptz_comparison_exp | undefined
  description?: String_comparison_exp | undefined
  diffJson?: jsonb_comparison_exp | undefined
  hash?: String_comparison_exp | undefined
  id?: uuid_comparison_exp | undefined
  job?: job_bool_exp | undefined
  jobId?: uuid_comparison_exp | undefined
  json?: jsonb_comparison_exp | undefined
  normalizedJson?: jsonb_comparison_exp | undefined
  normalizedType?: normalized_type_enum_comparison_exp | undefined
  parsedAt?: timestamptz_comparison_exp | undefined
  payments?: payment_bool_exp | undefined
  predecessorEntity?: entity_bool_exp | undefined
  predecessorEntityId?: uuid_comparison_exp | undefined
  status?: entity_status_enum_comparison_exp | undefined
  statusText?: String_comparison_exp | undefined
  successorEntities?: entity_bool_exp | undefined
  team?: team_bool_exp | undefined
  teamId?: uuid_comparison_exp | undefined
  type?: String_comparison_exp | undefined
  uniqueRef?: String_comparison_exp | undefined
  units?: unit_bool_exp | undefined
  updatedAt?: timestamptz_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "entity"
 */
export enum entity_constraint {
  /**
   * unique or primary key constraint
   */
  entity_connection_id_job_id_type_unique_ref_key = 'entity_connection_id_job_id_type_unique_ref_key',

  /**
   * unique or primary key constraint
   */
  entity_pkey = 'entity_pkey',
}

/**
 * delete the field or element with specified path (for JSON arrays, negative integers count from the end)
 */
export type entity_delete_at_path_input = {
  diffJson?: Array<string> | undefined
  json?: Array<string> | undefined
  normalizedJson?: Array<string> | undefined
}

/**
 * delete the array element with specified index (negative integers count from the
end). throws an error if top level container is not an array
 */
export type entity_delete_elem_input = {
  diffJson?: number | undefined
  json?: number | undefined
  normalizedJson?: number | undefined
}

/**
 * delete key/value pair or string element. key/value pairs are matched based on their key value
 */
export type entity_delete_key_input = {
  diffJson?: string | undefined
  json?: string | undefined
  normalizedJson?: string | undefined
}

/**
 * input type for inserting data into table "entity"
 */
export type entity_insert_input = {
  bookings?: booking_arr_rel_insert_input | undefined
  connection?: connection_obj_rel_insert_input | undefined
  connectionId?: string | undefined
  createdAt?: string | undefined
  description?: string | undefined
  diffJson?: string | undefined
  hash?: string | undefined
  id?: string | undefined
  job?: job_obj_rel_insert_input | undefined
  jobId?: string | undefined
  json?: string | undefined
  normalizedJson?: string | undefined
  normalizedType?: normalized_type_enum | undefined
  parsedAt?: string | undefined
  payments?: payment_arr_rel_insert_input | undefined
  predecessorEntity?: entity_obj_rel_insert_input | undefined
  predecessorEntityId?: string | undefined
  status?: entity_status_enum | undefined
  statusText?: string | undefined
  successorEntities?: entity_arr_rel_insert_input | undefined
  team?: team_obj_rel_insert_input | undefined
  teamId?: string | undefined
  type?: string | undefined
  uniqueRef?: string | undefined
  units?: unit_arr_rel_insert_input | undefined
  updatedAt?: string | undefined
}

/**
 * aggregate max on columns
 */
export class entity_max_fields extends $Base<'entity_max_fields'> {
  constructor() {
    super('entity_max_fields')
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get description(): $Field<'description', string | undefined> {
    return this.$_select('description') as any
  }

  get hash(): $Field<'hash', string | undefined> {
    return this.$_select('hash') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get jobId(): $Field<'jobId', string | undefined> {
    return this.$_select('jobId') as any
  }

  get parsedAt(): $Field<'parsedAt', string | undefined> {
    return this.$_select('parsedAt') as any
  }

  get predecessorEntityId(): $Field<'predecessorEntityId', string | undefined> {
    return this.$_select('predecessorEntityId') as any
  }

  get statusText(): $Field<'statusText', string | undefined> {
    return this.$_select('statusText') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get type(): $Field<'type', string | undefined> {
    return this.$_select('type') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * order by max() on columns of table "entity"
 */
export type entity_max_order_by = {
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  description?: order_by | undefined
  hash?: order_by | undefined
  id?: order_by | undefined
  jobId?: order_by | undefined
  parsedAt?: order_by | undefined
  predecessorEntityId?: order_by | undefined
  statusText?: order_by | undefined
  teamId?: order_by | undefined
  type?: order_by | undefined
  uniqueRef?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * aggregate min on columns
 */
export class entity_min_fields extends $Base<'entity_min_fields'> {
  constructor() {
    super('entity_min_fields')
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get description(): $Field<'description', string | undefined> {
    return this.$_select('description') as any
  }

  get hash(): $Field<'hash', string | undefined> {
    return this.$_select('hash') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get jobId(): $Field<'jobId', string | undefined> {
    return this.$_select('jobId') as any
  }

  get parsedAt(): $Field<'parsedAt', string | undefined> {
    return this.$_select('parsedAt') as any
  }

  get predecessorEntityId(): $Field<'predecessorEntityId', string | undefined> {
    return this.$_select('predecessorEntityId') as any
  }

  get statusText(): $Field<'statusText', string | undefined> {
    return this.$_select('statusText') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get type(): $Field<'type', string | undefined> {
    return this.$_select('type') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * order by min() on columns of table "entity"
 */
export type entity_min_order_by = {
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  description?: order_by | undefined
  hash?: order_by | undefined
  id?: order_by | undefined
  jobId?: order_by | undefined
  parsedAt?: order_by | undefined
  predecessorEntityId?: order_by | undefined
  statusText?: order_by | undefined
  teamId?: order_by | undefined
  type?: order_by | undefined
  uniqueRef?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * response of any mutation on the table "entity"
 */
export class entity_mutation_response extends $Base<'entity_mutation_response'> {
  constructor() {
    super('entity_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<entity>>(
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new entity()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * input type for inserting object relation for remote table "entity"
 */
export type entity_obj_rel_insert_input = {
  data: entity_insert_input
  on_conflict?: entity_on_conflict | undefined
}

/**
 * on conflict condition type for table "entity"
 */
export type entity_on_conflict = {
  constraint: entity_constraint
  update_columns: Array<entity_update_column>
  where?: entity_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "entity".
 */
export type entity_order_by = {
  bookings_aggregate?: booking_aggregate_order_by | undefined
  connection?: connection_order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  description?: order_by | undefined
  diffJson?: order_by | undefined
  hash?: order_by | undefined
  id?: order_by | undefined
  job?: job_order_by | undefined
  jobId?: order_by | undefined
  json?: order_by | undefined
  normalizedJson?: order_by | undefined
  normalizedType?: order_by | undefined
  parsedAt?: order_by | undefined
  payments_aggregate?: payment_aggregate_order_by | undefined
  predecessorEntity?: entity_order_by | undefined
  predecessorEntityId?: order_by | undefined
  status?: order_by | undefined
  statusText?: order_by | undefined
  successorEntities_aggregate?: entity_aggregate_order_by | undefined
  team?: team_order_by | undefined
  teamId?: order_by | undefined
  type?: order_by | undefined
  uniqueRef?: order_by | undefined
  units_aggregate?: unit_aggregate_order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * primary key columns input for table: entity
 */
export type entity_pk_columns_input = {
  id: string
}

/**
 * prepend existing jsonb value of filtered columns with new jsonb value
 */
export type entity_prepend_input = {
  diffJson?: string | undefined
  json?: string | undefined
  normalizedJson?: string | undefined
}

/**
 * select columns of table "entity"
 */
export enum entity_select_column {
  /**
   * column name
   */
  connectionId = 'connectionId',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  description = 'description',

  /**
   * column name
   */
  diffJson = 'diffJson',

  /**
   * column name
   */
  hash = 'hash',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  jobId = 'jobId',

  /**
   * column name
   */
  json = 'json',

  /**
   * column name
   */
  normalizedJson = 'normalizedJson',

  /**
   * column name
   */
  normalizedType = 'normalizedType',

  /**
   * column name
   */
  parsedAt = 'parsedAt',

  /**
   * column name
   */
  predecessorEntityId = 'predecessorEntityId',

  /**
   * column name
   */
  status = 'status',

  /**
   * column name
   */
  statusText = 'statusText',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  type = 'type',

  /**
   * column name
   */
  uniqueRef = 'uniqueRef',

  /**
   * column name
   */
  updatedAt = 'updatedAt',
}

/**
 * input type for updating data in table "entity"
 */
export type entity_set_input = {
  connectionId?: string | undefined
  createdAt?: string | undefined
  description?: string | undefined
  diffJson?: string | undefined
  hash?: string | undefined
  id?: string | undefined
  jobId?: string | undefined
  json?: string | undefined
  normalizedJson?: string | undefined
  normalizedType?: normalized_type_enum | undefined
  parsedAt?: string | undefined
  predecessorEntityId?: string | undefined
  status?: entity_status_enum | undefined
  statusText?: string | undefined
  teamId?: string | undefined
  type?: string | undefined
  uniqueRef?: string | undefined
  updatedAt?: string | undefined
}

export enum entity_status_enum {
  accepted = 'accepted',

  extracted = 'extracted',

  reconciled = 'reconciled',

  rejected = 'rejected',

  transformed = 'transformed',
}

/**
 * Boolean expression to compare columns of type "entity_status_enum". All fields are combined with logical 'AND'.
 */
export type entity_status_enum_comparison_exp = {
  _eq?: entity_status_enum | undefined
  _in?: Array<entity_status_enum> | undefined
  _is_null?: boolean | undefined
  _neq?: entity_status_enum | undefined
  _nin?: Array<entity_status_enum> | undefined
}

/**
 * update columns of table "entity"
 */
export enum entity_update_column {
  /**
   * column name
   */
  connectionId = 'connectionId',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  description = 'description',

  /**
   * column name
   */
  diffJson = 'diffJson',

  /**
   * column name
   */
  hash = 'hash',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  jobId = 'jobId',

  /**
   * column name
   */
  json = 'json',

  /**
   * column name
   */
  normalizedJson = 'normalizedJson',

  /**
   * column name
   */
  normalizedType = 'normalizedType',

  /**
   * column name
   */
  parsedAt = 'parsedAt',

  /**
   * column name
   */
  predecessorEntityId = 'predecessorEntityId',

  /**
   * column name
   */
  status = 'status',

  /**
   * column name
   */
  statusText = 'statusText',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  type = 'type',

  /**
   * column name
   */
  uniqueRef = 'uniqueRef',

  /**
   * column name
   */
  updatedAt = 'updatedAt',
}

/**
 * columns and relationships of "entity_status"
 */
export class entityStatus extends $Base<'entityStatus'> {
  constructor() {
    super('entityStatus')
  }

  get name(): $Field<'name', string> {
    return this.$_select('name') as any
  }
}

/**
 * aggregated selection of "entity_status"
 */
export class entityStatus_aggregate extends $Base<'entityStatus_aggregate'> {
  constructor() {
    super('entityStatus_aggregate')
  }

  aggregate<Sel extends Selection<entityStatus_aggregate_fields>>(
    selectorFn: (s: entityStatus_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new entityStatus_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<entityStatus>>(
    selectorFn: (s: entityStatus) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new entityStatus()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "entity_status"
 */
export class entityStatus_aggregate_fields extends $Base<'entityStatus_aggregate_fields'> {
  constructor() {
    super('entityStatus_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<entityStatus_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[entityStatus_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<entityStatus_max_fields>>(
    selectorFn: (s: entityStatus_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new entityStatus_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<entityStatus_min_fields>>(
    selectorFn: (s: entityStatus_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new entityStatus_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * Boolean expression to filter rows from the table "entity_status". All fields are combined with a logical 'AND'.
 */
export type entityStatus_bool_exp = {
  _and?: Array<entityStatus_bool_exp> | undefined
  _not?: entityStatus_bool_exp | undefined
  _or?: Array<entityStatus_bool_exp> | undefined
  name?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "entity_status"
 */
export enum entityStatus_constraint {
  /**
   * unique or primary key constraint
   */
  entity_status_pkey = 'entity_status_pkey',
}

/**
 * input type for inserting data into table "entity_status"
 */
export type entityStatus_insert_input = {
  name?: string | undefined
}

/**
 * aggregate max on columns
 */
export class entityStatus_max_fields extends $Base<'entityStatus_max_fields'> {
  constructor() {
    super('entityStatus_max_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * aggregate min on columns
 */
export class entityStatus_min_fields extends $Base<'entityStatus_min_fields'> {
  constructor() {
    super('entityStatus_min_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * response of any mutation on the table "entity_status"
 */
export class entityStatus_mutation_response extends $Base<'entityStatus_mutation_response'> {
  constructor() {
    super('entityStatus_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<entityStatus>>(
    selectorFn: (s: entityStatus) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new entityStatus()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "entity_status"
 */
export type entityStatus_on_conflict = {
  constraint: entityStatus_constraint
  update_columns: Array<entityStatus_update_column>
  where?: entityStatus_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "entity_status".
 */
export type entityStatus_order_by = {
  name?: order_by | undefined
}

/**
 * primary key columns input for table: entityStatus
 */
export type entityStatus_pk_columns_input = {
  name: string
}

/**
 * select columns of table "entity_status"
 */
export enum entityStatus_select_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * input type for updating data in table "entity_status"
 */
export type entityStatus_set_input = {
  name?: string | undefined
}

/**
 * update columns of table "entity_status"
 */
export enum entityStatus_update_column {
  /**
   * column name
   */
  name = 'name',
}

export type float8 = unknown

/**
 * Boolean expression to compare columns of type "float8". All fields are combined with logical 'AND'.
 */
export type float8_comparison_exp = {
  _eq?: string | undefined
  _gt?: string | undefined
  _gte?: string | undefined
  _in?: Array<string> | undefined
  _is_null?: boolean | undefined
  _lt?: string | undefined
  _lte?: string | undefined
  _neq?: string | undefined
  _nin?: Array<string> | undefined
}

/**
 * Boolean expression to compare columns of type "Int". All fields are combined with logical 'AND'.
 */
export type Int_comparison_exp = {
  _eq?: number | undefined
  _gt?: number | undefined
  _gte?: number | undefined
  _in?: Array<number> | undefined
  _is_null?: boolean | undefined
  _lt?: number | undefined
  _lte?: number | undefined
  _neq?: number | undefined
  _nin?: Array<number> | undefined
}

/**
 * columns and relationships of "integration"
 */
export class integration extends $Base<'integration'> {
  constructor() {
    super('integration')
  }

  get apiDevUrl(): $Field<'apiDevUrl', string | undefined> {
    return this.$_select('apiDevUrl') as any
  }

  get apiUrl(): $Field<'apiUrl', string> {
    return this.$_select('apiUrl') as any
  }

  /**
   * An array relationship
   */
  connections<
    Args extends VariabledInput<{
      distinct_on?: Array<connection_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<connection_order_by> | undefined
      where?: connection_bool_exp | undefined
    }>,
    Sel extends Selection<connection>
  >(
    args: Args,
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'connections', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[connection_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[connection_order_by!]',
        where: 'connection_bool_exp',
      },
      args,

      selection: selectorFn(new connection()),
    }
    return this.$_select('connections', options) as any
  }

  /**
   * An aggregate relationship
   */
  connections_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<connection_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<connection_order_by> | undefined
      where?: connection_bool_exp | undefined
    }>,
    Sel extends Selection<connection_aggregate>
  >(
    args: Args,
    selectorFn: (s: connection_aggregate) => [...Sel]
  ): $Field<'connections_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[connection_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[connection_order_by!]',
        where: 'connection_bool_exp',
      },
      args,

      selection: selectorFn(new connection_aggregate()),
    }
    return this.$_select('connections_aggregate', options) as any
  }

  get icon(): $Field<'icon', string | undefined> {
    return this.$_select('icon') as any
  }

  get id(): $Field<'id', string> {
    return this.$_select('id') as any
  }

  get isApproved(): $Field<'isApproved', boolean | undefined> {
    return this.$_select('isApproved') as any
  }

  get isPrivate(): $Field<'isPrivate', boolean> {
    return this.$_select('isPrivate') as any
  }

  /**
   * An array relationship
   */
  jobs<
    Args extends VariabledInput<{
      distinct_on?: Array<job_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<job_order_by> | undefined
      where?: job_bool_exp | undefined
    }>,
    Sel extends Selection<job>
  >(
    args: Args,
    selectorFn: (s: job) => [...Sel]
  ): $Field<'jobs', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[job_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[job_order_by!]',
        where: 'job_bool_exp',
      },
      args,

      selection: selectorFn(new job()),
    }
    return this.$_select('jobs', options) as any
  }

  /**
   * An aggregate relationship
   */
  jobs_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<job_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<job_order_by> | undefined
      where?: job_bool_exp | undefined
    }>,
    Sel extends Selection<job_aggregate>
  >(
    args: Args,
    selectorFn: (s: job_aggregate) => [...Sel]
  ): $Field<'jobs_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[job_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[job_order_by!]',
        where: 'job_bool_exp',
      },
      args,

      selection: selectorFn(new job_aggregate()),
    }
    return this.$_select('jobs_aggregate', options) as any
  }

  get name(): $Field<'name', string> {
    return this.$_select('name') as any
  }

  /**
   * An object relationship
   */
  team<Sel extends Selection<team>>(
    selectorFn: (s: team) => [...Sel]
  ): $Field<'team', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team()),
    }
    return this.$_select('team', options) as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get type(): $Field<'type', integration_type_enum> {
    return this.$_select('type') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string> {
    return this.$_select('uniqueRef') as any
  }
}

/**
 * aggregated selection of "integration"
 */
export class integration_aggregate extends $Base<'integration_aggregate'> {
  constructor() {
    super('integration_aggregate')
  }

  aggregate<Sel extends Selection<integration_aggregate_fields>>(
    selectorFn: (s: integration_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new integration_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<integration>>(
    selectorFn: (s: integration) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new integration()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "integration"
 */
export class integration_aggregate_fields extends $Base<'integration_aggregate_fields'> {
  constructor() {
    super('integration_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<integration_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[integration_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<integration_max_fields>>(
    selectorFn: (s: integration_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new integration_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<integration_min_fields>>(
    selectorFn: (s: integration_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new integration_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * order by aggregate values of table "integration"
 */
export type integration_aggregate_order_by = {
  count?: order_by | undefined
  max?: integration_max_order_by | undefined
  min?: integration_min_order_by | undefined
}

/**
 * input type for inserting array relation for remote table "integration"
 */
export type integration_arr_rel_insert_input = {
  data: Array<integration_insert_input>
  on_conflict?: integration_on_conflict | undefined
}

/**
 * Boolean expression to filter rows from the table "integration". All fields are combined with a logical 'AND'.
 */
export type integration_bool_exp = {
  _and?: Array<integration_bool_exp> | undefined
  _not?: integration_bool_exp | undefined
  _or?: Array<integration_bool_exp> | undefined
  apiDevUrl?: String_comparison_exp | undefined
  apiUrl?: String_comparison_exp | undefined
  connections?: connection_bool_exp | undefined
  icon?: String_comparison_exp | undefined
  id?: uuid_comparison_exp | undefined
  isApproved?: Boolean_comparison_exp | undefined
  isPrivate?: Boolean_comparison_exp | undefined
  jobs?: job_bool_exp | undefined
  name?: String_comparison_exp | undefined
  team?: team_bool_exp | undefined
  teamId?: uuid_comparison_exp | undefined
  type?: integration_type_enum_comparison_exp | undefined
  uniqueRef?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "integration"
 */
export enum integration_constraint {
  /**
   * unique or primary key constraint
   */
  integration_pkey = 'integration_pkey',
}

/**
 * input type for inserting data into table "integration"
 */
export type integration_insert_input = {
  apiDevUrl?: string | undefined
  apiUrl?: string | undefined
  connections?: connection_arr_rel_insert_input | undefined
  icon?: string | undefined
  id?: string | undefined
  isApproved?: boolean | undefined
  isPrivate?: boolean | undefined
  jobs?: job_arr_rel_insert_input | undefined
  name?: string | undefined
  team?: team_obj_rel_insert_input | undefined
  teamId?: string | undefined
  type?: integration_type_enum | undefined
  uniqueRef?: string | undefined
}

/**
 * aggregate max on columns
 */
export class integration_max_fields extends $Base<'integration_max_fields'> {
  constructor() {
    super('integration_max_fields')
  }

  get apiDevUrl(): $Field<'apiDevUrl', string | undefined> {
    return this.$_select('apiDevUrl') as any
  }

  get apiUrl(): $Field<'apiUrl', string | undefined> {
    return this.$_select('apiUrl') as any
  }

  get icon(): $Field<'icon', string | undefined> {
    return this.$_select('icon') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }
}

/**
 * order by max() on columns of table "integration"
 */
export type integration_max_order_by = {
  apiDevUrl?: order_by | undefined
  apiUrl?: order_by | undefined
  icon?: order_by | undefined
  id?: order_by | undefined
  name?: order_by | undefined
  teamId?: order_by | undefined
  uniqueRef?: order_by | undefined
}

/**
 * aggregate min on columns
 */
export class integration_min_fields extends $Base<'integration_min_fields'> {
  constructor() {
    super('integration_min_fields')
  }

  get apiDevUrl(): $Field<'apiDevUrl', string | undefined> {
    return this.$_select('apiDevUrl') as any
  }

  get apiUrl(): $Field<'apiUrl', string | undefined> {
    return this.$_select('apiUrl') as any
  }

  get icon(): $Field<'icon', string | undefined> {
    return this.$_select('icon') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }
}

/**
 * order by min() on columns of table "integration"
 */
export type integration_min_order_by = {
  apiDevUrl?: order_by | undefined
  apiUrl?: order_by | undefined
  icon?: order_by | undefined
  id?: order_by | undefined
  name?: order_by | undefined
  teamId?: order_by | undefined
  uniqueRef?: order_by | undefined
}

/**
 * response of any mutation on the table "integration"
 */
export class integration_mutation_response extends $Base<'integration_mutation_response'> {
  constructor() {
    super('integration_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<integration>>(
    selectorFn: (s: integration) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new integration()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * input type for inserting object relation for remote table "integration"
 */
export type integration_obj_rel_insert_input = {
  data: integration_insert_input
  on_conflict?: integration_on_conflict | undefined
}

/**
 * on conflict condition type for table "integration"
 */
export type integration_on_conflict = {
  constraint: integration_constraint
  update_columns: Array<integration_update_column>
  where?: integration_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "integration".
 */
export type integration_order_by = {
  apiDevUrl?: order_by | undefined
  apiUrl?: order_by | undefined
  connections_aggregate?: connection_aggregate_order_by | undefined
  icon?: order_by | undefined
  id?: order_by | undefined
  isApproved?: order_by | undefined
  isPrivate?: order_by | undefined
  jobs_aggregate?: job_aggregate_order_by | undefined
  name?: order_by | undefined
  team?: team_order_by | undefined
  teamId?: order_by | undefined
  type?: order_by | undefined
  uniqueRef?: order_by | undefined
}

/**
 * primary key columns input for table: integration
 */
export type integration_pk_columns_input = {
  id: string
}

/**
 * select columns of table "integration"
 */
export enum integration_select_column {
  /**
   * column name
   */
  apiDevUrl = 'apiDevUrl',

  /**
   * column name
   */
  apiUrl = 'apiUrl',

  /**
   * column name
   */
  icon = 'icon',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  isApproved = 'isApproved',

  /**
   * column name
   */
  isPrivate = 'isPrivate',

  /**
   * column name
   */
  name = 'name',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  type = 'type',

  /**
   * column name
   */
  uniqueRef = 'uniqueRef',
}

/**
 * input type for updating data in table "integration"
 */
export type integration_set_input = {
  apiDevUrl?: string | undefined
  apiUrl?: string | undefined
  icon?: string | undefined
  id?: string | undefined
  isApproved?: boolean | undefined
  isPrivate?: boolean | undefined
  name?: string | undefined
  teamId?: string | undefined
  type?: integration_type_enum | undefined
  uniqueRef?: string | undefined
}

export enum integration_type_enum {
  accountingPlatform = 'accountingPlatform',

  bookingChannel = 'bookingChannel',

  otherService = 'otherService',

  paymentGateway = 'paymentGateway',

  propertyManagementSystem = 'propertyManagementSystem',
}

/**
 * Boolean expression to compare columns of type "integration_type_enum". All fields are combined with logical 'AND'.
 */
export type integration_type_enum_comparison_exp = {
  _eq?: integration_type_enum | undefined
  _in?: Array<integration_type_enum> | undefined
  _is_null?: boolean | undefined
  _neq?: integration_type_enum | undefined
  _nin?: Array<integration_type_enum> | undefined
}

/**
 * update columns of table "integration"
 */
export enum integration_update_column {
  /**
   * column name
   */
  apiDevUrl = 'apiDevUrl',

  /**
   * column name
   */
  apiUrl = 'apiUrl',

  /**
   * column name
   */
  icon = 'icon',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  isApproved = 'isApproved',

  /**
   * column name
   */
  isPrivate = 'isPrivate',

  /**
   * column name
   */
  name = 'name',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  type = 'type',

  /**
   * column name
   */
  uniqueRef = 'uniqueRef',
}

/**
 * columns and relationships of "integration_type"
 */
export class integrationType extends $Base<'integrationType'> {
  constructor() {
    super('integrationType')
  }

  get name(): $Field<'name', string> {
    return this.$_select('name') as any
  }
}

/**
 * aggregated selection of "integration_type"
 */
export class integrationType_aggregate extends $Base<'integrationType_aggregate'> {
  constructor() {
    super('integrationType_aggregate')
  }

  aggregate<Sel extends Selection<integrationType_aggregate_fields>>(
    selectorFn: (s: integrationType_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new integrationType_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<integrationType>>(
    selectorFn: (s: integrationType) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new integrationType()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "integration_type"
 */
export class integrationType_aggregate_fields extends $Base<'integrationType_aggregate_fields'> {
  constructor() {
    super('integrationType_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<integrationType_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[integrationType_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<integrationType_max_fields>>(
    selectorFn: (s: integrationType_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new integrationType_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<integrationType_min_fields>>(
    selectorFn: (s: integrationType_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new integrationType_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * Boolean expression to filter rows from the table "integration_type". All fields are combined with a logical 'AND'.
 */
export type integrationType_bool_exp = {
  _and?: Array<integrationType_bool_exp> | undefined
  _not?: integrationType_bool_exp | undefined
  _or?: Array<integrationType_bool_exp> | undefined
  name?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "integration_type"
 */
export enum integrationType_constraint {
  /**
   * unique or primary key constraint
   */
  integration_type_pkey = 'integration_type_pkey',
}

/**
 * input type for inserting data into table "integration_type"
 */
export type integrationType_insert_input = {
  name?: string | undefined
}

/**
 * aggregate max on columns
 */
export class integrationType_max_fields extends $Base<'integrationType_max_fields'> {
  constructor() {
    super('integrationType_max_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * aggregate min on columns
 */
export class integrationType_min_fields extends $Base<'integrationType_min_fields'> {
  constructor() {
    super('integrationType_min_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * response of any mutation on the table "integration_type"
 */
export class integrationType_mutation_response extends $Base<'integrationType_mutation_response'> {
  constructor() {
    super('integrationType_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<integrationType>>(
    selectorFn: (s: integrationType) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new integrationType()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "integration_type"
 */
export type integrationType_on_conflict = {
  constraint: integrationType_constraint
  update_columns: Array<integrationType_update_column>
  where?: integrationType_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "integration_type".
 */
export type integrationType_order_by = {
  name?: order_by | undefined
}

/**
 * primary key columns input for table: integrationType
 */
export type integrationType_pk_columns_input = {
  name: string
}

/**
 * select columns of table "integration_type"
 */
export enum integrationType_select_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * input type for updating data in table "integration_type"
 */
export type integrationType_set_input = {
  name?: string | undefined
}

/**
 * update columns of table "integration_type"
 */
export enum integrationType_update_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * columns and relationships of "issue"
 */
export class issue extends $Base<'issue'> {
  constructor() {
    super('issue')
  }

  get code(): $Field<'code', string | undefined> {
    return this.$_select('code') as any
  }

  get createdAt(): $Field<'createdAt', string> {
    return this.$_select('createdAt') as any
  }

  get id(): $Field<'id', string> {
    return this.$_select('id') as any
  }

  get isPublic(): $Field<'isPublic', boolean | undefined> {
    return this.$_select('isPublic') as any
  }

  get isResolved(): $Field<'isResolved', boolean | undefined> {
    return this.$_select('isResolved') as any
  }

  /**
   * An object relationship
   */
  job<Sel extends Selection<job>>(selectorFn: (s: job) => [...Sel]): $Field<'job', GetOutput<Sel>> {
    const options = {
      selection: selectorFn(new job()),
    }
    return this.$_select('job', options) as any
  }

  get jobId(): $Field<'jobId', string> {
    return this.$_select('jobId') as any
  }

  get message(): $Field<'message', string | undefined> {
    return this.$_select('message') as any
  }

  requestParams<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'requestParams', string | undefined, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('requestParams', options) as any
  }

  resolveParams<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'resolveParams', string | undefined, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('resolveParams', options) as any
  }

  /**
   * An object relationship
   */
  team<Sel extends Selection<team>>(
    selectorFn: (s: team) => [...Sel]
  ): $Field<'team', GetOutput<Sel>> {
    const options = {
      selection: selectorFn(new team()),
    }
    return this.$_select('team', options) as any
  }

  get teamId(): $Field<'teamId', string> {
    return this.$_select('teamId') as any
  }

  get type(): $Field<'type', string | undefined> {
    return this.$_select('type') as any
  }

  get updatedAt(): $Field<'updatedAt', string> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * aggregated selection of "issue"
 */
export class issue_aggregate extends $Base<'issue_aggregate'> {
  constructor() {
    super('issue_aggregate')
  }

  aggregate<Sel extends Selection<issue_aggregate_fields>>(
    selectorFn: (s: issue_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new issue_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<issue>>(
    selectorFn: (s: issue) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new issue()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "issue"
 */
export class issue_aggregate_fields extends $Base<'issue_aggregate_fields'> {
  constructor() {
    super('issue_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<issue_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[issue_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<issue_max_fields>>(
    selectorFn: (s: issue_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new issue_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<issue_min_fields>>(
    selectorFn: (s: issue_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new issue_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * order by aggregate values of table "issue"
 */
export type issue_aggregate_order_by = {
  count?: order_by | undefined
  max?: issue_max_order_by | undefined
  min?: issue_min_order_by | undefined
}

/**
 * append existing jsonb value of filtered columns with new jsonb value
 */
export type issue_append_input = {
  requestParams?: string | undefined
  resolveParams?: string | undefined
}

/**
 * input type for inserting array relation for remote table "issue"
 */
export type issue_arr_rel_insert_input = {
  data: Array<issue_insert_input>
  on_conflict?: issue_on_conflict | undefined
}

/**
 * Boolean expression to filter rows from the table "issue". All fields are combined with a logical 'AND'.
 */
export type issue_bool_exp = {
  _and?: Array<issue_bool_exp> | undefined
  _not?: issue_bool_exp | undefined
  _or?: Array<issue_bool_exp> | undefined
  code?: String_comparison_exp | undefined
  createdAt?: timestamptz_comparison_exp | undefined
  id?: uuid_comparison_exp | undefined
  isPublic?: Boolean_comparison_exp | undefined
  isResolved?: Boolean_comparison_exp | undefined
  job?: job_bool_exp | undefined
  jobId?: uuid_comparison_exp | undefined
  message?: String_comparison_exp | undefined
  requestParams?: jsonb_comparison_exp | undefined
  resolveParams?: jsonb_comparison_exp | undefined
  team?: team_bool_exp | undefined
  teamId?: uuid_comparison_exp | undefined
  type?: String_comparison_exp | undefined
  updatedAt?: timestamptz_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "issue"
 */
export enum issue_constraint {
  /**
   * unique or primary key constraint
   */
  issue_pkey = 'issue_pkey',
}

/**
 * delete the field or element with specified path (for JSON arrays, negative integers count from the end)
 */
export type issue_delete_at_path_input = {
  requestParams?: Array<string> | undefined
  resolveParams?: Array<string> | undefined
}

/**
 * delete the array element with specified index (negative integers count from the
end). throws an error if top level container is not an array
 */
export type issue_delete_elem_input = {
  requestParams?: number | undefined
  resolveParams?: number | undefined
}

/**
 * delete key/value pair or string element. key/value pairs are matched based on their key value
 */
export type issue_delete_key_input = {
  requestParams?: string | undefined
  resolveParams?: string | undefined
}

/**
 * input type for inserting data into table "issue"
 */
export type issue_insert_input = {
  code?: string | undefined
  createdAt?: string | undefined
  id?: string | undefined
  isPublic?: boolean | undefined
  isResolved?: boolean | undefined
  job?: job_obj_rel_insert_input | undefined
  jobId?: string | undefined
  message?: string | undefined
  requestParams?: string | undefined
  resolveParams?: string | undefined
  team?: team_obj_rel_insert_input | undefined
  teamId?: string | undefined
  type?: string | undefined
  updatedAt?: string | undefined
}

/**
 * aggregate max on columns
 */
export class issue_max_fields extends $Base<'issue_max_fields'> {
  constructor() {
    super('issue_max_fields')
  }

  get code(): $Field<'code', string | undefined> {
    return this.$_select('code') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get jobId(): $Field<'jobId', string | undefined> {
    return this.$_select('jobId') as any
  }

  get message(): $Field<'message', string | undefined> {
    return this.$_select('message') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get type(): $Field<'type', string | undefined> {
    return this.$_select('type') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * order by max() on columns of table "issue"
 */
export type issue_max_order_by = {
  code?: order_by | undefined
  createdAt?: order_by | undefined
  id?: order_by | undefined
  jobId?: order_by | undefined
  message?: order_by | undefined
  teamId?: order_by | undefined
  type?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * aggregate min on columns
 */
export class issue_min_fields extends $Base<'issue_min_fields'> {
  constructor() {
    super('issue_min_fields')
  }

  get code(): $Field<'code', string | undefined> {
    return this.$_select('code') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get jobId(): $Field<'jobId', string | undefined> {
    return this.$_select('jobId') as any
  }

  get message(): $Field<'message', string | undefined> {
    return this.$_select('message') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get type(): $Field<'type', string | undefined> {
    return this.$_select('type') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * order by min() on columns of table "issue"
 */
export type issue_min_order_by = {
  code?: order_by | undefined
  createdAt?: order_by | undefined
  id?: order_by | undefined
  jobId?: order_by | undefined
  message?: order_by | undefined
  teamId?: order_by | undefined
  type?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * response of any mutation on the table "issue"
 */
export class issue_mutation_response extends $Base<'issue_mutation_response'> {
  constructor() {
    super('issue_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<issue>>(
    selectorFn: (s: issue) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new issue()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "issue"
 */
export type issue_on_conflict = {
  constraint: issue_constraint
  update_columns: Array<issue_update_column>
  where?: issue_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "issue".
 */
export type issue_order_by = {
  code?: order_by | undefined
  createdAt?: order_by | undefined
  id?: order_by | undefined
  isPublic?: order_by | undefined
  isResolved?: order_by | undefined
  job?: job_order_by | undefined
  jobId?: order_by | undefined
  message?: order_by | undefined
  requestParams?: order_by | undefined
  resolveParams?: order_by | undefined
  team?: team_order_by | undefined
  teamId?: order_by | undefined
  type?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * primary key columns input for table: issue
 */
export type issue_pk_columns_input = {
  id: string
}

/**
 * prepend existing jsonb value of filtered columns with new jsonb value
 */
export type issue_prepend_input = {
  requestParams?: string | undefined
  resolveParams?: string | undefined
}

/**
 * select columns of table "issue"
 */
export enum issue_select_column {
  /**
   * column name
   */
  code = 'code',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  isPublic = 'isPublic',

  /**
   * column name
   */
  isResolved = 'isResolved',

  /**
   * column name
   */
  jobId = 'jobId',

  /**
   * column name
   */
  message = 'message',

  /**
   * column name
   */
  requestParams = 'requestParams',

  /**
   * column name
   */
  resolveParams = 'resolveParams',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  type = 'type',

  /**
   * column name
   */
  updatedAt = 'updatedAt',
}

/**
 * input type for updating data in table "issue"
 */
export type issue_set_input = {
  code?: string | undefined
  createdAt?: string | undefined
  id?: string | undefined
  isPublic?: boolean | undefined
  isResolved?: boolean | undefined
  jobId?: string | undefined
  message?: string | undefined
  requestParams?: string | undefined
  resolveParams?: string | undefined
  teamId?: string | undefined
  type?: string | undefined
  updatedAt?: string | undefined
}

/**
 * update columns of table "issue"
 */
export enum issue_update_column {
  /**
   * column name
   */
  code = 'code',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  isPublic = 'isPublic',

  /**
   * column name
   */
  isResolved = 'isResolved',

  /**
   * column name
   */
  jobId = 'jobId',

  /**
   * column name
   */
  message = 'message',

  /**
   * column name
   */
  requestParams = 'requestParams',

  /**
   * column name
   */
  resolveParams = 'resolveParams',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  type = 'type',

  /**
   * column name
   */
  updatedAt = 'updatedAt',
}

/**
 * columns and relationships of "job"
 */
export class job extends $Base<'job'> {
  constructor() {
    super('job')
  }

  get apiVersion(): $Field<'apiVersion', string | undefined> {
    return this.$_select('apiVersion') as any
  }

  /**
   * An object relationship
   */
  connection<Sel extends Selection<connection>>(
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'connection', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new connection()),
    }
    return this.$_select('connection', options) as any
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string> {
    return this.$_select('createdAt') as any
  }

  get endedAt(): $Field<'endedAt', string | undefined> {
    return this.$_select('endedAt') as any
  }

  /**
   * An array relationship
   */
  entities<
    Args extends VariabledInput<{
      distinct_on?: Array<entity_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<entity_order_by> | undefined
      where?: entity_bool_exp | undefined
    }>,
    Sel extends Selection<entity>
  >(
    args: Args,
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'entities', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[entity_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[entity_order_by!]',
        where: 'entity_bool_exp',
      },
      args,

      selection: selectorFn(new entity()),
    }
    return this.$_select('entities', options) as any
  }

  /**
   * An aggregate relationship
   */
  entities_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<entity_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<entity_order_by> | undefined
      where?: entity_bool_exp | undefined
    }>,
    Sel extends Selection<entity_aggregate>
  >(
    args: Args,
    selectorFn: (s: entity_aggregate) => [...Sel]
  ): $Field<'entities_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[entity_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[entity_order_by!]',
        where: 'entity_bool_exp',
      },
      args,

      selection: selectorFn(new entity_aggregate()),
    }
    return this.$_select('entities_aggregate', options) as any
  }

  get id(): $Field<'id', string> {
    return this.$_select('id') as any
  }

  /**
   * An object relationship
   */
  integration<Sel extends Selection<integration>>(
    selectorFn: (s: integration) => [...Sel]
  ): $Field<'integration', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new integration()),
    }
    return this.$_select('integration', options) as any
  }

  get integrationId(): $Field<'integrationId', string | undefined> {
    return this.$_select('integrationId') as any
  }

  get integrationSdkVersion(): $Field<'integrationSdkVersion', string | undefined> {
    return this.$_select('integrationSdkVersion') as any
  }

  get integrationVersion(): $Field<'integrationVersion', string | undefined> {
    return this.$_select('integrationVersion') as any
  }

  /**
   * An array relationship
   */
  issues<
    Args extends VariabledInput<{
      distinct_on?: Array<issue_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<issue_order_by> | undefined
      where?: issue_bool_exp | undefined
    }>,
    Sel extends Selection<issue>
  >(
    args: Args,
    selectorFn: (s: issue) => [...Sel]
  ): $Field<'issues', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[issue_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[issue_order_by!]',
        where: 'issue_bool_exp',
      },
      args,

      selection: selectorFn(new issue()),
    }
    return this.$_select('issues', options) as any
  }

  /**
   * An aggregate relationship
   */
  issues_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<issue_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<issue_order_by> | undefined
      where?: issue_bool_exp | undefined
    }>,
    Sel extends Selection<issue_aggregate>
  >(
    args: Args,
    selectorFn: (s: issue_aggregate) => [...Sel]
  ): $Field<'issues_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[issue_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[issue_order_by!]',
        where: 'issue_bool_exp',
      },
      args,

      selection: selectorFn(new issue_aggregate()),
    }
    return this.$_select('issues_aggregate', options) as any
  }

  get logFile(): $Field<'logFile', string | undefined> {
    return this.$_select('logFile') as any
  }

  get logLink(): $Field<'logLink', string | undefined> {
    return this.$_select('logLink') as any
  }

  logs<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'logs', string | undefined, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('logs', options) as any
  }

  get method(): $Field<'method', job_method_enum | undefined> {
    return this.$_select('method') as any
  }

  params<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'params', string | undefined, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('params', options) as any
  }

  get requestId(): $Field<'requestId', string | undefined> {
    return this.$_select('requestId') as any
  }

  response<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'response', string | undefined, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('response', options) as any
  }

  get sdkVersion(): $Field<'sdkVersion', string | undefined> {
    return this.$_select('sdkVersion') as any
  }

  get startedAt(): $Field<'startedAt', string | undefined> {
    return this.$_select('startedAt') as any
  }

  get status(): $Field<'status', job_status_enum | undefined> {
    return this.$_select('status') as any
  }

  /**
   * An object relationship
   */
  team<Sel extends Selection<team>>(
    selectorFn: (s: team) => [...Sel]
  ): $Field<'team', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team()),
    }
    return this.$_select('team', options) as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get updatedAt(): $Field<'updatedAt', string> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * aggregated selection of "job"
 */
export class job_aggregate extends $Base<'job_aggregate'> {
  constructor() {
    super('job_aggregate')
  }

  aggregate<Sel extends Selection<job_aggregate_fields>>(
    selectorFn: (s: job_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new job_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<job>>(
    selectorFn: (s: job) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new job()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "job"
 */
export class job_aggregate_fields extends $Base<'job_aggregate_fields'> {
  constructor() {
    super('job_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<job_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[job_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<job_max_fields>>(
    selectorFn: (s: job_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new job_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<job_min_fields>>(
    selectorFn: (s: job_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new job_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * order by aggregate values of table "job"
 */
export type job_aggregate_order_by = {
  count?: order_by | undefined
  max?: job_max_order_by | undefined
  min?: job_min_order_by | undefined
}

/**
 * append existing jsonb value of filtered columns with new jsonb value
 */
export type job_append_input = {
  logs?: string | undefined
  params?: string | undefined
  response?: string | undefined
}

/**
 * input type for inserting array relation for remote table "job"
 */
export type job_arr_rel_insert_input = {
  data: Array<job_insert_input>
  on_conflict?: job_on_conflict | undefined
}

/**
 * Boolean expression to filter rows from the table "job". All fields are combined with a logical 'AND'.
 */
export type job_bool_exp = {
  _and?: Array<job_bool_exp> | undefined
  _not?: job_bool_exp | undefined
  _or?: Array<job_bool_exp> | undefined
  apiVersion?: String_comparison_exp | undefined
  connection?: connection_bool_exp | undefined
  connectionId?: uuid_comparison_exp | undefined
  createdAt?: timestamptz_comparison_exp | undefined
  endedAt?: timestamptz_comparison_exp | undefined
  entities?: entity_bool_exp | undefined
  id?: uuid_comparison_exp | undefined
  integration?: integration_bool_exp | undefined
  integrationId?: uuid_comparison_exp | undefined
  integrationSdkVersion?: String_comparison_exp | undefined
  integrationVersion?: String_comparison_exp | undefined
  issues?: issue_bool_exp | undefined
  logFile?: String_comparison_exp | undefined
  logLink?: String_comparison_exp | undefined
  logs?: jsonb_comparison_exp | undefined
  method?: job_method_enum_comparison_exp | undefined
  params?: jsonb_comparison_exp | undefined
  requestId?: String_comparison_exp | undefined
  response?: jsonb_comparison_exp | undefined
  sdkVersion?: String_comparison_exp | undefined
  startedAt?: timestamptz_comparison_exp | undefined
  status?: job_status_enum_comparison_exp | undefined
  team?: team_bool_exp | undefined
  teamId?: uuid_comparison_exp | undefined
  updatedAt?: timestamptz_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "job"
 */
export enum job_constraint {
  /**
   * unique or primary key constraint
   */
  job_pkey = 'job_pkey',
}

/**
 * delete the field or element with specified path (for JSON arrays, negative integers count from the end)
 */
export type job_delete_at_path_input = {
  logs?: Array<string> | undefined
  params?: Array<string> | undefined
  response?: Array<string> | undefined
}

/**
 * delete the array element with specified index (negative integers count from the
end). throws an error if top level container is not an array
 */
export type job_delete_elem_input = {
  logs?: number | undefined
  params?: number | undefined
  response?: number | undefined
}

/**
 * delete key/value pair or string element. key/value pairs are matched based on their key value
 */
export type job_delete_key_input = {
  logs?: string | undefined
  params?: string | undefined
  response?: string | undefined
}

/**
 * input type for inserting data into table "job"
 */
export type job_insert_input = {
  apiVersion?: string | undefined
  connection?: connection_obj_rel_insert_input | undefined
  connectionId?: string | undefined
  createdAt?: string | undefined
  endedAt?: string | undefined
  entities?: entity_arr_rel_insert_input | undefined
  id?: string | undefined
  integration?: integration_obj_rel_insert_input | undefined
  integrationId?: string | undefined
  integrationSdkVersion?: string | undefined
  integrationVersion?: string | undefined
  issues?: issue_arr_rel_insert_input | undefined
  logFile?: string | undefined
  logLink?: string | undefined
  logs?: string | undefined
  method?: job_method_enum | undefined
  params?: string | undefined
  requestId?: string | undefined
  response?: string | undefined
  sdkVersion?: string | undefined
  startedAt?: string | undefined
  status?: job_status_enum | undefined
  team?: team_obj_rel_insert_input | undefined
  teamId?: string | undefined
  updatedAt?: string | undefined
}

/**
 * aggregate max on columns
 */
export class job_max_fields extends $Base<'job_max_fields'> {
  constructor() {
    super('job_max_fields')
  }

  get apiVersion(): $Field<'apiVersion', string | undefined> {
    return this.$_select('apiVersion') as any
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get endedAt(): $Field<'endedAt', string | undefined> {
    return this.$_select('endedAt') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get integrationId(): $Field<'integrationId', string | undefined> {
    return this.$_select('integrationId') as any
  }

  get integrationSdkVersion(): $Field<'integrationSdkVersion', string | undefined> {
    return this.$_select('integrationSdkVersion') as any
  }

  get integrationVersion(): $Field<'integrationVersion', string | undefined> {
    return this.$_select('integrationVersion') as any
  }

  get logFile(): $Field<'logFile', string | undefined> {
    return this.$_select('logFile') as any
  }

  get logLink(): $Field<'logLink', string | undefined> {
    return this.$_select('logLink') as any
  }

  get requestId(): $Field<'requestId', string | undefined> {
    return this.$_select('requestId') as any
  }

  get sdkVersion(): $Field<'sdkVersion', string | undefined> {
    return this.$_select('sdkVersion') as any
  }

  get startedAt(): $Field<'startedAt', string | undefined> {
    return this.$_select('startedAt') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * order by max() on columns of table "job"
 */
export type job_max_order_by = {
  apiVersion?: order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  endedAt?: order_by | undefined
  id?: order_by | undefined
  integrationId?: order_by | undefined
  integrationSdkVersion?: order_by | undefined
  integrationVersion?: order_by | undefined
  logFile?: order_by | undefined
  logLink?: order_by | undefined
  requestId?: order_by | undefined
  sdkVersion?: order_by | undefined
  startedAt?: order_by | undefined
  teamId?: order_by | undefined
  updatedAt?: order_by | undefined
}

export enum job_method_enum {
  act = 'act',

  connect = 'connect',

  delete = 'delete',

  enhance = 'enhance',

  extract = 'extract',

  info = 'info',

  react = 'react',

  refresh = 'refresh',

  transform = 'transform',
}

/**
 * Boolean expression to compare columns of type "job_method_enum". All fields are combined with logical 'AND'.
 */
export type job_method_enum_comparison_exp = {
  _eq?: job_method_enum | undefined
  _in?: Array<job_method_enum> | undefined
  _is_null?: boolean | undefined
  _neq?: job_method_enum | undefined
  _nin?: Array<job_method_enum> | undefined
}

/**
 * aggregate min on columns
 */
export class job_min_fields extends $Base<'job_min_fields'> {
  constructor() {
    super('job_min_fields')
  }

  get apiVersion(): $Field<'apiVersion', string | undefined> {
    return this.$_select('apiVersion') as any
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get endedAt(): $Field<'endedAt', string | undefined> {
    return this.$_select('endedAt') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get integrationId(): $Field<'integrationId', string | undefined> {
    return this.$_select('integrationId') as any
  }

  get integrationSdkVersion(): $Field<'integrationSdkVersion', string | undefined> {
    return this.$_select('integrationSdkVersion') as any
  }

  get integrationVersion(): $Field<'integrationVersion', string | undefined> {
    return this.$_select('integrationVersion') as any
  }

  get logFile(): $Field<'logFile', string | undefined> {
    return this.$_select('logFile') as any
  }

  get logLink(): $Field<'logLink', string | undefined> {
    return this.$_select('logLink') as any
  }

  get requestId(): $Field<'requestId', string | undefined> {
    return this.$_select('requestId') as any
  }

  get sdkVersion(): $Field<'sdkVersion', string | undefined> {
    return this.$_select('sdkVersion') as any
  }

  get startedAt(): $Field<'startedAt', string | undefined> {
    return this.$_select('startedAt') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * order by min() on columns of table "job"
 */
export type job_min_order_by = {
  apiVersion?: order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  endedAt?: order_by | undefined
  id?: order_by | undefined
  integrationId?: order_by | undefined
  integrationSdkVersion?: order_by | undefined
  integrationVersion?: order_by | undefined
  logFile?: order_by | undefined
  logLink?: order_by | undefined
  requestId?: order_by | undefined
  sdkVersion?: order_by | undefined
  startedAt?: order_by | undefined
  teamId?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * response of any mutation on the table "job"
 */
export class job_mutation_response extends $Base<'job_mutation_response'> {
  constructor() {
    super('job_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<job>>(
    selectorFn: (s: job) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new job()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * input type for inserting object relation for remote table "job"
 */
export type job_obj_rel_insert_input = {
  data: job_insert_input
  on_conflict?: job_on_conflict | undefined
}

/**
 * on conflict condition type for table "job"
 */
export type job_on_conflict = {
  constraint: job_constraint
  update_columns: Array<job_update_column>
  where?: job_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "job".
 */
export type job_order_by = {
  apiVersion?: order_by | undefined
  connection?: connection_order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  endedAt?: order_by | undefined
  entities_aggregate?: entity_aggregate_order_by | undefined
  id?: order_by | undefined
  integration?: integration_order_by | undefined
  integrationId?: order_by | undefined
  integrationSdkVersion?: order_by | undefined
  integrationVersion?: order_by | undefined
  issues_aggregate?: issue_aggregate_order_by | undefined
  logFile?: order_by | undefined
  logLink?: order_by | undefined
  logs?: order_by | undefined
  method?: order_by | undefined
  params?: order_by | undefined
  requestId?: order_by | undefined
  response?: order_by | undefined
  sdkVersion?: order_by | undefined
  startedAt?: order_by | undefined
  status?: order_by | undefined
  team?: team_order_by | undefined
  teamId?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * primary key columns input for table: job
 */
export type job_pk_columns_input = {
  id: string
}

/**
 * prepend existing jsonb value of filtered columns with new jsonb value
 */
export type job_prepend_input = {
  logs?: string | undefined
  params?: string | undefined
  response?: string | undefined
}

/**
 * select columns of table "job"
 */
export enum job_select_column {
  /**
   * column name
   */
  apiVersion = 'apiVersion',

  /**
   * column name
   */
  connectionId = 'connectionId',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  endedAt = 'endedAt',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  integrationId = 'integrationId',

  /**
   * column name
   */
  integrationSdkVersion = 'integrationSdkVersion',

  /**
   * column name
   */
  integrationVersion = 'integrationVersion',

  /**
   * column name
   */
  logFile = 'logFile',

  /**
   * column name
   */
  logLink = 'logLink',

  /**
   * column name
   */
  logs = 'logs',

  /**
   * column name
   */
  method = 'method',

  /**
   * column name
   */
  params = 'params',

  /**
   * column name
   */
  requestId = 'requestId',

  /**
   * column name
   */
  response = 'response',

  /**
   * column name
   */
  sdkVersion = 'sdkVersion',

  /**
   * column name
   */
  startedAt = 'startedAt',

  /**
   * column name
   */
  status = 'status',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  updatedAt = 'updatedAt',
}

/**
 * input type for updating data in table "job"
 */
export type job_set_input = {
  apiVersion?: string | undefined
  connectionId?: string | undefined
  createdAt?: string | undefined
  endedAt?: string | undefined
  id?: string | undefined
  integrationId?: string | undefined
  integrationSdkVersion?: string | undefined
  integrationVersion?: string | undefined
  logFile?: string | undefined
  logLink?: string | undefined
  logs?: string | undefined
  method?: job_method_enum | undefined
  params?: string | undefined
  requestId?: string | undefined
  response?: string | undefined
  sdkVersion?: string | undefined
  startedAt?: string | undefined
  status?: job_status_enum | undefined
  teamId?: string | undefined
  updatedAt?: string | undefined
}

export enum job_status_enum {
  completed = 'completed',

  failed = 'failed',

  paused = 'paused',

  queued = 'queued',

  started = 'started',
}

/**
 * Boolean expression to compare columns of type "job_status_enum". All fields are combined with logical 'AND'.
 */
export type job_status_enum_comparison_exp = {
  _eq?: job_status_enum | undefined
  _in?: Array<job_status_enum> | undefined
  _is_null?: boolean | undefined
  _neq?: job_status_enum | undefined
  _nin?: Array<job_status_enum> | undefined
}

/**
 * update columns of table "job"
 */
export enum job_update_column {
  /**
   * column name
   */
  apiVersion = 'apiVersion',

  /**
   * column name
   */
  connectionId = 'connectionId',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  endedAt = 'endedAt',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  integrationId = 'integrationId',

  /**
   * column name
   */
  integrationSdkVersion = 'integrationSdkVersion',

  /**
   * column name
   */
  integrationVersion = 'integrationVersion',

  /**
   * column name
   */
  logFile = 'logFile',

  /**
   * column name
   */
  logLink = 'logLink',

  /**
   * column name
   */
  logs = 'logs',

  /**
   * column name
   */
  method = 'method',

  /**
   * column name
   */
  params = 'params',

  /**
   * column name
   */
  requestId = 'requestId',

  /**
   * column name
   */
  response = 'response',

  /**
   * column name
   */
  sdkVersion = 'sdkVersion',

  /**
   * column name
   */
  startedAt = 'startedAt',

  /**
   * column name
   */
  status = 'status',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  updatedAt = 'updatedAt',
}

/**
 * columns and relationships of "job_method"
 */
export class jobMethod extends $Base<'jobMethod'> {
  constructor() {
    super('jobMethod')
  }

  get name(): $Field<'name', string> {
    return this.$_select('name') as any
  }
}

/**
 * aggregated selection of "job_method"
 */
export class jobMethod_aggregate extends $Base<'jobMethod_aggregate'> {
  constructor() {
    super('jobMethod_aggregate')
  }

  aggregate<Sel extends Selection<jobMethod_aggregate_fields>>(
    selectorFn: (s: jobMethod_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new jobMethod_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<jobMethod>>(
    selectorFn: (s: jobMethod) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new jobMethod()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "job_method"
 */
export class jobMethod_aggregate_fields extends $Base<'jobMethod_aggregate_fields'> {
  constructor() {
    super('jobMethod_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<jobMethod_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[jobMethod_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<jobMethod_max_fields>>(
    selectorFn: (s: jobMethod_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new jobMethod_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<jobMethod_min_fields>>(
    selectorFn: (s: jobMethod_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new jobMethod_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * Boolean expression to filter rows from the table "job_method". All fields are combined with a logical 'AND'.
 */
export type jobMethod_bool_exp = {
  _and?: Array<jobMethod_bool_exp> | undefined
  _not?: jobMethod_bool_exp | undefined
  _or?: Array<jobMethod_bool_exp> | undefined
  name?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "job_method"
 */
export enum jobMethod_constraint {
  /**
   * unique or primary key constraint
   */
  job_method_pkey = 'job_method_pkey',
}

/**
 * input type for inserting data into table "job_method"
 */
export type jobMethod_insert_input = {
  name?: string | undefined
}

/**
 * aggregate max on columns
 */
export class jobMethod_max_fields extends $Base<'jobMethod_max_fields'> {
  constructor() {
    super('jobMethod_max_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * aggregate min on columns
 */
export class jobMethod_min_fields extends $Base<'jobMethod_min_fields'> {
  constructor() {
    super('jobMethod_min_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * response of any mutation on the table "job_method"
 */
export class jobMethod_mutation_response extends $Base<'jobMethod_mutation_response'> {
  constructor() {
    super('jobMethod_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<jobMethod>>(
    selectorFn: (s: jobMethod) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new jobMethod()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "job_method"
 */
export type jobMethod_on_conflict = {
  constraint: jobMethod_constraint
  update_columns: Array<jobMethod_update_column>
  where?: jobMethod_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "job_method".
 */
export type jobMethod_order_by = {
  name?: order_by | undefined
}

/**
 * primary key columns input for table: jobMethod
 */
export type jobMethod_pk_columns_input = {
  name: string
}

/**
 * select columns of table "job_method"
 */
export enum jobMethod_select_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * input type for updating data in table "job_method"
 */
export type jobMethod_set_input = {
  name?: string | undefined
}

/**
 * update columns of table "job_method"
 */
export enum jobMethod_update_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * columns and relationships of "job_status"
 */
export class jobStatus extends $Base<'jobStatus'> {
  constructor() {
    super('jobStatus')
  }

  get name(): $Field<'name', string> {
    return this.$_select('name') as any
  }
}

/**
 * aggregated selection of "job_status"
 */
export class jobStatus_aggregate extends $Base<'jobStatus_aggregate'> {
  constructor() {
    super('jobStatus_aggregate')
  }

  aggregate<Sel extends Selection<jobStatus_aggregate_fields>>(
    selectorFn: (s: jobStatus_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new jobStatus_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<jobStatus>>(
    selectorFn: (s: jobStatus) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new jobStatus()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "job_status"
 */
export class jobStatus_aggregate_fields extends $Base<'jobStatus_aggregate_fields'> {
  constructor() {
    super('jobStatus_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<jobStatus_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[jobStatus_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<jobStatus_max_fields>>(
    selectorFn: (s: jobStatus_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new jobStatus_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<jobStatus_min_fields>>(
    selectorFn: (s: jobStatus_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new jobStatus_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * Boolean expression to filter rows from the table "job_status". All fields are combined with a logical 'AND'.
 */
export type jobStatus_bool_exp = {
  _and?: Array<jobStatus_bool_exp> | undefined
  _not?: jobStatus_bool_exp | undefined
  _or?: Array<jobStatus_bool_exp> | undefined
  name?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "job_status"
 */
export enum jobStatus_constraint {
  /**
   * unique or primary key constraint
   */
  job_status_pkey = 'job_status_pkey',
}

/**
 * input type for inserting data into table "job_status"
 */
export type jobStatus_insert_input = {
  name?: string | undefined
}

/**
 * aggregate max on columns
 */
export class jobStatus_max_fields extends $Base<'jobStatus_max_fields'> {
  constructor() {
    super('jobStatus_max_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * aggregate min on columns
 */
export class jobStatus_min_fields extends $Base<'jobStatus_min_fields'> {
  constructor() {
    super('jobStatus_min_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * response of any mutation on the table "job_status"
 */
export class jobStatus_mutation_response extends $Base<'jobStatus_mutation_response'> {
  constructor() {
    super('jobStatus_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<jobStatus>>(
    selectorFn: (s: jobStatus) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new jobStatus()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "job_status"
 */
export type jobStatus_on_conflict = {
  constraint: jobStatus_constraint
  update_columns: Array<jobStatus_update_column>
  where?: jobStatus_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "job_status".
 */
export type jobStatus_order_by = {
  name?: order_by | undefined
}

/**
 * primary key columns input for table: jobStatus
 */
export type jobStatus_pk_columns_input = {
  name: string
}

/**
 * select columns of table "job_status"
 */
export enum jobStatus_select_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * input type for updating data in table "job_status"
 */
export type jobStatus_set_input = {
  name?: string | undefined
}

/**
 * update columns of table "job_status"
 */
export enum jobStatus_update_column {
  /**
   * column name
   */
  name = 'name',
}

export type jsonb = unknown

/**
 * Boolean expression to compare columns of type "jsonb". All fields are combined with logical 'AND'.
 */
export type jsonb_comparison_exp = {
  _contained_in?: string | undefined
  _contains?: string | undefined
  _eq?: string | undefined
  _gt?: string | undefined
  _gte?: string | undefined
  _has_key?: string | undefined
  _has_keys_all?: Array<string> | undefined
  _has_keys_any?: Array<string> | undefined
  _in?: Array<string> | undefined
  _is_null?: boolean | undefined
  _lt?: string | undefined
  _lte?: string | undefined
  _neq?: string | undefined
  _nin?: Array<string> | undefined
}

/**
 * columns and relationships of "line"
 */
export class line extends $Base<'line'> {
  constructor() {
    super('line')
  }

  /**
   * An object relationship
   */
  booking<Sel extends Selection<booking>>(
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'booking', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new booking()),
    }
    return this.$_select('booking', options) as any
  }

  get bookingId(): $Field<'bookingId', string | undefined> {
    return this.$_select('bookingId') as any
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }

  get classification(): $Field<'classification', classification_enum | undefined> {
    return this.$_select('classification') as any
  }

  /**
   * An object relationship
   */
  connection<Sel extends Selection<connection>>(
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'connection', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new connection()),
    }
    return this.$_select('connection', options) as any
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string> {
    return this.$_select('createdAt') as any
  }

  get description(): $Field<'description', string | undefined> {
    return this.$_select('description') as any
  }

  /**
   * An array relationship
   */
  enhancementLines<
    Args extends VariabledInput<{
      distinct_on?: Array<line_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<line_order_by> | undefined
      where?: line_bool_exp | undefined
    }>,
    Sel extends Selection<line>
  >(
    args: Args,
    selectorFn: (s: line) => [...Sel]
  ): $Field<'enhancementLines', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[line_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[line_order_by!]',
        where: 'line_bool_exp',
      },
      args,

      selection: selectorFn(new line()),
    }
    return this.$_select('enhancementLines', options) as any
  }

  /**
   * An aggregate relationship
   */
  enhancementLines_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<line_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<line_order_by> | undefined
      where?: line_bool_exp | undefined
    }>,
    Sel extends Selection<line_aggregate>
  >(
    args: Args,
    selectorFn: (s: line_aggregate) => [...Sel]
  ): $Field<'enhancementLines_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[line_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[line_order_by!]',
        where: 'line_bool_exp',
      },
      args,

      selection: selectorFn(new line_aggregate()),
    }
    return this.$_select('enhancementLines_aggregate', options) as any
  }

  /**
   * An object relationship
   */
  enhancingLine<Sel extends Selection<line>>(
    selectorFn: (s: line) => [...Sel]
  ): $Field<'enhancingLine', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new line()),
    }
    return this.$_select('enhancingLine', options) as any
  }

  get enhancingLineId(): $Field<'enhancingLineId', string | undefined> {
    return this.$_select('enhancingLineId') as any
  }

  get id(): $Field<'id', string> {
    return this.$_select('id') as any
  }

  get invoiceStatus(): $Field<'invoiceStatus', string | undefined> {
    return this.$_select('invoiceStatus') as any
  }

  get isEnhanced(): $Field<'isEnhanced', boolean | undefined> {
    return this.$_select('isEnhanced') as any
  }

  metadata<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'metadata', string | undefined, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('metadata', options) as any
  }

  get originCentTotal(): $Field<'originCentTotal', number | undefined> {
    return this.$_select('originCentTotal') as any
  }

  get originCurrency(): $Field<'originCurrency', string | undefined> {
    return this.$_select('originCurrency') as any
  }

  get originExchangeRate(): $Field<'originExchangeRate', string | undefined> {
    return this.$_select('originExchangeRate') as any
  }

  /**
   * An object relationship
   */
  payment<Sel extends Selection<payment>>(
    selectorFn: (s: payment) => [...Sel]
  ): $Field<'payment', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new payment()),
    }
    return this.$_select('payment', options) as any
  }

  get paymentId(): $Field<'paymentId', string | undefined> {
    return this.$_select('paymentId') as any
  }

  get subclassification(): $Field<'subclassification', subclassification_enum | undefined> {
    return this.$_select('subclassification') as any
  }

  /**
   * An object relationship
   */
  team<Sel extends Selection<team>>(
    selectorFn: (s: team) => [...Sel]
  ): $Field<'team', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team()),
    }
    return this.$_select('team', options) as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get type(): $Field<'type', string | undefined> {
    return this.$_select('type') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get unitId(): $Field<'unitId', string | undefined> {
    return this.$_select('unitId') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * aggregated selection of "line"
 */
export class line_aggregate extends $Base<'line_aggregate'> {
  constructor() {
    super('line_aggregate')
  }

  aggregate<Sel extends Selection<line_aggregate_fields>>(
    selectorFn: (s: line_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new line_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<line>>(
    selectorFn: (s: line) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new line()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "line"
 */
export class line_aggregate_fields extends $Base<'line_aggregate_fields'> {
  constructor() {
    super('line_aggregate_fields')
  }

  avg<Sel extends Selection<line_avg_fields>>(
    selectorFn: (s: line_avg_fields) => [...Sel]
  ): $Field<'avg', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new line_avg_fields()),
    }
    return this.$_select('avg', options) as any
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<line_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[line_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<line_max_fields>>(
    selectorFn: (s: line_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new line_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<line_min_fields>>(
    selectorFn: (s: line_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new line_min_fields()),
    }
    return this.$_select('min', options) as any
  }

  stddev<Sel extends Selection<line_stddev_fields>>(
    selectorFn: (s: line_stddev_fields) => [...Sel]
  ): $Field<'stddev', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new line_stddev_fields()),
    }
    return this.$_select('stddev', options) as any
  }

  stddev_pop<Sel extends Selection<line_stddev_pop_fields>>(
    selectorFn: (s: line_stddev_pop_fields) => [...Sel]
  ): $Field<'stddev_pop', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new line_stddev_pop_fields()),
    }
    return this.$_select('stddev_pop', options) as any
  }

  stddev_samp<Sel extends Selection<line_stddev_samp_fields>>(
    selectorFn: (s: line_stddev_samp_fields) => [...Sel]
  ): $Field<'stddev_samp', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new line_stddev_samp_fields()),
    }
    return this.$_select('stddev_samp', options) as any
  }

  sum<Sel extends Selection<line_sum_fields>>(
    selectorFn: (s: line_sum_fields) => [...Sel]
  ): $Field<'sum', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new line_sum_fields()),
    }
    return this.$_select('sum', options) as any
  }

  var_pop<Sel extends Selection<line_var_pop_fields>>(
    selectorFn: (s: line_var_pop_fields) => [...Sel]
  ): $Field<'var_pop', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new line_var_pop_fields()),
    }
    return this.$_select('var_pop', options) as any
  }

  var_samp<Sel extends Selection<line_var_samp_fields>>(
    selectorFn: (s: line_var_samp_fields) => [...Sel]
  ): $Field<'var_samp', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new line_var_samp_fields()),
    }
    return this.$_select('var_samp', options) as any
  }

  variance<Sel extends Selection<line_variance_fields>>(
    selectorFn: (s: line_variance_fields) => [...Sel]
  ): $Field<'variance', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new line_variance_fields()),
    }
    return this.$_select('variance', options) as any
  }
}

/**
 * order by aggregate values of table "line"
 */
export type line_aggregate_order_by = {
  avg?: line_avg_order_by | undefined
  count?: order_by | undefined
  max?: line_max_order_by | undefined
  min?: line_min_order_by | undefined
  stddev?: line_stddev_order_by | undefined
  stddev_pop?: line_stddev_pop_order_by | undefined
  stddev_samp?: line_stddev_samp_order_by | undefined
  sum?: line_sum_order_by | undefined
  var_pop?: line_var_pop_order_by | undefined
  var_samp?: line_var_samp_order_by | undefined
  variance?: line_variance_order_by | undefined
}

/**
 * append existing jsonb value of filtered columns with new jsonb value
 */
export type line_append_input = {
  metadata?: string | undefined
}

/**
 * input type for inserting array relation for remote table "line"
 */
export type line_arr_rel_insert_input = {
  data: Array<line_insert_input>
  on_conflict?: line_on_conflict | undefined
}

/**
 * aggregate avg on columns
 */
export class line_avg_fields extends $Base<'line_avg_fields'> {
  constructor() {
    super('line_avg_fields')
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }

  get originCentTotal(): $Field<'originCentTotal', number | undefined> {
    return this.$_select('originCentTotal') as any
  }

  get originExchangeRate(): $Field<'originExchangeRate', number | undefined> {
    return this.$_select('originExchangeRate') as any
  }
}

/**
 * order by avg() on columns of table "line"
 */
export type line_avg_order_by = {
  centTotal?: order_by | undefined
  originCentTotal?: order_by | undefined
  originExchangeRate?: order_by | undefined
}

/**
 * Boolean expression to filter rows from the table "line". All fields are combined with a logical 'AND'.
 */
export type line_bool_exp = {
  _and?: Array<line_bool_exp> | undefined
  _not?: line_bool_exp | undefined
  _or?: Array<line_bool_exp> | undefined
  booking?: booking_bool_exp | undefined
  bookingId?: uuid_comparison_exp | undefined
  centTotal?: Int_comparison_exp | undefined
  classification?: classification_enum_comparison_exp | undefined
  connection?: connection_bool_exp | undefined
  connectionId?: uuid_comparison_exp | undefined
  createdAt?: timestamptz_comparison_exp | undefined
  description?: String_comparison_exp | undefined
  enhancementLines?: line_bool_exp | undefined
  enhancingLine?: line_bool_exp | undefined
  enhancingLineId?: uuid_comparison_exp | undefined
  id?: uuid_comparison_exp | undefined
  invoiceStatus?: String_comparison_exp | undefined
  isEnhanced?: Boolean_comparison_exp | undefined
  metadata?: jsonb_comparison_exp | undefined
  originCentTotal?: Int_comparison_exp | undefined
  originCurrency?: String_comparison_exp | undefined
  originExchangeRate?: numeric_comparison_exp | undefined
  payment?: payment_bool_exp | undefined
  paymentId?: uuid_comparison_exp | undefined
  subclassification?: subclassification_enum_comparison_exp | undefined
  team?: team_bool_exp | undefined
  teamId?: uuid_comparison_exp | undefined
  type?: String_comparison_exp | undefined
  uniqueRef?: String_comparison_exp | undefined
  unitId?: uuid_comparison_exp | undefined
  updatedAt?: timestamptz_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "line"
 */
export enum line_constraint {
  /**
   * unique or primary key constraint
   */
  line_pkey = 'line_pkey',
}

/**
 * delete the field or element with specified path (for JSON arrays, negative integers count from the end)
 */
export type line_delete_at_path_input = {
  metadata?: Array<string> | undefined
}

/**
 * delete the array element with specified index (negative integers count from the
end). throws an error if top level container is not an array
 */
export type line_delete_elem_input = {
  metadata?: number | undefined
}

/**
 * delete key/value pair or string element. key/value pairs are matched based on their key value
 */
export type line_delete_key_input = {
  metadata?: string | undefined
}

/**
 * input type for incrementing numeric columns in table "line"
 */
export type line_inc_input = {
  centTotal?: number | undefined
  originCentTotal?: number | undefined
  originExchangeRate?: string | undefined
}

/**
 * input type for inserting data into table "line"
 */
export type line_insert_input = {
  booking?: booking_obj_rel_insert_input | undefined
  bookingId?: string | undefined
  centTotal?: number | undefined
  classification?: classification_enum | undefined
  connection?: connection_obj_rel_insert_input | undefined
  connectionId?: string | undefined
  createdAt?: string | undefined
  description?: string | undefined
  enhancementLines?: line_arr_rel_insert_input | undefined
  enhancingLine?: line_obj_rel_insert_input | undefined
  enhancingLineId?: string | undefined
  id?: string | undefined
  invoiceStatus?: string | undefined
  isEnhanced?: boolean | undefined
  metadata?: string | undefined
  originCentTotal?: number | undefined
  originCurrency?: string | undefined
  originExchangeRate?: string | undefined
  payment?: payment_obj_rel_insert_input | undefined
  paymentId?: string | undefined
  subclassification?: subclassification_enum | undefined
  team?: team_obj_rel_insert_input | undefined
  teamId?: string | undefined
  type?: string | undefined
  uniqueRef?: string | undefined
  unitId?: string | undefined
  updatedAt?: string | undefined
}

/**
 * aggregate max on columns
 */
export class line_max_fields extends $Base<'line_max_fields'> {
  constructor() {
    super('line_max_fields')
  }

  get bookingId(): $Field<'bookingId', string | undefined> {
    return this.$_select('bookingId') as any
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get description(): $Field<'description', string | undefined> {
    return this.$_select('description') as any
  }

  get enhancingLineId(): $Field<'enhancingLineId', string | undefined> {
    return this.$_select('enhancingLineId') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get invoiceStatus(): $Field<'invoiceStatus', string | undefined> {
    return this.$_select('invoiceStatus') as any
  }

  get originCentTotal(): $Field<'originCentTotal', number | undefined> {
    return this.$_select('originCentTotal') as any
  }

  get originCurrency(): $Field<'originCurrency', string | undefined> {
    return this.$_select('originCurrency') as any
  }

  get originExchangeRate(): $Field<'originExchangeRate', string | undefined> {
    return this.$_select('originExchangeRate') as any
  }

  get paymentId(): $Field<'paymentId', string | undefined> {
    return this.$_select('paymentId') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get type(): $Field<'type', string | undefined> {
    return this.$_select('type') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get unitId(): $Field<'unitId', string | undefined> {
    return this.$_select('unitId') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * order by max() on columns of table "line"
 */
export type line_max_order_by = {
  bookingId?: order_by | undefined
  centTotal?: order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  description?: order_by | undefined
  enhancingLineId?: order_by | undefined
  id?: order_by | undefined
  invoiceStatus?: order_by | undefined
  originCentTotal?: order_by | undefined
  originCurrency?: order_by | undefined
  originExchangeRate?: order_by | undefined
  paymentId?: order_by | undefined
  teamId?: order_by | undefined
  type?: order_by | undefined
  uniqueRef?: order_by | undefined
  unitId?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * aggregate min on columns
 */
export class line_min_fields extends $Base<'line_min_fields'> {
  constructor() {
    super('line_min_fields')
  }

  get bookingId(): $Field<'bookingId', string | undefined> {
    return this.$_select('bookingId') as any
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get description(): $Field<'description', string | undefined> {
    return this.$_select('description') as any
  }

  get enhancingLineId(): $Field<'enhancingLineId', string | undefined> {
    return this.$_select('enhancingLineId') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get invoiceStatus(): $Field<'invoiceStatus', string | undefined> {
    return this.$_select('invoiceStatus') as any
  }

  get originCentTotal(): $Field<'originCentTotal', number | undefined> {
    return this.$_select('originCentTotal') as any
  }

  get originCurrency(): $Field<'originCurrency', string | undefined> {
    return this.$_select('originCurrency') as any
  }

  get originExchangeRate(): $Field<'originExchangeRate', string | undefined> {
    return this.$_select('originExchangeRate') as any
  }

  get paymentId(): $Field<'paymentId', string | undefined> {
    return this.$_select('paymentId') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get type(): $Field<'type', string | undefined> {
    return this.$_select('type') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get unitId(): $Field<'unitId', string | undefined> {
    return this.$_select('unitId') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * order by min() on columns of table "line"
 */
export type line_min_order_by = {
  bookingId?: order_by | undefined
  centTotal?: order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  description?: order_by | undefined
  enhancingLineId?: order_by | undefined
  id?: order_by | undefined
  invoiceStatus?: order_by | undefined
  originCentTotal?: order_by | undefined
  originCurrency?: order_by | undefined
  originExchangeRate?: order_by | undefined
  paymentId?: order_by | undefined
  teamId?: order_by | undefined
  type?: order_by | undefined
  uniqueRef?: order_by | undefined
  unitId?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * response of any mutation on the table "line"
 */
export class line_mutation_response extends $Base<'line_mutation_response'> {
  constructor() {
    super('line_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<line>>(
    selectorFn: (s: line) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new line()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * input type for inserting object relation for remote table "line"
 */
export type line_obj_rel_insert_input = {
  data: line_insert_input
  on_conflict?: line_on_conflict | undefined
}

/**
 * on conflict condition type for table "line"
 */
export type line_on_conflict = {
  constraint: line_constraint
  update_columns: Array<line_update_column>
  where?: line_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "line".
 */
export type line_order_by = {
  booking?: booking_order_by | undefined
  bookingId?: order_by | undefined
  centTotal?: order_by | undefined
  classification?: order_by | undefined
  connection?: connection_order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  description?: order_by | undefined
  enhancementLines_aggregate?: line_aggregate_order_by | undefined
  enhancingLine?: line_order_by | undefined
  enhancingLineId?: order_by | undefined
  id?: order_by | undefined
  invoiceStatus?: order_by | undefined
  isEnhanced?: order_by | undefined
  metadata?: order_by | undefined
  originCentTotal?: order_by | undefined
  originCurrency?: order_by | undefined
  originExchangeRate?: order_by | undefined
  payment?: payment_order_by | undefined
  paymentId?: order_by | undefined
  subclassification?: order_by | undefined
  team?: team_order_by | undefined
  teamId?: order_by | undefined
  type?: order_by | undefined
  uniqueRef?: order_by | undefined
  unitId?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * primary key columns input for table: line
 */
export type line_pk_columns_input = {
  id: string
}

/**
 * prepend existing jsonb value of filtered columns with new jsonb value
 */
export type line_prepend_input = {
  metadata?: string | undefined
}

/**
 * select columns of table "line"
 */
export enum line_select_column {
  /**
   * column name
   */
  bookingId = 'bookingId',

  /**
   * column name
   */
  centTotal = 'centTotal',

  /**
   * column name
   */
  classification = 'classification',

  /**
   * column name
   */
  connectionId = 'connectionId',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  description = 'description',

  /**
   * column name
   */
  enhancingLineId = 'enhancingLineId',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  invoiceStatus = 'invoiceStatus',

  /**
   * column name
   */
  isEnhanced = 'isEnhanced',

  /**
   * column name
   */
  metadata = 'metadata',

  /**
   * column name
   */
  originCentTotal = 'originCentTotal',

  /**
   * column name
   */
  originCurrency = 'originCurrency',

  /**
   * column name
   */
  originExchangeRate = 'originExchangeRate',

  /**
   * column name
   */
  paymentId = 'paymentId',

  /**
   * column name
   */
  subclassification = 'subclassification',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  type = 'type',

  /**
   * column name
   */
  uniqueRef = 'uniqueRef',

  /**
   * column name
   */
  unitId = 'unitId',

  /**
   * column name
   */
  updatedAt = 'updatedAt',
}

/**
 * input type for updating data in table "line"
 */
export type line_set_input = {
  bookingId?: string | undefined
  centTotal?: number | undefined
  classification?: classification_enum | undefined
  connectionId?: string | undefined
  createdAt?: string | undefined
  description?: string | undefined
  enhancingLineId?: string | undefined
  id?: string | undefined
  invoiceStatus?: string | undefined
  isEnhanced?: boolean | undefined
  metadata?: string | undefined
  originCentTotal?: number | undefined
  originCurrency?: string | undefined
  originExchangeRate?: string | undefined
  paymentId?: string | undefined
  subclassification?: subclassification_enum | undefined
  teamId?: string | undefined
  type?: string | undefined
  uniqueRef?: string | undefined
  unitId?: string | undefined
  updatedAt?: string | undefined
}

/**
 * aggregate stddev on columns
 */
export class line_stddev_fields extends $Base<'line_stddev_fields'> {
  constructor() {
    super('line_stddev_fields')
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }

  get originCentTotal(): $Field<'originCentTotal', number | undefined> {
    return this.$_select('originCentTotal') as any
  }

  get originExchangeRate(): $Field<'originExchangeRate', number | undefined> {
    return this.$_select('originExchangeRate') as any
  }
}

/**
 * order by stddev() on columns of table "line"
 */
export type line_stddev_order_by = {
  centTotal?: order_by | undefined
  originCentTotal?: order_by | undefined
  originExchangeRate?: order_by | undefined
}

/**
 * aggregate stddev_pop on columns
 */
export class line_stddev_pop_fields extends $Base<'line_stddev_pop_fields'> {
  constructor() {
    super('line_stddev_pop_fields')
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }

  get originCentTotal(): $Field<'originCentTotal', number | undefined> {
    return this.$_select('originCentTotal') as any
  }

  get originExchangeRate(): $Field<'originExchangeRate', number | undefined> {
    return this.$_select('originExchangeRate') as any
  }
}

/**
 * order by stddev_pop() on columns of table "line"
 */
export type line_stddev_pop_order_by = {
  centTotal?: order_by | undefined
  originCentTotal?: order_by | undefined
  originExchangeRate?: order_by | undefined
}

/**
 * aggregate stddev_samp on columns
 */
export class line_stddev_samp_fields extends $Base<'line_stddev_samp_fields'> {
  constructor() {
    super('line_stddev_samp_fields')
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }

  get originCentTotal(): $Field<'originCentTotal', number | undefined> {
    return this.$_select('originCentTotal') as any
  }

  get originExchangeRate(): $Field<'originExchangeRate', number | undefined> {
    return this.$_select('originExchangeRate') as any
  }
}

/**
 * order by stddev_samp() on columns of table "line"
 */
export type line_stddev_samp_order_by = {
  centTotal?: order_by | undefined
  originCentTotal?: order_by | undefined
  originExchangeRate?: order_by | undefined
}

/**
 * aggregate sum on columns
 */
export class line_sum_fields extends $Base<'line_sum_fields'> {
  constructor() {
    super('line_sum_fields')
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }

  get originCentTotal(): $Field<'originCentTotal', number | undefined> {
    return this.$_select('originCentTotal') as any
  }

  get originExchangeRate(): $Field<'originExchangeRate', string | undefined> {
    return this.$_select('originExchangeRate') as any
  }
}

/**
 * order by sum() on columns of table "line"
 */
export type line_sum_order_by = {
  centTotal?: order_by | undefined
  originCentTotal?: order_by | undefined
  originExchangeRate?: order_by | undefined
}

/**
 * update columns of table "line"
 */
export enum line_update_column {
  /**
   * column name
   */
  bookingId = 'bookingId',

  /**
   * column name
   */
  centTotal = 'centTotal',

  /**
   * column name
   */
  classification = 'classification',

  /**
   * column name
   */
  connectionId = 'connectionId',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  description = 'description',

  /**
   * column name
   */
  enhancingLineId = 'enhancingLineId',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  invoiceStatus = 'invoiceStatus',

  /**
   * column name
   */
  isEnhanced = 'isEnhanced',

  /**
   * column name
   */
  metadata = 'metadata',

  /**
   * column name
   */
  originCentTotal = 'originCentTotal',

  /**
   * column name
   */
  originCurrency = 'originCurrency',

  /**
   * column name
   */
  originExchangeRate = 'originExchangeRate',

  /**
   * column name
   */
  paymentId = 'paymentId',

  /**
   * column name
   */
  subclassification = 'subclassification',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  type = 'type',

  /**
   * column name
   */
  uniqueRef = 'uniqueRef',

  /**
   * column name
   */
  unitId = 'unitId',

  /**
   * column name
   */
  updatedAt = 'updatedAt',
}

/**
 * aggregate var_pop on columns
 */
export class line_var_pop_fields extends $Base<'line_var_pop_fields'> {
  constructor() {
    super('line_var_pop_fields')
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }

  get originCentTotal(): $Field<'originCentTotal', number | undefined> {
    return this.$_select('originCentTotal') as any
  }

  get originExchangeRate(): $Field<'originExchangeRate', number | undefined> {
    return this.$_select('originExchangeRate') as any
  }
}

/**
 * order by var_pop() on columns of table "line"
 */
export type line_var_pop_order_by = {
  centTotal?: order_by | undefined
  originCentTotal?: order_by | undefined
  originExchangeRate?: order_by | undefined
}

/**
 * aggregate var_samp on columns
 */
export class line_var_samp_fields extends $Base<'line_var_samp_fields'> {
  constructor() {
    super('line_var_samp_fields')
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }

  get originCentTotal(): $Field<'originCentTotal', number | undefined> {
    return this.$_select('originCentTotal') as any
  }

  get originExchangeRate(): $Field<'originExchangeRate', number | undefined> {
    return this.$_select('originExchangeRate') as any
  }
}

/**
 * order by var_samp() on columns of table "line"
 */
export type line_var_samp_order_by = {
  centTotal?: order_by | undefined
  originCentTotal?: order_by | undefined
  originExchangeRate?: order_by | undefined
}

/**
 * aggregate variance on columns
 */
export class line_variance_fields extends $Base<'line_variance_fields'> {
  constructor() {
    super('line_variance_fields')
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }

  get originCentTotal(): $Field<'originCentTotal', number | undefined> {
    return this.$_select('originCentTotal') as any
  }

  get originExchangeRate(): $Field<'originExchangeRate', number | undefined> {
    return this.$_select('originExchangeRate') as any
  }
}

/**
 * order by variance() on columns of table "line"
 */
export type line_variance_order_by = {
  centTotal?: order_by | undefined
  originCentTotal?: order_by | undefined
  originExchangeRate?: order_by | undefined
}

/**
 * columns and relationships of "metric"
 */
export class metric extends $Base<'metric'> {
  constructor() {
    super('metric')
  }

  /**
   * An object relationship
   */
  connection<Sel extends Selection<connection>>(
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'connection', GetOutput<Sel>> {
    const options = {
      selection: selectorFn(new connection()),
    }
    return this.$_select('connection', options) as any
  }

  get connectionId(): $Field<'connectionId', string> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string> {
    return this.$_select('createdAt') as any
  }

  get ensuedAt(): $Field<'ensuedAt', string> {
    return this.$_select('ensuedAt') as any
  }

  get id(): $Field<'id', string> {
    return this.$_select('id') as any
  }

  metadata<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'metadata', string, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('metadata', options) as any
  }

  /**
   * An object relationship
   */
  team<Sel extends Selection<team>>(
    selectorFn: (s: team) => [...Sel]
  ): $Field<'team', GetOutput<Sel>> {
    const options = {
      selection: selectorFn(new team()),
    }
    return this.$_select('team', options) as any
  }

  get teamId(): $Field<'teamId', string> {
    return this.$_select('teamId') as any
  }

  get text(): $Field<'text', string | undefined> {
    return this.$_select('text') as any
  }

  get type(): $Field<'type', string> {
    return this.$_select('type') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get unitId(): $Field<'unitId', string | undefined> {
    return this.$_select('unitId') as any
  }

  get updatedAt(): $Field<'updatedAt', string> {
    return this.$_select('updatedAt') as any
  }

  get value(): $Field<'value', string | undefined> {
    return this.$_select('value') as any
  }
}

/**
 * aggregated selection of "metric"
 */
export class metric_aggregate extends $Base<'metric_aggregate'> {
  constructor() {
    super('metric_aggregate')
  }

  aggregate<Sel extends Selection<metric_aggregate_fields>>(
    selectorFn: (s: metric_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new metric_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<metric>>(
    selectorFn: (s: metric) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new metric()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "metric"
 */
export class metric_aggregate_fields extends $Base<'metric_aggregate_fields'> {
  constructor() {
    super('metric_aggregate_fields')
  }

  avg<Sel extends Selection<metric_avg_fields>>(
    selectorFn: (s: metric_avg_fields) => [...Sel]
  ): $Field<'avg', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new metric_avg_fields()),
    }
    return this.$_select('avg', options) as any
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<metric_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[metric_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<metric_max_fields>>(
    selectorFn: (s: metric_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new metric_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<metric_min_fields>>(
    selectorFn: (s: metric_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new metric_min_fields()),
    }
    return this.$_select('min', options) as any
  }

  stddev<Sel extends Selection<metric_stddev_fields>>(
    selectorFn: (s: metric_stddev_fields) => [...Sel]
  ): $Field<'stddev', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new metric_stddev_fields()),
    }
    return this.$_select('stddev', options) as any
  }

  stddev_pop<Sel extends Selection<metric_stddev_pop_fields>>(
    selectorFn: (s: metric_stddev_pop_fields) => [...Sel]
  ): $Field<'stddev_pop', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new metric_stddev_pop_fields()),
    }
    return this.$_select('stddev_pop', options) as any
  }

  stddev_samp<Sel extends Selection<metric_stddev_samp_fields>>(
    selectorFn: (s: metric_stddev_samp_fields) => [...Sel]
  ): $Field<'stddev_samp', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new metric_stddev_samp_fields()),
    }
    return this.$_select('stddev_samp', options) as any
  }

  sum<Sel extends Selection<metric_sum_fields>>(
    selectorFn: (s: metric_sum_fields) => [...Sel]
  ): $Field<'sum', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new metric_sum_fields()),
    }
    return this.$_select('sum', options) as any
  }

  var_pop<Sel extends Selection<metric_var_pop_fields>>(
    selectorFn: (s: metric_var_pop_fields) => [...Sel]
  ): $Field<'var_pop', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new metric_var_pop_fields()),
    }
    return this.$_select('var_pop', options) as any
  }

  var_samp<Sel extends Selection<metric_var_samp_fields>>(
    selectorFn: (s: metric_var_samp_fields) => [...Sel]
  ): $Field<'var_samp', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new metric_var_samp_fields()),
    }
    return this.$_select('var_samp', options) as any
  }

  variance<Sel extends Selection<metric_variance_fields>>(
    selectorFn: (s: metric_variance_fields) => [...Sel]
  ): $Field<'variance', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new metric_variance_fields()),
    }
    return this.$_select('variance', options) as any
  }
}

/**
 * order by aggregate values of table "metric"
 */
export type metric_aggregate_order_by = {
  avg?: metric_avg_order_by | undefined
  count?: order_by | undefined
  max?: metric_max_order_by | undefined
  min?: metric_min_order_by | undefined
  stddev?: metric_stddev_order_by | undefined
  stddev_pop?: metric_stddev_pop_order_by | undefined
  stddev_samp?: metric_stddev_samp_order_by | undefined
  sum?: metric_sum_order_by | undefined
  var_pop?: metric_var_pop_order_by | undefined
  var_samp?: metric_var_samp_order_by | undefined
  variance?: metric_variance_order_by | undefined
}

/**
 * append existing jsonb value of filtered columns with new jsonb value
 */
export type metric_append_input = {
  metadata?: string | undefined
}

/**
 * input type for inserting array relation for remote table "metric"
 */
export type metric_arr_rel_insert_input = {
  data: Array<metric_insert_input>
  on_conflict?: metric_on_conflict | undefined
}

/**
 * aggregate avg on columns
 */
export class metric_avg_fields extends $Base<'metric_avg_fields'> {
  constructor() {
    super('metric_avg_fields')
  }

  get value(): $Field<'value', number | undefined> {
    return this.$_select('value') as any
  }
}

/**
 * order by avg() on columns of table "metric"
 */
export type metric_avg_order_by = {
  value?: order_by | undefined
}

/**
 * Boolean expression to filter rows from the table "metric". All fields are combined with a logical 'AND'.
 */
export type metric_bool_exp = {
  _and?: Array<metric_bool_exp> | undefined
  _not?: metric_bool_exp | undefined
  _or?: Array<metric_bool_exp> | undefined
  connection?: connection_bool_exp | undefined
  connectionId?: uuid_comparison_exp | undefined
  createdAt?: timestamptz_comparison_exp | undefined
  ensuedAt?: timestamptz_comparison_exp | undefined
  id?: uuid_comparison_exp | undefined
  metadata?: jsonb_comparison_exp | undefined
  team?: team_bool_exp | undefined
  teamId?: uuid_comparison_exp | undefined
  text?: String_comparison_exp | undefined
  type?: String_comparison_exp | undefined
  uniqueRef?: String_comparison_exp | undefined
  unitId?: uuid_comparison_exp | undefined
  updatedAt?: timestamptz_comparison_exp | undefined
  value?: float8_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "metric"
 */
export enum metric_constraint {
  /**
   * unique or primary key constraint
   */
  metric_pkey = 'metric_pkey',
}

/**
 * delete the field or element with specified path (for JSON arrays, negative integers count from the end)
 */
export type metric_delete_at_path_input = {
  metadata?: Array<string> | undefined
}

/**
 * delete the array element with specified index (negative integers count from the
end). throws an error if top level container is not an array
 */
export type metric_delete_elem_input = {
  metadata?: number | undefined
}

/**
 * delete key/value pair or string element. key/value pairs are matched based on their key value
 */
export type metric_delete_key_input = {
  metadata?: string | undefined
}

/**
 * input type for incrementing numeric columns in table "metric"
 */
export type metric_inc_input = {
  value?: string | undefined
}

/**
 * input type for inserting data into table "metric"
 */
export type metric_insert_input = {
  connection?: connection_obj_rel_insert_input | undefined
  connectionId?: string | undefined
  createdAt?: string | undefined
  ensuedAt?: string | undefined
  id?: string | undefined
  metadata?: string | undefined
  team?: team_obj_rel_insert_input | undefined
  teamId?: string | undefined
  text?: string | undefined
  type?: string | undefined
  uniqueRef?: string | undefined
  unitId?: string | undefined
  updatedAt?: string | undefined
  value?: string | undefined
}

/**
 * aggregate max on columns
 */
export class metric_max_fields extends $Base<'metric_max_fields'> {
  constructor() {
    super('metric_max_fields')
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get ensuedAt(): $Field<'ensuedAt', string | undefined> {
    return this.$_select('ensuedAt') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get text(): $Field<'text', string | undefined> {
    return this.$_select('text') as any
  }

  get type(): $Field<'type', string | undefined> {
    return this.$_select('type') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get unitId(): $Field<'unitId', string | undefined> {
    return this.$_select('unitId') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }

  get value(): $Field<'value', string | undefined> {
    return this.$_select('value') as any
  }
}

/**
 * order by max() on columns of table "metric"
 */
export type metric_max_order_by = {
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  ensuedAt?: order_by | undefined
  id?: order_by | undefined
  teamId?: order_by | undefined
  text?: order_by | undefined
  type?: order_by | undefined
  uniqueRef?: order_by | undefined
  unitId?: order_by | undefined
  updatedAt?: order_by | undefined
  value?: order_by | undefined
}

/**
 * aggregate min on columns
 */
export class metric_min_fields extends $Base<'metric_min_fields'> {
  constructor() {
    super('metric_min_fields')
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get ensuedAt(): $Field<'ensuedAt', string | undefined> {
    return this.$_select('ensuedAt') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get text(): $Field<'text', string | undefined> {
    return this.$_select('text') as any
  }

  get type(): $Field<'type', string | undefined> {
    return this.$_select('type') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get unitId(): $Field<'unitId', string | undefined> {
    return this.$_select('unitId') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }

  get value(): $Field<'value', string | undefined> {
    return this.$_select('value') as any
  }
}

/**
 * order by min() on columns of table "metric"
 */
export type metric_min_order_by = {
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  ensuedAt?: order_by | undefined
  id?: order_by | undefined
  teamId?: order_by | undefined
  text?: order_by | undefined
  type?: order_by | undefined
  uniqueRef?: order_by | undefined
  unitId?: order_by | undefined
  updatedAt?: order_by | undefined
  value?: order_by | undefined
}

/**
 * response of any mutation on the table "metric"
 */
export class metric_mutation_response extends $Base<'metric_mutation_response'> {
  constructor() {
    super('metric_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<metric>>(
    selectorFn: (s: metric) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new metric()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "metric"
 */
export type metric_on_conflict = {
  constraint: metric_constraint
  update_columns: Array<metric_update_column>
  where?: metric_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "metric".
 */
export type metric_order_by = {
  connection?: connection_order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  ensuedAt?: order_by | undefined
  id?: order_by | undefined
  metadata?: order_by | undefined
  team?: team_order_by | undefined
  teamId?: order_by | undefined
  text?: order_by | undefined
  type?: order_by | undefined
  uniqueRef?: order_by | undefined
  unitId?: order_by | undefined
  updatedAt?: order_by | undefined
  value?: order_by | undefined
}

/**
 * primary key columns input for table: metric
 */
export type metric_pk_columns_input = {
  id: string
}

/**
 * prepend existing jsonb value of filtered columns with new jsonb value
 */
export type metric_prepend_input = {
  metadata?: string | undefined
}

/**
 * select columns of table "metric"
 */
export enum metric_select_column {
  /**
   * column name
   */
  connectionId = 'connectionId',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  ensuedAt = 'ensuedAt',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  metadata = 'metadata',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  text = 'text',

  /**
   * column name
   */
  type = 'type',

  /**
   * column name
   */
  uniqueRef = 'uniqueRef',

  /**
   * column name
   */
  unitId = 'unitId',

  /**
   * column name
   */
  updatedAt = 'updatedAt',

  /**
   * column name
   */
  value = 'value',
}

/**
 * input type for updating data in table "metric"
 */
export type metric_set_input = {
  connectionId?: string | undefined
  createdAt?: string | undefined
  ensuedAt?: string | undefined
  id?: string | undefined
  metadata?: string | undefined
  teamId?: string | undefined
  text?: string | undefined
  type?: string | undefined
  uniqueRef?: string | undefined
  unitId?: string | undefined
  updatedAt?: string | undefined
  value?: string | undefined
}

/**
 * aggregate stddev on columns
 */
export class metric_stddev_fields extends $Base<'metric_stddev_fields'> {
  constructor() {
    super('metric_stddev_fields')
  }

  get value(): $Field<'value', number | undefined> {
    return this.$_select('value') as any
  }
}

/**
 * order by stddev() on columns of table "metric"
 */
export type metric_stddev_order_by = {
  value?: order_by | undefined
}

/**
 * aggregate stddev_pop on columns
 */
export class metric_stddev_pop_fields extends $Base<'metric_stddev_pop_fields'> {
  constructor() {
    super('metric_stddev_pop_fields')
  }

  get value(): $Field<'value', number | undefined> {
    return this.$_select('value') as any
  }
}

/**
 * order by stddev_pop() on columns of table "metric"
 */
export type metric_stddev_pop_order_by = {
  value?: order_by | undefined
}

/**
 * aggregate stddev_samp on columns
 */
export class metric_stddev_samp_fields extends $Base<'metric_stddev_samp_fields'> {
  constructor() {
    super('metric_stddev_samp_fields')
  }

  get value(): $Field<'value', number | undefined> {
    return this.$_select('value') as any
  }
}

/**
 * order by stddev_samp() on columns of table "metric"
 */
export type metric_stddev_samp_order_by = {
  value?: order_by | undefined
}

/**
 * aggregate sum on columns
 */
export class metric_sum_fields extends $Base<'metric_sum_fields'> {
  constructor() {
    super('metric_sum_fields')
  }

  get value(): $Field<'value', string | undefined> {
    return this.$_select('value') as any
  }
}

/**
 * order by sum() on columns of table "metric"
 */
export type metric_sum_order_by = {
  value?: order_by | undefined
}

/**
 * update columns of table "metric"
 */
export enum metric_update_column {
  /**
   * column name
   */
  connectionId = 'connectionId',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  ensuedAt = 'ensuedAt',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  metadata = 'metadata',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  text = 'text',

  /**
   * column name
   */
  type = 'type',

  /**
   * column name
   */
  uniqueRef = 'uniqueRef',

  /**
   * column name
   */
  unitId = 'unitId',

  /**
   * column name
   */
  updatedAt = 'updatedAt',

  /**
   * column name
   */
  value = 'value',
}

/**
 * aggregate var_pop on columns
 */
export class metric_var_pop_fields extends $Base<'metric_var_pop_fields'> {
  constructor() {
    super('metric_var_pop_fields')
  }

  get value(): $Field<'value', number | undefined> {
    return this.$_select('value') as any
  }
}

/**
 * order by var_pop() on columns of table "metric"
 */
export type metric_var_pop_order_by = {
  value?: order_by | undefined
}

/**
 * aggregate var_samp on columns
 */
export class metric_var_samp_fields extends $Base<'metric_var_samp_fields'> {
  constructor() {
    super('metric_var_samp_fields')
  }

  get value(): $Field<'value', number | undefined> {
    return this.$_select('value') as any
  }
}

/**
 * order by var_samp() on columns of table "metric"
 */
export type metric_var_samp_order_by = {
  value?: order_by | undefined
}

/**
 * aggregate variance on columns
 */
export class metric_variance_fields extends $Base<'metric_variance_fields'> {
  constructor() {
    super('metric_variance_fields')
  }

  get value(): $Field<'value', number | undefined> {
    return this.$_select('value') as any
  }
}

/**
 * order by variance() on columns of table "metric"
 */
export type metric_variance_order_by = {
  value?: order_by | undefined
}

/**
 * mutation root
 */
export class mutation_root extends $Base<'mutation_root'> {
  constructor() {
    super('mutation_root')
  }

  /**
   * delete single row from the table: "booking"
   */
  deleteBooking<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<booking>
  >(
    args: Args,
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'deleteBooking', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new booking()),
    }
    return this.$_select('deleteBooking', options) as any
  }

  /**
   * delete single row from the table: "booking_status"
   */
  deleteBookingStatus<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<bookingStatus>
  >(
    args: Args,
    selectorFn: (s: bookingStatus) => [...Sel]
  ): $Field<'deleteBookingStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new bookingStatus()),
    }
    return this.$_select('deleteBookingStatus', options) as any
  }

  /**
   * delete data from the table: "booking_status"
   */
  deleteBookingStatuses<
    Args extends VariabledInput<{
      where: bookingStatus_bool_exp
    }>,
    Sel extends Selection<bookingStatus_mutation_response>
  >(
    args: Args,
    selectorFn: (s: bookingStatus_mutation_response) => [...Sel]
  ): $Field<'deleteBookingStatuses', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'bookingStatus_bool_exp!',
      },
      args,

      selection: selectorFn(new bookingStatus_mutation_response()),
    }
    return this.$_select('deleteBookingStatuses', options) as any
  }

  /**
   * delete data from the table: "booking"
   */
  deleteBookings<
    Args extends VariabledInput<{
      where: booking_bool_exp
    }>,
    Sel extends Selection<booking_mutation_response>
  >(
    args: Args,
    selectorFn: (s: booking_mutation_response) => [...Sel]
  ): $Field<'deleteBookings', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'booking_bool_exp!',
      },
      args,

      selection: selectorFn(new booking_mutation_response()),
    }
    return this.$_select('deleteBookings', options) as any
  }

  /**
   * delete single row from the table: "classification"
   */
  deleteClassification<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<classification>
  >(
    args: Args,
    selectorFn: (s: classification) => [...Sel]
  ): $Field<'deleteClassification', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new classification()),
    }
    return this.$_select('deleteClassification', options) as any
  }

  /**
   * delete data from the table: "classification"
   */
  deleteClassifications<
    Args extends VariabledInput<{
      where: classification_bool_exp
    }>,
    Sel extends Selection<classification_mutation_response>
  >(
    args: Args,
    selectorFn: (s: classification_mutation_response) => [...Sel]
  ): $Field<'deleteClassifications', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'classification_bool_exp!',
      },
      args,

      selection: selectorFn(new classification_mutation_response()),
    }
    return this.$_select('deleteClassifications', options) as any
  }

  /**
   * delete single row from the table: "connection"
   */
  deleteConnection<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<connection>
  >(
    args: Args,
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'deleteConnection', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new connection()),
    }
    return this.$_select('deleteConnection', options) as any
  }

  /**
   * delete data from the table: "connection"
   */
  deleteConnections<
    Args extends VariabledInput<{
      where: connection_bool_exp
    }>,
    Sel extends Selection<connection_mutation_response>
  >(
    args: Args,
    selectorFn: (s: connection_mutation_response) => [...Sel]
  ): $Field<'deleteConnections', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'connection_bool_exp!',
      },
      args,

      selection: selectorFn(new connection_mutation_response()),
    }
    return this.$_select('deleteConnections', options) as any
  }

  /**
   * delete data from the table: "currency"
   */
  deleteCurrencies<
    Args extends VariabledInput<{
      where: currency_bool_exp
    }>,
    Sel extends Selection<currency_mutation_response>
  >(
    args: Args,
    selectorFn: (s: currency_mutation_response) => [...Sel]
  ): $Field<'deleteCurrencies', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'currency_bool_exp!',
      },
      args,

      selection: selectorFn(new currency_mutation_response()),
    }
    return this.$_select('deleteCurrencies', options) as any
  }

  /**
   * delete single row from the table: "currency"
   */
  deleteCurrency<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<currency>
  >(
    args: Args,
    selectorFn: (s: currency) => [...Sel]
  ): $Field<'deleteCurrency', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new currency()),
    }
    return this.$_select('deleteCurrency', options) as any
  }

  /**
   * delete data from the table: "entity"
   */
  deleteEntities<
    Args extends VariabledInput<{
      where: entity_bool_exp
    }>,
    Sel extends Selection<entity_mutation_response>
  >(
    args: Args,
    selectorFn: (s: entity_mutation_response) => [...Sel]
  ): $Field<'deleteEntities', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'entity_bool_exp!',
      },
      args,

      selection: selectorFn(new entity_mutation_response()),
    }
    return this.$_select('deleteEntities', options) as any
  }

  /**
   * delete single row from the table: "entity"
   */
  deleteEntity<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<entity>
  >(
    args: Args,
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'deleteEntity', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new entity()),
    }
    return this.$_select('deleteEntity', options) as any
  }

  /**
   * delete single row from the table: "entity_status"
   */
  deleteEntityStatus<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<entityStatus>
  >(
    args: Args,
    selectorFn: (s: entityStatus) => [...Sel]
  ): $Field<'deleteEntityStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new entityStatus()),
    }
    return this.$_select('deleteEntityStatus', options) as any
  }

  /**
   * delete data from the table: "entity_status"
   */
  deleteEntityStatuses<
    Args extends VariabledInput<{
      where: entityStatus_bool_exp
    }>,
    Sel extends Selection<entityStatus_mutation_response>
  >(
    args: Args,
    selectorFn: (s: entityStatus_mutation_response) => [...Sel]
  ): $Field<'deleteEntityStatuses', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'entityStatus_bool_exp!',
      },
      args,

      selection: selectorFn(new entityStatus_mutation_response()),
    }
    return this.$_select('deleteEntityStatuses', options) as any
  }

  /**
   * delete single row from the table: "integration"
   */
  deleteIntegration<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<integration>
  >(
    args: Args,
    selectorFn: (s: integration) => [...Sel]
  ): $Field<'deleteIntegration', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new integration()),
    }
    return this.$_select('deleteIntegration', options) as any
  }

  /**
   * delete single row from the table: "integration_type"
   */
  deleteIntegrationType<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<integrationType>
  >(
    args: Args,
    selectorFn: (s: integrationType) => [...Sel]
  ): $Field<'deleteIntegrationType', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new integrationType()),
    }
    return this.$_select('deleteIntegrationType', options) as any
  }

  /**
   * delete data from the table: "integration_type"
   */
  deleteIntegrationTypes<
    Args extends VariabledInput<{
      where: integrationType_bool_exp
    }>,
    Sel extends Selection<integrationType_mutation_response>
  >(
    args: Args,
    selectorFn: (s: integrationType_mutation_response) => [...Sel]
  ): $Field<'deleteIntegrationTypes', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'integrationType_bool_exp!',
      },
      args,

      selection: selectorFn(new integrationType_mutation_response()),
    }
    return this.$_select('deleteIntegrationTypes', options) as any
  }

  /**
   * delete data from the table: "integration"
   */
  deleteIntegrations<
    Args extends VariabledInput<{
      where: integration_bool_exp
    }>,
    Sel extends Selection<integration_mutation_response>
  >(
    args: Args,
    selectorFn: (s: integration_mutation_response) => [...Sel]
  ): $Field<'deleteIntegrations', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'integration_bool_exp!',
      },
      args,

      selection: selectorFn(new integration_mutation_response()),
    }
    return this.$_select('deleteIntegrations', options) as any
  }

  /**
   * delete single row from the table: "issue"
   */
  deleteIssue<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<issue>
  >(
    args: Args,
    selectorFn: (s: issue) => [...Sel]
  ): $Field<'deleteIssue', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new issue()),
    }
    return this.$_select('deleteIssue', options) as any
  }

  /**
   * delete data from the table: "issue"
   */
  deleteIssues<
    Args extends VariabledInput<{
      where: issue_bool_exp
    }>,
    Sel extends Selection<issue_mutation_response>
  >(
    args: Args,
    selectorFn: (s: issue_mutation_response) => [...Sel]
  ): $Field<'deleteIssues', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'issue_bool_exp!',
      },
      args,

      selection: selectorFn(new issue_mutation_response()),
    }
    return this.$_select('deleteIssues', options) as any
  }

  /**
   * delete single row from the table: "job"
   */
  deleteJob<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<job>
  >(
    args: Args,
    selectorFn: (s: job) => [...Sel]
  ): $Field<'deleteJob', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new job()),
    }
    return this.$_select('deleteJob', options) as any
  }

  /**
   * delete single row from the table: "job_method"
   */
  deleteJobMethod<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<jobMethod>
  >(
    args: Args,
    selectorFn: (s: jobMethod) => [...Sel]
  ): $Field<'deleteJobMethod', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new jobMethod()),
    }
    return this.$_select('deleteJobMethod', options) as any
  }

  /**
   * delete data from the table: "job_method"
   */
  deleteJobMethods<
    Args extends VariabledInput<{
      where: jobMethod_bool_exp
    }>,
    Sel extends Selection<jobMethod_mutation_response>
  >(
    args: Args,
    selectorFn: (s: jobMethod_mutation_response) => [...Sel]
  ): $Field<'deleteJobMethods', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'jobMethod_bool_exp!',
      },
      args,

      selection: selectorFn(new jobMethod_mutation_response()),
    }
    return this.$_select('deleteJobMethods', options) as any
  }

  /**
   * delete single row from the table: "job_status"
   */
  deleteJobStatus<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<jobStatus>
  >(
    args: Args,
    selectorFn: (s: jobStatus) => [...Sel]
  ): $Field<'deleteJobStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new jobStatus()),
    }
    return this.$_select('deleteJobStatus', options) as any
  }

  /**
   * delete data from the table: "job_status"
   */
  deleteJobStatuses<
    Args extends VariabledInput<{
      where: jobStatus_bool_exp
    }>,
    Sel extends Selection<jobStatus_mutation_response>
  >(
    args: Args,
    selectorFn: (s: jobStatus_mutation_response) => [...Sel]
  ): $Field<'deleteJobStatuses', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'jobStatus_bool_exp!',
      },
      args,

      selection: selectorFn(new jobStatus_mutation_response()),
    }
    return this.$_select('deleteJobStatuses', options) as any
  }

  /**
   * delete data from the table: "job"
   */
  deleteJobs<
    Args extends VariabledInput<{
      where: job_bool_exp
    }>,
    Sel extends Selection<job_mutation_response>
  >(
    args: Args,
    selectorFn: (s: job_mutation_response) => [...Sel]
  ): $Field<'deleteJobs', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'job_bool_exp!',
      },
      args,

      selection: selectorFn(new job_mutation_response()),
    }
    return this.$_select('deleteJobs', options) as any
  }

  /**
   * delete single row from the table: "line"
   */
  deleteLine<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<line>
  >(
    args: Args,
    selectorFn: (s: line) => [...Sel]
  ): $Field<'deleteLine', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new line()),
    }
    return this.$_select('deleteLine', options) as any
  }

  /**
   * delete data from the table: "line"
   */
  deleteLines<
    Args extends VariabledInput<{
      where: line_bool_exp
    }>,
    Sel extends Selection<line_mutation_response>
  >(
    args: Args,
    selectorFn: (s: line_mutation_response) => [...Sel]
  ): $Field<'deleteLines', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'line_bool_exp!',
      },
      args,

      selection: selectorFn(new line_mutation_response()),
    }
    return this.$_select('deleteLines', options) as any
  }

  /**
   * delete single row from the table: "metric"
   */
  deleteMetric<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<metric>
  >(
    args: Args,
    selectorFn: (s: metric) => [...Sel]
  ): $Field<'deleteMetric', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new metric()),
    }
    return this.$_select('deleteMetric', options) as any
  }

  /**
   * delete data from the table: "metric"
   */
  deleteMetrics<
    Args extends VariabledInput<{
      where: metric_bool_exp
    }>,
    Sel extends Selection<metric_mutation_response>
  >(
    args: Args,
    selectorFn: (s: metric_mutation_response) => [...Sel]
  ): $Field<'deleteMetrics', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'metric_bool_exp!',
      },
      args,

      selection: selectorFn(new metric_mutation_response()),
    }
    return this.$_select('deleteMetrics', options) as any
  }

  /**
   * delete single row from the table: "normalized_type"
   */
  deleteNormalizedType<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<normalizedType>
  >(
    args: Args,
    selectorFn: (s: normalizedType) => [...Sel]
  ): $Field<'deleteNormalizedType', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new normalizedType()),
    }
    return this.$_select('deleteNormalizedType', options) as any
  }

  /**
   * delete data from the table: "normalized_type"
   */
  deleteNormalizedTypes<
    Args extends VariabledInput<{
      where: normalizedType_bool_exp
    }>,
    Sel extends Selection<normalizedType_mutation_response>
  >(
    args: Args,
    selectorFn: (s: normalizedType_mutation_response) => [...Sel]
  ): $Field<'deleteNormalizedTypes', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'normalizedType_bool_exp!',
      },
      args,

      selection: selectorFn(new normalizedType_mutation_response()),
    }
    return this.$_select('deleteNormalizedTypes', options) as any
  }

  /**
   * delete single row from the table: "payment"
   */
  deletePayment<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<payment>
  >(
    args: Args,
    selectorFn: (s: payment) => [...Sel]
  ): $Field<'deletePayment', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new payment()),
    }
    return this.$_select('deletePayment', options) as any
  }

  /**
   * delete single row from the table: "payment_status"
   */
  deletePaymentStatus<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<paymentStatus>
  >(
    args: Args,
    selectorFn: (s: paymentStatus) => [...Sel]
  ): $Field<'deletePaymentStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new paymentStatus()),
    }
    return this.$_select('deletePaymentStatus', options) as any
  }

  /**
   * delete data from the table: "payment_status"
   */
  deletePaymentStatuses<
    Args extends VariabledInput<{
      where: paymentStatus_bool_exp
    }>,
    Sel extends Selection<paymentStatus_mutation_response>
  >(
    args: Args,
    selectorFn: (s: paymentStatus_mutation_response) => [...Sel]
  ): $Field<'deletePaymentStatuses', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'paymentStatus_bool_exp!',
      },
      args,

      selection: selectorFn(new paymentStatus_mutation_response()),
    }
    return this.$_select('deletePaymentStatuses', options) as any
  }

  /**
   * delete single row from the table: "payment_type"
   */
  deletePaymentType<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<paymentType>
  >(
    args: Args,
    selectorFn: (s: paymentType) => [...Sel]
  ): $Field<'deletePaymentType', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new paymentType()),
    }
    return this.$_select('deletePaymentType', options) as any
  }

  /**
   * delete data from the table: "payment_type"
   */
  deletePaymentTypes<
    Args extends VariabledInput<{
      where: paymentType_bool_exp
    }>,
    Sel extends Selection<paymentType_mutation_response>
  >(
    args: Args,
    selectorFn: (s: paymentType_mutation_response) => [...Sel]
  ): $Field<'deletePaymentTypes', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'paymentType_bool_exp!',
      },
      args,

      selection: selectorFn(new paymentType_mutation_response()),
    }
    return this.$_select('deletePaymentTypes', options) as any
  }

  /**
   * delete data from the table: "payment"
   */
  deletePayments<
    Args extends VariabledInput<{
      where: payment_bool_exp
    }>,
    Sel extends Selection<payment_mutation_response>
  >(
    args: Args,
    selectorFn: (s: payment_mutation_response) => [...Sel]
  ): $Field<'deletePayments', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'payment_bool_exp!',
      },
      args,

      selection: selectorFn(new payment_mutation_response()),
    }
    return this.$_select('deletePayments', options) as any
  }

  /**
   * delete single row from the table: "subclassification"
   */
  deleteSubclassification<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<subclassification>
  >(
    args: Args,
    selectorFn: (s: subclassification) => [...Sel]
  ): $Field<'deleteSubclassification', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new subclassification()),
    }
    return this.$_select('deleteSubclassification', options) as any
  }

  /**
   * delete data from the table: "subclassification"
   */
  deleteSubclassifications<
    Args extends VariabledInput<{
      where: subclassification_bool_exp
    }>,
    Sel extends Selection<subclassification_mutation_response>
  >(
    args: Args,
    selectorFn: (s: subclassification_mutation_response) => [...Sel]
  ): $Field<'deleteSubclassifications', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'subclassification_bool_exp!',
      },
      args,

      selection: selectorFn(new subclassification_mutation_response()),
    }
    return this.$_select('deleteSubclassifications', options) as any
  }

  /**
   * delete single row from the table: "tag"
   */
  deleteTag<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<tag>
  >(
    args: Args,
    selectorFn: (s: tag) => [...Sel]
  ): $Field<'deleteTag', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new tag()),
    }
    return this.$_select('deleteTag', options) as any
  }

  /**
   * delete data from the table: "tag"
   */
  deleteTags<
    Args extends VariabledInput<{
      where: tag_bool_exp
    }>,
    Sel extends Selection<tag_mutation_response>
  >(
    args: Args,
    selectorFn: (s: tag_mutation_response) => [...Sel]
  ): $Field<'deleteTags', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'tag_bool_exp!',
      },
      args,

      selection: selectorFn(new tag_mutation_response()),
    }
    return this.$_select('deleteTags', options) as any
  }

  /**
   * delete single row from the table: "team"
   */
  deleteTeam<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<team>
  >(
    args: Args,
    selectorFn: (s: team) => [...Sel]
  ): $Field<'deleteTeam', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new team()),
    }
    return this.$_select('deleteTeam', options) as any
  }

  /**
   * delete single row from the table: "team_user"
   */
  deleteTeamUser<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<teamUser>
  >(
    args: Args,
    selectorFn: (s: teamUser) => [...Sel]
  ): $Field<'deleteTeamUser', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new teamUser()),
    }
    return this.$_select('deleteTeamUser', options) as any
  }

  /**
   * delete data from the table: "team_user"
   */
  deleteTeamUsers<
    Args extends VariabledInput<{
      where: teamUser_bool_exp
    }>,
    Sel extends Selection<teamUser_mutation_response>
  >(
    args: Args,
    selectorFn: (s: teamUser_mutation_response) => [...Sel]
  ): $Field<'deleteTeamUsers', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'teamUser_bool_exp!',
      },
      args,

      selection: selectorFn(new teamUser_mutation_response()),
    }
    return this.$_select('deleteTeamUsers', options) as any
  }

  /**
   * delete data from the table: "team"
   */
  deleteTeams<
    Args extends VariabledInput<{
      where: team_bool_exp
    }>,
    Sel extends Selection<team_mutation_response>
  >(
    args: Args,
    selectorFn: (s: team_mutation_response) => [...Sel]
  ): $Field<'deleteTeams', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'team_bool_exp!',
      },
      args,

      selection: selectorFn(new team_mutation_response()),
    }
    return this.$_select('deleteTeams', options) as any
  }

  /**
   * delete single row from the table: "unit"
   */
  deleteUnit<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<unit>
  >(
    args: Args,
    selectorFn: (s: unit) => [...Sel]
  ): $Field<'deleteUnit', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new unit()),
    }
    return this.$_select('deleteUnit', options) as any
  }

  /**
   * delete data from the table: "unit"
   */
  deleteUnits<
    Args extends VariabledInput<{
      where: unit_bool_exp
    }>,
    Sel extends Selection<unit_mutation_response>
  >(
    args: Args,
    selectorFn: (s: unit_mutation_response) => [...Sel]
  ): $Field<'deleteUnits', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'unit_bool_exp!',
      },
      args,

      selection: selectorFn(new unit_mutation_response()),
    }
    return this.$_select('deleteUnits', options) as any
  }

  /**
   * delete single row from the table: "user"
   */
  deleteUser<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<user>
  >(
    args: Args,
    selectorFn: (s: user) => [...Sel]
  ): $Field<'deleteUser', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new user()),
    }
    return this.$_select('deleteUser', options) as any
  }

  /**
   * delete single row from the table: "user_status"
   */
  deleteUserStatus<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<userStatus>
  >(
    args: Args,
    selectorFn: (s: userStatus) => [...Sel]
  ): $Field<'deleteUserStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new userStatus()),
    }
    return this.$_select('deleteUserStatus', options) as any
  }

  /**
   * delete data from the table: "user_status"
   */
  deleteUserStatuses<
    Args extends VariabledInput<{
      where: userStatus_bool_exp
    }>,
    Sel extends Selection<userStatus_mutation_response>
  >(
    args: Args,
    selectorFn: (s: userStatus_mutation_response) => [...Sel]
  ): $Field<'deleteUserStatuses', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'userStatus_bool_exp!',
      },
      args,

      selection: selectorFn(new userStatus_mutation_response()),
    }
    return this.$_select('deleteUserStatuses', options) as any
  }

  /**
   * delete data from the table: "user"
   */
  deleteUsers<
    Args extends VariabledInput<{
      where: user_bool_exp
    }>,
    Sel extends Selection<user_mutation_response>
  >(
    args: Args,
    selectorFn: (s: user_mutation_response) => [...Sel]
  ): $Field<'deleteUsers', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'user_bool_exp!',
      },
      args,

      selection: selectorFn(new user_mutation_response()),
    }
    return this.$_select('deleteUsers', options) as any
  }

  /**
   * delete single row from the table: "webhook"
   */
  deleteWebhook<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<webhook>
  >(
    args: Args,
    selectorFn: (s: webhook) => [...Sel]
  ): $Field<'deleteWebhook', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new webhook()),
    }
    return this.$_select('deleteWebhook', options) as any
  }

  /**
   * delete data from the table: "webhook"
   */
  deleteWebhooks<
    Args extends VariabledInput<{
      where: webhook_bool_exp
    }>,
    Sel extends Selection<webhook_mutation_response>
  >(
    args: Args,
    selectorFn: (s: webhook_mutation_response) => [...Sel]
  ): $Field<'deleteWebhooks', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'webhook_bool_exp!',
      },
      args,

      selection: selectorFn(new webhook_mutation_response()),
    }
    return this.$_select('deleteWebhooks', options) as any
  }

  /**
   * delete data from the table: "booking_channel"
   */
  delete_booking_channel<
    Args extends VariabledInput<{
      where: booking_channel_bool_exp
    }>,
    Sel extends Selection<booking_channel_mutation_response>
  >(
    args: Args,
    selectorFn: (s: booking_channel_mutation_response) => [...Sel]
  ): $Field<'delete_booking_channel', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        where: 'booking_channel_bool_exp!',
      },
      args,

      selection: selectorFn(new booking_channel_mutation_response()),
    }
    return this.$_select('delete_booking_channel', options) as any
  }

  /**
   * delete single row from the table: "booking_channel"
   */
  delete_booking_channel_by_pk<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<booking_channel>
  >(
    args: Args,
    selectorFn: (s: booking_channel) => [...Sel]
  ): $Field<'delete_booking_channel_by_pk', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new booking_channel()),
    }
    return this.$_select('delete_booking_channel_by_pk', options) as any
  }

  /**
   * insert a single row into the table: "booking"
   */
  insertBooking<
    Args extends VariabledInput<{
      object: booking_insert_input
      on_conflict?: booking_on_conflict | undefined
    }>,
    Sel extends Selection<booking>
  >(
    args: Args,
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'insertBooking', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'booking_insert_input!',
        on_conflict: 'booking_on_conflict',
      },
      args,

      selection: selectorFn(new booking()),
    }
    return this.$_select('insertBooking', options) as any
  }

  /**
   * insert a single row into the table: "booking_status"
   */
  insertBookingStatus<
    Args extends VariabledInput<{
      object: bookingStatus_insert_input
      on_conflict?: bookingStatus_on_conflict | undefined
    }>,
    Sel extends Selection<bookingStatus>
  >(
    args: Args,
    selectorFn: (s: bookingStatus) => [...Sel]
  ): $Field<'insertBookingStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'bookingStatus_insert_input!',
        on_conflict: 'bookingStatus_on_conflict',
      },
      args,

      selection: selectorFn(new bookingStatus()),
    }
    return this.$_select('insertBookingStatus', options) as any
  }

  /**
   * insert data into the table: "booking_status"
   */
  insertBookingStatuses<
    Args extends VariabledInput<{
      objects: Array<bookingStatus_insert_input>
      on_conflict?: bookingStatus_on_conflict | undefined
    }>,
    Sel extends Selection<bookingStatus_mutation_response>
  >(
    args: Args,
    selectorFn: (s: bookingStatus_mutation_response) => [...Sel]
  ): $Field<'insertBookingStatuses', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[bookingStatus_insert_input!]!',
        on_conflict: 'bookingStatus_on_conflict',
      },
      args,

      selection: selectorFn(new bookingStatus_mutation_response()),
    }
    return this.$_select('insertBookingStatuses', options) as any
  }

  /**
   * insert data into the table: "booking"
   */
  insertBookings<
    Args extends VariabledInput<{
      objects: Array<booking_insert_input>
      on_conflict?: booking_on_conflict | undefined
    }>,
    Sel extends Selection<booking_mutation_response>
  >(
    args: Args,
    selectorFn: (s: booking_mutation_response) => [...Sel]
  ): $Field<'insertBookings', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[booking_insert_input!]!',
        on_conflict: 'booking_on_conflict',
      },
      args,

      selection: selectorFn(new booking_mutation_response()),
    }
    return this.$_select('insertBookings', options) as any
  }

  /**
   * insert a single row into the table: "classification"
   */
  insertClassification<
    Args extends VariabledInput<{
      object: classification_insert_input
      on_conflict?: classification_on_conflict | undefined
    }>,
    Sel extends Selection<classification>
  >(
    args: Args,
    selectorFn: (s: classification) => [...Sel]
  ): $Field<'insertClassification', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'classification_insert_input!',
        on_conflict: 'classification_on_conflict',
      },
      args,

      selection: selectorFn(new classification()),
    }
    return this.$_select('insertClassification', options) as any
  }

  /**
   * insert data into the table: "classification"
   */
  insertClassifications<
    Args extends VariabledInput<{
      objects: Array<classification_insert_input>
      on_conflict?: classification_on_conflict | undefined
    }>,
    Sel extends Selection<classification_mutation_response>
  >(
    args: Args,
    selectorFn: (s: classification_mutation_response) => [...Sel]
  ): $Field<'insertClassifications', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[classification_insert_input!]!',
        on_conflict: 'classification_on_conflict',
      },
      args,

      selection: selectorFn(new classification_mutation_response()),
    }
    return this.$_select('insertClassifications', options) as any
  }

  /**
   * insert a single row into the table: "connection"
   */
  insertConnection<
    Args extends VariabledInput<{
      object: connection_insert_input
      on_conflict?: connection_on_conflict | undefined
    }>,
    Sel extends Selection<connection>
  >(
    args: Args,
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'insertConnection', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'connection_insert_input!',
        on_conflict: 'connection_on_conflict',
      },
      args,

      selection: selectorFn(new connection()),
    }
    return this.$_select('insertConnection', options) as any
  }

  /**
   * insert data into the table: "connection"
   */
  insertConnections<
    Args extends VariabledInput<{
      objects: Array<connection_insert_input>
      on_conflict?: connection_on_conflict | undefined
    }>,
    Sel extends Selection<connection_mutation_response>
  >(
    args: Args,
    selectorFn: (s: connection_mutation_response) => [...Sel]
  ): $Field<'insertConnections', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[connection_insert_input!]!',
        on_conflict: 'connection_on_conflict',
      },
      args,

      selection: selectorFn(new connection_mutation_response()),
    }
    return this.$_select('insertConnections', options) as any
  }

  /**
   * insert data into the table: "currency"
   */
  insertCurrencies<
    Args extends VariabledInput<{
      objects: Array<currency_insert_input>
      on_conflict?: currency_on_conflict | undefined
    }>,
    Sel extends Selection<currency_mutation_response>
  >(
    args: Args,
    selectorFn: (s: currency_mutation_response) => [...Sel]
  ): $Field<'insertCurrencies', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[currency_insert_input!]!',
        on_conflict: 'currency_on_conflict',
      },
      args,

      selection: selectorFn(new currency_mutation_response()),
    }
    return this.$_select('insertCurrencies', options) as any
  }

  /**
   * insert a single row into the table: "currency"
   */
  insertCurrency<
    Args extends VariabledInput<{
      object: currency_insert_input
      on_conflict?: currency_on_conflict | undefined
    }>,
    Sel extends Selection<currency>
  >(
    args: Args,
    selectorFn: (s: currency) => [...Sel]
  ): $Field<'insertCurrency', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'currency_insert_input!',
        on_conflict: 'currency_on_conflict',
      },
      args,

      selection: selectorFn(new currency()),
    }
    return this.$_select('insertCurrency', options) as any
  }

  /**
   * insert data into the table: "entity"
   */
  insertEntities<
    Args extends VariabledInput<{
      objects: Array<entity_insert_input>
      on_conflict?: entity_on_conflict | undefined
    }>,
    Sel extends Selection<entity_mutation_response>
  >(
    args: Args,
    selectorFn: (s: entity_mutation_response) => [...Sel]
  ): $Field<'insertEntities', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[entity_insert_input!]!',
        on_conflict: 'entity_on_conflict',
      },
      args,

      selection: selectorFn(new entity_mutation_response()),
    }
    return this.$_select('insertEntities', options) as any
  }

  /**
   * insert a single row into the table: "entity"
   */
  insertEntity<
    Args extends VariabledInput<{
      object: entity_insert_input
      on_conflict?: entity_on_conflict | undefined
    }>,
    Sel extends Selection<entity>
  >(
    args: Args,
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'insertEntity', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'entity_insert_input!',
        on_conflict: 'entity_on_conflict',
      },
      args,

      selection: selectorFn(new entity()),
    }
    return this.$_select('insertEntity', options) as any
  }

  /**
   * insert a single row into the table: "entity_status"
   */
  insertEntityStatus<
    Args extends VariabledInput<{
      object: entityStatus_insert_input
      on_conflict?: entityStatus_on_conflict | undefined
    }>,
    Sel extends Selection<entityStatus>
  >(
    args: Args,
    selectorFn: (s: entityStatus) => [...Sel]
  ): $Field<'insertEntityStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'entityStatus_insert_input!',
        on_conflict: 'entityStatus_on_conflict',
      },
      args,

      selection: selectorFn(new entityStatus()),
    }
    return this.$_select('insertEntityStatus', options) as any
  }

  /**
   * insert data into the table: "entity_status"
   */
  insertEntityStatuses<
    Args extends VariabledInput<{
      objects: Array<entityStatus_insert_input>
      on_conflict?: entityStatus_on_conflict | undefined
    }>,
    Sel extends Selection<entityStatus_mutation_response>
  >(
    args: Args,
    selectorFn: (s: entityStatus_mutation_response) => [...Sel]
  ): $Field<'insertEntityStatuses', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[entityStatus_insert_input!]!',
        on_conflict: 'entityStatus_on_conflict',
      },
      args,

      selection: selectorFn(new entityStatus_mutation_response()),
    }
    return this.$_select('insertEntityStatuses', options) as any
  }

  /**
   * insert a single row into the table: "integration"
   */
  insertIntegration<
    Args extends VariabledInput<{
      object: integration_insert_input
      on_conflict?: integration_on_conflict | undefined
    }>,
    Sel extends Selection<integration>
  >(
    args: Args,
    selectorFn: (s: integration) => [...Sel]
  ): $Field<'insertIntegration', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'integration_insert_input!',
        on_conflict: 'integration_on_conflict',
      },
      args,

      selection: selectorFn(new integration()),
    }
    return this.$_select('insertIntegration', options) as any
  }

  /**
   * insert a single row into the table: "integration_type"
   */
  insertIntegrationType<
    Args extends VariabledInput<{
      object: integrationType_insert_input
      on_conflict?: integrationType_on_conflict | undefined
    }>,
    Sel extends Selection<integrationType>
  >(
    args: Args,
    selectorFn: (s: integrationType) => [...Sel]
  ): $Field<'insertIntegrationType', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'integrationType_insert_input!',
        on_conflict: 'integrationType_on_conflict',
      },
      args,

      selection: selectorFn(new integrationType()),
    }
    return this.$_select('insertIntegrationType', options) as any
  }

  /**
   * insert data into the table: "integration_type"
   */
  insertIntegrationTypes<
    Args extends VariabledInput<{
      objects: Array<integrationType_insert_input>
      on_conflict?: integrationType_on_conflict | undefined
    }>,
    Sel extends Selection<integrationType_mutation_response>
  >(
    args: Args,
    selectorFn: (s: integrationType_mutation_response) => [...Sel]
  ): $Field<'insertIntegrationTypes', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[integrationType_insert_input!]!',
        on_conflict: 'integrationType_on_conflict',
      },
      args,

      selection: selectorFn(new integrationType_mutation_response()),
    }
    return this.$_select('insertIntegrationTypes', options) as any
  }

  /**
   * insert data into the table: "integration"
   */
  insertIntegrations<
    Args extends VariabledInput<{
      objects: Array<integration_insert_input>
      on_conflict?: integration_on_conflict | undefined
    }>,
    Sel extends Selection<integration_mutation_response>
  >(
    args: Args,
    selectorFn: (s: integration_mutation_response) => [...Sel]
  ): $Field<'insertIntegrations', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[integration_insert_input!]!',
        on_conflict: 'integration_on_conflict',
      },
      args,

      selection: selectorFn(new integration_mutation_response()),
    }
    return this.$_select('insertIntegrations', options) as any
  }

  /**
   * insert a single row into the table: "issue"
   */
  insertIssue<
    Args extends VariabledInput<{
      object: issue_insert_input
      on_conflict?: issue_on_conflict | undefined
    }>,
    Sel extends Selection<issue>
  >(
    args: Args,
    selectorFn: (s: issue) => [...Sel]
  ): $Field<'insertIssue', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'issue_insert_input!',
        on_conflict: 'issue_on_conflict',
      },
      args,

      selection: selectorFn(new issue()),
    }
    return this.$_select('insertIssue', options) as any
  }

  /**
   * insert data into the table: "issue"
   */
  insertIssues<
    Args extends VariabledInput<{
      objects: Array<issue_insert_input>
      on_conflict?: issue_on_conflict | undefined
    }>,
    Sel extends Selection<issue_mutation_response>
  >(
    args: Args,
    selectorFn: (s: issue_mutation_response) => [...Sel]
  ): $Field<'insertIssues', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[issue_insert_input!]!',
        on_conflict: 'issue_on_conflict',
      },
      args,

      selection: selectorFn(new issue_mutation_response()),
    }
    return this.$_select('insertIssues', options) as any
  }

  /**
   * insert a single row into the table: "job"
   */
  insertJob<
    Args extends VariabledInput<{
      object: job_insert_input
      on_conflict?: job_on_conflict | undefined
    }>,
    Sel extends Selection<job>
  >(
    args: Args,
    selectorFn: (s: job) => [...Sel]
  ): $Field<'insertJob', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'job_insert_input!',
        on_conflict: 'job_on_conflict',
      },
      args,

      selection: selectorFn(new job()),
    }
    return this.$_select('insertJob', options) as any
  }

  /**
   * insert a single row into the table: "job_method"
   */
  insertJobMethod<
    Args extends VariabledInput<{
      object: jobMethod_insert_input
      on_conflict?: jobMethod_on_conflict | undefined
    }>,
    Sel extends Selection<jobMethod>
  >(
    args: Args,
    selectorFn: (s: jobMethod) => [...Sel]
  ): $Field<'insertJobMethod', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'jobMethod_insert_input!',
        on_conflict: 'jobMethod_on_conflict',
      },
      args,

      selection: selectorFn(new jobMethod()),
    }
    return this.$_select('insertJobMethod', options) as any
  }

  /**
   * insert data into the table: "job_method"
   */
  insertJobMethods<
    Args extends VariabledInput<{
      objects: Array<jobMethod_insert_input>
      on_conflict?: jobMethod_on_conflict | undefined
    }>,
    Sel extends Selection<jobMethod_mutation_response>
  >(
    args: Args,
    selectorFn: (s: jobMethod_mutation_response) => [...Sel]
  ): $Field<'insertJobMethods', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[jobMethod_insert_input!]!',
        on_conflict: 'jobMethod_on_conflict',
      },
      args,

      selection: selectorFn(new jobMethod_mutation_response()),
    }
    return this.$_select('insertJobMethods', options) as any
  }

  /**
   * insert a single row into the table: "job_status"
   */
  insertJobStatus<
    Args extends VariabledInput<{
      object: jobStatus_insert_input
      on_conflict?: jobStatus_on_conflict | undefined
    }>,
    Sel extends Selection<jobStatus>
  >(
    args: Args,
    selectorFn: (s: jobStatus) => [...Sel]
  ): $Field<'insertJobStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'jobStatus_insert_input!',
        on_conflict: 'jobStatus_on_conflict',
      },
      args,

      selection: selectorFn(new jobStatus()),
    }
    return this.$_select('insertJobStatus', options) as any
  }

  /**
   * insert data into the table: "job_status"
   */
  insertJobStatuses<
    Args extends VariabledInput<{
      objects: Array<jobStatus_insert_input>
      on_conflict?: jobStatus_on_conflict | undefined
    }>,
    Sel extends Selection<jobStatus_mutation_response>
  >(
    args: Args,
    selectorFn: (s: jobStatus_mutation_response) => [...Sel]
  ): $Field<'insertJobStatuses', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[jobStatus_insert_input!]!',
        on_conflict: 'jobStatus_on_conflict',
      },
      args,

      selection: selectorFn(new jobStatus_mutation_response()),
    }
    return this.$_select('insertJobStatuses', options) as any
  }

  /**
   * insert data into the table: "job"
   */
  insertJobs<
    Args extends VariabledInput<{
      objects: Array<job_insert_input>
      on_conflict?: job_on_conflict | undefined
    }>,
    Sel extends Selection<job_mutation_response>
  >(
    args: Args,
    selectorFn: (s: job_mutation_response) => [...Sel]
  ): $Field<'insertJobs', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[job_insert_input!]!',
        on_conflict: 'job_on_conflict',
      },
      args,

      selection: selectorFn(new job_mutation_response()),
    }
    return this.$_select('insertJobs', options) as any
  }

  /**
   * insert a single row into the table: "line"
   */
  insertLine<
    Args extends VariabledInput<{
      object: line_insert_input
      on_conflict?: line_on_conflict | undefined
    }>,
    Sel extends Selection<line>
  >(
    args: Args,
    selectorFn: (s: line) => [...Sel]
  ): $Field<'insertLine', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'line_insert_input!',
        on_conflict: 'line_on_conflict',
      },
      args,

      selection: selectorFn(new line()),
    }
    return this.$_select('insertLine', options) as any
  }

  /**
   * insert data into the table: "line"
   */
  insertLines<
    Args extends VariabledInput<{
      objects: Array<line_insert_input>
      on_conflict?: line_on_conflict | undefined
    }>,
    Sel extends Selection<line_mutation_response>
  >(
    args: Args,
    selectorFn: (s: line_mutation_response) => [...Sel]
  ): $Field<'insertLines', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[line_insert_input!]!',
        on_conflict: 'line_on_conflict',
      },
      args,

      selection: selectorFn(new line_mutation_response()),
    }
    return this.$_select('insertLines', options) as any
  }

  /**
   * insert a single row into the table: "metric"
   */
  insertMetric<
    Args extends VariabledInput<{
      object: metric_insert_input
      on_conflict?: metric_on_conflict | undefined
    }>,
    Sel extends Selection<metric>
  >(
    args: Args,
    selectorFn: (s: metric) => [...Sel]
  ): $Field<'insertMetric', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'metric_insert_input!',
        on_conflict: 'metric_on_conflict',
      },
      args,

      selection: selectorFn(new metric()),
    }
    return this.$_select('insertMetric', options) as any
  }

  /**
   * insert data into the table: "metric"
   */
  insertMetrics<
    Args extends VariabledInput<{
      objects: Array<metric_insert_input>
      on_conflict?: metric_on_conflict | undefined
    }>,
    Sel extends Selection<metric_mutation_response>
  >(
    args: Args,
    selectorFn: (s: metric_mutation_response) => [...Sel]
  ): $Field<'insertMetrics', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[metric_insert_input!]!',
        on_conflict: 'metric_on_conflict',
      },
      args,

      selection: selectorFn(new metric_mutation_response()),
    }
    return this.$_select('insertMetrics', options) as any
  }

  /**
   * insert a single row into the table: "normalized_type"
   */
  insertNormalizedType<
    Args extends VariabledInput<{
      object: normalizedType_insert_input
      on_conflict?: normalizedType_on_conflict | undefined
    }>,
    Sel extends Selection<normalizedType>
  >(
    args: Args,
    selectorFn: (s: normalizedType) => [...Sel]
  ): $Field<'insertNormalizedType', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'normalizedType_insert_input!',
        on_conflict: 'normalizedType_on_conflict',
      },
      args,

      selection: selectorFn(new normalizedType()),
    }
    return this.$_select('insertNormalizedType', options) as any
  }

  /**
   * insert data into the table: "normalized_type"
   */
  insertNormalizedTypes<
    Args extends VariabledInput<{
      objects: Array<normalizedType_insert_input>
      on_conflict?: normalizedType_on_conflict | undefined
    }>,
    Sel extends Selection<normalizedType_mutation_response>
  >(
    args: Args,
    selectorFn: (s: normalizedType_mutation_response) => [...Sel]
  ): $Field<'insertNormalizedTypes', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[normalizedType_insert_input!]!',
        on_conflict: 'normalizedType_on_conflict',
      },
      args,

      selection: selectorFn(new normalizedType_mutation_response()),
    }
    return this.$_select('insertNormalizedTypes', options) as any
  }

  /**
   * insert a single row into the table: "payment"
   */
  insertPayment<
    Args extends VariabledInput<{
      object: payment_insert_input
      on_conflict?: payment_on_conflict | undefined
    }>,
    Sel extends Selection<payment>
  >(
    args: Args,
    selectorFn: (s: payment) => [...Sel]
  ): $Field<'insertPayment', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'payment_insert_input!',
        on_conflict: 'payment_on_conflict',
      },
      args,

      selection: selectorFn(new payment()),
    }
    return this.$_select('insertPayment', options) as any
  }

  /**
   * insert a single row into the table: "payment_status"
   */
  insertPaymentStatus<
    Args extends VariabledInput<{
      object: paymentStatus_insert_input
      on_conflict?: paymentStatus_on_conflict | undefined
    }>,
    Sel extends Selection<paymentStatus>
  >(
    args: Args,
    selectorFn: (s: paymentStatus) => [...Sel]
  ): $Field<'insertPaymentStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'paymentStatus_insert_input!',
        on_conflict: 'paymentStatus_on_conflict',
      },
      args,

      selection: selectorFn(new paymentStatus()),
    }
    return this.$_select('insertPaymentStatus', options) as any
  }

  /**
   * insert data into the table: "payment_status"
   */
  insertPaymentStatuses<
    Args extends VariabledInput<{
      objects: Array<paymentStatus_insert_input>
      on_conflict?: paymentStatus_on_conflict | undefined
    }>,
    Sel extends Selection<paymentStatus_mutation_response>
  >(
    args: Args,
    selectorFn: (s: paymentStatus_mutation_response) => [...Sel]
  ): $Field<'insertPaymentStatuses', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[paymentStatus_insert_input!]!',
        on_conflict: 'paymentStatus_on_conflict',
      },
      args,

      selection: selectorFn(new paymentStatus_mutation_response()),
    }
    return this.$_select('insertPaymentStatuses', options) as any
  }

  /**
   * insert a single row into the table: "payment_type"
   */
  insertPaymentType<
    Args extends VariabledInput<{
      object: paymentType_insert_input
      on_conflict?: paymentType_on_conflict | undefined
    }>,
    Sel extends Selection<paymentType>
  >(
    args: Args,
    selectorFn: (s: paymentType) => [...Sel]
  ): $Field<'insertPaymentType', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'paymentType_insert_input!',
        on_conflict: 'paymentType_on_conflict',
      },
      args,

      selection: selectorFn(new paymentType()),
    }
    return this.$_select('insertPaymentType', options) as any
  }

  /**
   * insert data into the table: "payment_type"
   */
  insertPaymentTypes<
    Args extends VariabledInput<{
      objects: Array<paymentType_insert_input>
      on_conflict?: paymentType_on_conflict | undefined
    }>,
    Sel extends Selection<paymentType_mutation_response>
  >(
    args: Args,
    selectorFn: (s: paymentType_mutation_response) => [...Sel]
  ): $Field<'insertPaymentTypes', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[paymentType_insert_input!]!',
        on_conflict: 'paymentType_on_conflict',
      },
      args,

      selection: selectorFn(new paymentType_mutation_response()),
    }
    return this.$_select('insertPaymentTypes', options) as any
  }

  /**
   * insert data into the table: "payment"
   */
  insertPayments<
    Args extends VariabledInput<{
      objects: Array<payment_insert_input>
      on_conflict?: payment_on_conflict | undefined
    }>,
    Sel extends Selection<payment_mutation_response>
  >(
    args: Args,
    selectorFn: (s: payment_mutation_response) => [...Sel]
  ): $Field<'insertPayments', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[payment_insert_input!]!',
        on_conflict: 'payment_on_conflict',
      },
      args,

      selection: selectorFn(new payment_mutation_response()),
    }
    return this.$_select('insertPayments', options) as any
  }

  /**
   * insert a single row into the table: "subclassification"
   */
  insertSubclassification<
    Args extends VariabledInput<{
      object: subclassification_insert_input
      on_conflict?: subclassification_on_conflict | undefined
    }>,
    Sel extends Selection<subclassification>
  >(
    args: Args,
    selectorFn: (s: subclassification) => [...Sel]
  ): $Field<'insertSubclassification', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'subclassification_insert_input!',
        on_conflict: 'subclassification_on_conflict',
      },
      args,

      selection: selectorFn(new subclassification()),
    }
    return this.$_select('insertSubclassification', options) as any
  }

  /**
   * insert data into the table: "subclassification"
   */
  insertSubclassifications<
    Args extends VariabledInput<{
      objects: Array<subclassification_insert_input>
      on_conflict?: subclassification_on_conflict | undefined
    }>,
    Sel extends Selection<subclassification_mutation_response>
  >(
    args: Args,
    selectorFn: (s: subclassification_mutation_response) => [...Sel]
  ): $Field<'insertSubclassifications', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[subclassification_insert_input!]!',
        on_conflict: 'subclassification_on_conflict',
      },
      args,

      selection: selectorFn(new subclassification_mutation_response()),
    }
    return this.$_select('insertSubclassifications', options) as any
  }

  /**
   * insert a single row into the table: "tag"
   */
  insertTag<
    Args extends VariabledInput<{
      object: tag_insert_input
      on_conflict?: tag_on_conflict | undefined
    }>,
    Sel extends Selection<tag>
  >(
    args: Args,
    selectorFn: (s: tag) => [...Sel]
  ): $Field<'insertTag', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'tag_insert_input!',
        on_conflict: 'tag_on_conflict',
      },
      args,

      selection: selectorFn(new tag()),
    }
    return this.$_select('insertTag', options) as any
  }

  /**
   * insert data into the table: "tag"
   */
  insertTags<
    Args extends VariabledInput<{
      objects: Array<tag_insert_input>
      on_conflict?: tag_on_conflict | undefined
    }>,
    Sel extends Selection<tag_mutation_response>
  >(
    args: Args,
    selectorFn: (s: tag_mutation_response) => [...Sel]
  ): $Field<'insertTags', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[tag_insert_input!]!',
        on_conflict: 'tag_on_conflict',
      },
      args,

      selection: selectorFn(new tag_mutation_response()),
    }
    return this.$_select('insertTags', options) as any
  }

  /**
   * insert a single row into the table: "team"
   */
  insertTeam<
    Args extends VariabledInput<{
      object: team_insert_input
      on_conflict?: team_on_conflict | undefined
    }>,
    Sel extends Selection<team>
  >(
    args: Args,
    selectorFn: (s: team) => [...Sel]
  ): $Field<'insertTeam', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'team_insert_input!',
        on_conflict: 'team_on_conflict',
      },
      args,

      selection: selectorFn(new team()),
    }
    return this.$_select('insertTeam', options) as any
  }

  /**
   * insert a single row into the table: "team_user"
   */
  insertTeamUser<
    Args extends VariabledInput<{
      object: teamUser_insert_input
      on_conflict?: teamUser_on_conflict | undefined
    }>,
    Sel extends Selection<teamUser>
  >(
    args: Args,
    selectorFn: (s: teamUser) => [...Sel]
  ): $Field<'insertTeamUser', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'teamUser_insert_input!',
        on_conflict: 'teamUser_on_conflict',
      },
      args,

      selection: selectorFn(new teamUser()),
    }
    return this.$_select('insertTeamUser', options) as any
  }

  /**
   * insert data into the table: "team_user"
   */
  insertTeamUsers<
    Args extends VariabledInput<{
      objects: Array<teamUser_insert_input>
      on_conflict?: teamUser_on_conflict | undefined
    }>,
    Sel extends Selection<teamUser_mutation_response>
  >(
    args: Args,
    selectorFn: (s: teamUser_mutation_response) => [...Sel]
  ): $Field<'insertTeamUsers', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[teamUser_insert_input!]!',
        on_conflict: 'teamUser_on_conflict',
      },
      args,

      selection: selectorFn(new teamUser_mutation_response()),
    }
    return this.$_select('insertTeamUsers', options) as any
  }

  /**
   * insert data into the table: "team"
   */
  insertTeams<
    Args extends VariabledInput<{
      objects: Array<team_insert_input>
      on_conflict?: team_on_conflict | undefined
    }>,
    Sel extends Selection<team_mutation_response>
  >(
    args: Args,
    selectorFn: (s: team_mutation_response) => [...Sel]
  ): $Field<'insertTeams', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[team_insert_input!]!',
        on_conflict: 'team_on_conflict',
      },
      args,

      selection: selectorFn(new team_mutation_response()),
    }
    return this.$_select('insertTeams', options) as any
  }

  /**
   * insert a single row into the table: "unit"
   */
  insertUnit<
    Args extends VariabledInput<{
      object: unit_insert_input
      on_conflict?: unit_on_conflict | undefined
    }>,
    Sel extends Selection<unit>
  >(
    args: Args,
    selectorFn: (s: unit) => [...Sel]
  ): $Field<'insertUnit', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'unit_insert_input!',
        on_conflict: 'unit_on_conflict',
      },
      args,

      selection: selectorFn(new unit()),
    }
    return this.$_select('insertUnit', options) as any
  }

  /**
   * insert data into the table: "unit"
   */
  insertUnits<
    Args extends VariabledInput<{
      objects: Array<unit_insert_input>
      on_conflict?: unit_on_conflict | undefined
    }>,
    Sel extends Selection<unit_mutation_response>
  >(
    args: Args,
    selectorFn: (s: unit_mutation_response) => [...Sel]
  ): $Field<'insertUnits', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[unit_insert_input!]!',
        on_conflict: 'unit_on_conflict',
      },
      args,

      selection: selectorFn(new unit_mutation_response()),
    }
    return this.$_select('insertUnits', options) as any
  }

  /**
   * insert a single row into the table: "user"
   */
  insertUser<
    Args extends VariabledInput<{
      object: user_insert_input
      on_conflict?: user_on_conflict | undefined
    }>,
    Sel extends Selection<user>
  >(
    args: Args,
    selectorFn: (s: user) => [...Sel]
  ): $Field<'insertUser', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'user_insert_input!',
        on_conflict: 'user_on_conflict',
      },
      args,

      selection: selectorFn(new user()),
    }
    return this.$_select('insertUser', options) as any
  }

  /**
   * insert a single row into the table: "user_status"
   */
  insertUserStatus<
    Args extends VariabledInput<{
      object: userStatus_insert_input
      on_conflict?: userStatus_on_conflict | undefined
    }>,
    Sel extends Selection<userStatus>
  >(
    args: Args,
    selectorFn: (s: userStatus) => [...Sel]
  ): $Field<'insertUserStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'userStatus_insert_input!',
        on_conflict: 'userStatus_on_conflict',
      },
      args,

      selection: selectorFn(new userStatus()),
    }
    return this.$_select('insertUserStatus', options) as any
  }

  /**
   * insert data into the table: "user_status"
   */
  insertUserStatuses<
    Args extends VariabledInput<{
      objects: Array<userStatus_insert_input>
      on_conflict?: userStatus_on_conflict | undefined
    }>,
    Sel extends Selection<userStatus_mutation_response>
  >(
    args: Args,
    selectorFn: (s: userStatus_mutation_response) => [...Sel]
  ): $Field<'insertUserStatuses', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[userStatus_insert_input!]!',
        on_conflict: 'userStatus_on_conflict',
      },
      args,

      selection: selectorFn(new userStatus_mutation_response()),
    }
    return this.$_select('insertUserStatuses', options) as any
  }

  /**
   * insert data into the table: "user"
   */
  insertUsers<
    Args extends VariabledInput<{
      objects: Array<user_insert_input>
      on_conflict?: user_on_conflict | undefined
    }>,
    Sel extends Selection<user_mutation_response>
  >(
    args: Args,
    selectorFn: (s: user_mutation_response) => [...Sel]
  ): $Field<'insertUsers', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[user_insert_input!]!',
        on_conflict: 'user_on_conflict',
      },
      args,

      selection: selectorFn(new user_mutation_response()),
    }
    return this.$_select('insertUsers', options) as any
  }

  /**
   * insert a single row into the table: "webhook"
   */
  insertWebhook<
    Args extends VariabledInput<{
      object: webhook_insert_input
      on_conflict?: webhook_on_conflict | undefined
    }>,
    Sel extends Selection<webhook>
  >(
    args: Args,
    selectorFn: (s: webhook) => [...Sel]
  ): $Field<'insertWebhook', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'webhook_insert_input!',
        on_conflict: 'webhook_on_conflict',
      },
      args,

      selection: selectorFn(new webhook()),
    }
    return this.$_select('insertWebhook', options) as any
  }

  /**
   * insert data into the table: "webhook"
   */
  insertWebhooks<
    Args extends VariabledInput<{
      objects: Array<webhook_insert_input>
      on_conflict?: webhook_on_conflict | undefined
    }>,
    Sel extends Selection<webhook_mutation_response>
  >(
    args: Args,
    selectorFn: (s: webhook_mutation_response) => [...Sel]
  ): $Field<'insertWebhooks', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[webhook_insert_input!]!',
        on_conflict: 'webhook_on_conflict',
      },
      args,

      selection: selectorFn(new webhook_mutation_response()),
    }
    return this.$_select('insertWebhooks', options) as any
  }

  /**
   * insert data into the table: "booking_channel"
   */
  insert_booking_channel<
    Args extends VariabledInput<{
      objects: Array<booking_channel_insert_input>
      on_conflict?: booking_channel_on_conflict | undefined
    }>,
    Sel extends Selection<booking_channel_mutation_response>
  >(
    args: Args,
    selectorFn: (s: booking_channel_mutation_response) => [...Sel]
  ): $Field<'insert_booking_channel', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        objects: '[booking_channel_insert_input!]!',
        on_conflict: 'booking_channel_on_conflict',
      },
      args,

      selection: selectorFn(new booking_channel_mutation_response()),
    }
    return this.$_select('insert_booking_channel', options) as any
  }

  /**
   * insert a single row into the table: "booking_channel"
   */
  insert_booking_channel_one<
    Args extends VariabledInput<{
      object: booking_channel_insert_input
      on_conflict?: booking_channel_on_conflict | undefined
    }>,
    Sel extends Selection<booking_channel>
  >(
    args: Args,
    selectorFn: (s: booking_channel) => [...Sel]
  ): $Field<'insert_booking_channel_one', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        object: 'booking_channel_insert_input!',
        on_conflict: 'booking_channel_on_conflict',
      },
      args,

      selection: selectorFn(new booking_channel()),
    }
    return this.$_select('insert_booking_channel_one', options) as any
  }

  /**
   * update single row of the table: "booking"
   */
  updateBooking<
    Args extends VariabledInput<{
      _append?: booking_append_input | undefined
      _delete_at_path?: booking_delete_at_path_input | undefined
      _delete_elem?: booking_delete_elem_input | undefined
      _delete_key?: booking_delete_key_input | undefined
      _inc?: booking_inc_input | undefined
      _prepend?: booking_prepend_input | undefined
      _set?: booking_set_input | undefined
      pk_columns: booking_pk_columns_input
    }>,
    Sel extends Selection<booking>
  >(
    args: Args,
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'updateBooking', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'booking_append_input',
        _delete_at_path: 'booking_delete_at_path_input',
        _delete_elem: 'booking_delete_elem_input',
        _delete_key: 'booking_delete_key_input',
        _inc: 'booking_inc_input',
        _prepend: 'booking_prepend_input',
        _set: 'booking_set_input',
        pk_columns: 'booking_pk_columns_input!',
      },
      args,

      selection: selectorFn(new booking()),
    }
    return this.$_select('updateBooking', options) as any
  }

  /**
   * update single row of the table: "booking_status"
   */
  updateBookingStatus<
    Args extends VariabledInput<{
      _set?: bookingStatus_set_input | undefined
      pk_columns: bookingStatus_pk_columns_input
    }>,
    Sel extends Selection<bookingStatus>
  >(
    args: Args,
    selectorFn: (s: bookingStatus) => [...Sel]
  ): $Field<'updateBookingStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'bookingStatus_set_input',
        pk_columns: 'bookingStatus_pk_columns_input!',
      },
      args,

      selection: selectorFn(new bookingStatus()),
    }
    return this.$_select('updateBookingStatus', options) as any
  }

  /**
   * update data of the table: "booking_status"
   */
  updateBookingStatuses<
    Args extends VariabledInput<{
      _set?: bookingStatus_set_input | undefined
      where: bookingStatus_bool_exp
    }>,
    Sel extends Selection<bookingStatus_mutation_response>
  >(
    args: Args,
    selectorFn: (s: bookingStatus_mutation_response) => [...Sel]
  ): $Field<'updateBookingStatuses', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'bookingStatus_set_input',
        where: 'bookingStatus_bool_exp!',
      },
      args,

      selection: selectorFn(new bookingStatus_mutation_response()),
    }
    return this.$_select('updateBookingStatuses', options) as any
  }

  /**
   * update data of the table: "booking"
   */
  updateBookings<
    Args extends VariabledInput<{
      _append?: booking_append_input | undefined
      _delete_at_path?: booking_delete_at_path_input | undefined
      _delete_elem?: booking_delete_elem_input | undefined
      _delete_key?: booking_delete_key_input | undefined
      _inc?: booking_inc_input | undefined
      _prepend?: booking_prepend_input | undefined
      _set?: booking_set_input | undefined
      where: booking_bool_exp
    }>,
    Sel extends Selection<booking_mutation_response>
  >(
    args: Args,
    selectorFn: (s: booking_mutation_response) => [...Sel]
  ): $Field<'updateBookings', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'booking_append_input',
        _delete_at_path: 'booking_delete_at_path_input',
        _delete_elem: 'booking_delete_elem_input',
        _delete_key: 'booking_delete_key_input',
        _inc: 'booking_inc_input',
        _prepend: 'booking_prepend_input',
        _set: 'booking_set_input',
        where: 'booking_bool_exp!',
      },
      args,

      selection: selectorFn(new booking_mutation_response()),
    }
    return this.$_select('updateBookings', options) as any
  }

  /**
   * update single row of the table: "classification"
   */
  updateClassification<
    Args extends VariabledInput<{
      _set?: classification_set_input | undefined
      pk_columns: classification_pk_columns_input
    }>,
    Sel extends Selection<classification>
  >(
    args: Args,
    selectorFn: (s: classification) => [...Sel]
  ): $Field<'updateClassification', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'classification_set_input',
        pk_columns: 'classification_pk_columns_input!',
      },
      args,

      selection: selectorFn(new classification()),
    }
    return this.$_select('updateClassification', options) as any
  }

  /**
   * update data of the table: "classification"
   */
  updateClassifications<
    Args extends VariabledInput<{
      _set?: classification_set_input | undefined
      where: classification_bool_exp
    }>,
    Sel extends Selection<classification_mutation_response>
  >(
    args: Args,
    selectorFn: (s: classification_mutation_response) => [...Sel]
  ): $Field<'updateClassifications', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'classification_set_input',
        where: 'classification_bool_exp!',
      },
      args,

      selection: selectorFn(new classification_mutation_response()),
    }
    return this.$_select('updateClassifications', options) as any
  }

  /**
   * update single row of the table: "connection"
   */
  updateConnection<
    Args extends VariabledInput<{
      _append?: connection_append_input | undefined
      _delete_at_path?: connection_delete_at_path_input | undefined
      _delete_elem?: connection_delete_elem_input | undefined
      _delete_key?: connection_delete_key_input | undefined
      _prepend?: connection_prepend_input | undefined
      _set?: connection_set_input | undefined
      pk_columns: connection_pk_columns_input
    }>,
    Sel extends Selection<connection>
  >(
    args: Args,
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'updateConnection', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'connection_append_input',
        _delete_at_path: 'connection_delete_at_path_input',
        _delete_elem: 'connection_delete_elem_input',
        _delete_key: 'connection_delete_key_input',
        _prepend: 'connection_prepend_input',
        _set: 'connection_set_input',
        pk_columns: 'connection_pk_columns_input!',
      },
      args,

      selection: selectorFn(new connection()),
    }
    return this.$_select('updateConnection', options) as any
  }

  /**
   * update data of the table: "connection"
   */
  updateConnections<
    Args extends VariabledInput<{
      _append?: connection_append_input | undefined
      _delete_at_path?: connection_delete_at_path_input | undefined
      _delete_elem?: connection_delete_elem_input | undefined
      _delete_key?: connection_delete_key_input | undefined
      _prepend?: connection_prepend_input | undefined
      _set?: connection_set_input | undefined
      where: connection_bool_exp
    }>,
    Sel extends Selection<connection_mutation_response>
  >(
    args: Args,
    selectorFn: (s: connection_mutation_response) => [...Sel]
  ): $Field<'updateConnections', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'connection_append_input',
        _delete_at_path: 'connection_delete_at_path_input',
        _delete_elem: 'connection_delete_elem_input',
        _delete_key: 'connection_delete_key_input',
        _prepend: 'connection_prepend_input',
        _set: 'connection_set_input',
        where: 'connection_bool_exp!',
      },
      args,

      selection: selectorFn(new connection_mutation_response()),
    }
    return this.$_select('updateConnections', options) as any
  }

  /**
   * update data of the table: "currency"
   */
  updateCurrencies<
    Args extends VariabledInput<{
      _set?: currency_set_input | undefined
      where: currency_bool_exp
    }>,
    Sel extends Selection<currency_mutation_response>
  >(
    args: Args,
    selectorFn: (s: currency_mutation_response) => [...Sel]
  ): $Field<'updateCurrencies', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'currency_set_input',
        where: 'currency_bool_exp!',
      },
      args,

      selection: selectorFn(new currency_mutation_response()),
    }
    return this.$_select('updateCurrencies', options) as any
  }

  /**
   * update single row of the table: "currency"
   */
  updateCurrency<
    Args extends VariabledInput<{
      _set?: currency_set_input | undefined
      pk_columns: currency_pk_columns_input
    }>,
    Sel extends Selection<currency>
  >(
    args: Args,
    selectorFn: (s: currency) => [...Sel]
  ): $Field<'updateCurrency', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'currency_set_input',
        pk_columns: 'currency_pk_columns_input!',
      },
      args,

      selection: selectorFn(new currency()),
    }
    return this.$_select('updateCurrency', options) as any
  }

  /**
   * update data of the table: "entity"
   */
  updateEntities<
    Args extends VariabledInput<{
      _append?: entity_append_input | undefined
      _delete_at_path?: entity_delete_at_path_input | undefined
      _delete_elem?: entity_delete_elem_input | undefined
      _delete_key?: entity_delete_key_input | undefined
      _prepend?: entity_prepend_input | undefined
      _set?: entity_set_input | undefined
      where: entity_bool_exp
    }>,
    Sel extends Selection<entity_mutation_response>
  >(
    args: Args,
    selectorFn: (s: entity_mutation_response) => [...Sel]
  ): $Field<'updateEntities', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'entity_append_input',
        _delete_at_path: 'entity_delete_at_path_input',
        _delete_elem: 'entity_delete_elem_input',
        _delete_key: 'entity_delete_key_input',
        _prepend: 'entity_prepend_input',
        _set: 'entity_set_input',
        where: 'entity_bool_exp!',
      },
      args,

      selection: selectorFn(new entity_mutation_response()),
    }
    return this.$_select('updateEntities', options) as any
  }

  /**
   * update single row of the table: "entity"
   */
  updateEntity<
    Args extends VariabledInput<{
      _append?: entity_append_input | undefined
      _delete_at_path?: entity_delete_at_path_input | undefined
      _delete_elem?: entity_delete_elem_input | undefined
      _delete_key?: entity_delete_key_input | undefined
      _prepend?: entity_prepend_input | undefined
      _set?: entity_set_input | undefined
      pk_columns: entity_pk_columns_input
    }>,
    Sel extends Selection<entity>
  >(
    args: Args,
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'updateEntity', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'entity_append_input',
        _delete_at_path: 'entity_delete_at_path_input',
        _delete_elem: 'entity_delete_elem_input',
        _delete_key: 'entity_delete_key_input',
        _prepend: 'entity_prepend_input',
        _set: 'entity_set_input',
        pk_columns: 'entity_pk_columns_input!',
      },
      args,

      selection: selectorFn(new entity()),
    }
    return this.$_select('updateEntity', options) as any
  }

  /**
   * update single row of the table: "entity_status"
   */
  updateEntityStatus<
    Args extends VariabledInput<{
      _set?: entityStatus_set_input | undefined
      pk_columns: entityStatus_pk_columns_input
    }>,
    Sel extends Selection<entityStatus>
  >(
    args: Args,
    selectorFn: (s: entityStatus) => [...Sel]
  ): $Field<'updateEntityStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'entityStatus_set_input',
        pk_columns: 'entityStatus_pk_columns_input!',
      },
      args,

      selection: selectorFn(new entityStatus()),
    }
    return this.$_select('updateEntityStatus', options) as any
  }

  /**
   * update data of the table: "entity_status"
   */
  updateEntityStatuses<
    Args extends VariabledInput<{
      _set?: entityStatus_set_input | undefined
      where: entityStatus_bool_exp
    }>,
    Sel extends Selection<entityStatus_mutation_response>
  >(
    args: Args,
    selectorFn: (s: entityStatus_mutation_response) => [...Sel]
  ): $Field<'updateEntityStatuses', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'entityStatus_set_input',
        where: 'entityStatus_bool_exp!',
      },
      args,

      selection: selectorFn(new entityStatus_mutation_response()),
    }
    return this.$_select('updateEntityStatuses', options) as any
  }

  /**
   * update single row of the table: "integration"
   */
  updateIntegration<
    Args extends VariabledInput<{
      _set?: integration_set_input | undefined
      pk_columns: integration_pk_columns_input
    }>,
    Sel extends Selection<integration>
  >(
    args: Args,
    selectorFn: (s: integration) => [...Sel]
  ): $Field<'updateIntegration', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'integration_set_input',
        pk_columns: 'integration_pk_columns_input!',
      },
      args,

      selection: selectorFn(new integration()),
    }
    return this.$_select('updateIntegration', options) as any
  }

  /**
   * update single row of the table: "integration_type"
   */
  updateIntegrationType<
    Args extends VariabledInput<{
      _set?: integrationType_set_input | undefined
      pk_columns: integrationType_pk_columns_input
    }>,
    Sel extends Selection<integrationType>
  >(
    args: Args,
    selectorFn: (s: integrationType) => [...Sel]
  ): $Field<'updateIntegrationType', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'integrationType_set_input',
        pk_columns: 'integrationType_pk_columns_input!',
      },
      args,

      selection: selectorFn(new integrationType()),
    }
    return this.$_select('updateIntegrationType', options) as any
  }

  /**
   * update data of the table: "integration_type"
   */
  updateIntegrationTypes<
    Args extends VariabledInput<{
      _set?: integrationType_set_input | undefined
      where: integrationType_bool_exp
    }>,
    Sel extends Selection<integrationType_mutation_response>
  >(
    args: Args,
    selectorFn: (s: integrationType_mutation_response) => [...Sel]
  ): $Field<'updateIntegrationTypes', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'integrationType_set_input',
        where: 'integrationType_bool_exp!',
      },
      args,

      selection: selectorFn(new integrationType_mutation_response()),
    }
    return this.$_select('updateIntegrationTypes', options) as any
  }

  /**
   * update data of the table: "integration"
   */
  updateIntegrations<
    Args extends VariabledInput<{
      _set?: integration_set_input | undefined
      where: integration_bool_exp
    }>,
    Sel extends Selection<integration_mutation_response>
  >(
    args: Args,
    selectorFn: (s: integration_mutation_response) => [...Sel]
  ): $Field<'updateIntegrations', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'integration_set_input',
        where: 'integration_bool_exp!',
      },
      args,

      selection: selectorFn(new integration_mutation_response()),
    }
    return this.$_select('updateIntegrations', options) as any
  }

  /**
   * update single row of the table: "issue"
   */
  updateIssue<
    Args extends VariabledInput<{
      _append?: issue_append_input | undefined
      _delete_at_path?: issue_delete_at_path_input | undefined
      _delete_elem?: issue_delete_elem_input | undefined
      _delete_key?: issue_delete_key_input | undefined
      _prepend?: issue_prepend_input | undefined
      _set?: issue_set_input | undefined
      pk_columns: issue_pk_columns_input
    }>,
    Sel extends Selection<issue>
  >(
    args: Args,
    selectorFn: (s: issue) => [...Sel]
  ): $Field<'updateIssue', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'issue_append_input',
        _delete_at_path: 'issue_delete_at_path_input',
        _delete_elem: 'issue_delete_elem_input',
        _delete_key: 'issue_delete_key_input',
        _prepend: 'issue_prepend_input',
        _set: 'issue_set_input',
        pk_columns: 'issue_pk_columns_input!',
      },
      args,

      selection: selectorFn(new issue()),
    }
    return this.$_select('updateIssue', options) as any
  }

  /**
   * update data of the table: "issue"
   */
  updateIssues<
    Args extends VariabledInput<{
      _append?: issue_append_input | undefined
      _delete_at_path?: issue_delete_at_path_input | undefined
      _delete_elem?: issue_delete_elem_input | undefined
      _delete_key?: issue_delete_key_input | undefined
      _prepend?: issue_prepend_input | undefined
      _set?: issue_set_input | undefined
      where: issue_bool_exp
    }>,
    Sel extends Selection<issue_mutation_response>
  >(
    args: Args,
    selectorFn: (s: issue_mutation_response) => [...Sel]
  ): $Field<'updateIssues', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'issue_append_input',
        _delete_at_path: 'issue_delete_at_path_input',
        _delete_elem: 'issue_delete_elem_input',
        _delete_key: 'issue_delete_key_input',
        _prepend: 'issue_prepend_input',
        _set: 'issue_set_input',
        where: 'issue_bool_exp!',
      },
      args,

      selection: selectorFn(new issue_mutation_response()),
    }
    return this.$_select('updateIssues', options) as any
  }

  /**
   * update single row of the table: "job"
   */
  updateJob<
    Args extends VariabledInput<{
      _append?: job_append_input | undefined
      _delete_at_path?: job_delete_at_path_input | undefined
      _delete_elem?: job_delete_elem_input | undefined
      _delete_key?: job_delete_key_input | undefined
      _prepend?: job_prepend_input | undefined
      _set?: job_set_input | undefined
      pk_columns: job_pk_columns_input
    }>,
    Sel extends Selection<job>
  >(
    args: Args,
    selectorFn: (s: job) => [...Sel]
  ): $Field<'updateJob', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'job_append_input',
        _delete_at_path: 'job_delete_at_path_input',
        _delete_elem: 'job_delete_elem_input',
        _delete_key: 'job_delete_key_input',
        _prepend: 'job_prepend_input',
        _set: 'job_set_input',
        pk_columns: 'job_pk_columns_input!',
      },
      args,

      selection: selectorFn(new job()),
    }
    return this.$_select('updateJob', options) as any
  }

  /**
   * update single row of the table: "job_method"
   */
  updateJobMethod<
    Args extends VariabledInput<{
      _set?: jobMethod_set_input | undefined
      pk_columns: jobMethod_pk_columns_input
    }>,
    Sel extends Selection<jobMethod>
  >(
    args: Args,
    selectorFn: (s: jobMethod) => [...Sel]
  ): $Field<'updateJobMethod', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'jobMethod_set_input',
        pk_columns: 'jobMethod_pk_columns_input!',
      },
      args,

      selection: selectorFn(new jobMethod()),
    }
    return this.$_select('updateJobMethod', options) as any
  }

  /**
   * update data of the table: "job_method"
   */
  updateJobMethods<
    Args extends VariabledInput<{
      _set?: jobMethod_set_input | undefined
      where: jobMethod_bool_exp
    }>,
    Sel extends Selection<jobMethod_mutation_response>
  >(
    args: Args,
    selectorFn: (s: jobMethod_mutation_response) => [...Sel]
  ): $Field<'updateJobMethods', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'jobMethod_set_input',
        where: 'jobMethod_bool_exp!',
      },
      args,

      selection: selectorFn(new jobMethod_mutation_response()),
    }
    return this.$_select('updateJobMethods', options) as any
  }

  /**
   * update single row of the table: "job_status"
   */
  updateJobStatus<
    Args extends VariabledInput<{
      _set?: jobStatus_set_input | undefined
      pk_columns: jobStatus_pk_columns_input
    }>,
    Sel extends Selection<jobStatus>
  >(
    args: Args,
    selectorFn: (s: jobStatus) => [...Sel]
  ): $Field<'updateJobStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'jobStatus_set_input',
        pk_columns: 'jobStatus_pk_columns_input!',
      },
      args,

      selection: selectorFn(new jobStatus()),
    }
    return this.$_select('updateJobStatus', options) as any
  }

  /**
   * update data of the table: "job_status"
   */
  updateJobStatuses<
    Args extends VariabledInput<{
      _set?: jobStatus_set_input | undefined
      where: jobStatus_bool_exp
    }>,
    Sel extends Selection<jobStatus_mutation_response>
  >(
    args: Args,
    selectorFn: (s: jobStatus_mutation_response) => [...Sel]
  ): $Field<'updateJobStatuses', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'jobStatus_set_input',
        where: 'jobStatus_bool_exp!',
      },
      args,

      selection: selectorFn(new jobStatus_mutation_response()),
    }
    return this.$_select('updateJobStatuses', options) as any
  }

  /**
   * update data of the table: "job"
   */
  updateJobs<
    Args extends VariabledInput<{
      _append?: job_append_input | undefined
      _delete_at_path?: job_delete_at_path_input | undefined
      _delete_elem?: job_delete_elem_input | undefined
      _delete_key?: job_delete_key_input | undefined
      _prepend?: job_prepend_input | undefined
      _set?: job_set_input | undefined
      where: job_bool_exp
    }>,
    Sel extends Selection<job_mutation_response>
  >(
    args: Args,
    selectorFn: (s: job_mutation_response) => [...Sel]
  ): $Field<'updateJobs', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'job_append_input',
        _delete_at_path: 'job_delete_at_path_input',
        _delete_elem: 'job_delete_elem_input',
        _delete_key: 'job_delete_key_input',
        _prepend: 'job_prepend_input',
        _set: 'job_set_input',
        where: 'job_bool_exp!',
      },
      args,

      selection: selectorFn(new job_mutation_response()),
    }
    return this.$_select('updateJobs', options) as any
  }

  /**
   * update single row of the table: "line"
   */
  updateLine<
    Args extends VariabledInput<{
      _append?: line_append_input | undefined
      _delete_at_path?: line_delete_at_path_input | undefined
      _delete_elem?: line_delete_elem_input | undefined
      _delete_key?: line_delete_key_input | undefined
      _inc?: line_inc_input | undefined
      _prepend?: line_prepend_input | undefined
      _set?: line_set_input | undefined
      pk_columns: line_pk_columns_input
    }>,
    Sel extends Selection<line>
  >(
    args: Args,
    selectorFn: (s: line) => [...Sel]
  ): $Field<'updateLine', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'line_append_input',
        _delete_at_path: 'line_delete_at_path_input',
        _delete_elem: 'line_delete_elem_input',
        _delete_key: 'line_delete_key_input',
        _inc: 'line_inc_input',
        _prepend: 'line_prepend_input',
        _set: 'line_set_input',
        pk_columns: 'line_pk_columns_input!',
      },
      args,

      selection: selectorFn(new line()),
    }
    return this.$_select('updateLine', options) as any
  }

  /**
   * update data of the table: "line"
   */
  updateLines<
    Args extends VariabledInput<{
      _append?: line_append_input | undefined
      _delete_at_path?: line_delete_at_path_input | undefined
      _delete_elem?: line_delete_elem_input | undefined
      _delete_key?: line_delete_key_input | undefined
      _inc?: line_inc_input | undefined
      _prepend?: line_prepend_input | undefined
      _set?: line_set_input | undefined
      where: line_bool_exp
    }>,
    Sel extends Selection<line_mutation_response>
  >(
    args: Args,
    selectorFn: (s: line_mutation_response) => [...Sel]
  ): $Field<'updateLines', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'line_append_input',
        _delete_at_path: 'line_delete_at_path_input',
        _delete_elem: 'line_delete_elem_input',
        _delete_key: 'line_delete_key_input',
        _inc: 'line_inc_input',
        _prepend: 'line_prepend_input',
        _set: 'line_set_input',
        where: 'line_bool_exp!',
      },
      args,

      selection: selectorFn(new line_mutation_response()),
    }
    return this.$_select('updateLines', options) as any
  }

  /**
   * update single row of the table: "metric"
   */
  updateMetric<
    Args extends VariabledInput<{
      _append?: metric_append_input | undefined
      _delete_at_path?: metric_delete_at_path_input | undefined
      _delete_elem?: metric_delete_elem_input | undefined
      _delete_key?: metric_delete_key_input | undefined
      _inc?: metric_inc_input | undefined
      _prepend?: metric_prepend_input | undefined
      _set?: metric_set_input | undefined
      pk_columns: metric_pk_columns_input
    }>,
    Sel extends Selection<metric>
  >(
    args: Args,
    selectorFn: (s: metric) => [...Sel]
  ): $Field<'updateMetric', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'metric_append_input',
        _delete_at_path: 'metric_delete_at_path_input',
        _delete_elem: 'metric_delete_elem_input',
        _delete_key: 'metric_delete_key_input',
        _inc: 'metric_inc_input',
        _prepend: 'metric_prepend_input',
        _set: 'metric_set_input',
        pk_columns: 'metric_pk_columns_input!',
      },
      args,

      selection: selectorFn(new metric()),
    }
    return this.$_select('updateMetric', options) as any
  }

  /**
   * update data of the table: "metric"
   */
  updateMetrics<
    Args extends VariabledInput<{
      _append?: metric_append_input | undefined
      _delete_at_path?: metric_delete_at_path_input | undefined
      _delete_elem?: metric_delete_elem_input | undefined
      _delete_key?: metric_delete_key_input | undefined
      _inc?: metric_inc_input | undefined
      _prepend?: metric_prepend_input | undefined
      _set?: metric_set_input | undefined
      where: metric_bool_exp
    }>,
    Sel extends Selection<metric_mutation_response>
  >(
    args: Args,
    selectorFn: (s: metric_mutation_response) => [...Sel]
  ): $Field<'updateMetrics', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'metric_append_input',
        _delete_at_path: 'metric_delete_at_path_input',
        _delete_elem: 'metric_delete_elem_input',
        _delete_key: 'metric_delete_key_input',
        _inc: 'metric_inc_input',
        _prepend: 'metric_prepend_input',
        _set: 'metric_set_input',
        where: 'metric_bool_exp!',
      },
      args,

      selection: selectorFn(new metric_mutation_response()),
    }
    return this.$_select('updateMetrics', options) as any
  }

  /**
   * update single row of the table: "normalized_type"
   */
  updateNormalizedType<
    Args extends VariabledInput<{
      _set?: normalizedType_set_input | undefined
      pk_columns: normalizedType_pk_columns_input
    }>,
    Sel extends Selection<normalizedType>
  >(
    args: Args,
    selectorFn: (s: normalizedType) => [...Sel]
  ): $Field<'updateNormalizedType', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'normalizedType_set_input',
        pk_columns: 'normalizedType_pk_columns_input!',
      },
      args,

      selection: selectorFn(new normalizedType()),
    }
    return this.$_select('updateNormalizedType', options) as any
  }

  /**
   * update data of the table: "normalized_type"
   */
  updateNormalizedTypes<
    Args extends VariabledInput<{
      _set?: normalizedType_set_input | undefined
      where: normalizedType_bool_exp
    }>,
    Sel extends Selection<normalizedType_mutation_response>
  >(
    args: Args,
    selectorFn: (s: normalizedType_mutation_response) => [...Sel]
  ): $Field<'updateNormalizedTypes', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'normalizedType_set_input',
        where: 'normalizedType_bool_exp!',
      },
      args,

      selection: selectorFn(new normalizedType_mutation_response()),
    }
    return this.$_select('updateNormalizedTypes', options) as any
  }

  /**
   * update single row of the table: "payment"
   */
  updatePayment<
    Args extends VariabledInput<{
      _append?: payment_append_input | undefined
      _delete_at_path?: payment_delete_at_path_input | undefined
      _delete_elem?: payment_delete_elem_input | undefined
      _delete_key?: payment_delete_key_input | undefined
      _inc?: payment_inc_input | undefined
      _prepend?: payment_prepend_input | undefined
      _set?: payment_set_input | undefined
      pk_columns: payment_pk_columns_input
    }>,
    Sel extends Selection<payment>
  >(
    args: Args,
    selectorFn: (s: payment) => [...Sel]
  ): $Field<'updatePayment', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'payment_append_input',
        _delete_at_path: 'payment_delete_at_path_input',
        _delete_elem: 'payment_delete_elem_input',
        _delete_key: 'payment_delete_key_input',
        _inc: 'payment_inc_input',
        _prepend: 'payment_prepend_input',
        _set: 'payment_set_input',
        pk_columns: 'payment_pk_columns_input!',
      },
      args,

      selection: selectorFn(new payment()),
    }
    return this.$_select('updatePayment', options) as any
  }

  /**
   * update single row of the table: "payment_status"
   */
  updatePaymentStatus<
    Args extends VariabledInput<{
      _set?: paymentStatus_set_input | undefined
      pk_columns: paymentStatus_pk_columns_input
    }>,
    Sel extends Selection<paymentStatus>
  >(
    args: Args,
    selectorFn: (s: paymentStatus) => [...Sel]
  ): $Field<'updatePaymentStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'paymentStatus_set_input',
        pk_columns: 'paymentStatus_pk_columns_input!',
      },
      args,

      selection: selectorFn(new paymentStatus()),
    }
    return this.$_select('updatePaymentStatus', options) as any
  }

  /**
   * update data of the table: "payment_status"
   */
  updatePaymentStatuses<
    Args extends VariabledInput<{
      _set?: paymentStatus_set_input | undefined
      where: paymentStatus_bool_exp
    }>,
    Sel extends Selection<paymentStatus_mutation_response>
  >(
    args: Args,
    selectorFn: (s: paymentStatus_mutation_response) => [...Sel]
  ): $Field<'updatePaymentStatuses', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'paymentStatus_set_input',
        where: 'paymentStatus_bool_exp!',
      },
      args,

      selection: selectorFn(new paymentStatus_mutation_response()),
    }
    return this.$_select('updatePaymentStatuses', options) as any
  }

  /**
   * update single row of the table: "payment_type"
   */
  updatePaymentType<
    Args extends VariabledInput<{
      _set?: paymentType_set_input | undefined
      pk_columns: paymentType_pk_columns_input
    }>,
    Sel extends Selection<paymentType>
  >(
    args: Args,
    selectorFn: (s: paymentType) => [...Sel]
  ): $Field<'updatePaymentType', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'paymentType_set_input',
        pk_columns: 'paymentType_pk_columns_input!',
      },
      args,

      selection: selectorFn(new paymentType()),
    }
    return this.$_select('updatePaymentType', options) as any
  }

  /**
   * update data of the table: "payment_type"
   */
  updatePaymentTypes<
    Args extends VariabledInput<{
      _set?: paymentType_set_input | undefined
      where: paymentType_bool_exp
    }>,
    Sel extends Selection<paymentType_mutation_response>
  >(
    args: Args,
    selectorFn: (s: paymentType_mutation_response) => [...Sel]
  ): $Field<'updatePaymentTypes', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'paymentType_set_input',
        where: 'paymentType_bool_exp!',
      },
      args,

      selection: selectorFn(new paymentType_mutation_response()),
    }
    return this.$_select('updatePaymentTypes', options) as any
  }

  /**
   * update data of the table: "payment"
   */
  updatePayments<
    Args extends VariabledInput<{
      _append?: payment_append_input | undefined
      _delete_at_path?: payment_delete_at_path_input | undefined
      _delete_elem?: payment_delete_elem_input | undefined
      _delete_key?: payment_delete_key_input | undefined
      _inc?: payment_inc_input | undefined
      _prepend?: payment_prepend_input | undefined
      _set?: payment_set_input | undefined
      where: payment_bool_exp
    }>,
    Sel extends Selection<payment_mutation_response>
  >(
    args: Args,
    selectorFn: (s: payment_mutation_response) => [...Sel]
  ): $Field<'updatePayments', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'payment_append_input',
        _delete_at_path: 'payment_delete_at_path_input',
        _delete_elem: 'payment_delete_elem_input',
        _delete_key: 'payment_delete_key_input',
        _inc: 'payment_inc_input',
        _prepend: 'payment_prepend_input',
        _set: 'payment_set_input',
        where: 'payment_bool_exp!',
      },
      args,

      selection: selectorFn(new payment_mutation_response()),
    }
    return this.$_select('updatePayments', options) as any
  }

  /**
   * update single row of the table: "subclassification"
   */
  updateSubclassification<
    Args extends VariabledInput<{
      _set?: subclassification_set_input | undefined
      pk_columns: subclassification_pk_columns_input
    }>,
    Sel extends Selection<subclassification>
  >(
    args: Args,
    selectorFn: (s: subclassification) => [...Sel]
  ): $Field<'updateSubclassification', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'subclassification_set_input',
        pk_columns: 'subclassification_pk_columns_input!',
      },
      args,

      selection: selectorFn(new subclassification()),
    }
    return this.$_select('updateSubclassification', options) as any
  }

  /**
   * update data of the table: "subclassification"
   */
  updateSubclassifications<
    Args extends VariabledInput<{
      _set?: subclassification_set_input | undefined
      where: subclassification_bool_exp
    }>,
    Sel extends Selection<subclassification_mutation_response>
  >(
    args: Args,
    selectorFn: (s: subclassification_mutation_response) => [...Sel]
  ): $Field<'updateSubclassifications', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'subclassification_set_input',
        where: 'subclassification_bool_exp!',
      },
      args,

      selection: selectorFn(new subclassification_mutation_response()),
    }
    return this.$_select('updateSubclassifications', options) as any
  }

  /**
   * update single row of the table: "tag"
   */
  updateTag<
    Args extends VariabledInput<{
      _append?: tag_append_input | undefined
      _delete_at_path?: tag_delete_at_path_input | undefined
      _delete_elem?: tag_delete_elem_input | undefined
      _delete_key?: tag_delete_key_input | undefined
      _prepend?: tag_prepend_input | undefined
      _set?: tag_set_input | undefined
      pk_columns: tag_pk_columns_input
    }>,
    Sel extends Selection<tag>
  >(
    args: Args,
    selectorFn: (s: tag) => [...Sel]
  ): $Field<'updateTag', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'tag_append_input',
        _delete_at_path: 'tag_delete_at_path_input',
        _delete_elem: 'tag_delete_elem_input',
        _delete_key: 'tag_delete_key_input',
        _prepend: 'tag_prepend_input',
        _set: 'tag_set_input',
        pk_columns: 'tag_pk_columns_input!',
      },
      args,

      selection: selectorFn(new tag()),
    }
    return this.$_select('updateTag', options) as any
  }

  /**
   * update data of the table: "tag"
   */
  updateTags<
    Args extends VariabledInput<{
      _append?: tag_append_input | undefined
      _delete_at_path?: tag_delete_at_path_input | undefined
      _delete_elem?: tag_delete_elem_input | undefined
      _delete_key?: tag_delete_key_input | undefined
      _prepend?: tag_prepend_input | undefined
      _set?: tag_set_input | undefined
      where: tag_bool_exp
    }>,
    Sel extends Selection<tag_mutation_response>
  >(
    args: Args,
    selectorFn: (s: tag_mutation_response) => [...Sel]
  ): $Field<'updateTags', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'tag_append_input',
        _delete_at_path: 'tag_delete_at_path_input',
        _delete_elem: 'tag_delete_elem_input',
        _delete_key: 'tag_delete_key_input',
        _prepend: 'tag_prepend_input',
        _set: 'tag_set_input',
        where: 'tag_bool_exp!',
      },
      args,

      selection: selectorFn(new tag_mutation_response()),
    }
    return this.$_select('updateTags', options) as any
  }

  /**
   * update single row of the table: "team"
   */
  updateTeam<
    Args extends VariabledInput<{
      _inc?: team_inc_input | undefined
      _set?: team_set_input | undefined
      pk_columns: team_pk_columns_input
    }>,
    Sel extends Selection<team>
  >(
    args: Args,
    selectorFn: (s: team) => [...Sel]
  ): $Field<'updateTeam', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _inc: 'team_inc_input',
        _set: 'team_set_input',
        pk_columns: 'team_pk_columns_input!',
      },
      args,

      selection: selectorFn(new team()),
    }
    return this.$_select('updateTeam', options) as any
  }

  /**
   * update single row of the table: "team_user"
   */
  updateTeamUser<
    Args extends VariabledInput<{
      _set?: teamUser_set_input | undefined
      pk_columns: teamUser_pk_columns_input
    }>,
    Sel extends Selection<teamUser>
  >(
    args: Args,
    selectorFn: (s: teamUser) => [...Sel]
  ): $Field<'updateTeamUser', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'teamUser_set_input',
        pk_columns: 'teamUser_pk_columns_input!',
      },
      args,

      selection: selectorFn(new teamUser()),
    }
    return this.$_select('updateTeamUser', options) as any
  }

  /**
   * update data of the table: "team_user"
   */
  updateTeamUsers<
    Args extends VariabledInput<{
      _set?: teamUser_set_input | undefined
      where: teamUser_bool_exp
    }>,
    Sel extends Selection<teamUser_mutation_response>
  >(
    args: Args,
    selectorFn: (s: teamUser_mutation_response) => [...Sel]
  ): $Field<'updateTeamUsers', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'teamUser_set_input',
        where: 'teamUser_bool_exp!',
      },
      args,

      selection: selectorFn(new teamUser_mutation_response()),
    }
    return this.$_select('updateTeamUsers', options) as any
  }

  /**
   * update data of the table: "team"
   */
  updateTeams<
    Args extends VariabledInput<{
      _inc?: team_inc_input | undefined
      _set?: team_set_input | undefined
      where: team_bool_exp
    }>,
    Sel extends Selection<team_mutation_response>
  >(
    args: Args,
    selectorFn: (s: team_mutation_response) => [...Sel]
  ): $Field<'updateTeams', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _inc: 'team_inc_input',
        _set: 'team_set_input',
        where: 'team_bool_exp!',
      },
      args,

      selection: selectorFn(new team_mutation_response()),
    }
    return this.$_select('updateTeams', options) as any
  }

  /**
   * update single row of the table: "unit"
   */
  updateUnit<
    Args extends VariabledInput<{
      _append?: unit_append_input | undefined
      _delete_at_path?: unit_delete_at_path_input | undefined
      _delete_elem?: unit_delete_elem_input | undefined
      _delete_key?: unit_delete_key_input | undefined
      _prepend?: unit_prepend_input | undefined
      _set?: unit_set_input | undefined
      pk_columns: unit_pk_columns_input
    }>,
    Sel extends Selection<unit>
  >(
    args: Args,
    selectorFn: (s: unit) => [...Sel]
  ): $Field<'updateUnit', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'unit_append_input',
        _delete_at_path: 'unit_delete_at_path_input',
        _delete_elem: 'unit_delete_elem_input',
        _delete_key: 'unit_delete_key_input',
        _prepend: 'unit_prepend_input',
        _set: 'unit_set_input',
        pk_columns: 'unit_pk_columns_input!',
      },
      args,

      selection: selectorFn(new unit()),
    }
    return this.$_select('updateUnit', options) as any
  }

  /**
   * update data of the table: "unit"
   */
  updateUnits<
    Args extends VariabledInput<{
      _append?: unit_append_input | undefined
      _delete_at_path?: unit_delete_at_path_input | undefined
      _delete_elem?: unit_delete_elem_input | undefined
      _delete_key?: unit_delete_key_input | undefined
      _prepend?: unit_prepend_input | undefined
      _set?: unit_set_input | undefined
      where: unit_bool_exp
    }>,
    Sel extends Selection<unit_mutation_response>
  >(
    args: Args,
    selectorFn: (s: unit_mutation_response) => [...Sel]
  ): $Field<'updateUnits', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'unit_append_input',
        _delete_at_path: 'unit_delete_at_path_input',
        _delete_elem: 'unit_delete_elem_input',
        _delete_key: 'unit_delete_key_input',
        _prepend: 'unit_prepend_input',
        _set: 'unit_set_input',
        where: 'unit_bool_exp!',
      },
      args,

      selection: selectorFn(new unit_mutation_response()),
    }
    return this.$_select('updateUnits', options) as any
  }

  /**
   * update single row of the table: "user"
   */
  updateUser<
    Args extends VariabledInput<{
      _set?: user_set_input | undefined
      pk_columns: user_pk_columns_input
    }>,
    Sel extends Selection<user>
  >(
    args: Args,
    selectorFn: (s: user) => [...Sel]
  ): $Field<'updateUser', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'user_set_input',
        pk_columns: 'user_pk_columns_input!',
      },
      args,

      selection: selectorFn(new user()),
    }
    return this.$_select('updateUser', options) as any
  }

  /**
   * update single row of the table: "user_status"
   */
  updateUserStatus<
    Args extends VariabledInput<{
      _set?: userStatus_set_input | undefined
      pk_columns: userStatus_pk_columns_input
    }>,
    Sel extends Selection<userStatus>
  >(
    args: Args,
    selectorFn: (s: userStatus) => [...Sel]
  ): $Field<'updateUserStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'userStatus_set_input',
        pk_columns: 'userStatus_pk_columns_input!',
      },
      args,

      selection: selectorFn(new userStatus()),
    }
    return this.$_select('updateUserStatus', options) as any
  }

  /**
   * update data of the table: "user_status"
   */
  updateUserStatuses<
    Args extends VariabledInput<{
      _set?: userStatus_set_input | undefined
      where: userStatus_bool_exp
    }>,
    Sel extends Selection<userStatus_mutation_response>
  >(
    args: Args,
    selectorFn: (s: userStatus_mutation_response) => [...Sel]
  ): $Field<'updateUserStatuses', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'userStatus_set_input',
        where: 'userStatus_bool_exp!',
      },
      args,

      selection: selectorFn(new userStatus_mutation_response()),
    }
    return this.$_select('updateUserStatuses', options) as any
  }

  /**
   * update data of the table: "user"
   */
  updateUsers<
    Args extends VariabledInput<{
      _set?: user_set_input | undefined
      where: user_bool_exp
    }>,
    Sel extends Selection<user_mutation_response>
  >(
    args: Args,
    selectorFn: (s: user_mutation_response) => [...Sel]
  ): $Field<'updateUsers', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'user_set_input',
        where: 'user_bool_exp!',
      },
      args,

      selection: selectorFn(new user_mutation_response()),
    }
    return this.$_select('updateUsers', options) as any
  }

  /**
   * update single row of the table: "webhook"
   */
  updateWebhook<
    Args extends VariabledInput<{
      _append?: webhook_append_input | undefined
      _delete_at_path?: webhook_delete_at_path_input | undefined
      _delete_elem?: webhook_delete_elem_input | undefined
      _delete_key?: webhook_delete_key_input | undefined
      _prepend?: webhook_prepend_input | undefined
      _set?: webhook_set_input | undefined
      pk_columns: webhook_pk_columns_input
    }>,
    Sel extends Selection<webhook>
  >(
    args: Args,
    selectorFn: (s: webhook) => [...Sel]
  ): $Field<'updateWebhook', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'webhook_append_input',
        _delete_at_path: 'webhook_delete_at_path_input',
        _delete_elem: 'webhook_delete_elem_input',
        _delete_key: 'webhook_delete_key_input',
        _prepend: 'webhook_prepend_input',
        _set: 'webhook_set_input',
        pk_columns: 'webhook_pk_columns_input!',
      },
      args,

      selection: selectorFn(new webhook()),
    }
    return this.$_select('updateWebhook', options) as any
  }

  /**
   * update data of the table: "webhook"
   */
  updateWebhooks<
    Args extends VariabledInput<{
      _append?: webhook_append_input | undefined
      _delete_at_path?: webhook_delete_at_path_input | undefined
      _delete_elem?: webhook_delete_elem_input | undefined
      _delete_key?: webhook_delete_key_input | undefined
      _prepend?: webhook_prepend_input | undefined
      _set?: webhook_set_input | undefined
      where: webhook_bool_exp
    }>,
    Sel extends Selection<webhook_mutation_response>
  >(
    args: Args,
    selectorFn: (s: webhook_mutation_response) => [...Sel]
  ): $Field<'updateWebhooks', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _append: 'webhook_append_input',
        _delete_at_path: 'webhook_delete_at_path_input',
        _delete_elem: 'webhook_delete_elem_input',
        _delete_key: 'webhook_delete_key_input',
        _prepend: 'webhook_prepend_input',
        _set: 'webhook_set_input',
        where: 'webhook_bool_exp!',
      },
      args,

      selection: selectorFn(new webhook_mutation_response()),
    }
    return this.$_select('updateWebhooks', options) as any
  }

  /**
   * update data of the table: "booking_channel"
   */
  update_booking_channel<
    Args extends VariabledInput<{
      _set?: booking_channel_set_input | undefined
      where: booking_channel_bool_exp
    }>,
    Sel extends Selection<booking_channel_mutation_response>
  >(
    args: Args,
    selectorFn: (s: booking_channel_mutation_response) => [...Sel]
  ): $Field<'update_booking_channel', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'booking_channel_set_input',
        where: 'booking_channel_bool_exp!',
      },
      args,

      selection: selectorFn(new booking_channel_mutation_response()),
    }
    return this.$_select('update_booking_channel', options) as any
  }

  /**
   * update single row of the table: "booking_channel"
   */
  update_booking_channel_by_pk<
    Args extends VariabledInput<{
      _set?: booking_channel_set_input | undefined
      pk_columns: booking_channel_pk_columns_input
    }>,
    Sel extends Selection<booking_channel>
  >(
    args: Args,
    selectorFn: (s: booking_channel) => [...Sel]
  ): $Field<'update_booking_channel_by_pk', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        _set: 'booking_channel_set_input',
        pk_columns: 'booking_channel_pk_columns_input!',
      },
      args,

      selection: selectorFn(new booking_channel()),
    }
    return this.$_select('update_booking_channel_by_pk', options) as any
  }
}

export enum normalized_type_enum {
  booking = 'booking',

  line = 'line',

  metric = 'metric',

  payment = 'payment',

  tag = 'tag',

  unit = 'unit',
}

/**
 * Boolean expression to compare columns of type "normalized_type_enum". All fields are combined with logical 'AND'.
 */
export type normalized_type_enum_comparison_exp = {
  _eq?: normalized_type_enum | undefined
  _in?: Array<normalized_type_enum> | undefined
  _is_null?: boolean | undefined
  _neq?: normalized_type_enum | undefined
  _nin?: Array<normalized_type_enum> | undefined
}

/**
 * columns and relationships of "normalized_type"
 */
export class normalizedType extends $Base<'normalizedType'> {
  constructor() {
    super('normalizedType')
  }

  get name(): $Field<'name', string> {
    return this.$_select('name') as any
  }
}

/**
 * aggregated selection of "normalized_type"
 */
export class normalizedType_aggregate extends $Base<'normalizedType_aggregate'> {
  constructor() {
    super('normalizedType_aggregate')
  }

  aggregate<Sel extends Selection<normalizedType_aggregate_fields>>(
    selectorFn: (s: normalizedType_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new normalizedType_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<normalizedType>>(
    selectorFn: (s: normalizedType) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new normalizedType()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "normalized_type"
 */
export class normalizedType_aggregate_fields extends $Base<'normalizedType_aggregate_fields'> {
  constructor() {
    super('normalizedType_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<normalizedType_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[normalizedType_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<normalizedType_max_fields>>(
    selectorFn: (s: normalizedType_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new normalizedType_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<normalizedType_min_fields>>(
    selectorFn: (s: normalizedType_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new normalizedType_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * Boolean expression to filter rows from the table "normalized_type". All fields are combined with a logical 'AND'.
 */
export type normalizedType_bool_exp = {
  _and?: Array<normalizedType_bool_exp> | undefined
  _not?: normalizedType_bool_exp | undefined
  _or?: Array<normalizedType_bool_exp> | undefined
  name?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "normalized_type"
 */
export enum normalizedType_constraint {
  /**
   * unique or primary key constraint
   */
  normalized_type_pkey = 'normalized_type_pkey',
}

/**
 * input type for inserting data into table "normalized_type"
 */
export type normalizedType_insert_input = {
  name?: string | undefined
}

/**
 * aggregate max on columns
 */
export class normalizedType_max_fields extends $Base<'normalizedType_max_fields'> {
  constructor() {
    super('normalizedType_max_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * aggregate min on columns
 */
export class normalizedType_min_fields extends $Base<'normalizedType_min_fields'> {
  constructor() {
    super('normalizedType_min_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * response of any mutation on the table "normalized_type"
 */
export class normalizedType_mutation_response extends $Base<'normalizedType_mutation_response'> {
  constructor() {
    super('normalizedType_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<normalizedType>>(
    selectorFn: (s: normalizedType) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new normalizedType()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "normalized_type"
 */
export type normalizedType_on_conflict = {
  constraint: normalizedType_constraint
  update_columns: Array<normalizedType_update_column>
  where?: normalizedType_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "normalized_type".
 */
export type normalizedType_order_by = {
  name?: order_by | undefined
}

/**
 * primary key columns input for table: normalizedType
 */
export type normalizedType_pk_columns_input = {
  name: string
}

/**
 * select columns of table "normalized_type"
 */
export enum normalizedType_select_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * input type for updating data in table "normalized_type"
 */
export type normalizedType_set_input = {
  name?: string | undefined
}

/**
 * update columns of table "normalized_type"
 */
export enum normalizedType_update_column {
  /**
   * column name
   */
  name = 'name',
}

export type numeric = unknown

/**
 * Boolean expression to compare columns of type "numeric". All fields are combined with logical 'AND'.
 */
export type numeric_comparison_exp = {
  _eq?: string | undefined
  _gt?: string | undefined
  _gte?: string | undefined
  _in?: Array<string> | undefined
  _is_null?: boolean | undefined
  _lt?: string | undefined
  _lte?: string | undefined
  _neq?: string | undefined
  _nin?: Array<string> | undefined
}

/**
 * column ordering options
 */
export enum order_by {
  /**
   * in ascending order, nulls last
   */
  asc = 'asc',

  /**
   * in ascending order, nulls first
   */
  asc_nulls_first = 'asc_nulls_first',

  /**
   * in ascending order, nulls last
   */
  asc_nulls_last = 'asc_nulls_last',

  /**
   * in descending order, nulls first
   */
  desc = 'desc',

  /**
   * in descending order, nulls first
   */
  desc_nulls_first = 'desc_nulls_first',

  /**
   * in descending order, nulls last
   */
  desc_nulls_last = 'desc_nulls_last',
}

/**
 * columns and relationships of "payment"
 */
export class payment extends $Base<'payment'> {
  constructor() {
    super('payment')
  }

  get arrivesAt(): $Field<'arrivesAt', string | undefined> {
    return this.$_select('arrivesAt') as any
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }

  /**
   * An object relationship
   */
  connection<Sel extends Selection<connection>>(
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'connection', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new connection()),
    }
    return this.$_select('connection', options) as any
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get currency(): $Field<'currency', currency_enum | undefined> {
    return this.$_select('currency') as any
  }

  get description(): $Field<'description', string | undefined> {
    return this.$_select('description') as any
  }

  /**
   * An object relationship
   */
  entity<Sel extends Selection<entity>>(
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'entity', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new entity()),
    }
    return this.$_select('entity', options) as any
  }

  get entityId(): $Field<'entityId', string | undefined> {
    return this.$_select('entityId') as any
  }

  get id(): $Field<'id', string> {
    return this.$_select('id') as any
  }

  /**
   * An array relationship
   */
  lines<
    Args extends VariabledInput<{
      distinct_on?: Array<line_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<line_order_by> | undefined
      where?: line_bool_exp | undefined
    }>,
    Sel extends Selection<line>
  >(
    args: Args,
    selectorFn: (s: line) => [...Sel]
  ): $Field<'lines', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[line_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[line_order_by!]',
        where: 'line_bool_exp',
      },
      args,

      selection: selectorFn(new line()),
    }
    return this.$_select('lines', options) as any
  }

  /**
   * An aggregate relationship
   */
  lines_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<line_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<line_order_by> | undefined
      where?: line_bool_exp | undefined
    }>,
    Sel extends Selection<line_aggregate>
  >(
    args: Args,
    selectorFn: (s: line_aggregate) => [...Sel]
  ): $Field<'lines_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[line_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[line_order_by!]',
        where: 'line_bool_exp',
      },
      args,

      selection: selectorFn(new line_aggregate()),
    }
    return this.$_select('lines_aggregate', options) as any
  }

  metadata<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'metadata', string | undefined, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('metadata', options) as any
  }

  get paidAt(): $Field<'paidAt', string | undefined> {
    return this.$_select('paidAt') as any
  }

  get status(): $Field<'status', payment_status_enum | undefined> {
    return this.$_select('status') as any
  }

  /**
   * An array relationship
   */
  tags<
    Args extends VariabledInput<{
      distinct_on?: Array<tag_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<tag_order_by> | undefined
      where?: tag_bool_exp | undefined
    }>,
    Sel extends Selection<tag>
  >(
    args: Args,
    selectorFn: (s: tag) => [...Sel]
  ): $Field<'tags', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[tag_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[tag_order_by!]',
        where: 'tag_bool_exp',
      },
      args,

      selection: selectorFn(new tag()),
    }
    return this.$_select('tags', options) as any
  }

  /**
   * An aggregate relationship
   */
  tags_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<tag_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<tag_order_by> | undefined
      where?: tag_bool_exp | undefined
    }>,
    Sel extends Selection<tag_aggregate>
  >(
    args: Args,
    selectorFn: (s: tag_aggregate) => [...Sel]
  ): $Field<'tags_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[tag_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[tag_order_by!]',
        where: 'tag_bool_exp',
      },
      args,

      selection: selectorFn(new tag_aggregate()),
    }
    return this.$_select('tags_aggregate', options) as any
  }

  /**
   * An object relationship
   */
  team<Sel extends Selection<team>>(
    selectorFn: (s: team) => [...Sel]
  ): $Field<'team', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team()),
    }
    return this.$_select('team', options) as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get type(): $Field<'type', string | undefined> {
    return this.$_select('type') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * aggregated selection of "payment"
 */
export class payment_aggregate extends $Base<'payment_aggregate'> {
  constructor() {
    super('payment_aggregate')
  }

  aggregate<Sel extends Selection<payment_aggregate_fields>>(
    selectorFn: (s: payment_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new payment_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<payment>>(
    selectorFn: (s: payment) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new payment()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "payment"
 */
export class payment_aggregate_fields extends $Base<'payment_aggregate_fields'> {
  constructor() {
    super('payment_aggregate_fields')
  }

  avg<Sel extends Selection<payment_avg_fields>>(
    selectorFn: (s: payment_avg_fields) => [...Sel]
  ): $Field<'avg', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new payment_avg_fields()),
    }
    return this.$_select('avg', options) as any
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<payment_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[payment_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<payment_max_fields>>(
    selectorFn: (s: payment_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new payment_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<payment_min_fields>>(
    selectorFn: (s: payment_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new payment_min_fields()),
    }
    return this.$_select('min', options) as any
  }

  stddev<Sel extends Selection<payment_stddev_fields>>(
    selectorFn: (s: payment_stddev_fields) => [...Sel]
  ): $Field<'stddev', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new payment_stddev_fields()),
    }
    return this.$_select('stddev', options) as any
  }

  stddev_pop<Sel extends Selection<payment_stddev_pop_fields>>(
    selectorFn: (s: payment_stddev_pop_fields) => [...Sel]
  ): $Field<'stddev_pop', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new payment_stddev_pop_fields()),
    }
    return this.$_select('stddev_pop', options) as any
  }

  stddev_samp<Sel extends Selection<payment_stddev_samp_fields>>(
    selectorFn: (s: payment_stddev_samp_fields) => [...Sel]
  ): $Field<'stddev_samp', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new payment_stddev_samp_fields()),
    }
    return this.$_select('stddev_samp', options) as any
  }

  sum<Sel extends Selection<payment_sum_fields>>(
    selectorFn: (s: payment_sum_fields) => [...Sel]
  ): $Field<'sum', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new payment_sum_fields()),
    }
    return this.$_select('sum', options) as any
  }

  var_pop<Sel extends Selection<payment_var_pop_fields>>(
    selectorFn: (s: payment_var_pop_fields) => [...Sel]
  ): $Field<'var_pop', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new payment_var_pop_fields()),
    }
    return this.$_select('var_pop', options) as any
  }

  var_samp<Sel extends Selection<payment_var_samp_fields>>(
    selectorFn: (s: payment_var_samp_fields) => [...Sel]
  ): $Field<'var_samp', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new payment_var_samp_fields()),
    }
    return this.$_select('var_samp', options) as any
  }

  variance<Sel extends Selection<payment_variance_fields>>(
    selectorFn: (s: payment_variance_fields) => [...Sel]
  ): $Field<'variance', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new payment_variance_fields()),
    }
    return this.$_select('variance', options) as any
  }
}

/**
 * order by aggregate values of table "payment"
 */
export type payment_aggregate_order_by = {
  avg?: payment_avg_order_by | undefined
  count?: order_by | undefined
  max?: payment_max_order_by | undefined
  min?: payment_min_order_by | undefined
  stddev?: payment_stddev_order_by | undefined
  stddev_pop?: payment_stddev_pop_order_by | undefined
  stddev_samp?: payment_stddev_samp_order_by | undefined
  sum?: payment_sum_order_by | undefined
  var_pop?: payment_var_pop_order_by | undefined
  var_samp?: payment_var_samp_order_by | undefined
  variance?: payment_variance_order_by | undefined
}

/**
 * append existing jsonb value of filtered columns with new jsonb value
 */
export type payment_append_input = {
  metadata?: string | undefined
}

/**
 * input type for inserting array relation for remote table "payment"
 */
export type payment_arr_rel_insert_input = {
  data: Array<payment_insert_input>
  on_conflict?: payment_on_conflict | undefined
}

/**
 * aggregate avg on columns
 */
export class payment_avg_fields extends $Base<'payment_avg_fields'> {
  constructor() {
    super('payment_avg_fields')
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }
}

/**
 * order by avg() on columns of table "payment"
 */
export type payment_avg_order_by = {
  centTotal?: order_by | undefined
}

/**
 * Boolean expression to filter rows from the table "payment". All fields are combined with a logical 'AND'.
 */
export type payment_bool_exp = {
  _and?: Array<payment_bool_exp> | undefined
  _not?: payment_bool_exp | undefined
  _or?: Array<payment_bool_exp> | undefined
  arrivesAt?: timestamptz_comparison_exp | undefined
  centTotal?: Int_comparison_exp | undefined
  connection?: connection_bool_exp | undefined
  connectionId?: uuid_comparison_exp | undefined
  createdAt?: timestamptz_comparison_exp | undefined
  currency?: currency_enum_comparison_exp | undefined
  description?: String_comparison_exp | undefined
  entity?: entity_bool_exp | undefined
  entityId?: uuid_comparison_exp | undefined
  id?: uuid_comparison_exp | undefined
  lines?: line_bool_exp | undefined
  metadata?: jsonb_comparison_exp | undefined
  paidAt?: timestamptz_comparison_exp | undefined
  status?: payment_status_enum_comparison_exp | undefined
  tags?: tag_bool_exp | undefined
  team?: team_bool_exp | undefined
  teamId?: uuid_comparison_exp | undefined
  type?: String_comparison_exp | undefined
  uniqueRef?: String_comparison_exp | undefined
  updatedAt?: timestamptz_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "payment"
 */
export enum payment_constraint {
  /**
   * unique or primary key constraint
   */
  payment_pkey = 'payment_pkey',
}

/**
 * delete the field or element with specified path (for JSON arrays, negative integers count from the end)
 */
export type payment_delete_at_path_input = {
  metadata?: Array<string> | undefined
}

/**
 * delete the array element with specified index (negative integers count from the
end). throws an error if top level container is not an array
 */
export type payment_delete_elem_input = {
  metadata?: number | undefined
}

/**
 * delete key/value pair or string element. key/value pairs are matched based on their key value
 */
export type payment_delete_key_input = {
  metadata?: string | undefined
}

/**
 * input type for incrementing numeric columns in table "payment"
 */
export type payment_inc_input = {
  centTotal?: number | undefined
}

/**
 * input type for inserting data into table "payment"
 */
export type payment_insert_input = {
  arrivesAt?: string | undefined
  centTotal?: number | undefined
  connection?: connection_obj_rel_insert_input | undefined
  connectionId?: string | undefined
  createdAt?: string | undefined
  currency?: currency_enum | undefined
  description?: string | undefined
  entity?: entity_obj_rel_insert_input | undefined
  entityId?: string | undefined
  id?: string | undefined
  lines?: line_arr_rel_insert_input | undefined
  metadata?: string | undefined
  paidAt?: string | undefined
  status?: payment_status_enum | undefined
  tags?: tag_arr_rel_insert_input | undefined
  team?: team_obj_rel_insert_input | undefined
  teamId?: string | undefined
  type?: string | undefined
  uniqueRef?: string | undefined
  updatedAt?: string | undefined
}

/**
 * aggregate max on columns
 */
export class payment_max_fields extends $Base<'payment_max_fields'> {
  constructor() {
    super('payment_max_fields')
  }

  get arrivesAt(): $Field<'arrivesAt', string | undefined> {
    return this.$_select('arrivesAt') as any
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get description(): $Field<'description', string | undefined> {
    return this.$_select('description') as any
  }

  get entityId(): $Field<'entityId', string | undefined> {
    return this.$_select('entityId') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get paidAt(): $Field<'paidAt', string | undefined> {
    return this.$_select('paidAt') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get type(): $Field<'type', string | undefined> {
    return this.$_select('type') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * order by max() on columns of table "payment"
 */
export type payment_max_order_by = {
  arrivesAt?: order_by | undefined
  centTotal?: order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  description?: order_by | undefined
  entityId?: order_by | undefined
  id?: order_by | undefined
  paidAt?: order_by | undefined
  teamId?: order_by | undefined
  type?: order_by | undefined
  uniqueRef?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * aggregate min on columns
 */
export class payment_min_fields extends $Base<'payment_min_fields'> {
  constructor() {
    super('payment_min_fields')
  }

  get arrivesAt(): $Field<'arrivesAt', string | undefined> {
    return this.$_select('arrivesAt') as any
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get description(): $Field<'description', string | undefined> {
    return this.$_select('description') as any
  }

  get entityId(): $Field<'entityId', string | undefined> {
    return this.$_select('entityId') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get paidAt(): $Field<'paidAt', string | undefined> {
    return this.$_select('paidAt') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get type(): $Field<'type', string | undefined> {
    return this.$_select('type') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * order by min() on columns of table "payment"
 */
export type payment_min_order_by = {
  arrivesAt?: order_by | undefined
  centTotal?: order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  description?: order_by | undefined
  entityId?: order_by | undefined
  id?: order_by | undefined
  paidAt?: order_by | undefined
  teamId?: order_by | undefined
  type?: order_by | undefined
  uniqueRef?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * response of any mutation on the table "payment"
 */
export class payment_mutation_response extends $Base<'payment_mutation_response'> {
  constructor() {
    super('payment_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<payment>>(
    selectorFn: (s: payment) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new payment()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * input type for inserting object relation for remote table "payment"
 */
export type payment_obj_rel_insert_input = {
  data: payment_insert_input
  on_conflict?: payment_on_conflict | undefined
}

/**
 * on conflict condition type for table "payment"
 */
export type payment_on_conflict = {
  constraint: payment_constraint
  update_columns: Array<payment_update_column>
  where?: payment_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "payment".
 */
export type payment_order_by = {
  arrivesAt?: order_by | undefined
  centTotal?: order_by | undefined
  connection?: connection_order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  currency?: order_by | undefined
  description?: order_by | undefined
  entity?: entity_order_by | undefined
  entityId?: order_by | undefined
  id?: order_by | undefined
  lines_aggregate?: line_aggregate_order_by | undefined
  metadata?: order_by | undefined
  paidAt?: order_by | undefined
  status?: order_by | undefined
  tags_aggregate?: tag_aggregate_order_by | undefined
  team?: team_order_by | undefined
  teamId?: order_by | undefined
  type?: order_by | undefined
  uniqueRef?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * primary key columns input for table: payment
 */
export type payment_pk_columns_input = {
  id: string
}

/**
 * prepend existing jsonb value of filtered columns with new jsonb value
 */
export type payment_prepend_input = {
  metadata?: string | undefined
}

/**
 * select columns of table "payment"
 */
export enum payment_select_column {
  /**
   * column name
   */
  arrivesAt = 'arrivesAt',

  /**
   * column name
   */
  centTotal = 'centTotal',

  /**
   * column name
   */
  connectionId = 'connectionId',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  currency = 'currency',

  /**
   * column name
   */
  description = 'description',

  /**
   * column name
   */
  entityId = 'entityId',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  metadata = 'metadata',

  /**
   * column name
   */
  paidAt = 'paidAt',

  /**
   * column name
   */
  status = 'status',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  type = 'type',

  /**
   * column name
   */
  uniqueRef = 'uniqueRef',

  /**
   * column name
   */
  updatedAt = 'updatedAt',
}

/**
 * input type for updating data in table "payment"
 */
export type payment_set_input = {
  arrivesAt?: string | undefined
  centTotal?: number | undefined
  connectionId?: string | undefined
  createdAt?: string | undefined
  currency?: currency_enum | undefined
  description?: string | undefined
  entityId?: string | undefined
  id?: string | undefined
  metadata?: string | undefined
  paidAt?: string | undefined
  status?: payment_status_enum | undefined
  teamId?: string | undefined
  type?: string | undefined
  uniqueRef?: string | undefined
  updatedAt?: string | undefined
}

export enum payment_status_enum {
  arrived = 'arrived',

  cancelled = 'cancelled',

  pending = 'pending',
}

/**
 * Boolean expression to compare columns of type "payment_status_enum". All fields are combined with logical 'AND'.
 */
export type payment_status_enum_comparison_exp = {
  _eq?: payment_status_enum | undefined
  _in?: Array<payment_status_enum> | undefined
  _is_null?: boolean | undefined
  _neq?: payment_status_enum | undefined
  _nin?: Array<payment_status_enum> | undefined
}

/**
 * aggregate stddev on columns
 */
export class payment_stddev_fields extends $Base<'payment_stddev_fields'> {
  constructor() {
    super('payment_stddev_fields')
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }
}

/**
 * order by stddev() on columns of table "payment"
 */
export type payment_stddev_order_by = {
  centTotal?: order_by | undefined
}

/**
 * aggregate stddev_pop on columns
 */
export class payment_stddev_pop_fields extends $Base<'payment_stddev_pop_fields'> {
  constructor() {
    super('payment_stddev_pop_fields')
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }
}

/**
 * order by stddev_pop() on columns of table "payment"
 */
export type payment_stddev_pop_order_by = {
  centTotal?: order_by | undefined
}

/**
 * aggregate stddev_samp on columns
 */
export class payment_stddev_samp_fields extends $Base<'payment_stddev_samp_fields'> {
  constructor() {
    super('payment_stddev_samp_fields')
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }
}

/**
 * order by stddev_samp() on columns of table "payment"
 */
export type payment_stddev_samp_order_by = {
  centTotal?: order_by | undefined
}

/**
 * aggregate sum on columns
 */
export class payment_sum_fields extends $Base<'payment_sum_fields'> {
  constructor() {
    super('payment_sum_fields')
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }
}

/**
 * order by sum() on columns of table "payment"
 */
export type payment_sum_order_by = {
  centTotal?: order_by | undefined
}

/**
 * update columns of table "payment"
 */
export enum payment_update_column {
  /**
   * column name
   */
  arrivesAt = 'arrivesAt',

  /**
   * column name
   */
  centTotal = 'centTotal',

  /**
   * column name
   */
  connectionId = 'connectionId',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  currency = 'currency',

  /**
   * column name
   */
  description = 'description',

  /**
   * column name
   */
  entityId = 'entityId',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  metadata = 'metadata',

  /**
   * column name
   */
  paidAt = 'paidAt',

  /**
   * column name
   */
  status = 'status',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  type = 'type',

  /**
   * column name
   */
  uniqueRef = 'uniqueRef',

  /**
   * column name
   */
  updatedAt = 'updatedAt',
}

/**
 * aggregate var_pop on columns
 */
export class payment_var_pop_fields extends $Base<'payment_var_pop_fields'> {
  constructor() {
    super('payment_var_pop_fields')
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }
}

/**
 * order by var_pop() on columns of table "payment"
 */
export type payment_var_pop_order_by = {
  centTotal?: order_by | undefined
}

/**
 * aggregate var_samp on columns
 */
export class payment_var_samp_fields extends $Base<'payment_var_samp_fields'> {
  constructor() {
    super('payment_var_samp_fields')
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }
}

/**
 * order by var_samp() on columns of table "payment"
 */
export type payment_var_samp_order_by = {
  centTotal?: order_by | undefined
}

/**
 * aggregate variance on columns
 */
export class payment_variance_fields extends $Base<'payment_variance_fields'> {
  constructor() {
    super('payment_variance_fields')
  }

  get centTotal(): $Field<'centTotal', number | undefined> {
    return this.$_select('centTotal') as any
  }
}

/**
 * order by variance() on columns of table "payment"
 */
export type payment_variance_order_by = {
  centTotal?: order_by | undefined
}

/**
 * columns and relationships of "payment_status"
 */
export class paymentStatus extends $Base<'paymentStatus'> {
  constructor() {
    super('paymentStatus')
  }

  get name(): $Field<'name', string> {
    return this.$_select('name') as any
  }
}

/**
 * aggregated selection of "payment_status"
 */
export class paymentStatus_aggregate extends $Base<'paymentStatus_aggregate'> {
  constructor() {
    super('paymentStatus_aggregate')
  }

  aggregate<Sel extends Selection<paymentStatus_aggregate_fields>>(
    selectorFn: (s: paymentStatus_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new paymentStatus_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<paymentStatus>>(
    selectorFn: (s: paymentStatus) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new paymentStatus()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "payment_status"
 */
export class paymentStatus_aggregate_fields extends $Base<'paymentStatus_aggregate_fields'> {
  constructor() {
    super('paymentStatus_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<paymentStatus_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[paymentStatus_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<paymentStatus_max_fields>>(
    selectorFn: (s: paymentStatus_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new paymentStatus_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<paymentStatus_min_fields>>(
    selectorFn: (s: paymentStatus_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new paymentStatus_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * Boolean expression to filter rows from the table "payment_status". All fields are combined with a logical 'AND'.
 */
export type paymentStatus_bool_exp = {
  _and?: Array<paymentStatus_bool_exp> | undefined
  _not?: paymentStatus_bool_exp | undefined
  _or?: Array<paymentStatus_bool_exp> | undefined
  name?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "payment_status"
 */
export enum paymentStatus_constraint {
  /**
   * unique or primary key constraint
   */
  payment_status_pkey = 'payment_status_pkey',
}

/**
 * input type for inserting data into table "payment_status"
 */
export type paymentStatus_insert_input = {
  name?: string | undefined
}

/**
 * aggregate max on columns
 */
export class paymentStatus_max_fields extends $Base<'paymentStatus_max_fields'> {
  constructor() {
    super('paymentStatus_max_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * aggregate min on columns
 */
export class paymentStatus_min_fields extends $Base<'paymentStatus_min_fields'> {
  constructor() {
    super('paymentStatus_min_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * response of any mutation on the table "payment_status"
 */
export class paymentStatus_mutation_response extends $Base<'paymentStatus_mutation_response'> {
  constructor() {
    super('paymentStatus_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<paymentStatus>>(
    selectorFn: (s: paymentStatus) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new paymentStatus()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "payment_status"
 */
export type paymentStatus_on_conflict = {
  constraint: paymentStatus_constraint
  update_columns: Array<paymentStatus_update_column>
  where?: paymentStatus_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "payment_status".
 */
export type paymentStatus_order_by = {
  name?: order_by | undefined
}

/**
 * primary key columns input for table: paymentStatus
 */
export type paymentStatus_pk_columns_input = {
  name: string
}

/**
 * select columns of table "payment_status"
 */
export enum paymentStatus_select_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * input type for updating data in table "payment_status"
 */
export type paymentStatus_set_input = {
  name?: string | undefined
}

/**
 * update columns of table "payment_status"
 */
export enum paymentStatus_update_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * columns and relationships of "payment_type"
 */
export class paymentType extends $Base<'paymentType'> {
  constructor() {
    super('paymentType')
  }

  get name(): $Field<'name', string> {
    return this.$_select('name') as any
  }
}

/**
 * aggregated selection of "payment_type"
 */
export class paymentType_aggregate extends $Base<'paymentType_aggregate'> {
  constructor() {
    super('paymentType_aggregate')
  }

  aggregate<Sel extends Selection<paymentType_aggregate_fields>>(
    selectorFn: (s: paymentType_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new paymentType_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<paymentType>>(
    selectorFn: (s: paymentType) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new paymentType()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "payment_type"
 */
export class paymentType_aggregate_fields extends $Base<'paymentType_aggregate_fields'> {
  constructor() {
    super('paymentType_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<paymentType_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[paymentType_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<paymentType_max_fields>>(
    selectorFn: (s: paymentType_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new paymentType_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<paymentType_min_fields>>(
    selectorFn: (s: paymentType_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new paymentType_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * Boolean expression to filter rows from the table "payment_type". All fields are combined with a logical 'AND'.
 */
export type paymentType_bool_exp = {
  _and?: Array<paymentType_bool_exp> | undefined
  _not?: paymentType_bool_exp | undefined
  _or?: Array<paymentType_bool_exp> | undefined
  name?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "payment_type"
 */
export enum paymentType_constraint {
  /**
   * unique or primary key constraint
   */
  payment_type_pkey = 'payment_type_pkey',
}

/**
 * input type for inserting data into table "payment_type"
 */
export type paymentType_insert_input = {
  name?: string | undefined
}

/**
 * aggregate max on columns
 */
export class paymentType_max_fields extends $Base<'paymentType_max_fields'> {
  constructor() {
    super('paymentType_max_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * aggregate min on columns
 */
export class paymentType_min_fields extends $Base<'paymentType_min_fields'> {
  constructor() {
    super('paymentType_min_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * response of any mutation on the table "payment_type"
 */
export class paymentType_mutation_response extends $Base<'paymentType_mutation_response'> {
  constructor() {
    super('paymentType_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<paymentType>>(
    selectorFn: (s: paymentType) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new paymentType()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "payment_type"
 */
export type paymentType_on_conflict = {
  constraint: paymentType_constraint
  update_columns: Array<paymentType_update_column>
  where?: paymentType_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "payment_type".
 */
export type paymentType_order_by = {
  name?: order_by | undefined
}

/**
 * primary key columns input for table: paymentType
 */
export type paymentType_pk_columns_input = {
  name: string
}

/**
 * select columns of table "payment_type"
 */
export enum paymentType_select_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * input type for updating data in table "payment_type"
 */
export type paymentType_set_input = {
  name?: string | undefined
}

/**
 * update columns of table "payment_type"
 */
export enum paymentType_update_column {
  /**
   * column name
   */
  name = 'name',
}

export class query_root extends $Base<'query_root'> {
  constructor() {
    super('query_root')
  }

  /**
   * fetch aggregated fields from the table: "booking_status"
   */
  aggregateBookingStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<bookingStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<bookingStatus_order_by> | undefined
      where?: bookingStatus_bool_exp | undefined
    }>,
    Sel extends Selection<bookingStatus_aggregate>
  >(
    args: Args,
    selectorFn: (s: bookingStatus_aggregate) => [...Sel]
  ): $Field<'aggregateBookingStatuses', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[bookingStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[bookingStatus_order_by!]',
        where: 'bookingStatus_bool_exp',
      },
      args,

      selection: selectorFn(new bookingStatus_aggregate()),
    }
    return this.$_select('aggregateBookingStatuses', options) as any
  }

  /**
   * fetch aggregated fields from the table: "booking"
   */
  aggregateBookings<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_order_by> | undefined
      where?: booking_bool_exp | undefined
    }>,
    Sel extends Selection<booking_aggregate>
  >(
    args: Args,
    selectorFn: (s: booking_aggregate) => [...Sel]
  ): $Field<'aggregateBookings', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_order_by!]',
        where: 'booking_bool_exp',
      },
      args,

      selection: selectorFn(new booking_aggregate()),
    }
    return this.$_select('aggregateBookings', options) as any
  }

  /**
   * fetch aggregated fields from the table: "classification"
   */
  aggregateClassifications<
    Args extends VariabledInput<{
      distinct_on?: Array<classification_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<classification_order_by> | undefined
      where?: classification_bool_exp | undefined
    }>,
    Sel extends Selection<classification_aggregate>
  >(
    args: Args,
    selectorFn: (s: classification_aggregate) => [...Sel]
  ): $Field<'aggregateClassifications', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[classification_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[classification_order_by!]',
        where: 'classification_bool_exp',
      },
      args,

      selection: selectorFn(new classification_aggregate()),
    }
    return this.$_select('aggregateClassifications', options) as any
  }

  /**
   * fetch aggregated fields from the table: "connection"
   */
  aggregateConnections<
    Args extends VariabledInput<{
      distinct_on?: Array<connection_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<connection_order_by> | undefined
      where?: connection_bool_exp | undefined
    }>,
    Sel extends Selection<connection_aggregate>
  >(
    args: Args,
    selectorFn: (s: connection_aggregate) => [...Sel]
  ): $Field<'aggregateConnections', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[connection_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[connection_order_by!]',
        where: 'connection_bool_exp',
      },
      args,

      selection: selectorFn(new connection_aggregate()),
    }
    return this.$_select('aggregateConnections', options) as any
  }

  /**
   * fetch aggregated fields from the table: "currency"
   */
  aggregateCurrencies<
    Args extends VariabledInput<{
      distinct_on?: Array<currency_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<currency_order_by> | undefined
      where?: currency_bool_exp | undefined
    }>,
    Sel extends Selection<currency_aggregate>
  >(
    args: Args,
    selectorFn: (s: currency_aggregate) => [...Sel]
  ): $Field<'aggregateCurrencies', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[currency_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[currency_order_by!]',
        where: 'currency_bool_exp',
      },
      args,

      selection: selectorFn(new currency_aggregate()),
    }
    return this.$_select('aggregateCurrencies', options) as any
  }

  /**
   * fetch aggregated fields from the table: "entity"
   */
  aggregateEntities<
    Args extends VariabledInput<{
      distinct_on?: Array<entity_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<entity_order_by> | undefined
      where?: entity_bool_exp | undefined
    }>,
    Sel extends Selection<entity_aggregate>
  >(
    args: Args,
    selectorFn: (s: entity_aggregate) => [...Sel]
  ): $Field<'aggregateEntities', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[entity_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[entity_order_by!]',
        where: 'entity_bool_exp',
      },
      args,

      selection: selectorFn(new entity_aggregate()),
    }
    return this.$_select('aggregateEntities', options) as any
  }

  /**
   * fetch aggregated fields from the table: "entity_status"
   */
  aggregateEntityStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<entityStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<entityStatus_order_by> | undefined
      where?: entityStatus_bool_exp | undefined
    }>,
    Sel extends Selection<entityStatus_aggregate>
  >(
    args: Args,
    selectorFn: (s: entityStatus_aggregate) => [...Sel]
  ): $Field<'aggregateEntityStatuses', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[entityStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[entityStatus_order_by!]',
        where: 'entityStatus_bool_exp',
      },
      args,

      selection: selectorFn(new entityStatus_aggregate()),
    }
    return this.$_select('aggregateEntityStatuses', options) as any
  }

  /**
   * fetch aggregated fields from the table: "integration_type"
   */
  aggregateIntegrationTypes<
    Args extends VariabledInput<{
      distinct_on?: Array<integrationType_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<integrationType_order_by> | undefined
      where?: integrationType_bool_exp | undefined
    }>,
    Sel extends Selection<integrationType_aggregate>
  >(
    args: Args,
    selectorFn: (s: integrationType_aggregate) => [...Sel]
  ): $Field<'aggregateIntegrationTypes', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[integrationType_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[integrationType_order_by!]',
        where: 'integrationType_bool_exp',
      },
      args,

      selection: selectorFn(new integrationType_aggregate()),
    }
    return this.$_select('aggregateIntegrationTypes', options) as any
  }

  /**
   * fetch aggregated fields from the table: "integration"
   */
  aggregateIntegrations<
    Args extends VariabledInput<{
      distinct_on?: Array<integration_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<integration_order_by> | undefined
      where?: integration_bool_exp | undefined
    }>,
    Sel extends Selection<integration_aggregate>
  >(
    args: Args,
    selectorFn: (s: integration_aggregate) => [...Sel]
  ): $Field<'aggregateIntegrations', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[integration_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[integration_order_by!]',
        where: 'integration_bool_exp',
      },
      args,

      selection: selectorFn(new integration_aggregate()),
    }
    return this.$_select('aggregateIntegrations', options) as any
  }

  /**
   * fetch aggregated fields from the table: "issue"
   */
  aggregateIssues<
    Args extends VariabledInput<{
      distinct_on?: Array<issue_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<issue_order_by> | undefined
      where?: issue_bool_exp | undefined
    }>,
    Sel extends Selection<issue_aggregate>
  >(
    args: Args,
    selectorFn: (s: issue_aggregate) => [...Sel]
  ): $Field<'aggregateIssues', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[issue_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[issue_order_by!]',
        where: 'issue_bool_exp',
      },
      args,

      selection: selectorFn(new issue_aggregate()),
    }
    return this.$_select('aggregateIssues', options) as any
  }

  /**
   * fetch aggregated fields from the table: "job_method"
   */
  aggregateJobMethods<
    Args extends VariabledInput<{
      distinct_on?: Array<jobMethod_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<jobMethod_order_by> | undefined
      where?: jobMethod_bool_exp | undefined
    }>,
    Sel extends Selection<jobMethod_aggregate>
  >(
    args: Args,
    selectorFn: (s: jobMethod_aggregate) => [...Sel]
  ): $Field<'aggregateJobMethods', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[jobMethod_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[jobMethod_order_by!]',
        where: 'jobMethod_bool_exp',
      },
      args,

      selection: selectorFn(new jobMethod_aggregate()),
    }
    return this.$_select('aggregateJobMethods', options) as any
  }

  /**
   * fetch aggregated fields from the table: "job_status"
   */
  aggregateJobStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<jobStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<jobStatus_order_by> | undefined
      where?: jobStatus_bool_exp | undefined
    }>,
    Sel extends Selection<jobStatus_aggregate>
  >(
    args: Args,
    selectorFn: (s: jobStatus_aggregate) => [...Sel]
  ): $Field<'aggregateJobStatuses', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[jobStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[jobStatus_order_by!]',
        where: 'jobStatus_bool_exp',
      },
      args,

      selection: selectorFn(new jobStatus_aggregate()),
    }
    return this.$_select('aggregateJobStatuses', options) as any
  }

  /**
   * fetch aggregated fields from the table: "job"
   */
  aggregateJobs<
    Args extends VariabledInput<{
      distinct_on?: Array<job_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<job_order_by> | undefined
      where?: job_bool_exp | undefined
    }>,
    Sel extends Selection<job_aggregate>
  >(
    args: Args,
    selectorFn: (s: job_aggregate) => [...Sel]
  ): $Field<'aggregateJobs', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[job_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[job_order_by!]',
        where: 'job_bool_exp',
      },
      args,

      selection: selectorFn(new job_aggregate()),
    }
    return this.$_select('aggregateJobs', options) as any
  }

  /**
   * fetch aggregated fields from the table: "line"
   */
  aggregateLines<
    Args extends VariabledInput<{
      distinct_on?: Array<line_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<line_order_by> | undefined
      where?: line_bool_exp | undefined
    }>,
    Sel extends Selection<line_aggregate>
  >(
    args: Args,
    selectorFn: (s: line_aggregate) => [...Sel]
  ): $Field<'aggregateLines', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[line_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[line_order_by!]',
        where: 'line_bool_exp',
      },
      args,

      selection: selectorFn(new line_aggregate()),
    }
    return this.$_select('aggregateLines', options) as any
  }

  /**
   * fetch aggregated fields from the table: "metric"
   */
  aggregateMetrics<
    Args extends VariabledInput<{
      distinct_on?: Array<metric_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<metric_order_by> | undefined
      where?: metric_bool_exp | undefined
    }>,
    Sel extends Selection<metric_aggregate>
  >(
    args: Args,
    selectorFn: (s: metric_aggregate) => [...Sel]
  ): $Field<'aggregateMetrics', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[metric_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[metric_order_by!]',
        where: 'metric_bool_exp',
      },
      args,

      selection: selectorFn(new metric_aggregate()),
    }
    return this.$_select('aggregateMetrics', options) as any
  }

  /**
   * fetch aggregated fields from the table: "normalized_type"
   */
  aggregateNormalizedTypes<
    Args extends VariabledInput<{
      distinct_on?: Array<normalizedType_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<normalizedType_order_by> | undefined
      where?: normalizedType_bool_exp | undefined
    }>,
    Sel extends Selection<normalizedType_aggregate>
  >(
    args: Args,
    selectorFn: (s: normalizedType_aggregate) => [...Sel]
  ): $Field<'aggregateNormalizedTypes', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[normalizedType_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[normalizedType_order_by!]',
        where: 'normalizedType_bool_exp',
      },
      args,

      selection: selectorFn(new normalizedType_aggregate()),
    }
    return this.$_select('aggregateNormalizedTypes', options) as any
  }

  /**
   * fetch aggregated fields from the table: "payment_status"
   */
  aggregatePaymentStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<paymentStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<paymentStatus_order_by> | undefined
      where?: paymentStatus_bool_exp | undefined
    }>,
    Sel extends Selection<paymentStatus_aggregate>
  >(
    args: Args,
    selectorFn: (s: paymentStatus_aggregate) => [...Sel]
  ): $Field<'aggregatePaymentStatuses', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[paymentStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[paymentStatus_order_by!]',
        where: 'paymentStatus_bool_exp',
      },
      args,

      selection: selectorFn(new paymentStatus_aggregate()),
    }
    return this.$_select('aggregatePaymentStatuses', options) as any
  }

  /**
   * fetch aggregated fields from the table: "payment_type"
   */
  aggregatePaymentTypes<
    Args extends VariabledInput<{
      distinct_on?: Array<paymentType_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<paymentType_order_by> | undefined
      where?: paymentType_bool_exp | undefined
    }>,
    Sel extends Selection<paymentType_aggregate>
  >(
    args: Args,
    selectorFn: (s: paymentType_aggregate) => [...Sel]
  ): $Field<'aggregatePaymentTypes', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[paymentType_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[paymentType_order_by!]',
        where: 'paymentType_bool_exp',
      },
      args,

      selection: selectorFn(new paymentType_aggregate()),
    }
    return this.$_select('aggregatePaymentTypes', options) as any
  }

  /**
   * fetch aggregated fields from the table: "payment"
   */
  aggregatePayments<
    Args extends VariabledInput<{
      distinct_on?: Array<payment_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<payment_order_by> | undefined
      where?: payment_bool_exp | undefined
    }>,
    Sel extends Selection<payment_aggregate>
  >(
    args: Args,
    selectorFn: (s: payment_aggregate) => [...Sel]
  ): $Field<'aggregatePayments', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[payment_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[payment_order_by!]',
        where: 'payment_bool_exp',
      },
      args,

      selection: selectorFn(new payment_aggregate()),
    }
    return this.$_select('aggregatePayments', options) as any
  }

  /**
   * fetch aggregated fields from the table: "subclassification"
   */
  aggregateSubclassifications<
    Args extends VariabledInput<{
      distinct_on?: Array<subclassification_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<subclassification_order_by> | undefined
      where?: subclassification_bool_exp | undefined
    }>,
    Sel extends Selection<subclassification_aggregate>
  >(
    args: Args,
    selectorFn: (s: subclassification_aggregate) => [...Sel]
  ): $Field<'aggregateSubclassifications', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[subclassification_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[subclassification_order_by!]',
        where: 'subclassification_bool_exp',
      },
      args,

      selection: selectorFn(new subclassification_aggregate()),
    }
    return this.$_select('aggregateSubclassifications', options) as any
  }

  /**
   * fetch aggregated fields from the table: "tag"
   */
  aggregateTags<
    Args extends VariabledInput<{
      distinct_on?: Array<tag_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<tag_order_by> | undefined
      where?: tag_bool_exp | undefined
    }>,
    Sel extends Selection<tag_aggregate>
  >(
    args: Args,
    selectorFn: (s: tag_aggregate) => [...Sel]
  ): $Field<'aggregateTags', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[tag_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[tag_order_by!]',
        where: 'tag_bool_exp',
      },
      args,

      selection: selectorFn(new tag_aggregate()),
    }
    return this.$_select('aggregateTags', options) as any
  }

  /**
   * fetch aggregated fields from the table: "team_user"
   */
  aggregateTeamUsers<
    Args extends VariabledInput<{
      distinct_on?: Array<teamUser_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<teamUser_order_by> | undefined
      where?: teamUser_bool_exp | undefined
    }>,
    Sel extends Selection<teamUser_aggregate>
  >(
    args: Args,
    selectorFn: (s: teamUser_aggregate) => [...Sel]
  ): $Field<'aggregateTeamUsers', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[teamUser_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[teamUser_order_by!]',
        where: 'teamUser_bool_exp',
      },
      args,

      selection: selectorFn(new teamUser_aggregate()),
    }
    return this.$_select('aggregateTeamUsers', options) as any
  }

  /**
   * fetch aggregated fields from the table: "team"
   */
  aggregateTeams<
    Args extends VariabledInput<{
      distinct_on?: Array<team_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<team_order_by> | undefined
      where?: team_bool_exp | undefined
    }>,
    Sel extends Selection<team_aggregate>
  >(
    args: Args,
    selectorFn: (s: team_aggregate) => [...Sel]
  ): $Field<'aggregateTeams', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[team_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[team_order_by!]',
        where: 'team_bool_exp',
      },
      args,

      selection: selectorFn(new team_aggregate()),
    }
    return this.$_select('aggregateTeams', options) as any
  }

  /**
   * fetch aggregated fields from the table: "unit"
   */
  aggregateUnits<
    Args extends VariabledInput<{
      distinct_on?: Array<unit_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<unit_order_by> | undefined
      where?: unit_bool_exp | undefined
    }>,
    Sel extends Selection<unit_aggregate>
  >(
    args: Args,
    selectorFn: (s: unit_aggregate) => [...Sel]
  ): $Field<'aggregateUnits', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[unit_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[unit_order_by!]',
        where: 'unit_bool_exp',
      },
      args,

      selection: selectorFn(new unit_aggregate()),
    }
    return this.$_select('aggregateUnits', options) as any
  }

  /**
   * fetch aggregated fields from the table: "user_status"
   */
  aggregateUserStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<userStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<userStatus_order_by> | undefined
      where?: userStatus_bool_exp | undefined
    }>,
    Sel extends Selection<userStatus_aggregate>
  >(
    args: Args,
    selectorFn: (s: userStatus_aggregate) => [...Sel]
  ): $Field<'aggregateUserStatuses', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[userStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[userStatus_order_by!]',
        where: 'userStatus_bool_exp',
      },
      args,

      selection: selectorFn(new userStatus_aggregate()),
    }
    return this.$_select('aggregateUserStatuses', options) as any
  }

  /**
   * fetch aggregated fields from the table: "user"
   */
  aggregateUsers<
    Args extends VariabledInput<{
      distinct_on?: Array<user_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<user_order_by> | undefined
      where?: user_bool_exp | undefined
    }>,
    Sel extends Selection<user_aggregate>
  >(
    args: Args,
    selectorFn: (s: user_aggregate) => [...Sel]
  ): $Field<'aggregateUsers', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[user_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[user_order_by!]',
        where: 'user_bool_exp',
      },
      args,

      selection: selectorFn(new user_aggregate()),
    }
    return this.$_select('aggregateUsers', options) as any
  }

  /**
   * fetch aggregated fields from the table: "webhook"
   */
  aggregateWebhooks<
    Args extends VariabledInput<{
      distinct_on?: Array<webhook_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<webhook_order_by> | undefined
      where?: webhook_bool_exp | undefined
    }>,
    Sel extends Selection<webhook_aggregate>
  >(
    args: Args,
    selectorFn: (s: webhook_aggregate) => [...Sel]
  ): $Field<'aggregateWebhooks', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[webhook_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[webhook_order_by!]',
        where: 'webhook_bool_exp',
      },
      args,

      selection: selectorFn(new webhook_aggregate()),
    }
    return this.$_select('aggregateWebhooks', options) as any
  }

  /**
   * fetch data from the table: "booking" using primary key columns
   */
  booking<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<booking>
  >(
    args: Args,
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'booking', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new booking()),
    }
    return this.$_select('booking', options) as any
  }

  /**
   * fetch data from the table: "booking_status" using primary key columns
   */
  bookingStatus<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<bookingStatus>
  >(
    args: Args,
    selectorFn: (s: bookingStatus) => [...Sel]
  ): $Field<'bookingStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new bookingStatus()),
    }
    return this.$_select('bookingStatus', options) as any
  }

  /**
   * fetch data from the table: "booking_status"
   */
  bookingStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<bookingStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<bookingStatus_order_by> | undefined
      where?: bookingStatus_bool_exp | undefined
    }>,
    Sel extends Selection<bookingStatus>
  >(
    args: Args,
    selectorFn: (s: bookingStatus) => [...Sel]
  ): $Field<'bookingStatuses', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[bookingStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[bookingStatus_order_by!]',
        where: 'bookingStatus_bool_exp',
      },
      args,

      selection: selectorFn(new bookingStatus()),
    }
    return this.$_select('bookingStatuses', options) as any
  }

  /**
   * fetch data from the table: "booking_channel"
   */
  booking_channel<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_channel_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_channel_order_by> | undefined
      where?: booking_channel_bool_exp | undefined
    }>,
    Sel extends Selection<booking_channel>
  >(
    args: Args,
    selectorFn: (s: booking_channel) => [...Sel]
  ): $Field<'booking_channel', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_channel_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_channel_order_by!]',
        where: 'booking_channel_bool_exp',
      },
      args,

      selection: selectorFn(new booking_channel()),
    }
    return this.$_select('booking_channel', options) as any
  }

  /**
   * fetch aggregated fields from the table: "booking_channel"
   */
  booking_channel_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_channel_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_channel_order_by> | undefined
      where?: booking_channel_bool_exp | undefined
    }>,
    Sel extends Selection<booking_channel_aggregate>
  >(
    args: Args,
    selectorFn: (s: booking_channel_aggregate) => [...Sel]
  ): $Field<'booking_channel_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_channel_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_channel_order_by!]',
        where: 'booking_channel_bool_exp',
      },
      args,

      selection: selectorFn(new booking_channel_aggregate()),
    }
    return this.$_select('booking_channel_aggregate', options) as any
  }

  /**
   * fetch data from the table: "booking_channel" using primary key columns
   */
  booking_channel_by_pk<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<booking_channel>
  >(
    args: Args,
    selectorFn: (s: booking_channel) => [...Sel]
  ): $Field<'booking_channel_by_pk', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new booking_channel()),
    }
    return this.$_select('booking_channel_by_pk', options) as any
  }

  /**
   * An array relationship
   */
  bookings<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_order_by> | undefined
      where?: booking_bool_exp | undefined
    }>,
    Sel extends Selection<booking>
  >(
    args: Args,
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'bookings', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_order_by!]',
        where: 'booking_bool_exp',
      },
      args,

      selection: selectorFn(new booking()),
    }
    return this.$_select('bookings', options) as any
  }

  /**
   * fetch data from the table: "classification" using primary key columns
   */
  classification<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<classification>
  >(
    args: Args,
    selectorFn: (s: classification) => [...Sel]
  ): $Field<'classification', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new classification()),
    }
    return this.$_select('classification', options) as any
  }

  /**
   * fetch data from the table: "classification"
   */
  classifications<
    Args extends VariabledInput<{
      distinct_on?: Array<classification_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<classification_order_by> | undefined
      where?: classification_bool_exp | undefined
    }>,
    Sel extends Selection<classification>
  >(
    args: Args,
    selectorFn: (s: classification) => [...Sel]
  ): $Field<'classifications', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[classification_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[classification_order_by!]',
        where: 'classification_bool_exp',
      },
      args,

      selection: selectorFn(new classification()),
    }
    return this.$_select('classifications', options) as any
  }

  /**
   * fetch data from the table: "connection" using primary key columns
   */
  connection<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<connection>
  >(
    args: Args,
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'connection', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new connection()),
    }
    return this.$_select('connection', options) as any
  }

  /**
   * An array relationship
   */
  connections<
    Args extends VariabledInput<{
      distinct_on?: Array<connection_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<connection_order_by> | undefined
      where?: connection_bool_exp | undefined
    }>,
    Sel extends Selection<connection>
  >(
    args: Args,
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'connections', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[connection_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[connection_order_by!]',
        where: 'connection_bool_exp',
      },
      args,

      selection: selectorFn(new connection()),
    }
    return this.$_select('connections', options) as any
  }

  /**
   * fetch data from the table: "currency"
   */
  currencies<
    Args extends VariabledInput<{
      distinct_on?: Array<currency_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<currency_order_by> | undefined
      where?: currency_bool_exp | undefined
    }>,
    Sel extends Selection<currency>
  >(
    args: Args,
    selectorFn: (s: currency) => [...Sel]
  ): $Field<'currencies', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[currency_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[currency_order_by!]',
        where: 'currency_bool_exp',
      },
      args,

      selection: selectorFn(new currency()),
    }
    return this.$_select('currencies', options) as any
  }

  /**
   * fetch data from the table: "currency" using primary key columns
   */
  currency<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<currency>
  >(
    args: Args,
    selectorFn: (s: currency) => [...Sel]
  ): $Field<'currency', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new currency()),
    }
    return this.$_select('currency', options) as any
  }

  /**
   * An array relationship
   */
  entities<
    Args extends VariabledInput<{
      distinct_on?: Array<entity_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<entity_order_by> | undefined
      where?: entity_bool_exp | undefined
    }>,
    Sel extends Selection<entity>
  >(
    args: Args,
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'entities', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[entity_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[entity_order_by!]',
        where: 'entity_bool_exp',
      },
      args,

      selection: selectorFn(new entity()),
    }
    return this.$_select('entities', options) as any
  }

  /**
   * fetch data from the table: "entity" using primary key columns
   */
  entity<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<entity>
  >(
    args: Args,
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'entity', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new entity()),
    }
    return this.$_select('entity', options) as any
  }

  /**
   * fetch data from the table: "entity_status" using primary key columns
   */
  entityStatus<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<entityStatus>
  >(
    args: Args,
    selectorFn: (s: entityStatus) => [...Sel]
  ): $Field<'entityStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new entityStatus()),
    }
    return this.$_select('entityStatus', options) as any
  }

  /**
   * fetch data from the table: "entity_status"
   */
  entityStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<entityStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<entityStatus_order_by> | undefined
      where?: entityStatus_bool_exp | undefined
    }>,
    Sel extends Selection<entityStatus>
  >(
    args: Args,
    selectorFn: (s: entityStatus) => [...Sel]
  ): $Field<'entityStatuses', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[entityStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[entityStatus_order_by!]',
        where: 'entityStatus_bool_exp',
      },
      args,

      selection: selectorFn(new entityStatus()),
    }
    return this.$_select('entityStatuses', options) as any
  }

  /**
   * fetch data from the table: "integration" using primary key columns
   */
  integration<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<integration>
  >(
    args: Args,
    selectorFn: (s: integration) => [...Sel]
  ): $Field<'integration', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new integration()),
    }
    return this.$_select('integration', options) as any
  }

  /**
   * fetch data from the table: "integration_type" using primary key columns
   */
  integrationType<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<integrationType>
  >(
    args: Args,
    selectorFn: (s: integrationType) => [...Sel]
  ): $Field<'integrationType', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new integrationType()),
    }
    return this.$_select('integrationType', options) as any
  }

  /**
   * fetch data from the table: "integration_type"
   */
  integrationTypes<
    Args extends VariabledInput<{
      distinct_on?: Array<integrationType_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<integrationType_order_by> | undefined
      where?: integrationType_bool_exp | undefined
    }>,
    Sel extends Selection<integrationType>
  >(
    args: Args,
    selectorFn: (s: integrationType) => [...Sel]
  ): $Field<'integrationTypes', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[integrationType_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[integrationType_order_by!]',
        where: 'integrationType_bool_exp',
      },
      args,

      selection: selectorFn(new integrationType()),
    }
    return this.$_select('integrationTypes', options) as any
  }

  /**
   * An array relationship
   */
  integrations<
    Args extends VariabledInput<{
      distinct_on?: Array<integration_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<integration_order_by> | undefined
      where?: integration_bool_exp | undefined
    }>,
    Sel extends Selection<integration>
  >(
    args: Args,
    selectorFn: (s: integration) => [...Sel]
  ): $Field<'integrations', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[integration_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[integration_order_by!]',
        where: 'integration_bool_exp',
      },
      args,

      selection: selectorFn(new integration()),
    }
    return this.$_select('integrations', options) as any
  }

  /**
   * fetch data from the table: "issue" using primary key columns
   */
  issue<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<issue>
  >(
    args: Args,
    selectorFn: (s: issue) => [...Sel]
  ): $Field<'issue', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new issue()),
    }
    return this.$_select('issue', options) as any
  }

  /**
   * An array relationship
   */
  issues<
    Args extends VariabledInput<{
      distinct_on?: Array<issue_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<issue_order_by> | undefined
      where?: issue_bool_exp | undefined
    }>,
    Sel extends Selection<issue>
  >(
    args: Args,
    selectorFn: (s: issue) => [...Sel]
  ): $Field<'issues', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[issue_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[issue_order_by!]',
        where: 'issue_bool_exp',
      },
      args,

      selection: selectorFn(new issue()),
    }
    return this.$_select('issues', options) as any
  }

  /**
   * fetch data from the table: "job" using primary key columns
   */
  job<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<job>
  >(
    args: Args,
    selectorFn: (s: job) => [...Sel]
  ): $Field<'job', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new job()),
    }
    return this.$_select('job', options) as any
  }

  /**
   * fetch data from the table: "job_method" using primary key columns
   */
  jobMethod<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<jobMethod>
  >(
    args: Args,
    selectorFn: (s: jobMethod) => [...Sel]
  ): $Field<'jobMethod', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new jobMethod()),
    }
    return this.$_select('jobMethod', options) as any
  }

  /**
   * fetch data from the table: "job_method"
   */
  jobMethods<
    Args extends VariabledInput<{
      distinct_on?: Array<jobMethod_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<jobMethod_order_by> | undefined
      where?: jobMethod_bool_exp | undefined
    }>,
    Sel extends Selection<jobMethod>
  >(
    args: Args,
    selectorFn: (s: jobMethod) => [...Sel]
  ): $Field<'jobMethods', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[jobMethod_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[jobMethod_order_by!]',
        where: 'jobMethod_bool_exp',
      },
      args,

      selection: selectorFn(new jobMethod()),
    }
    return this.$_select('jobMethods', options) as any
  }

  /**
   * fetch data from the table: "job_status" using primary key columns
   */
  jobStatus<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<jobStatus>
  >(
    args: Args,
    selectorFn: (s: jobStatus) => [...Sel]
  ): $Field<'jobStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new jobStatus()),
    }
    return this.$_select('jobStatus', options) as any
  }

  /**
   * fetch data from the table: "job_status"
   */
  jobStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<jobStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<jobStatus_order_by> | undefined
      where?: jobStatus_bool_exp | undefined
    }>,
    Sel extends Selection<jobStatus>
  >(
    args: Args,
    selectorFn: (s: jobStatus) => [...Sel]
  ): $Field<'jobStatuses', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[jobStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[jobStatus_order_by!]',
        where: 'jobStatus_bool_exp',
      },
      args,

      selection: selectorFn(new jobStatus()),
    }
    return this.$_select('jobStatuses', options) as any
  }

  /**
   * An array relationship
   */
  jobs<
    Args extends VariabledInput<{
      distinct_on?: Array<job_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<job_order_by> | undefined
      where?: job_bool_exp | undefined
    }>,
    Sel extends Selection<job>
  >(
    args: Args,
    selectorFn: (s: job) => [...Sel]
  ): $Field<'jobs', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[job_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[job_order_by!]',
        where: 'job_bool_exp',
      },
      args,

      selection: selectorFn(new job()),
    }
    return this.$_select('jobs', options) as any
  }

  /**
   * fetch data from the table: "line" using primary key columns
   */
  line<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<line>
  >(
    args: Args,
    selectorFn: (s: line) => [...Sel]
  ): $Field<'line', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new line()),
    }
    return this.$_select('line', options) as any
  }

  /**
   * An array relationship
   */
  lines<
    Args extends VariabledInput<{
      distinct_on?: Array<line_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<line_order_by> | undefined
      where?: line_bool_exp | undefined
    }>,
    Sel extends Selection<line>
  >(
    args: Args,
    selectorFn: (s: line) => [...Sel]
  ): $Field<'lines', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[line_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[line_order_by!]',
        where: 'line_bool_exp',
      },
      args,

      selection: selectorFn(new line()),
    }
    return this.$_select('lines', options) as any
  }

  /**
   * fetch data from the table: "metric" using primary key columns
   */
  metric<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<metric>
  >(
    args: Args,
    selectorFn: (s: metric) => [...Sel]
  ): $Field<'metric', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new metric()),
    }
    return this.$_select('metric', options) as any
  }

  /**
   * An array relationship
   */
  metrics<
    Args extends VariabledInput<{
      distinct_on?: Array<metric_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<metric_order_by> | undefined
      where?: metric_bool_exp | undefined
    }>,
    Sel extends Selection<metric>
  >(
    args: Args,
    selectorFn: (s: metric) => [...Sel]
  ): $Field<'metrics', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[metric_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[metric_order_by!]',
        where: 'metric_bool_exp',
      },
      args,

      selection: selectorFn(new metric()),
    }
    return this.$_select('metrics', options) as any
  }

  /**
   * fetch data from the table: "normalized_type" using primary key columns
   */
  normalizedType<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<normalizedType>
  >(
    args: Args,
    selectorFn: (s: normalizedType) => [...Sel]
  ): $Field<'normalizedType', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new normalizedType()),
    }
    return this.$_select('normalizedType', options) as any
  }

  /**
   * fetch data from the table: "normalized_type"
   */
  normalizedTypes<
    Args extends VariabledInput<{
      distinct_on?: Array<normalizedType_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<normalizedType_order_by> | undefined
      where?: normalizedType_bool_exp | undefined
    }>,
    Sel extends Selection<normalizedType>
  >(
    args: Args,
    selectorFn: (s: normalizedType) => [...Sel]
  ): $Field<'normalizedTypes', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[normalizedType_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[normalizedType_order_by!]',
        where: 'normalizedType_bool_exp',
      },
      args,

      selection: selectorFn(new normalizedType()),
    }
    return this.$_select('normalizedTypes', options) as any
  }

  /**
   * fetch data from the table: "payment" using primary key columns
   */
  payment<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<payment>
  >(
    args: Args,
    selectorFn: (s: payment) => [...Sel]
  ): $Field<'payment', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new payment()),
    }
    return this.$_select('payment', options) as any
  }

  /**
   * fetch data from the table: "payment_status" using primary key columns
   */
  paymentStatus<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<paymentStatus>
  >(
    args: Args,
    selectorFn: (s: paymentStatus) => [...Sel]
  ): $Field<'paymentStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new paymentStatus()),
    }
    return this.$_select('paymentStatus', options) as any
  }

  /**
   * fetch data from the table: "payment_status"
   */
  paymentStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<paymentStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<paymentStatus_order_by> | undefined
      where?: paymentStatus_bool_exp | undefined
    }>,
    Sel extends Selection<paymentStatus>
  >(
    args: Args,
    selectorFn: (s: paymentStatus) => [...Sel]
  ): $Field<'paymentStatuses', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[paymentStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[paymentStatus_order_by!]',
        where: 'paymentStatus_bool_exp',
      },
      args,

      selection: selectorFn(new paymentStatus()),
    }
    return this.$_select('paymentStatuses', options) as any
  }

  /**
   * fetch data from the table: "payment_type" using primary key columns
   */
  paymentType<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<paymentType>
  >(
    args: Args,
    selectorFn: (s: paymentType) => [...Sel]
  ): $Field<'paymentType', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new paymentType()),
    }
    return this.$_select('paymentType', options) as any
  }

  /**
   * fetch data from the table: "payment_type"
   */
  paymentTypes<
    Args extends VariabledInput<{
      distinct_on?: Array<paymentType_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<paymentType_order_by> | undefined
      where?: paymentType_bool_exp | undefined
    }>,
    Sel extends Selection<paymentType>
  >(
    args: Args,
    selectorFn: (s: paymentType) => [...Sel]
  ): $Field<'paymentTypes', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[paymentType_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[paymentType_order_by!]',
        where: 'paymentType_bool_exp',
      },
      args,

      selection: selectorFn(new paymentType()),
    }
    return this.$_select('paymentTypes', options) as any
  }

  /**
   * An array relationship
   */
  payments<
    Args extends VariabledInput<{
      distinct_on?: Array<payment_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<payment_order_by> | undefined
      where?: payment_bool_exp | undefined
    }>,
    Sel extends Selection<payment>
  >(
    args: Args,
    selectorFn: (s: payment) => [...Sel]
  ): $Field<'payments', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[payment_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[payment_order_by!]',
        where: 'payment_bool_exp',
      },
      args,

      selection: selectorFn(new payment()),
    }
    return this.$_select('payments', options) as any
  }

  /**
   * fetch data from the table: "subclassification" using primary key columns
   */
  subclassification<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<subclassification>
  >(
    args: Args,
    selectorFn: (s: subclassification) => [...Sel]
  ): $Field<'subclassification', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new subclassification()),
    }
    return this.$_select('subclassification', options) as any
  }

  /**
   * fetch data from the table: "subclassification"
   */
  subclassifications<
    Args extends VariabledInput<{
      distinct_on?: Array<subclassification_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<subclassification_order_by> | undefined
      where?: subclassification_bool_exp | undefined
    }>,
    Sel extends Selection<subclassification>
  >(
    args: Args,
    selectorFn: (s: subclassification) => [...Sel]
  ): $Field<'subclassifications', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[subclassification_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[subclassification_order_by!]',
        where: 'subclassification_bool_exp',
      },
      args,

      selection: selectorFn(new subclassification()),
    }
    return this.$_select('subclassifications', options) as any
  }

  /**
   * fetch data from the table: "tag" using primary key columns
   */
  tag<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<tag>
  >(
    args: Args,
    selectorFn: (s: tag) => [...Sel]
  ): $Field<'tag', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new tag()),
    }
    return this.$_select('tag', options) as any
  }

  /**
   * An array relationship
   */
  tags<
    Args extends VariabledInput<{
      distinct_on?: Array<tag_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<tag_order_by> | undefined
      where?: tag_bool_exp | undefined
    }>,
    Sel extends Selection<tag>
  >(
    args: Args,
    selectorFn: (s: tag) => [...Sel]
  ): $Field<'tags', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[tag_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[tag_order_by!]',
        where: 'tag_bool_exp',
      },
      args,

      selection: selectorFn(new tag()),
    }
    return this.$_select('tags', options) as any
  }

  /**
   * fetch data from the table: "team" using primary key columns
   */
  team<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<team>
  >(
    args: Args,
    selectorFn: (s: team) => [...Sel]
  ): $Field<'team', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new team()),
    }
    return this.$_select('team', options) as any
  }

  /**
   * fetch data from the table: "team_user" using primary key columns
   */
  teamUser<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<teamUser>
  >(
    args: Args,
    selectorFn: (s: teamUser) => [...Sel]
  ): $Field<'teamUser', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new teamUser()),
    }
    return this.$_select('teamUser', options) as any
  }

  /**
   * fetch data from the table: "team_user"
   */
  teamUsers<
    Args extends VariabledInput<{
      distinct_on?: Array<teamUser_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<teamUser_order_by> | undefined
      where?: teamUser_bool_exp | undefined
    }>,
    Sel extends Selection<teamUser>
  >(
    args: Args,
    selectorFn: (s: teamUser) => [...Sel]
  ): $Field<'teamUsers', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[teamUser_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[teamUser_order_by!]',
        where: 'teamUser_bool_exp',
      },
      args,

      selection: selectorFn(new teamUser()),
    }
    return this.$_select('teamUsers', options) as any
  }

  /**
   * fetch data from the table: "team"
   */
  teams<
    Args extends VariabledInput<{
      distinct_on?: Array<team_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<team_order_by> | undefined
      where?: team_bool_exp | undefined
    }>,
    Sel extends Selection<team>
  >(
    args: Args,
    selectorFn: (s: team) => [...Sel]
  ): $Field<'teams', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[team_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[team_order_by!]',
        where: 'team_bool_exp',
      },
      args,

      selection: selectorFn(new team()),
    }
    return this.$_select('teams', options) as any
  }

  /**
   * fetch data from the table: "unit" using primary key columns
   */
  unit<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<unit>
  >(
    args: Args,
    selectorFn: (s: unit) => [...Sel]
  ): $Field<'unit', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new unit()),
    }
    return this.$_select('unit', options) as any
  }

  /**
   * An array relationship
   */
  units<
    Args extends VariabledInput<{
      distinct_on?: Array<unit_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<unit_order_by> | undefined
      where?: unit_bool_exp | undefined
    }>,
    Sel extends Selection<unit>
  >(
    args: Args,
    selectorFn: (s: unit) => [...Sel]
  ): $Field<'units', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[unit_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[unit_order_by!]',
        where: 'unit_bool_exp',
      },
      args,

      selection: selectorFn(new unit()),
    }
    return this.$_select('units', options) as any
  }

  /**
   * fetch data from the table: "user" using primary key columns
   */
  user<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<user>
  >(
    args: Args,
    selectorFn: (s: user) => [...Sel]
  ): $Field<'user', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new user()),
    }
    return this.$_select('user', options) as any
  }

  /**
   * fetch data from the table: "user_status" using primary key columns
   */
  userStatus<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<userStatus>
  >(
    args: Args,
    selectorFn: (s: userStatus) => [...Sel]
  ): $Field<'userStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new userStatus()),
    }
    return this.$_select('userStatus', options) as any
  }

  /**
   * fetch data from the table: "user_status"
   */
  userStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<userStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<userStatus_order_by> | undefined
      where?: userStatus_bool_exp | undefined
    }>,
    Sel extends Selection<userStatus>
  >(
    args: Args,
    selectorFn: (s: userStatus) => [...Sel]
  ): $Field<'userStatuses', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[userStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[userStatus_order_by!]',
        where: 'userStatus_bool_exp',
      },
      args,

      selection: selectorFn(new userStatus()),
    }
    return this.$_select('userStatuses', options) as any
  }

  /**
   * fetch data from the table: "user"
   */
  users<
    Args extends VariabledInput<{
      distinct_on?: Array<user_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<user_order_by> | undefined
      where?: user_bool_exp | undefined
    }>,
    Sel extends Selection<user>
  >(
    args: Args,
    selectorFn: (s: user) => [...Sel]
  ): $Field<'users', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[user_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[user_order_by!]',
        where: 'user_bool_exp',
      },
      args,

      selection: selectorFn(new user()),
    }
    return this.$_select('users', options) as any
  }

  /**
   * fetch data from the table: "webhook" using primary key columns
   */
  webhook<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<webhook>
  >(
    args: Args,
    selectorFn: (s: webhook) => [...Sel]
  ): $Field<'webhook', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new webhook()),
    }
    return this.$_select('webhook', options) as any
  }

  /**
   * An array relationship
   */
  webhooks<
    Args extends VariabledInput<{
      distinct_on?: Array<webhook_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<webhook_order_by> | undefined
      where?: webhook_bool_exp | undefined
    }>,
    Sel extends Selection<webhook>
  >(
    args: Args,
    selectorFn: (s: webhook) => [...Sel]
  ): $Field<'webhooks', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[webhook_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[webhook_order_by!]',
        where: 'webhook_bool_exp',
      },
      args,

      selection: selectorFn(new webhook()),
    }
    return this.$_select('webhooks', options) as any
  }
}

/**
 * Boolean expression to compare columns of type "String". All fields are combined with logical 'AND'.
 */
export type String_comparison_exp = {
  _eq?: string | undefined
  _gt?: string | undefined
  _gte?: string | undefined
  _ilike?: string | undefined
  _in?: Array<string> | undefined
  _iregex?: string | undefined
  _is_null?: boolean | undefined
  _like?: string | undefined
  _lt?: string | undefined
  _lte?: string | undefined
  _neq?: string | undefined
  _nilike?: string | undefined
  _nin?: Array<string> | undefined
  _niregex?: string | undefined
  _nlike?: string | undefined
  _nregex?: string | undefined
  _nsimilar?: string | undefined
  _regex?: string | undefined
  _similar?: string | undefined
}

/**
 * columns and relationships of "subclassification"
 */
export class subclassification extends $Base<'subclassification'> {
  constructor() {
    super('subclassification')
  }

  get name(): $Field<'name', string> {
    return this.$_select('name') as any
  }
}

/**
 * aggregated selection of "subclassification"
 */
export class subclassification_aggregate extends $Base<'subclassification_aggregate'> {
  constructor() {
    super('subclassification_aggregate')
  }

  aggregate<Sel extends Selection<subclassification_aggregate_fields>>(
    selectorFn: (s: subclassification_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new subclassification_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<subclassification>>(
    selectorFn: (s: subclassification) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new subclassification()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "subclassification"
 */
export class subclassification_aggregate_fields extends $Base<'subclassification_aggregate_fields'> {
  constructor() {
    super('subclassification_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<subclassification_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[subclassification_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<subclassification_max_fields>>(
    selectorFn: (s: subclassification_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new subclassification_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<subclassification_min_fields>>(
    selectorFn: (s: subclassification_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new subclassification_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * Boolean expression to filter rows from the table "subclassification". All fields are combined with a logical 'AND'.
 */
export type subclassification_bool_exp = {
  _and?: Array<subclassification_bool_exp> | undefined
  _not?: subclassification_bool_exp | undefined
  _or?: Array<subclassification_bool_exp> | undefined
  name?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "subclassification"
 */
export enum subclassification_constraint {
  /**
   * unique or primary key constraint
   */
  subclassification_pkey = 'subclassification_pkey',
}

export enum subclassification_enum {
  adjustment_alteration = 'adjustment_alteration',

  adjustment_cancellation = 'adjustment_cancellation',

  adjustment_deviation = 'adjustment_deviation',

  adjustment_other = 'adjustment_other',

  adjustment_resolution = 'adjustment_resolution',

  commission_management = 'commission_management',

  commission_ota = 'commission_ota',

  commission_other = 'commission_other',

  commission_pms = 'commission_pms',

  exception_paymentDeviation = 'exception_paymentDeviation',

  exception_reservationAmountZero = 'exception_reservationAmountZero',

  exception_reservationDeviation = 'exception_reservationDeviation',

  paymentFee_card = 'paymentFee_card',

  paymentFee_currencyConversion = 'paymentFee_currencyConversion',

  paymentFee_other = 'paymentFee_other',

  paymentFee_transaction = 'paymentFee_transaction',

  revenue_accommodation = 'revenue_accommodation',

  revenue_cleaning = 'revenue_cleaning',

  revenue_extra = 'revenue_extra',

  revenue_other = 'revenue_other',

  securityDeposit_deposit = 'securityDeposit_deposit',

  securityDeposit_fee = 'securityDeposit_fee',

  tax_city = 'tax_city',

  tax_local = 'tax_local',

  tax_other = 'tax_other',

  tax_tourism = 'tax_tourism',

  tax_vat = 'tax_vat',
}

/**
 * Boolean expression to compare columns of type "subclassification_enum". All fields are combined with logical 'AND'.
 */
export type subclassification_enum_comparison_exp = {
  _eq?: subclassification_enum | undefined
  _in?: Array<subclassification_enum> | undefined
  _is_null?: boolean | undefined
  _neq?: subclassification_enum | undefined
  _nin?: Array<subclassification_enum> | undefined
}

/**
 * input type for inserting data into table "subclassification"
 */
export type subclassification_insert_input = {
  name?: string | undefined
}

/**
 * aggregate max on columns
 */
export class subclassification_max_fields extends $Base<'subclassification_max_fields'> {
  constructor() {
    super('subclassification_max_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * aggregate min on columns
 */
export class subclassification_min_fields extends $Base<'subclassification_min_fields'> {
  constructor() {
    super('subclassification_min_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * response of any mutation on the table "subclassification"
 */
export class subclassification_mutation_response extends $Base<'subclassification_mutation_response'> {
  constructor() {
    super('subclassification_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<subclassification>>(
    selectorFn: (s: subclassification) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new subclassification()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "subclassification"
 */
export type subclassification_on_conflict = {
  constraint: subclassification_constraint
  update_columns: Array<subclassification_update_column>
  where?: subclassification_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "subclassification".
 */
export type subclassification_order_by = {
  name?: order_by | undefined
}

/**
 * primary key columns input for table: subclassification
 */
export type subclassification_pk_columns_input = {
  name: string
}

/**
 * select columns of table "subclassification"
 */
export enum subclassification_select_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * input type for updating data in table "subclassification"
 */
export type subclassification_set_input = {
  name?: string | undefined
}

/**
 * update columns of table "subclassification"
 */
export enum subclassification_update_column {
  /**
   * column name
   */
  name = 'name',
}

export class subscription_root extends $Base<'subscription_root'> {
  constructor() {
    super('subscription_root')
  }

  /**
   * fetch aggregated fields from the table: "booking_status"
   */
  aggregateBookingStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<bookingStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<bookingStatus_order_by> | undefined
      where?: bookingStatus_bool_exp | undefined
    }>,
    Sel extends Selection<bookingStatus_aggregate>
  >(
    args: Args,
    selectorFn: (s: bookingStatus_aggregate) => [...Sel]
  ): $Field<'aggregateBookingStatuses', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[bookingStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[bookingStatus_order_by!]',
        where: 'bookingStatus_bool_exp',
      },
      args,

      selection: selectorFn(new bookingStatus_aggregate()),
    }
    return this.$_select('aggregateBookingStatuses', options) as any
  }

  /**
   * fetch aggregated fields from the table: "booking"
   */
  aggregateBookings<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_order_by> | undefined
      where?: booking_bool_exp | undefined
    }>,
    Sel extends Selection<booking_aggregate>
  >(
    args: Args,
    selectorFn: (s: booking_aggregate) => [...Sel]
  ): $Field<'aggregateBookings', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_order_by!]',
        where: 'booking_bool_exp',
      },
      args,

      selection: selectorFn(new booking_aggregate()),
    }
    return this.$_select('aggregateBookings', options) as any
  }

  /**
   * fetch aggregated fields from the table: "classification"
   */
  aggregateClassifications<
    Args extends VariabledInput<{
      distinct_on?: Array<classification_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<classification_order_by> | undefined
      where?: classification_bool_exp | undefined
    }>,
    Sel extends Selection<classification_aggregate>
  >(
    args: Args,
    selectorFn: (s: classification_aggregate) => [...Sel]
  ): $Field<'aggregateClassifications', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[classification_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[classification_order_by!]',
        where: 'classification_bool_exp',
      },
      args,

      selection: selectorFn(new classification_aggregate()),
    }
    return this.$_select('aggregateClassifications', options) as any
  }

  /**
   * fetch aggregated fields from the table: "connection"
   */
  aggregateConnections<
    Args extends VariabledInput<{
      distinct_on?: Array<connection_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<connection_order_by> | undefined
      where?: connection_bool_exp | undefined
    }>,
    Sel extends Selection<connection_aggregate>
  >(
    args: Args,
    selectorFn: (s: connection_aggregate) => [...Sel]
  ): $Field<'aggregateConnections', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[connection_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[connection_order_by!]',
        where: 'connection_bool_exp',
      },
      args,

      selection: selectorFn(new connection_aggregate()),
    }
    return this.$_select('aggregateConnections', options) as any
  }

  /**
   * fetch aggregated fields from the table: "currency"
   */
  aggregateCurrencies<
    Args extends VariabledInput<{
      distinct_on?: Array<currency_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<currency_order_by> | undefined
      where?: currency_bool_exp | undefined
    }>,
    Sel extends Selection<currency_aggregate>
  >(
    args: Args,
    selectorFn: (s: currency_aggregate) => [...Sel]
  ): $Field<'aggregateCurrencies', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[currency_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[currency_order_by!]',
        where: 'currency_bool_exp',
      },
      args,

      selection: selectorFn(new currency_aggregate()),
    }
    return this.$_select('aggregateCurrencies', options) as any
  }

  /**
   * fetch aggregated fields from the table: "entity"
   */
  aggregateEntities<
    Args extends VariabledInput<{
      distinct_on?: Array<entity_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<entity_order_by> | undefined
      where?: entity_bool_exp | undefined
    }>,
    Sel extends Selection<entity_aggregate>
  >(
    args: Args,
    selectorFn: (s: entity_aggregate) => [...Sel]
  ): $Field<'aggregateEntities', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[entity_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[entity_order_by!]',
        where: 'entity_bool_exp',
      },
      args,

      selection: selectorFn(new entity_aggregate()),
    }
    return this.$_select('aggregateEntities', options) as any
  }

  /**
   * fetch aggregated fields from the table: "entity_status"
   */
  aggregateEntityStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<entityStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<entityStatus_order_by> | undefined
      where?: entityStatus_bool_exp | undefined
    }>,
    Sel extends Selection<entityStatus_aggregate>
  >(
    args: Args,
    selectorFn: (s: entityStatus_aggregate) => [...Sel]
  ): $Field<'aggregateEntityStatuses', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[entityStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[entityStatus_order_by!]',
        where: 'entityStatus_bool_exp',
      },
      args,

      selection: selectorFn(new entityStatus_aggregate()),
    }
    return this.$_select('aggregateEntityStatuses', options) as any
  }

  /**
   * fetch aggregated fields from the table: "integration_type"
   */
  aggregateIntegrationTypes<
    Args extends VariabledInput<{
      distinct_on?: Array<integrationType_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<integrationType_order_by> | undefined
      where?: integrationType_bool_exp | undefined
    }>,
    Sel extends Selection<integrationType_aggregate>
  >(
    args: Args,
    selectorFn: (s: integrationType_aggregate) => [...Sel]
  ): $Field<'aggregateIntegrationTypes', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[integrationType_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[integrationType_order_by!]',
        where: 'integrationType_bool_exp',
      },
      args,

      selection: selectorFn(new integrationType_aggregate()),
    }
    return this.$_select('aggregateIntegrationTypes', options) as any
  }

  /**
   * fetch aggregated fields from the table: "integration"
   */
  aggregateIntegrations<
    Args extends VariabledInput<{
      distinct_on?: Array<integration_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<integration_order_by> | undefined
      where?: integration_bool_exp | undefined
    }>,
    Sel extends Selection<integration_aggregate>
  >(
    args: Args,
    selectorFn: (s: integration_aggregate) => [...Sel]
  ): $Field<'aggregateIntegrations', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[integration_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[integration_order_by!]',
        where: 'integration_bool_exp',
      },
      args,

      selection: selectorFn(new integration_aggregate()),
    }
    return this.$_select('aggregateIntegrations', options) as any
  }

  /**
   * fetch aggregated fields from the table: "issue"
   */
  aggregateIssues<
    Args extends VariabledInput<{
      distinct_on?: Array<issue_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<issue_order_by> | undefined
      where?: issue_bool_exp | undefined
    }>,
    Sel extends Selection<issue_aggregate>
  >(
    args: Args,
    selectorFn: (s: issue_aggregate) => [...Sel]
  ): $Field<'aggregateIssues', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[issue_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[issue_order_by!]',
        where: 'issue_bool_exp',
      },
      args,

      selection: selectorFn(new issue_aggregate()),
    }
    return this.$_select('aggregateIssues', options) as any
  }

  /**
   * fetch aggregated fields from the table: "job_method"
   */
  aggregateJobMethods<
    Args extends VariabledInput<{
      distinct_on?: Array<jobMethod_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<jobMethod_order_by> | undefined
      where?: jobMethod_bool_exp | undefined
    }>,
    Sel extends Selection<jobMethod_aggregate>
  >(
    args: Args,
    selectorFn: (s: jobMethod_aggregate) => [...Sel]
  ): $Field<'aggregateJobMethods', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[jobMethod_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[jobMethod_order_by!]',
        where: 'jobMethod_bool_exp',
      },
      args,

      selection: selectorFn(new jobMethod_aggregate()),
    }
    return this.$_select('aggregateJobMethods', options) as any
  }

  /**
   * fetch aggregated fields from the table: "job_status"
   */
  aggregateJobStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<jobStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<jobStatus_order_by> | undefined
      where?: jobStatus_bool_exp | undefined
    }>,
    Sel extends Selection<jobStatus_aggregate>
  >(
    args: Args,
    selectorFn: (s: jobStatus_aggregate) => [...Sel]
  ): $Field<'aggregateJobStatuses', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[jobStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[jobStatus_order_by!]',
        where: 'jobStatus_bool_exp',
      },
      args,

      selection: selectorFn(new jobStatus_aggregate()),
    }
    return this.$_select('aggregateJobStatuses', options) as any
  }

  /**
   * fetch aggregated fields from the table: "job"
   */
  aggregateJobs<
    Args extends VariabledInput<{
      distinct_on?: Array<job_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<job_order_by> | undefined
      where?: job_bool_exp | undefined
    }>,
    Sel extends Selection<job_aggregate>
  >(
    args: Args,
    selectorFn: (s: job_aggregate) => [...Sel]
  ): $Field<'aggregateJobs', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[job_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[job_order_by!]',
        where: 'job_bool_exp',
      },
      args,

      selection: selectorFn(new job_aggregate()),
    }
    return this.$_select('aggregateJobs', options) as any
  }

  /**
   * fetch aggregated fields from the table: "line"
   */
  aggregateLines<
    Args extends VariabledInput<{
      distinct_on?: Array<line_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<line_order_by> | undefined
      where?: line_bool_exp | undefined
    }>,
    Sel extends Selection<line_aggregate>
  >(
    args: Args,
    selectorFn: (s: line_aggregate) => [...Sel]
  ): $Field<'aggregateLines', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[line_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[line_order_by!]',
        where: 'line_bool_exp',
      },
      args,

      selection: selectorFn(new line_aggregate()),
    }
    return this.$_select('aggregateLines', options) as any
  }

  /**
   * fetch aggregated fields from the table: "metric"
   */
  aggregateMetrics<
    Args extends VariabledInput<{
      distinct_on?: Array<metric_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<metric_order_by> | undefined
      where?: metric_bool_exp | undefined
    }>,
    Sel extends Selection<metric_aggregate>
  >(
    args: Args,
    selectorFn: (s: metric_aggregate) => [...Sel]
  ): $Field<'aggregateMetrics', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[metric_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[metric_order_by!]',
        where: 'metric_bool_exp',
      },
      args,

      selection: selectorFn(new metric_aggregate()),
    }
    return this.$_select('aggregateMetrics', options) as any
  }

  /**
   * fetch aggregated fields from the table: "normalized_type"
   */
  aggregateNormalizedTypes<
    Args extends VariabledInput<{
      distinct_on?: Array<normalizedType_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<normalizedType_order_by> | undefined
      where?: normalizedType_bool_exp | undefined
    }>,
    Sel extends Selection<normalizedType_aggregate>
  >(
    args: Args,
    selectorFn: (s: normalizedType_aggregate) => [...Sel]
  ): $Field<'aggregateNormalizedTypes', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[normalizedType_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[normalizedType_order_by!]',
        where: 'normalizedType_bool_exp',
      },
      args,

      selection: selectorFn(new normalizedType_aggregate()),
    }
    return this.$_select('aggregateNormalizedTypes', options) as any
  }

  /**
   * fetch aggregated fields from the table: "payment_status"
   */
  aggregatePaymentStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<paymentStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<paymentStatus_order_by> | undefined
      where?: paymentStatus_bool_exp | undefined
    }>,
    Sel extends Selection<paymentStatus_aggregate>
  >(
    args: Args,
    selectorFn: (s: paymentStatus_aggregate) => [...Sel]
  ): $Field<'aggregatePaymentStatuses', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[paymentStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[paymentStatus_order_by!]',
        where: 'paymentStatus_bool_exp',
      },
      args,

      selection: selectorFn(new paymentStatus_aggregate()),
    }
    return this.$_select('aggregatePaymentStatuses', options) as any
  }

  /**
   * fetch aggregated fields from the table: "payment_type"
   */
  aggregatePaymentTypes<
    Args extends VariabledInput<{
      distinct_on?: Array<paymentType_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<paymentType_order_by> | undefined
      where?: paymentType_bool_exp | undefined
    }>,
    Sel extends Selection<paymentType_aggregate>
  >(
    args: Args,
    selectorFn: (s: paymentType_aggregate) => [...Sel]
  ): $Field<'aggregatePaymentTypes', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[paymentType_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[paymentType_order_by!]',
        where: 'paymentType_bool_exp',
      },
      args,

      selection: selectorFn(new paymentType_aggregate()),
    }
    return this.$_select('aggregatePaymentTypes', options) as any
  }

  /**
   * fetch aggregated fields from the table: "payment"
   */
  aggregatePayments<
    Args extends VariabledInput<{
      distinct_on?: Array<payment_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<payment_order_by> | undefined
      where?: payment_bool_exp | undefined
    }>,
    Sel extends Selection<payment_aggregate>
  >(
    args: Args,
    selectorFn: (s: payment_aggregate) => [...Sel]
  ): $Field<'aggregatePayments', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[payment_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[payment_order_by!]',
        where: 'payment_bool_exp',
      },
      args,

      selection: selectorFn(new payment_aggregate()),
    }
    return this.$_select('aggregatePayments', options) as any
  }

  /**
   * fetch aggregated fields from the table: "subclassification"
   */
  aggregateSubclassifications<
    Args extends VariabledInput<{
      distinct_on?: Array<subclassification_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<subclassification_order_by> | undefined
      where?: subclassification_bool_exp | undefined
    }>,
    Sel extends Selection<subclassification_aggregate>
  >(
    args: Args,
    selectorFn: (s: subclassification_aggregate) => [...Sel]
  ): $Field<'aggregateSubclassifications', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[subclassification_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[subclassification_order_by!]',
        where: 'subclassification_bool_exp',
      },
      args,

      selection: selectorFn(new subclassification_aggregate()),
    }
    return this.$_select('aggregateSubclassifications', options) as any
  }

  /**
   * fetch aggregated fields from the table: "tag"
   */
  aggregateTags<
    Args extends VariabledInput<{
      distinct_on?: Array<tag_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<tag_order_by> | undefined
      where?: tag_bool_exp | undefined
    }>,
    Sel extends Selection<tag_aggregate>
  >(
    args: Args,
    selectorFn: (s: tag_aggregate) => [...Sel]
  ): $Field<'aggregateTags', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[tag_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[tag_order_by!]',
        where: 'tag_bool_exp',
      },
      args,

      selection: selectorFn(new tag_aggregate()),
    }
    return this.$_select('aggregateTags', options) as any
  }

  /**
   * fetch aggregated fields from the table: "team_user"
   */
  aggregateTeamUsers<
    Args extends VariabledInput<{
      distinct_on?: Array<teamUser_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<teamUser_order_by> | undefined
      where?: teamUser_bool_exp | undefined
    }>,
    Sel extends Selection<teamUser_aggregate>
  >(
    args: Args,
    selectorFn: (s: teamUser_aggregate) => [...Sel]
  ): $Field<'aggregateTeamUsers', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[teamUser_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[teamUser_order_by!]',
        where: 'teamUser_bool_exp',
      },
      args,

      selection: selectorFn(new teamUser_aggregate()),
    }
    return this.$_select('aggregateTeamUsers', options) as any
  }

  /**
   * fetch aggregated fields from the table: "team"
   */
  aggregateTeams<
    Args extends VariabledInput<{
      distinct_on?: Array<team_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<team_order_by> | undefined
      where?: team_bool_exp | undefined
    }>,
    Sel extends Selection<team_aggregate>
  >(
    args: Args,
    selectorFn: (s: team_aggregate) => [...Sel]
  ): $Field<'aggregateTeams', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[team_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[team_order_by!]',
        where: 'team_bool_exp',
      },
      args,

      selection: selectorFn(new team_aggregate()),
    }
    return this.$_select('aggregateTeams', options) as any
  }

  /**
   * fetch aggregated fields from the table: "unit"
   */
  aggregateUnits<
    Args extends VariabledInput<{
      distinct_on?: Array<unit_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<unit_order_by> | undefined
      where?: unit_bool_exp | undefined
    }>,
    Sel extends Selection<unit_aggregate>
  >(
    args: Args,
    selectorFn: (s: unit_aggregate) => [...Sel]
  ): $Field<'aggregateUnits', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[unit_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[unit_order_by!]',
        where: 'unit_bool_exp',
      },
      args,

      selection: selectorFn(new unit_aggregate()),
    }
    return this.$_select('aggregateUnits', options) as any
  }

  /**
   * fetch aggregated fields from the table: "user_status"
   */
  aggregateUserStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<userStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<userStatus_order_by> | undefined
      where?: userStatus_bool_exp | undefined
    }>,
    Sel extends Selection<userStatus_aggregate>
  >(
    args: Args,
    selectorFn: (s: userStatus_aggregate) => [...Sel]
  ): $Field<'aggregateUserStatuses', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[userStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[userStatus_order_by!]',
        where: 'userStatus_bool_exp',
      },
      args,

      selection: selectorFn(new userStatus_aggregate()),
    }
    return this.$_select('aggregateUserStatuses', options) as any
  }

  /**
   * fetch aggregated fields from the table: "user"
   */
  aggregateUsers<
    Args extends VariabledInput<{
      distinct_on?: Array<user_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<user_order_by> | undefined
      where?: user_bool_exp | undefined
    }>,
    Sel extends Selection<user_aggregate>
  >(
    args: Args,
    selectorFn: (s: user_aggregate) => [...Sel]
  ): $Field<'aggregateUsers', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[user_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[user_order_by!]',
        where: 'user_bool_exp',
      },
      args,

      selection: selectorFn(new user_aggregate()),
    }
    return this.$_select('aggregateUsers', options) as any
  }

  /**
   * fetch aggregated fields from the table: "webhook"
   */
  aggregateWebhooks<
    Args extends VariabledInput<{
      distinct_on?: Array<webhook_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<webhook_order_by> | undefined
      where?: webhook_bool_exp | undefined
    }>,
    Sel extends Selection<webhook_aggregate>
  >(
    args: Args,
    selectorFn: (s: webhook_aggregate) => [...Sel]
  ): $Field<'aggregateWebhooks', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[webhook_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[webhook_order_by!]',
        where: 'webhook_bool_exp',
      },
      args,

      selection: selectorFn(new webhook_aggregate()),
    }
    return this.$_select('aggregateWebhooks', options) as any
  }

  /**
   * fetch data from the table: "booking" using primary key columns
   */
  booking<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<booking>
  >(
    args: Args,
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'booking', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new booking()),
    }
    return this.$_select('booking', options) as any
  }

  /**
   * fetch data from the table: "booking_status" using primary key columns
   */
  bookingStatus<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<bookingStatus>
  >(
    args: Args,
    selectorFn: (s: bookingStatus) => [...Sel]
  ): $Field<'bookingStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new bookingStatus()),
    }
    return this.$_select('bookingStatus', options) as any
  }

  /**
   * fetch data from the table: "booking_status"
   */
  bookingStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<bookingStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<bookingStatus_order_by> | undefined
      where?: bookingStatus_bool_exp | undefined
    }>,
    Sel extends Selection<bookingStatus>
  >(
    args: Args,
    selectorFn: (s: bookingStatus) => [...Sel]
  ): $Field<'bookingStatuses', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[bookingStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[bookingStatus_order_by!]',
        where: 'bookingStatus_bool_exp',
      },
      args,

      selection: selectorFn(new bookingStatus()),
    }
    return this.$_select('bookingStatuses', options) as any
  }

  /**
   * fetch data from the table: "booking_channel"
   */
  booking_channel<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_channel_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_channel_order_by> | undefined
      where?: booking_channel_bool_exp | undefined
    }>,
    Sel extends Selection<booking_channel>
  >(
    args: Args,
    selectorFn: (s: booking_channel) => [...Sel]
  ): $Field<'booking_channel', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_channel_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_channel_order_by!]',
        where: 'booking_channel_bool_exp',
      },
      args,

      selection: selectorFn(new booking_channel()),
    }
    return this.$_select('booking_channel', options) as any
  }

  /**
   * fetch aggregated fields from the table: "booking_channel"
   */
  booking_channel_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_channel_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_channel_order_by> | undefined
      where?: booking_channel_bool_exp | undefined
    }>,
    Sel extends Selection<booking_channel_aggregate>
  >(
    args: Args,
    selectorFn: (s: booking_channel_aggregate) => [...Sel]
  ): $Field<'booking_channel_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_channel_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_channel_order_by!]',
        where: 'booking_channel_bool_exp',
      },
      args,

      selection: selectorFn(new booking_channel_aggregate()),
    }
    return this.$_select('booking_channel_aggregate', options) as any
  }

  /**
   * fetch data from the table: "booking_channel" using primary key columns
   */
  booking_channel_by_pk<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<booking_channel>
  >(
    args: Args,
    selectorFn: (s: booking_channel) => [...Sel]
  ): $Field<'booking_channel_by_pk', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new booking_channel()),
    }
    return this.$_select('booking_channel_by_pk', options) as any
  }

  /**
   * An array relationship
   */
  bookings<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_order_by> | undefined
      where?: booking_bool_exp | undefined
    }>,
    Sel extends Selection<booking>
  >(
    args: Args,
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'bookings', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_order_by!]',
        where: 'booking_bool_exp',
      },
      args,

      selection: selectorFn(new booking()),
    }
    return this.$_select('bookings', options) as any
  }

  /**
   * fetch data from the table: "classification" using primary key columns
   */
  classification<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<classification>
  >(
    args: Args,
    selectorFn: (s: classification) => [...Sel]
  ): $Field<'classification', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new classification()),
    }
    return this.$_select('classification', options) as any
  }

  /**
   * fetch data from the table: "classification"
   */
  classifications<
    Args extends VariabledInput<{
      distinct_on?: Array<classification_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<classification_order_by> | undefined
      where?: classification_bool_exp | undefined
    }>,
    Sel extends Selection<classification>
  >(
    args: Args,
    selectorFn: (s: classification) => [...Sel]
  ): $Field<'classifications', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[classification_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[classification_order_by!]',
        where: 'classification_bool_exp',
      },
      args,

      selection: selectorFn(new classification()),
    }
    return this.$_select('classifications', options) as any
  }

  /**
   * fetch data from the table: "connection" using primary key columns
   */
  connection<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<connection>
  >(
    args: Args,
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'connection', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new connection()),
    }
    return this.$_select('connection', options) as any
  }

  /**
   * An array relationship
   */
  connections<
    Args extends VariabledInput<{
      distinct_on?: Array<connection_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<connection_order_by> | undefined
      where?: connection_bool_exp | undefined
    }>,
    Sel extends Selection<connection>
  >(
    args: Args,
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'connections', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[connection_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[connection_order_by!]',
        where: 'connection_bool_exp',
      },
      args,

      selection: selectorFn(new connection()),
    }
    return this.$_select('connections', options) as any
  }

  /**
   * fetch data from the table: "currency"
   */
  currencies<
    Args extends VariabledInput<{
      distinct_on?: Array<currency_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<currency_order_by> | undefined
      where?: currency_bool_exp | undefined
    }>,
    Sel extends Selection<currency>
  >(
    args: Args,
    selectorFn: (s: currency) => [...Sel]
  ): $Field<'currencies', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[currency_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[currency_order_by!]',
        where: 'currency_bool_exp',
      },
      args,

      selection: selectorFn(new currency()),
    }
    return this.$_select('currencies', options) as any
  }

  /**
   * fetch data from the table: "currency" using primary key columns
   */
  currency<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<currency>
  >(
    args: Args,
    selectorFn: (s: currency) => [...Sel]
  ): $Field<'currency', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new currency()),
    }
    return this.$_select('currency', options) as any
  }

  /**
   * An array relationship
   */
  entities<
    Args extends VariabledInput<{
      distinct_on?: Array<entity_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<entity_order_by> | undefined
      where?: entity_bool_exp | undefined
    }>,
    Sel extends Selection<entity>
  >(
    args: Args,
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'entities', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[entity_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[entity_order_by!]',
        where: 'entity_bool_exp',
      },
      args,

      selection: selectorFn(new entity()),
    }
    return this.$_select('entities', options) as any
  }

  /**
   * fetch data from the table: "entity" using primary key columns
   */
  entity<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<entity>
  >(
    args: Args,
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'entity', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new entity()),
    }
    return this.$_select('entity', options) as any
  }

  /**
   * fetch data from the table: "entity_status" using primary key columns
   */
  entityStatus<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<entityStatus>
  >(
    args: Args,
    selectorFn: (s: entityStatus) => [...Sel]
  ): $Field<'entityStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new entityStatus()),
    }
    return this.$_select('entityStatus', options) as any
  }

  /**
   * fetch data from the table: "entity_status"
   */
  entityStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<entityStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<entityStatus_order_by> | undefined
      where?: entityStatus_bool_exp | undefined
    }>,
    Sel extends Selection<entityStatus>
  >(
    args: Args,
    selectorFn: (s: entityStatus) => [...Sel]
  ): $Field<'entityStatuses', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[entityStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[entityStatus_order_by!]',
        where: 'entityStatus_bool_exp',
      },
      args,

      selection: selectorFn(new entityStatus()),
    }
    return this.$_select('entityStatuses', options) as any
  }

  /**
   * fetch data from the table: "integration" using primary key columns
   */
  integration<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<integration>
  >(
    args: Args,
    selectorFn: (s: integration) => [...Sel]
  ): $Field<'integration', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new integration()),
    }
    return this.$_select('integration', options) as any
  }

  /**
   * fetch data from the table: "integration_type" using primary key columns
   */
  integrationType<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<integrationType>
  >(
    args: Args,
    selectorFn: (s: integrationType) => [...Sel]
  ): $Field<'integrationType', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new integrationType()),
    }
    return this.$_select('integrationType', options) as any
  }

  /**
   * fetch data from the table: "integration_type"
   */
  integrationTypes<
    Args extends VariabledInput<{
      distinct_on?: Array<integrationType_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<integrationType_order_by> | undefined
      where?: integrationType_bool_exp | undefined
    }>,
    Sel extends Selection<integrationType>
  >(
    args: Args,
    selectorFn: (s: integrationType) => [...Sel]
  ): $Field<'integrationTypes', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[integrationType_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[integrationType_order_by!]',
        where: 'integrationType_bool_exp',
      },
      args,

      selection: selectorFn(new integrationType()),
    }
    return this.$_select('integrationTypes', options) as any
  }

  /**
   * An array relationship
   */
  integrations<
    Args extends VariabledInput<{
      distinct_on?: Array<integration_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<integration_order_by> | undefined
      where?: integration_bool_exp | undefined
    }>,
    Sel extends Selection<integration>
  >(
    args: Args,
    selectorFn: (s: integration) => [...Sel]
  ): $Field<'integrations', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[integration_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[integration_order_by!]',
        where: 'integration_bool_exp',
      },
      args,

      selection: selectorFn(new integration()),
    }
    return this.$_select('integrations', options) as any
  }

  /**
   * fetch data from the table: "issue" using primary key columns
   */
  issue<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<issue>
  >(
    args: Args,
    selectorFn: (s: issue) => [...Sel]
  ): $Field<'issue', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new issue()),
    }
    return this.$_select('issue', options) as any
  }

  /**
   * An array relationship
   */
  issues<
    Args extends VariabledInput<{
      distinct_on?: Array<issue_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<issue_order_by> | undefined
      where?: issue_bool_exp | undefined
    }>,
    Sel extends Selection<issue>
  >(
    args: Args,
    selectorFn: (s: issue) => [...Sel]
  ): $Field<'issues', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[issue_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[issue_order_by!]',
        where: 'issue_bool_exp',
      },
      args,

      selection: selectorFn(new issue()),
    }
    return this.$_select('issues', options) as any
  }

  /**
   * fetch data from the table: "job" using primary key columns
   */
  job<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<job>
  >(
    args: Args,
    selectorFn: (s: job) => [...Sel]
  ): $Field<'job', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new job()),
    }
    return this.$_select('job', options) as any
  }

  /**
   * fetch data from the table: "job_method" using primary key columns
   */
  jobMethod<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<jobMethod>
  >(
    args: Args,
    selectorFn: (s: jobMethod) => [...Sel]
  ): $Field<'jobMethod', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new jobMethod()),
    }
    return this.$_select('jobMethod', options) as any
  }

  /**
   * fetch data from the table: "job_method"
   */
  jobMethods<
    Args extends VariabledInput<{
      distinct_on?: Array<jobMethod_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<jobMethod_order_by> | undefined
      where?: jobMethod_bool_exp | undefined
    }>,
    Sel extends Selection<jobMethod>
  >(
    args: Args,
    selectorFn: (s: jobMethod) => [...Sel]
  ): $Field<'jobMethods', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[jobMethod_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[jobMethod_order_by!]',
        where: 'jobMethod_bool_exp',
      },
      args,

      selection: selectorFn(new jobMethod()),
    }
    return this.$_select('jobMethods', options) as any
  }

  /**
   * fetch data from the table: "job_status" using primary key columns
   */
  jobStatus<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<jobStatus>
  >(
    args: Args,
    selectorFn: (s: jobStatus) => [...Sel]
  ): $Field<'jobStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new jobStatus()),
    }
    return this.$_select('jobStatus', options) as any
  }

  /**
   * fetch data from the table: "job_status"
   */
  jobStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<jobStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<jobStatus_order_by> | undefined
      where?: jobStatus_bool_exp | undefined
    }>,
    Sel extends Selection<jobStatus>
  >(
    args: Args,
    selectorFn: (s: jobStatus) => [...Sel]
  ): $Field<'jobStatuses', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[jobStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[jobStatus_order_by!]',
        where: 'jobStatus_bool_exp',
      },
      args,

      selection: selectorFn(new jobStatus()),
    }
    return this.$_select('jobStatuses', options) as any
  }

  /**
   * An array relationship
   */
  jobs<
    Args extends VariabledInput<{
      distinct_on?: Array<job_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<job_order_by> | undefined
      where?: job_bool_exp | undefined
    }>,
    Sel extends Selection<job>
  >(
    args: Args,
    selectorFn: (s: job) => [...Sel]
  ): $Field<'jobs', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[job_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[job_order_by!]',
        where: 'job_bool_exp',
      },
      args,

      selection: selectorFn(new job()),
    }
    return this.$_select('jobs', options) as any
  }

  /**
   * fetch data from the table: "line" using primary key columns
   */
  line<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<line>
  >(
    args: Args,
    selectorFn: (s: line) => [...Sel]
  ): $Field<'line', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new line()),
    }
    return this.$_select('line', options) as any
  }

  /**
   * An array relationship
   */
  lines<
    Args extends VariabledInput<{
      distinct_on?: Array<line_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<line_order_by> | undefined
      where?: line_bool_exp | undefined
    }>,
    Sel extends Selection<line>
  >(
    args: Args,
    selectorFn: (s: line) => [...Sel]
  ): $Field<'lines', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[line_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[line_order_by!]',
        where: 'line_bool_exp',
      },
      args,

      selection: selectorFn(new line()),
    }
    return this.$_select('lines', options) as any
  }

  /**
   * fetch data from the table: "metric" using primary key columns
   */
  metric<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<metric>
  >(
    args: Args,
    selectorFn: (s: metric) => [...Sel]
  ): $Field<'metric', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new metric()),
    }
    return this.$_select('metric', options) as any
  }

  /**
   * An array relationship
   */
  metrics<
    Args extends VariabledInput<{
      distinct_on?: Array<metric_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<metric_order_by> | undefined
      where?: metric_bool_exp | undefined
    }>,
    Sel extends Selection<metric>
  >(
    args: Args,
    selectorFn: (s: metric) => [...Sel]
  ): $Field<'metrics', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[metric_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[metric_order_by!]',
        where: 'metric_bool_exp',
      },
      args,

      selection: selectorFn(new metric()),
    }
    return this.$_select('metrics', options) as any
  }

  /**
   * fetch data from the table: "normalized_type" using primary key columns
   */
  normalizedType<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<normalizedType>
  >(
    args: Args,
    selectorFn: (s: normalizedType) => [...Sel]
  ): $Field<'normalizedType', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new normalizedType()),
    }
    return this.$_select('normalizedType', options) as any
  }

  /**
   * fetch data from the table: "normalized_type"
   */
  normalizedTypes<
    Args extends VariabledInput<{
      distinct_on?: Array<normalizedType_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<normalizedType_order_by> | undefined
      where?: normalizedType_bool_exp | undefined
    }>,
    Sel extends Selection<normalizedType>
  >(
    args: Args,
    selectorFn: (s: normalizedType) => [...Sel]
  ): $Field<'normalizedTypes', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[normalizedType_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[normalizedType_order_by!]',
        where: 'normalizedType_bool_exp',
      },
      args,

      selection: selectorFn(new normalizedType()),
    }
    return this.$_select('normalizedTypes', options) as any
  }

  /**
   * fetch data from the table: "payment" using primary key columns
   */
  payment<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<payment>
  >(
    args: Args,
    selectorFn: (s: payment) => [...Sel]
  ): $Field<'payment', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new payment()),
    }
    return this.$_select('payment', options) as any
  }

  /**
   * fetch data from the table: "payment_status" using primary key columns
   */
  paymentStatus<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<paymentStatus>
  >(
    args: Args,
    selectorFn: (s: paymentStatus) => [...Sel]
  ): $Field<'paymentStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new paymentStatus()),
    }
    return this.$_select('paymentStatus', options) as any
  }

  /**
   * fetch data from the table: "payment_status"
   */
  paymentStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<paymentStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<paymentStatus_order_by> | undefined
      where?: paymentStatus_bool_exp | undefined
    }>,
    Sel extends Selection<paymentStatus>
  >(
    args: Args,
    selectorFn: (s: paymentStatus) => [...Sel]
  ): $Field<'paymentStatuses', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[paymentStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[paymentStatus_order_by!]',
        where: 'paymentStatus_bool_exp',
      },
      args,

      selection: selectorFn(new paymentStatus()),
    }
    return this.$_select('paymentStatuses', options) as any
  }

  /**
   * fetch data from the table: "payment_type" using primary key columns
   */
  paymentType<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<paymentType>
  >(
    args: Args,
    selectorFn: (s: paymentType) => [...Sel]
  ): $Field<'paymentType', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new paymentType()),
    }
    return this.$_select('paymentType', options) as any
  }

  /**
   * fetch data from the table: "payment_type"
   */
  paymentTypes<
    Args extends VariabledInput<{
      distinct_on?: Array<paymentType_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<paymentType_order_by> | undefined
      where?: paymentType_bool_exp | undefined
    }>,
    Sel extends Selection<paymentType>
  >(
    args: Args,
    selectorFn: (s: paymentType) => [...Sel]
  ): $Field<'paymentTypes', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[paymentType_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[paymentType_order_by!]',
        where: 'paymentType_bool_exp',
      },
      args,

      selection: selectorFn(new paymentType()),
    }
    return this.$_select('paymentTypes', options) as any
  }

  /**
   * An array relationship
   */
  payments<
    Args extends VariabledInput<{
      distinct_on?: Array<payment_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<payment_order_by> | undefined
      where?: payment_bool_exp | undefined
    }>,
    Sel extends Selection<payment>
  >(
    args: Args,
    selectorFn: (s: payment) => [...Sel]
  ): $Field<'payments', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[payment_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[payment_order_by!]',
        where: 'payment_bool_exp',
      },
      args,

      selection: selectorFn(new payment()),
    }
    return this.$_select('payments', options) as any
  }

  /**
   * fetch data from the table: "subclassification" using primary key columns
   */
  subclassification<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<subclassification>
  >(
    args: Args,
    selectorFn: (s: subclassification) => [...Sel]
  ): $Field<'subclassification', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new subclassification()),
    }
    return this.$_select('subclassification', options) as any
  }

  /**
   * fetch data from the table: "subclassification"
   */
  subclassifications<
    Args extends VariabledInput<{
      distinct_on?: Array<subclassification_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<subclassification_order_by> | undefined
      where?: subclassification_bool_exp | undefined
    }>,
    Sel extends Selection<subclassification>
  >(
    args: Args,
    selectorFn: (s: subclassification) => [...Sel]
  ): $Field<'subclassifications', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[subclassification_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[subclassification_order_by!]',
        where: 'subclassification_bool_exp',
      },
      args,

      selection: selectorFn(new subclassification()),
    }
    return this.$_select('subclassifications', options) as any
  }

  /**
   * fetch data from the table: "tag" using primary key columns
   */
  tag<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<tag>
  >(
    args: Args,
    selectorFn: (s: tag) => [...Sel]
  ): $Field<'tag', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new tag()),
    }
    return this.$_select('tag', options) as any
  }

  /**
   * An array relationship
   */
  tags<
    Args extends VariabledInput<{
      distinct_on?: Array<tag_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<tag_order_by> | undefined
      where?: tag_bool_exp | undefined
    }>,
    Sel extends Selection<tag>
  >(
    args: Args,
    selectorFn: (s: tag) => [...Sel]
  ): $Field<'tags', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[tag_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[tag_order_by!]',
        where: 'tag_bool_exp',
      },
      args,

      selection: selectorFn(new tag()),
    }
    return this.$_select('tags', options) as any
  }

  /**
   * fetch data from the table: "team" using primary key columns
   */
  team<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<team>
  >(
    args: Args,
    selectorFn: (s: team) => [...Sel]
  ): $Field<'team', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new team()),
    }
    return this.$_select('team', options) as any
  }

  /**
   * fetch data from the table: "team_user" using primary key columns
   */
  teamUser<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<teamUser>
  >(
    args: Args,
    selectorFn: (s: teamUser) => [...Sel]
  ): $Field<'teamUser', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new teamUser()),
    }
    return this.$_select('teamUser', options) as any
  }

  /**
   * fetch data from the table: "team_user"
   */
  teamUsers<
    Args extends VariabledInput<{
      distinct_on?: Array<teamUser_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<teamUser_order_by> | undefined
      where?: teamUser_bool_exp | undefined
    }>,
    Sel extends Selection<teamUser>
  >(
    args: Args,
    selectorFn: (s: teamUser) => [...Sel]
  ): $Field<'teamUsers', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[teamUser_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[teamUser_order_by!]',
        where: 'teamUser_bool_exp',
      },
      args,

      selection: selectorFn(new teamUser()),
    }
    return this.$_select('teamUsers', options) as any
  }

  /**
   * fetch data from the table: "team"
   */
  teams<
    Args extends VariabledInput<{
      distinct_on?: Array<team_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<team_order_by> | undefined
      where?: team_bool_exp | undefined
    }>,
    Sel extends Selection<team>
  >(
    args: Args,
    selectorFn: (s: team) => [...Sel]
  ): $Field<'teams', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[team_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[team_order_by!]',
        where: 'team_bool_exp',
      },
      args,

      selection: selectorFn(new team()),
    }
    return this.$_select('teams', options) as any
  }

  /**
   * fetch data from the table: "unit" using primary key columns
   */
  unit<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<unit>
  >(
    args: Args,
    selectorFn: (s: unit) => [...Sel]
  ): $Field<'unit', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new unit()),
    }
    return this.$_select('unit', options) as any
  }

  /**
   * An array relationship
   */
  units<
    Args extends VariabledInput<{
      distinct_on?: Array<unit_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<unit_order_by> | undefined
      where?: unit_bool_exp | undefined
    }>,
    Sel extends Selection<unit>
  >(
    args: Args,
    selectorFn: (s: unit) => [...Sel]
  ): $Field<'units', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[unit_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[unit_order_by!]',
        where: 'unit_bool_exp',
      },
      args,

      selection: selectorFn(new unit()),
    }
    return this.$_select('units', options) as any
  }

  /**
   * fetch data from the table: "user" using primary key columns
   */
  user<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<user>
  >(
    args: Args,
    selectorFn: (s: user) => [...Sel]
  ): $Field<'user', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new user()),
    }
    return this.$_select('user', options) as any
  }

  /**
   * fetch data from the table: "user_status" using primary key columns
   */
  userStatus<
    Args extends VariabledInput<{
      name: string
    }>,
    Sel extends Selection<userStatus>
  >(
    args: Args,
    selectorFn: (s: userStatus) => [...Sel]
  ): $Field<'userStatus', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        name: 'String!',
      },
      args,

      selection: selectorFn(new userStatus()),
    }
    return this.$_select('userStatus', options) as any
  }

  /**
   * fetch data from the table: "user_status"
   */
  userStatuses<
    Args extends VariabledInput<{
      distinct_on?: Array<userStatus_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<userStatus_order_by> | undefined
      where?: userStatus_bool_exp | undefined
    }>,
    Sel extends Selection<userStatus>
  >(
    args: Args,
    selectorFn: (s: userStatus) => [...Sel]
  ): $Field<'userStatuses', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[userStatus_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[userStatus_order_by!]',
        where: 'userStatus_bool_exp',
      },
      args,

      selection: selectorFn(new userStatus()),
    }
    return this.$_select('userStatuses', options) as any
  }

  /**
   * fetch data from the table: "user"
   */
  users<
    Args extends VariabledInput<{
      distinct_on?: Array<user_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<user_order_by> | undefined
      where?: user_bool_exp | undefined
    }>,
    Sel extends Selection<user>
  >(
    args: Args,
    selectorFn: (s: user) => [...Sel]
  ): $Field<'users', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[user_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[user_order_by!]',
        where: 'user_bool_exp',
      },
      args,

      selection: selectorFn(new user()),
    }
    return this.$_select('users', options) as any
  }

  /**
   * fetch data from the table: "webhook" using primary key columns
   */
  webhook<
    Args extends VariabledInput<{
      id: string
    }>,
    Sel extends Selection<webhook>
  >(
    args: Args,
    selectorFn: (s: webhook) => [...Sel]
  ): $Field<'webhook', GetOutput<Sel> | undefined, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        id: 'uuid!',
      },
      args,

      selection: selectorFn(new webhook()),
    }
    return this.$_select('webhook', options) as any
  }

  /**
   * An array relationship
   */
  webhooks<
    Args extends VariabledInput<{
      distinct_on?: Array<webhook_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<webhook_order_by> | undefined
      where?: webhook_bool_exp | undefined
    }>,
    Sel extends Selection<webhook>
  >(
    args: Args,
    selectorFn: (s: webhook) => [...Sel]
  ): $Field<'webhooks', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[webhook_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[webhook_order_by!]',
        where: 'webhook_bool_exp',
      },
      args,

      selection: selectorFn(new webhook()),
    }
    return this.$_select('webhooks', options) as any
  }
}

/**
 * columns and relationships of "tag"
 */
export class tag extends $Base<'tag'> {
  constructor() {
    super('tag')
  }

  /**
   * An object relationship
   */
  booking<Sel extends Selection<booking>>(
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'booking', GetOutput<Sel>> {
    const options = {
      selection: selectorFn(new booking()),
    }
    return this.$_select('booking', options) as any
  }

  get bookingId(): $Field<'bookingId', string> {
    return this.$_select('bookingId') as any
  }

  /**
   * An object relationship
   */
  connection<Sel extends Selection<connection>>(
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'connection', GetOutput<Sel>> {
    const options = {
      selection: selectorFn(new connection()),
    }
    return this.$_select('connection', options) as any
  }

  get connectionId(): $Field<'connectionId', string> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get id(): $Field<'id', string> {
    return this.$_select('id') as any
  }

  json<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'json', string, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('json', options) as any
  }

  /**
   * An object relationship
   */
  payment<Sel extends Selection<payment>>(
    selectorFn: (s: payment) => [...Sel]
  ): $Field<'payment', GetOutput<Sel>> {
    const options = {
      selection: selectorFn(new payment()),
    }
    return this.$_select('payment', options) as any
  }

  get paymentId(): $Field<'paymentId', string> {
    return this.$_select('paymentId') as any
  }

  /**
   * An object relationship
   */
  team<Sel extends Selection<team>>(
    selectorFn: (s: team) => [...Sel]
  ): $Field<'team', GetOutput<Sel>> {
    const options = {
      selection: selectorFn(new team()),
    }
    return this.$_select('team', options) as any
  }

  get teamId(): $Field<'teamId', string> {
    return this.$_select('teamId') as any
  }

  get type(): $Field<'type', string> {
    return this.$_select('type') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string> {
    return this.$_select('uniqueRef') as any
  }

  /**
   * An object relationship
   */
  unit<Sel extends Selection<unit>>(
    selectorFn: (s: unit) => [...Sel]
  ): $Field<'unit', GetOutput<Sel>> {
    const options = {
      selection: selectorFn(new unit()),
    }
    return this.$_select('unit', options) as any
  }

  get unitId(): $Field<'unitId', string> {
    return this.$_select('unitId') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * aggregated selection of "tag"
 */
export class tag_aggregate extends $Base<'tag_aggregate'> {
  constructor() {
    super('tag_aggregate')
  }

  aggregate<Sel extends Selection<tag_aggregate_fields>>(
    selectorFn: (s: tag_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new tag_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<tag>>(
    selectorFn: (s: tag) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new tag()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "tag"
 */
export class tag_aggregate_fields extends $Base<'tag_aggregate_fields'> {
  constructor() {
    super('tag_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<tag_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[tag_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<tag_max_fields>>(
    selectorFn: (s: tag_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new tag_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<tag_min_fields>>(
    selectorFn: (s: tag_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new tag_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * order by aggregate values of table "tag"
 */
export type tag_aggregate_order_by = {
  count?: order_by | undefined
  max?: tag_max_order_by | undefined
  min?: tag_min_order_by | undefined
}

/**
 * append existing jsonb value of filtered columns with new jsonb value
 */
export type tag_append_input = {
  json?: string | undefined
}

/**
 * input type for inserting array relation for remote table "tag"
 */
export type tag_arr_rel_insert_input = {
  data: Array<tag_insert_input>
  on_conflict?: tag_on_conflict | undefined
}

/**
 * Boolean expression to filter rows from the table "tag". All fields are combined with a logical 'AND'.
 */
export type tag_bool_exp = {
  _and?: Array<tag_bool_exp> | undefined
  _not?: tag_bool_exp | undefined
  _or?: Array<tag_bool_exp> | undefined
  booking?: booking_bool_exp | undefined
  bookingId?: uuid_comparison_exp | undefined
  connection?: connection_bool_exp | undefined
  connectionId?: uuid_comparison_exp | undefined
  createdAt?: timestamptz_comparison_exp | undefined
  id?: uuid_comparison_exp | undefined
  json?: jsonb_comparison_exp | undefined
  payment?: payment_bool_exp | undefined
  paymentId?: uuid_comparison_exp | undefined
  team?: team_bool_exp | undefined
  teamId?: uuid_comparison_exp | undefined
  type?: String_comparison_exp | undefined
  uniqueRef?: String_comparison_exp | undefined
  unit?: unit_bool_exp | undefined
  unitId?: uuid_comparison_exp | undefined
  updatedAt?: timestamptz_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "tag"
 */
export enum tag_constraint {
  /**
   * unique or primary key constraint
   */
  tag_pkey = 'tag_pkey',
}

/**
 * delete the field or element with specified path (for JSON arrays, negative integers count from the end)
 */
export type tag_delete_at_path_input = {
  json?: Array<string> | undefined
}

/**
 * delete the array element with specified index (negative integers count from the
end). throws an error if top level container is not an array
 */
export type tag_delete_elem_input = {
  json?: number | undefined
}

/**
 * delete key/value pair or string element. key/value pairs are matched based on their key value
 */
export type tag_delete_key_input = {
  json?: string | undefined
}

/**
 * input type for inserting data into table "tag"
 */
export type tag_insert_input = {
  booking?: booking_obj_rel_insert_input | undefined
  bookingId?: string | undefined
  connection?: connection_obj_rel_insert_input | undefined
  connectionId?: string | undefined
  createdAt?: string | undefined
  id?: string | undefined
  json?: string | undefined
  payment?: payment_obj_rel_insert_input | undefined
  paymentId?: string | undefined
  team?: team_obj_rel_insert_input | undefined
  teamId?: string | undefined
  type?: string | undefined
  uniqueRef?: string | undefined
  unit?: unit_obj_rel_insert_input | undefined
  unitId?: string | undefined
  updatedAt?: string | undefined
}

/**
 * aggregate max on columns
 */
export class tag_max_fields extends $Base<'tag_max_fields'> {
  constructor() {
    super('tag_max_fields')
  }

  get bookingId(): $Field<'bookingId', string | undefined> {
    return this.$_select('bookingId') as any
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get paymentId(): $Field<'paymentId', string | undefined> {
    return this.$_select('paymentId') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get type(): $Field<'type', string | undefined> {
    return this.$_select('type') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get unitId(): $Field<'unitId', string | undefined> {
    return this.$_select('unitId') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * order by max() on columns of table "tag"
 */
export type tag_max_order_by = {
  bookingId?: order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  id?: order_by | undefined
  paymentId?: order_by | undefined
  teamId?: order_by | undefined
  type?: order_by | undefined
  uniqueRef?: order_by | undefined
  unitId?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * aggregate min on columns
 */
export class tag_min_fields extends $Base<'tag_min_fields'> {
  constructor() {
    super('tag_min_fields')
  }

  get bookingId(): $Field<'bookingId', string | undefined> {
    return this.$_select('bookingId') as any
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get paymentId(): $Field<'paymentId', string | undefined> {
    return this.$_select('paymentId') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get type(): $Field<'type', string | undefined> {
    return this.$_select('type') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get unitId(): $Field<'unitId', string | undefined> {
    return this.$_select('unitId') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * order by min() on columns of table "tag"
 */
export type tag_min_order_by = {
  bookingId?: order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  id?: order_by | undefined
  paymentId?: order_by | undefined
  teamId?: order_by | undefined
  type?: order_by | undefined
  uniqueRef?: order_by | undefined
  unitId?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * response of any mutation on the table "tag"
 */
export class tag_mutation_response extends $Base<'tag_mutation_response'> {
  constructor() {
    super('tag_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<tag>>(
    selectorFn: (s: tag) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new tag()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "tag"
 */
export type tag_on_conflict = {
  constraint: tag_constraint
  update_columns: Array<tag_update_column>
  where?: tag_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "tag".
 */
export type tag_order_by = {
  booking?: booking_order_by | undefined
  bookingId?: order_by | undefined
  connection?: connection_order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  id?: order_by | undefined
  json?: order_by | undefined
  payment?: payment_order_by | undefined
  paymentId?: order_by | undefined
  team?: team_order_by | undefined
  teamId?: order_by | undefined
  type?: order_by | undefined
  uniqueRef?: order_by | undefined
  unit?: unit_order_by | undefined
  unitId?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * primary key columns input for table: tag
 */
export type tag_pk_columns_input = {
  id: string
}

/**
 * prepend existing jsonb value of filtered columns with new jsonb value
 */
export type tag_prepend_input = {
  json?: string | undefined
}

/**
 * select columns of table "tag"
 */
export enum tag_select_column {
  /**
   * column name
   */
  bookingId = 'bookingId',

  /**
   * column name
   */
  connectionId = 'connectionId',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  json = 'json',

  /**
   * column name
   */
  paymentId = 'paymentId',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  type = 'type',

  /**
   * column name
   */
  uniqueRef = 'uniqueRef',

  /**
   * column name
   */
  unitId = 'unitId',

  /**
   * column name
   */
  updatedAt = 'updatedAt',
}

/**
 * input type for updating data in table "tag"
 */
export type tag_set_input = {
  bookingId?: string | undefined
  connectionId?: string | undefined
  createdAt?: string | undefined
  id?: string | undefined
  json?: string | undefined
  paymentId?: string | undefined
  teamId?: string | undefined
  type?: string | undefined
  uniqueRef?: string | undefined
  unitId?: string | undefined
  updatedAt?: string | undefined
}

/**
 * update columns of table "tag"
 */
export enum tag_update_column {
  /**
   * column name
   */
  bookingId = 'bookingId',

  /**
   * column name
   */
  connectionId = 'connectionId',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  json = 'json',

  /**
   * column name
   */
  paymentId = 'paymentId',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  type = 'type',

  /**
   * column name
   */
  uniqueRef = 'uniqueRef',

  /**
   * column name
   */
  unitId = 'unitId',

  /**
   * column name
   */
  updatedAt = 'updatedAt',
}

/**
 * columns and relationships of "team"
 */
export class team extends $Base<'team'> {
  constructor() {
    super('team')
  }

  get address(): $Field<'address', string | undefined> {
    return this.$_select('address') as any
  }

  /**
   * An array relationship
   */
  bookings<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_order_by> | undefined
      where?: booking_bool_exp | undefined
    }>,
    Sel extends Selection<booking>
  >(
    args: Args,
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'bookings', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_order_by!]',
        where: 'booking_bool_exp',
      },
      args,

      selection: selectorFn(new booking()),
    }
    return this.$_select('bookings', options) as any
  }

  /**
   * An aggregate relationship
   */
  bookings_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_order_by> | undefined
      where?: booking_bool_exp | undefined
    }>,
    Sel extends Selection<booking_aggregate>
  >(
    args: Args,
    selectorFn: (s: booking_aggregate) => [...Sel]
  ): $Field<'bookings_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_order_by!]',
        where: 'booking_bool_exp',
      },
      args,

      selection: selectorFn(new booking_aggregate()),
    }
    return this.$_select('bookings_aggregate', options) as any
  }

  get commissionPercentage(): $Field<'commissionPercentage', string | undefined> {
    return this.$_select('commissionPercentage') as any
  }

  /**
   * An array relationship
   */
  connections<
    Args extends VariabledInput<{
      distinct_on?: Array<connection_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<connection_order_by> | undefined
      where?: connection_bool_exp | undefined
    }>,
    Sel extends Selection<connection>
  >(
    args: Args,
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'connections', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[connection_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[connection_order_by!]',
        where: 'connection_bool_exp',
      },
      args,

      selection: selectorFn(new connection()),
    }
    return this.$_select('connections', options) as any
  }

  /**
   * An aggregate relationship
   */
  connections_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<connection_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<connection_order_by> | undefined
      where?: connection_bool_exp | undefined
    }>,
    Sel extends Selection<connection_aggregate>
  >(
    args: Args,
    selectorFn: (s: connection_aggregate) => [...Sel]
  ): $Field<'connections_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[connection_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[connection_order_by!]',
        where: 'connection_bool_exp',
      },
      args,

      selection: selectorFn(new connection_aggregate()),
    }
    return this.$_select('connections_aggregate', options) as any
  }

  get createdAt(): $Field<'createdAt', string> {
    return this.$_select('createdAt') as any
  }

  get email(): $Field<'email', string | undefined> {
    return this.$_select('email') as any
  }

  /**
   * An array relationship
   */
  entities<
    Args extends VariabledInput<{
      distinct_on?: Array<entity_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<entity_order_by> | undefined
      where?: entity_bool_exp | undefined
    }>,
    Sel extends Selection<entity>
  >(
    args: Args,
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'entities', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[entity_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[entity_order_by!]',
        where: 'entity_bool_exp',
      },
      args,

      selection: selectorFn(new entity()),
    }
    return this.$_select('entities', options) as any
  }

  /**
   * An aggregate relationship
   */
  entities_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<entity_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<entity_order_by> | undefined
      where?: entity_bool_exp | undefined
    }>,
    Sel extends Selection<entity_aggregate>
  >(
    args: Args,
    selectorFn: (s: entity_aggregate) => [...Sel]
  ): $Field<'entities_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[entity_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[entity_order_by!]',
        where: 'entity_bool_exp',
      },
      args,

      selection: selectorFn(new entity_aggregate()),
    }
    return this.$_select('entities_aggregate', options) as any
  }

  get id(): $Field<'id', string> {
    return this.$_select('id') as any
  }

  /**
   * An array relationship
   */
  integrations<
    Args extends VariabledInput<{
      distinct_on?: Array<integration_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<integration_order_by> | undefined
      where?: integration_bool_exp | undefined
    }>,
    Sel extends Selection<integration>
  >(
    args: Args,
    selectorFn: (s: integration) => [...Sel]
  ): $Field<'integrations', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[integration_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[integration_order_by!]',
        where: 'integration_bool_exp',
      },
      args,

      selection: selectorFn(new integration()),
    }
    return this.$_select('integrations', options) as any
  }

  /**
   * An aggregate relationship
   */
  integrations_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<integration_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<integration_order_by> | undefined
      where?: integration_bool_exp | undefined
    }>,
    Sel extends Selection<integration_aggregate>
  >(
    args: Args,
    selectorFn: (s: integration_aggregate) => [...Sel]
  ): $Field<'integrations_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[integration_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[integration_order_by!]',
        where: 'integration_bool_exp',
      },
      args,

      selection: selectorFn(new integration_aggregate()),
    }
    return this.$_select('integrations_aggregate', options) as any
  }

  get isActive(): $Field<'isActive', boolean | undefined> {
    return this.$_select('isActive') as any
  }

  get isTest(): $Field<'isTest', boolean | undefined> {
    return this.$_select('isTest') as any
  }

  /**
   * An array relationship
   */
  issues<
    Args extends VariabledInput<{
      distinct_on?: Array<issue_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<issue_order_by> | undefined
      where?: issue_bool_exp | undefined
    }>,
    Sel extends Selection<issue>
  >(
    args: Args,
    selectorFn: (s: issue) => [...Sel]
  ): $Field<'issues', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[issue_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[issue_order_by!]',
        where: 'issue_bool_exp',
      },
      args,

      selection: selectorFn(new issue()),
    }
    return this.$_select('issues', options) as any
  }

  /**
   * An aggregate relationship
   */
  issues_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<issue_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<issue_order_by> | undefined
      where?: issue_bool_exp | undefined
    }>,
    Sel extends Selection<issue_aggregate>
  >(
    args: Args,
    selectorFn: (s: issue_aggregate) => [...Sel]
  ): $Field<'issues_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[issue_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[issue_order_by!]',
        where: 'issue_bool_exp',
      },
      args,

      selection: selectorFn(new issue_aggregate()),
    }
    return this.$_select('issues_aggregate', options) as any
  }

  /**
   * An array relationship
   */
  jobs<
    Args extends VariabledInput<{
      distinct_on?: Array<job_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<job_order_by> | undefined
      where?: job_bool_exp | undefined
    }>,
    Sel extends Selection<job>
  >(
    args: Args,
    selectorFn: (s: job) => [...Sel]
  ): $Field<'jobs', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[job_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[job_order_by!]',
        where: 'job_bool_exp',
      },
      args,

      selection: selectorFn(new job()),
    }
    return this.$_select('jobs', options) as any
  }

  /**
   * An aggregate relationship
   */
  jobs_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<job_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<job_order_by> | undefined
      where?: job_bool_exp | undefined
    }>,
    Sel extends Selection<job_aggregate>
  >(
    args: Args,
    selectorFn: (s: job_aggregate) => [...Sel]
  ): $Field<'jobs_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[job_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[job_order_by!]',
        where: 'job_bool_exp',
      },
      args,

      selection: selectorFn(new job_aggregate()),
    }
    return this.$_select('jobs_aggregate', options) as any
  }

  /**
   * An array relationship
   */
  lines<
    Args extends VariabledInput<{
      distinct_on?: Array<line_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<line_order_by> | undefined
      where?: line_bool_exp | undefined
    }>,
    Sel extends Selection<line>
  >(
    args: Args,
    selectorFn: (s: line) => [...Sel]
  ): $Field<'lines', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[line_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[line_order_by!]',
        where: 'line_bool_exp',
      },
      args,

      selection: selectorFn(new line()),
    }
    return this.$_select('lines', options) as any
  }

  /**
   * An aggregate relationship
   */
  lines_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<line_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<line_order_by> | undefined
      where?: line_bool_exp | undefined
    }>,
    Sel extends Selection<line_aggregate>
  >(
    args: Args,
    selectorFn: (s: line_aggregate) => [...Sel]
  ): $Field<'lines_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[line_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[line_order_by!]',
        where: 'line_bool_exp',
      },
      args,

      selection: selectorFn(new line_aggregate()),
    }
    return this.$_select('lines_aggregate', options) as any
  }

  /**
   * An array relationship
   */
  members<
    Args extends VariabledInput<{
      distinct_on?: Array<teamUser_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<teamUser_order_by> | undefined
      where?: teamUser_bool_exp | undefined
    }>,
    Sel extends Selection<teamUser>
  >(
    args: Args,
    selectorFn: (s: teamUser) => [...Sel]
  ): $Field<'members', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[teamUser_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[teamUser_order_by!]',
        where: 'teamUser_bool_exp',
      },
      args,

      selection: selectorFn(new teamUser()),
    }
    return this.$_select('members', options) as any
  }

  /**
   * An aggregate relationship
   */
  members_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<teamUser_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<teamUser_order_by> | undefined
      where?: teamUser_bool_exp | undefined
    }>,
    Sel extends Selection<teamUser_aggregate>
  >(
    args: Args,
    selectorFn: (s: teamUser_aggregate) => [...Sel]
  ): $Field<'members_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[teamUser_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[teamUser_order_by!]',
        where: 'teamUser_bool_exp',
      },
      args,

      selection: selectorFn(new teamUser_aggregate()),
    }
    return this.$_select('members_aggregate', options) as any
  }

  /**
   * An array relationship
   */
  metrics<
    Args extends VariabledInput<{
      distinct_on?: Array<metric_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<metric_order_by> | undefined
      where?: metric_bool_exp | undefined
    }>,
    Sel extends Selection<metric>
  >(
    args: Args,
    selectorFn: (s: metric) => [...Sel]
  ): $Field<'metrics', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[metric_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[metric_order_by!]',
        where: 'metric_bool_exp',
      },
      args,

      selection: selectorFn(new metric()),
    }
    return this.$_select('metrics', options) as any
  }

  /**
   * An aggregate relationship
   */
  metrics_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<metric_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<metric_order_by> | undefined
      where?: metric_bool_exp | undefined
    }>,
    Sel extends Selection<metric_aggregate>
  >(
    args: Args,
    selectorFn: (s: metric_aggregate) => [...Sel]
  ): $Field<'metrics_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[metric_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[metric_order_by!]',
        where: 'metric_bool_exp',
      },
      args,

      selection: selectorFn(new metric_aggregate()),
    }
    return this.$_select('metrics_aggregate', options) as any
  }

  get name(): $Field<'name', string> {
    return this.$_select('name') as any
  }

  /**
   * An array relationship
   */
  payments<
    Args extends VariabledInput<{
      distinct_on?: Array<payment_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<payment_order_by> | undefined
      where?: payment_bool_exp | undefined
    }>,
    Sel extends Selection<payment>
  >(
    args: Args,
    selectorFn: (s: payment) => [...Sel]
  ): $Field<'payments', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[payment_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[payment_order_by!]',
        where: 'payment_bool_exp',
      },
      args,

      selection: selectorFn(new payment()),
    }
    return this.$_select('payments', options) as any
  }

  /**
   * An aggregate relationship
   */
  payments_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<payment_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<payment_order_by> | undefined
      where?: payment_bool_exp | undefined
    }>,
    Sel extends Selection<payment_aggregate>
  >(
    args: Args,
    selectorFn: (s: payment_aggregate) => [...Sel]
  ): $Field<'payments_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[payment_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[payment_order_by!]',
        where: 'payment_bool_exp',
      },
      args,

      selection: selectorFn(new payment_aggregate()),
    }
    return this.$_select('payments_aggregate', options) as any
  }

  get stripeId(): $Field<'stripeId', string | undefined> {
    return this.$_select('stripeId') as any
  }

  get stripeSubscriptionItemId(): $Field<'stripeSubscriptionItemId', string | undefined> {
    return this.$_select('stripeSubscriptionItemId') as any
  }

  get supportEmail(): $Field<'supportEmail', string | undefined> {
    return this.$_select('supportEmail') as any
  }

  get supportPhone(): $Field<'supportPhone', string | undefined> {
    return this.$_select('supportPhone') as any
  }

  /**
   * An array relationship
   */
  tags<
    Args extends VariabledInput<{
      distinct_on?: Array<tag_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<tag_order_by> | undefined
      where?: tag_bool_exp | undefined
    }>,
    Sel extends Selection<tag>
  >(
    args: Args,
    selectorFn: (s: tag) => [...Sel]
  ): $Field<'tags', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[tag_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[tag_order_by!]',
        where: 'tag_bool_exp',
      },
      args,

      selection: selectorFn(new tag()),
    }
    return this.$_select('tags', options) as any
  }

  /**
   * An aggregate relationship
   */
  tags_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<tag_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<tag_order_by> | undefined
      where?: tag_bool_exp | undefined
    }>,
    Sel extends Selection<tag_aggregate>
  >(
    args: Args,
    selectorFn: (s: tag_aggregate) => [...Sel]
  ): $Field<'tags_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[tag_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[tag_order_by!]',
        where: 'tag_bool_exp',
      },
      args,

      selection: selectorFn(new tag_aggregate()),
    }
    return this.$_select('tags_aggregate', options) as any
  }

  /**
   * An array relationship
   */
  units<
    Args extends VariabledInput<{
      distinct_on?: Array<unit_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<unit_order_by> | undefined
      where?: unit_bool_exp | undefined
    }>,
    Sel extends Selection<unit>
  >(
    args: Args,
    selectorFn: (s: unit) => [...Sel]
  ): $Field<'units', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[unit_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[unit_order_by!]',
        where: 'unit_bool_exp',
      },
      args,

      selection: selectorFn(new unit()),
    }
    return this.$_select('units', options) as any
  }

  /**
   * An aggregate relationship
   */
  units_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<unit_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<unit_order_by> | undefined
      where?: unit_bool_exp | undefined
    }>,
    Sel extends Selection<unit_aggregate>
  >(
    args: Args,
    selectorFn: (s: unit_aggregate) => [...Sel]
  ): $Field<'units_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[unit_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[unit_order_by!]',
        where: 'unit_bool_exp',
      },
      args,

      selection: selectorFn(new unit_aggregate()),
    }
    return this.$_select('units_aggregate', options) as any
  }

  /**
   * An array relationship
   */
  webhooks<
    Args extends VariabledInput<{
      distinct_on?: Array<webhook_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<webhook_order_by> | undefined
      where?: webhook_bool_exp | undefined
    }>,
    Sel extends Selection<webhook>
  >(
    args: Args,
    selectorFn: (s: webhook) => [...Sel]
  ): $Field<'webhooks', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[webhook_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[webhook_order_by!]',
        where: 'webhook_bool_exp',
      },
      args,

      selection: selectorFn(new webhook()),
    }
    return this.$_select('webhooks', options) as any
  }

  /**
   * An aggregate relationship
   */
  webhooks_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<webhook_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<webhook_order_by> | undefined
      where?: webhook_bool_exp | undefined
    }>,
    Sel extends Selection<webhook_aggregate>
  >(
    args: Args,
    selectorFn: (s: webhook_aggregate) => [...Sel]
  ): $Field<'webhooks_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[webhook_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[webhook_order_by!]',
        where: 'webhook_bool_exp',
      },
      args,

      selection: selectorFn(new webhook_aggregate()),
    }
    return this.$_select('webhooks_aggregate', options) as any
  }

  get website(): $Field<'website', string | undefined> {
    return this.$_select('website') as any
  }
}

/**
 * aggregated selection of "team"
 */
export class team_aggregate extends $Base<'team_aggregate'> {
  constructor() {
    super('team_aggregate')
  }

  aggregate<Sel extends Selection<team_aggregate_fields>>(
    selectorFn: (s: team_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<team>>(
    selectorFn: (s: team) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new team()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "team"
 */
export class team_aggregate_fields extends $Base<'team_aggregate_fields'> {
  constructor() {
    super('team_aggregate_fields')
  }

  avg<Sel extends Selection<team_avg_fields>>(
    selectorFn: (s: team_avg_fields) => [...Sel]
  ): $Field<'avg', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team_avg_fields()),
    }
    return this.$_select('avg', options) as any
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<team_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[team_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<team_max_fields>>(
    selectorFn: (s: team_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<team_min_fields>>(
    selectorFn: (s: team_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team_min_fields()),
    }
    return this.$_select('min', options) as any
  }

  stddev<Sel extends Selection<team_stddev_fields>>(
    selectorFn: (s: team_stddev_fields) => [...Sel]
  ): $Field<'stddev', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team_stddev_fields()),
    }
    return this.$_select('stddev', options) as any
  }

  stddev_pop<Sel extends Selection<team_stddev_pop_fields>>(
    selectorFn: (s: team_stddev_pop_fields) => [...Sel]
  ): $Field<'stddev_pop', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team_stddev_pop_fields()),
    }
    return this.$_select('stddev_pop', options) as any
  }

  stddev_samp<Sel extends Selection<team_stddev_samp_fields>>(
    selectorFn: (s: team_stddev_samp_fields) => [...Sel]
  ): $Field<'stddev_samp', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team_stddev_samp_fields()),
    }
    return this.$_select('stddev_samp', options) as any
  }

  sum<Sel extends Selection<team_sum_fields>>(
    selectorFn: (s: team_sum_fields) => [...Sel]
  ): $Field<'sum', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team_sum_fields()),
    }
    return this.$_select('sum', options) as any
  }

  var_pop<Sel extends Selection<team_var_pop_fields>>(
    selectorFn: (s: team_var_pop_fields) => [...Sel]
  ): $Field<'var_pop', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team_var_pop_fields()),
    }
    return this.$_select('var_pop', options) as any
  }

  var_samp<Sel extends Selection<team_var_samp_fields>>(
    selectorFn: (s: team_var_samp_fields) => [...Sel]
  ): $Field<'var_samp', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team_var_samp_fields()),
    }
    return this.$_select('var_samp', options) as any
  }

  variance<Sel extends Selection<team_variance_fields>>(
    selectorFn: (s: team_variance_fields) => [...Sel]
  ): $Field<'variance', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team_variance_fields()),
    }
    return this.$_select('variance', options) as any
  }
}

/**
 * aggregate avg on columns
 */
export class team_avg_fields extends $Base<'team_avg_fields'> {
  constructor() {
    super('team_avg_fields')
  }

  get commissionPercentage(): $Field<'commissionPercentage', number | undefined> {
    return this.$_select('commissionPercentage') as any
  }
}

/**
 * Boolean expression to filter rows from the table "team". All fields are combined with a logical 'AND'.
 */
export type team_bool_exp = {
  _and?: Array<team_bool_exp> | undefined
  _not?: team_bool_exp | undefined
  _or?: Array<team_bool_exp> | undefined
  address?: String_comparison_exp | undefined
  bookings?: booking_bool_exp | undefined
  commissionPercentage?: numeric_comparison_exp | undefined
  connections?: connection_bool_exp | undefined
  createdAt?: timestamptz_comparison_exp | undefined
  email?: String_comparison_exp | undefined
  entities?: entity_bool_exp | undefined
  id?: uuid_comparison_exp | undefined
  integrations?: integration_bool_exp | undefined
  isActive?: Boolean_comparison_exp | undefined
  isTest?: Boolean_comparison_exp | undefined
  issues?: issue_bool_exp | undefined
  jobs?: job_bool_exp | undefined
  lines?: line_bool_exp | undefined
  members?: teamUser_bool_exp | undefined
  metrics?: metric_bool_exp | undefined
  name?: String_comparison_exp | undefined
  payments?: payment_bool_exp | undefined
  stripeId?: String_comparison_exp | undefined
  stripeSubscriptionItemId?: String_comparison_exp | undefined
  supportEmail?: String_comparison_exp | undefined
  supportPhone?: String_comparison_exp | undefined
  tags?: tag_bool_exp | undefined
  units?: unit_bool_exp | undefined
  webhooks?: webhook_bool_exp | undefined
  website?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "team"
 */
export enum team_constraint {
  /**
   * unique or primary key constraint
   */
  team_pkey = 'team_pkey',
}

/**
 * input type for incrementing numeric columns in table "team"
 */
export type team_inc_input = {
  commissionPercentage?: string | undefined
}

/**
 * input type for inserting data into table "team"
 */
export type team_insert_input = {
  address?: string | undefined
  bookings?: booking_arr_rel_insert_input | undefined
  commissionPercentage?: string | undefined
  connections?: connection_arr_rel_insert_input | undefined
  createdAt?: string | undefined
  email?: string | undefined
  entities?: entity_arr_rel_insert_input | undefined
  id?: string | undefined
  integrations?: integration_arr_rel_insert_input | undefined
  isActive?: boolean | undefined
  isTest?: boolean | undefined
  issues?: issue_arr_rel_insert_input | undefined
  jobs?: job_arr_rel_insert_input | undefined
  lines?: line_arr_rel_insert_input | undefined
  members?: teamUser_arr_rel_insert_input | undefined
  metrics?: metric_arr_rel_insert_input | undefined
  name?: string | undefined
  payments?: payment_arr_rel_insert_input | undefined
  stripeId?: string | undefined
  stripeSubscriptionItemId?: string | undefined
  supportEmail?: string | undefined
  supportPhone?: string | undefined
  tags?: tag_arr_rel_insert_input | undefined
  units?: unit_arr_rel_insert_input | undefined
  webhooks?: webhook_arr_rel_insert_input | undefined
  website?: string | undefined
}

/**
 * aggregate max on columns
 */
export class team_max_fields extends $Base<'team_max_fields'> {
  constructor() {
    super('team_max_fields')
  }

  get address(): $Field<'address', string | undefined> {
    return this.$_select('address') as any
  }

  get commissionPercentage(): $Field<'commissionPercentage', string | undefined> {
    return this.$_select('commissionPercentage') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get email(): $Field<'email', string | undefined> {
    return this.$_select('email') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }

  get stripeId(): $Field<'stripeId', string | undefined> {
    return this.$_select('stripeId') as any
  }

  get stripeSubscriptionItemId(): $Field<'stripeSubscriptionItemId', string | undefined> {
    return this.$_select('stripeSubscriptionItemId') as any
  }

  get supportEmail(): $Field<'supportEmail', string | undefined> {
    return this.$_select('supportEmail') as any
  }

  get supportPhone(): $Field<'supportPhone', string | undefined> {
    return this.$_select('supportPhone') as any
  }

  get website(): $Field<'website', string | undefined> {
    return this.$_select('website') as any
  }
}

/**
 * aggregate min on columns
 */
export class team_min_fields extends $Base<'team_min_fields'> {
  constructor() {
    super('team_min_fields')
  }

  get address(): $Field<'address', string | undefined> {
    return this.$_select('address') as any
  }

  get commissionPercentage(): $Field<'commissionPercentage', string | undefined> {
    return this.$_select('commissionPercentage') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get email(): $Field<'email', string | undefined> {
    return this.$_select('email') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }

  get stripeId(): $Field<'stripeId', string | undefined> {
    return this.$_select('stripeId') as any
  }

  get stripeSubscriptionItemId(): $Field<'stripeSubscriptionItemId', string | undefined> {
    return this.$_select('stripeSubscriptionItemId') as any
  }

  get supportEmail(): $Field<'supportEmail', string | undefined> {
    return this.$_select('supportEmail') as any
  }

  get supportPhone(): $Field<'supportPhone', string | undefined> {
    return this.$_select('supportPhone') as any
  }

  get website(): $Field<'website', string | undefined> {
    return this.$_select('website') as any
  }
}

/**
 * response of any mutation on the table "team"
 */
export class team_mutation_response extends $Base<'team_mutation_response'> {
  constructor() {
    super('team_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<team>>(
    selectorFn: (s: team) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new team()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * input type for inserting object relation for remote table "team"
 */
export type team_obj_rel_insert_input = {
  data: team_insert_input
  on_conflict?: team_on_conflict | undefined
}

/**
 * on conflict condition type for table "team"
 */
export type team_on_conflict = {
  constraint: team_constraint
  update_columns: Array<team_update_column>
  where?: team_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "team".
 */
export type team_order_by = {
  address?: order_by | undefined
  bookings_aggregate?: booking_aggregate_order_by | undefined
  commissionPercentage?: order_by | undefined
  connections_aggregate?: connection_aggregate_order_by | undefined
  createdAt?: order_by | undefined
  email?: order_by | undefined
  entities_aggregate?: entity_aggregate_order_by | undefined
  id?: order_by | undefined
  integrations_aggregate?: integration_aggregate_order_by | undefined
  isActive?: order_by | undefined
  isTest?: order_by | undefined
  issues_aggregate?: issue_aggregate_order_by | undefined
  jobs_aggregate?: job_aggregate_order_by | undefined
  lines_aggregate?: line_aggregate_order_by | undefined
  members_aggregate?: teamUser_aggregate_order_by | undefined
  metrics_aggregate?: metric_aggregate_order_by | undefined
  name?: order_by | undefined
  payments_aggregate?: payment_aggregate_order_by | undefined
  stripeId?: order_by | undefined
  stripeSubscriptionItemId?: order_by | undefined
  supportEmail?: order_by | undefined
  supportPhone?: order_by | undefined
  tags_aggregate?: tag_aggregate_order_by | undefined
  units_aggregate?: unit_aggregate_order_by | undefined
  webhooks_aggregate?: webhook_aggregate_order_by | undefined
  website?: order_by | undefined
}

/**
 * primary key columns input for table: team
 */
export type team_pk_columns_input = {
  id: string
}

/**
 * select columns of table "team"
 */
export enum team_select_column {
  /**
   * column name
   */
  address = 'address',

  /**
   * column name
   */
  commissionPercentage = 'commissionPercentage',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  email = 'email',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  isActive = 'isActive',

  /**
   * column name
   */
  isTest = 'isTest',

  /**
   * column name
   */
  name = 'name',

  /**
   * column name
   */
  stripeId = 'stripeId',

  /**
   * column name
   */
  stripeSubscriptionItemId = 'stripeSubscriptionItemId',

  /**
   * column name
   */
  supportEmail = 'supportEmail',

  /**
   * column name
   */
  supportPhone = 'supportPhone',

  /**
   * column name
   */
  website = 'website',
}

/**
 * input type for updating data in table "team"
 */
export type team_set_input = {
  address?: string | undefined
  commissionPercentage?: string | undefined
  createdAt?: string | undefined
  email?: string | undefined
  id?: string | undefined
  isActive?: boolean | undefined
  isTest?: boolean | undefined
  name?: string | undefined
  stripeId?: string | undefined
  stripeSubscriptionItemId?: string | undefined
  supportEmail?: string | undefined
  supportPhone?: string | undefined
  website?: string | undefined
}

/**
 * aggregate stddev on columns
 */
export class team_stddev_fields extends $Base<'team_stddev_fields'> {
  constructor() {
    super('team_stddev_fields')
  }

  get commissionPercentage(): $Field<'commissionPercentage', number | undefined> {
    return this.$_select('commissionPercentage') as any
  }
}

/**
 * aggregate stddev_pop on columns
 */
export class team_stddev_pop_fields extends $Base<'team_stddev_pop_fields'> {
  constructor() {
    super('team_stddev_pop_fields')
  }

  get commissionPercentage(): $Field<'commissionPercentage', number | undefined> {
    return this.$_select('commissionPercentage') as any
  }
}

/**
 * aggregate stddev_samp on columns
 */
export class team_stddev_samp_fields extends $Base<'team_stddev_samp_fields'> {
  constructor() {
    super('team_stddev_samp_fields')
  }

  get commissionPercentage(): $Field<'commissionPercentage', number | undefined> {
    return this.$_select('commissionPercentage') as any
  }
}

/**
 * aggregate sum on columns
 */
export class team_sum_fields extends $Base<'team_sum_fields'> {
  constructor() {
    super('team_sum_fields')
  }

  get commissionPercentage(): $Field<'commissionPercentage', string | undefined> {
    return this.$_select('commissionPercentage') as any
  }
}

/**
 * update columns of table "team"
 */
export enum team_update_column {
  /**
   * column name
   */
  address = 'address',

  /**
   * column name
   */
  commissionPercentage = 'commissionPercentage',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  email = 'email',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  isActive = 'isActive',

  /**
   * column name
   */
  isTest = 'isTest',

  /**
   * column name
   */
  name = 'name',

  /**
   * column name
   */
  stripeId = 'stripeId',

  /**
   * column name
   */
  stripeSubscriptionItemId = 'stripeSubscriptionItemId',

  /**
   * column name
   */
  supportEmail = 'supportEmail',

  /**
   * column name
   */
  supportPhone = 'supportPhone',

  /**
   * column name
   */
  website = 'website',
}

/**
 * aggregate var_pop on columns
 */
export class team_var_pop_fields extends $Base<'team_var_pop_fields'> {
  constructor() {
    super('team_var_pop_fields')
  }

  get commissionPercentage(): $Field<'commissionPercentage', number | undefined> {
    return this.$_select('commissionPercentage') as any
  }
}

/**
 * aggregate var_samp on columns
 */
export class team_var_samp_fields extends $Base<'team_var_samp_fields'> {
  constructor() {
    super('team_var_samp_fields')
  }

  get commissionPercentage(): $Field<'commissionPercentage', number | undefined> {
    return this.$_select('commissionPercentage') as any
  }
}

/**
 * aggregate variance on columns
 */
export class team_variance_fields extends $Base<'team_variance_fields'> {
  constructor() {
    super('team_variance_fields')
  }

  get commissionPercentage(): $Field<'commissionPercentage', number | undefined> {
    return this.$_select('commissionPercentage') as any
  }
}

/**
 * columns and relationships of "team_user"
 */
export class teamUser extends $Base<'teamUser'> {
  constructor() {
    super('teamUser')
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get id(): $Field<'id', string> {
    return this.$_select('id') as any
  }

  get role(): $Field<'role', string | undefined> {
    return this.$_select('role') as any
  }

  /**
   * An object relationship
   */
  team<Sel extends Selection<team>>(
    selectorFn: (s: team) => [...Sel]
  ): $Field<'team', GetOutput<Sel>> {
    const options = {
      selection: selectorFn(new team()),
    }
    return this.$_select('team', options) as any
  }

  get teamId(): $Field<'teamId', string> {
    return this.$_select('teamId') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }

  /**
   * An object relationship
   */
  user<Sel extends Selection<user>>(
    selectorFn: (s: user) => [...Sel]
  ): $Field<'user', GetOutput<Sel>> {
    const options = {
      selection: selectorFn(new user()),
    }
    return this.$_select('user', options) as any
  }

  get userId(): $Field<'userId', string> {
    return this.$_select('userId') as any
  }
}

/**
 * aggregated selection of "team_user"
 */
export class teamUser_aggregate extends $Base<'teamUser_aggregate'> {
  constructor() {
    super('teamUser_aggregate')
  }

  aggregate<Sel extends Selection<teamUser_aggregate_fields>>(
    selectorFn: (s: teamUser_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new teamUser_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<teamUser>>(
    selectorFn: (s: teamUser) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new teamUser()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "team_user"
 */
export class teamUser_aggregate_fields extends $Base<'teamUser_aggregate_fields'> {
  constructor() {
    super('teamUser_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<teamUser_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[teamUser_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<teamUser_max_fields>>(
    selectorFn: (s: teamUser_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new teamUser_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<teamUser_min_fields>>(
    selectorFn: (s: teamUser_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new teamUser_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * order by aggregate values of table "team_user"
 */
export type teamUser_aggregate_order_by = {
  count?: order_by | undefined
  max?: teamUser_max_order_by | undefined
  min?: teamUser_min_order_by | undefined
}

/**
 * input type for inserting array relation for remote table "team_user"
 */
export type teamUser_arr_rel_insert_input = {
  data: Array<teamUser_insert_input>
  on_conflict?: teamUser_on_conflict | undefined
}

/**
 * Boolean expression to filter rows from the table "team_user". All fields are combined with a logical 'AND'.
 */
export type teamUser_bool_exp = {
  _and?: Array<teamUser_bool_exp> | undefined
  _not?: teamUser_bool_exp | undefined
  _or?: Array<teamUser_bool_exp> | undefined
  createdAt?: timestamptz_comparison_exp | undefined
  id?: uuid_comparison_exp | undefined
  role?: String_comparison_exp | undefined
  team?: team_bool_exp | undefined
  teamId?: uuid_comparison_exp | undefined
  updatedAt?: timestamptz_comparison_exp | undefined
  user?: user_bool_exp | undefined
  userId?: uuid_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "team_user"
 */
export enum teamUser_constraint {
  /**
   * unique or primary key constraint
   */
  team_user_pkey = 'team_user_pkey',
}

/**
 * input type for inserting data into table "team_user"
 */
export type teamUser_insert_input = {
  createdAt?: string | undefined
  id?: string | undefined
  role?: string | undefined
  team?: team_obj_rel_insert_input | undefined
  teamId?: string | undefined
  updatedAt?: string | undefined
  user?: user_obj_rel_insert_input | undefined
  userId?: string | undefined
}

/**
 * aggregate max on columns
 */
export class teamUser_max_fields extends $Base<'teamUser_max_fields'> {
  constructor() {
    super('teamUser_max_fields')
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get role(): $Field<'role', string | undefined> {
    return this.$_select('role') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }

  get userId(): $Field<'userId', string | undefined> {
    return this.$_select('userId') as any
  }
}

/**
 * order by max() on columns of table "team_user"
 */
export type teamUser_max_order_by = {
  createdAt?: order_by | undefined
  id?: order_by | undefined
  role?: order_by | undefined
  teamId?: order_by | undefined
  updatedAt?: order_by | undefined
  userId?: order_by | undefined
}

/**
 * aggregate min on columns
 */
export class teamUser_min_fields extends $Base<'teamUser_min_fields'> {
  constructor() {
    super('teamUser_min_fields')
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get role(): $Field<'role', string | undefined> {
    return this.$_select('role') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }

  get userId(): $Field<'userId', string | undefined> {
    return this.$_select('userId') as any
  }
}

/**
 * order by min() on columns of table "team_user"
 */
export type teamUser_min_order_by = {
  createdAt?: order_by | undefined
  id?: order_by | undefined
  role?: order_by | undefined
  teamId?: order_by | undefined
  updatedAt?: order_by | undefined
  userId?: order_by | undefined
}

/**
 * response of any mutation on the table "team_user"
 */
export class teamUser_mutation_response extends $Base<'teamUser_mutation_response'> {
  constructor() {
    super('teamUser_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<teamUser>>(
    selectorFn: (s: teamUser) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new teamUser()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "team_user"
 */
export type teamUser_on_conflict = {
  constraint: teamUser_constraint
  update_columns: Array<teamUser_update_column>
  where?: teamUser_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "team_user".
 */
export type teamUser_order_by = {
  createdAt?: order_by | undefined
  id?: order_by | undefined
  role?: order_by | undefined
  team?: team_order_by | undefined
  teamId?: order_by | undefined
  updatedAt?: order_by | undefined
  user?: user_order_by | undefined
  userId?: order_by | undefined
}

/**
 * primary key columns input for table: teamUser
 */
export type teamUser_pk_columns_input = {
  id: string
}

/**
 * select columns of table "team_user"
 */
export enum teamUser_select_column {
  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  role = 'role',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  updatedAt = 'updatedAt',

  /**
   * column name
   */
  userId = 'userId',
}

/**
 * input type for updating data in table "team_user"
 */
export type teamUser_set_input = {
  createdAt?: string | undefined
  id?: string | undefined
  role?: string | undefined
  teamId?: string | undefined
  updatedAt?: string | undefined
  userId?: string | undefined
}

/**
 * update columns of table "team_user"
 */
export enum teamUser_update_column {
  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  role = 'role',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  updatedAt = 'updatedAt',

  /**
   * column name
   */
  userId = 'userId',
}

export type timestamptz = unknown

/**
 * Boolean expression to compare columns of type "timestamptz". All fields are combined with logical 'AND'.
 */
export type timestamptz_comparison_exp = {
  _eq?: string | undefined
  _gt?: string | undefined
  _gte?: string | undefined
  _in?: Array<string> | undefined
  _is_null?: boolean | undefined
  _lt?: string | undefined
  _lte?: string | undefined
  _neq?: string | undefined
  _nin?: Array<string> | undefined
}

/**
 * columns and relationships of "unit"
 */
export class unit extends $Base<'unit'> {
  constructor() {
    super('unit')
  }

  /**
   * An array relationship
   */
  bookings<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_order_by> | undefined
      where?: booking_bool_exp | undefined
    }>,
    Sel extends Selection<booking>
  >(
    args: Args,
    selectorFn: (s: booking) => [...Sel]
  ): $Field<'bookings', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_order_by!]',
        where: 'booking_bool_exp',
      },
      args,

      selection: selectorFn(new booking()),
    }
    return this.$_select('bookings', options) as any
  }

  /**
   * An aggregate relationship
   */
  bookings_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<booking_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<booking_order_by> | undefined
      where?: booking_bool_exp | undefined
    }>,
    Sel extends Selection<booking_aggregate>
  >(
    args: Args,
    selectorFn: (s: booking_aggregate) => [...Sel]
  ): $Field<'bookings_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[booking_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[booking_order_by!]',
        where: 'booking_bool_exp',
      },
      args,

      selection: selectorFn(new booking_aggregate()),
    }
    return this.$_select('bookings_aggregate', options) as any
  }

  /**
   * An object relationship
   */
  connection<Sel extends Selection<connection>>(
    selectorFn: (s: connection) => [...Sel]
  ): $Field<'connection', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new connection()),
    }
    return this.$_select('connection', options) as any
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string> {
    return this.$_select('createdAt') as any
  }

  /**
   * An object relationship
   */
  entity<Sel extends Selection<entity>>(
    selectorFn: (s: entity) => [...Sel]
  ): $Field<'entity', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new entity()),
    }
    return this.$_select('entity', options) as any
  }

  get entityId(): $Field<'entityId', string | undefined> {
    return this.$_select('entityId') as any
  }

  get id(): $Field<'id', string> {
    return this.$_select('id') as any
  }

  metadata<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'metadata', string | undefined, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('metadata', options) as any
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }

  get status(): $Field<'status', string | undefined> {
    return this.$_select('status') as any
  }

  /**
   * An array relationship
   */
  tags<
    Args extends VariabledInput<{
      distinct_on?: Array<tag_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<tag_order_by> | undefined
      where?: tag_bool_exp | undefined
    }>,
    Sel extends Selection<tag>
  >(
    args: Args,
    selectorFn: (s: tag) => [...Sel]
  ): $Field<'tags', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[tag_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[tag_order_by!]',
        where: 'tag_bool_exp',
      },
      args,

      selection: selectorFn(new tag()),
    }
    return this.$_select('tags', options) as any
  }

  /**
   * An aggregate relationship
   */
  tags_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<tag_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<tag_order_by> | undefined
      where?: tag_bool_exp | undefined
    }>,
    Sel extends Selection<tag_aggregate>
  >(
    args: Args,
    selectorFn: (s: tag_aggregate) => [...Sel]
  ): $Field<'tags_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[tag_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[tag_order_by!]',
        where: 'tag_bool_exp',
      },
      args,

      selection: selectorFn(new tag_aggregate()),
    }
    return this.$_select('tags_aggregate', options) as any
  }

  /**
   * An object relationship
   */
  team<Sel extends Selection<team>>(
    selectorFn: (s: team) => [...Sel]
  ): $Field<'team', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new team()),
    }
    return this.$_select('team', options) as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get updatedAt(): $Field<'updatedAt', string> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * aggregated selection of "unit"
 */
export class unit_aggregate extends $Base<'unit_aggregate'> {
  constructor() {
    super('unit_aggregate')
  }

  aggregate<Sel extends Selection<unit_aggregate_fields>>(
    selectorFn: (s: unit_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new unit_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<unit>>(
    selectorFn: (s: unit) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new unit()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "unit"
 */
export class unit_aggregate_fields extends $Base<'unit_aggregate_fields'> {
  constructor() {
    super('unit_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<unit_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[unit_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<unit_max_fields>>(
    selectorFn: (s: unit_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new unit_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<unit_min_fields>>(
    selectorFn: (s: unit_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new unit_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * order by aggregate values of table "unit"
 */
export type unit_aggregate_order_by = {
  count?: order_by | undefined
  max?: unit_max_order_by | undefined
  min?: unit_min_order_by | undefined
}

/**
 * append existing jsonb value of filtered columns with new jsonb value
 */
export type unit_append_input = {
  metadata?: string | undefined
}

/**
 * input type for inserting array relation for remote table "unit"
 */
export type unit_arr_rel_insert_input = {
  data: Array<unit_insert_input>
  on_conflict?: unit_on_conflict | undefined
}

/**
 * Boolean expression to filter rows from the table "unit". All fields are combined with a logical 'AND'.
 */
export type unit_bool_exp = {
  _and?: Array<unit_bool_exp> | undefined
  _not?: unit_bool_exp | undefined
  _or?: Array<unit_bool_exp> | undefined
  bookings?: booking_bool_exp | undefined
  connection?: connection_bool_exp | undefined
  connectionId?: uuid_comparison_exp | undefined
  createdAt?: timestamptz_comparison_exp | undefined
  entity?: entity_bool_exp | undefined
  entityId?: uuid_comparison_exp | undefined
  id?: uuid_comparison_exp | undefined
  metadata?: jsonb_comparison_exp | undefined
  name?: String_comparison_exp | undefined
  status?: String_comparison_exp | undefined
  tags?: tag_bool_exp | undefined
  team?: team_bool_exp | undefined
  teamId?: uuid_comparison_exp | undefined
  uniqueRef?: String_comparison_exp | undefined
  updatedAt?: timestamptz_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "unit"
 */
export enum unit_constraint {
  /**
   * unique or primary key constraint
   */
  unit_pkey = 'unit_pkey',
}

/**
 * delete the field or element with specified path (for JSON arrays, negative integers count from the end)
 */
export type unit_delete_at_path_input = {
  metadata?: Array<string> | undefined
}

/**
 * delete the array element with specified index (negative integers count from the
end). throws an error if top level container is not an array
 */
export type unit_delete_elem_input = {
  metadata?: number | undefined
}

/**
 * delete key/value pair or string element. key/value pairs are matched based on their key value
 */
export type unit_delete_key_input = {
  metadata?: string | undefined
}

/**
 * input type for inserting data into table "unit"
 */
export type unit_insert_input = {
  bookings?: booking_arr_rel_insert_input | undefined
  connection?: connection_obj_rel_insert_input | undefined
  connectionId?: string | undefined
  createdAt?: string | undefined
  entity?: entity_obj_rel_insert_input | undefined
  entityId?: string | undefined
  id?: string | undefined
  metadata?: string | undefined
  name?: string | undefined
  status?: string | undefined
  tags?: tag_arr_rel_insert_input | undefined
  team?: team_obj_rel_insert_input | undefined
  teamId?: string | undefined
  uniqueRef?: string | undefined
  updatedAt?: string | undefined
}

/**
 * aggregate max on columns
 */
export class unit_max_fields extends $Base<'unit_max_fields'> {
  constructor() {
    super('unit_max_fields')
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get entityId(): $Field<'entityId', string | undefined> {
    return this.$_select('entityId') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }

  get status(): $Field<'status', string | undefined> {
    return this.$_select('status') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * order by max() on columns of table "unit"
 */
export type unit_max_order_by = {
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  entityId?: order_by | undefined
  id?: order_by | undefined
  name?: order_by | undefined
  status?: order_by | undefined
  teamId?: order_by | undefined
  uniqueRef?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * aggregate min on columns
 */
export class unit_min_fields extends $Base<'unit_min_fields'> {
  constructor() {
    super('unit_min_fields')
  }

  get connectionId(): $Field<'connectionId', string | undefined> {
    return this.$_select('connectionId') as any
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get entityId(): $Field<'entityId', string | undefined> {
    return this.$_select('entityId') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }

  get status(): $Field<'status', string | undefined> {
    return this.$_select('status') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get uniqueRef(): $Field<'uniqueRef', string | undefined> {
    return this.$_select('uniqueRef') as any
  }

  get updatedAt(): $Field<'updatedAt', string | undefined> {
    return this.$_select('updatedAt') as any
  }
}

/**
 * order by min() on columns of table "unit"
 */
export type unit_min_order_by = {
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  entityId?: order_by | undefined
  id?: order_by | undefined
  name?: order_by | undefined
  status?: order_by | undefined
  teamId?: order_by | undefined
  uniqueRef?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * response of any mutation on the table "unit"
 */
export class unit_mutation_response extends $Base<'unit_mutation_response'> {
  constructor() {
    super('unit_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<unit>>(
    selectorFn: (s: unit) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new unit()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * input type for inserting object relation for remote table "unit"
 */
export type unit_obj_rel_insert_input = {
  data: unit_insert_input
  on_conflict?: unit_on_conflict | undefined
}

/**
 * on conflict condition type for table "unit"
 */
export type unit_on_conflict = {
  constraint: unit_constraint
  update_columns: Array<unit_update_column>
  where?: unit_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "unit".
 */
export type unit_order_by = {
  bookings_aggregate?: booking_aggregate_order_by | undefined
  connection?: connection_order_by | undefined
  connectionId?: order_by | undefined
  createdAt?: order_by | undefined
  entity?: entity_order_by | undefined
  entityId?: order_by | undefined
  id?: order_by | undefined
  metadata?: order_by | undefined
  name?: order_by | undefined
  status?: order_by | undefined
  tags_aggregate?: tag_aggregate_order_by | undefined
  team?: team_order_by | undefined
  teamId?: order_by | undefined
  uniqueRef?: order_by | undefined
  updatedAt?: order_by | undefined
}

/**
 * primary key columns input for table: unit
 */
export type unit_pk_columns_input = {
  id: string
}

/**
 * prepend existing jsonb value of filtered columns with new jsonb value
 */
export type unit_prepend_input = {
  metadata?: string | undefined
}

/**
 * select columns of table "unit"
 */
export enum unit_select_column {
  /**
   * column name
   */
  connectionId = 'connectionId',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  entityId = 'entityId',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  metadata = 'metadata',

  /**
   * column name
   */
  name = 'name',

  /**
   * column name
   */
  status = 'status',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  uniqueRef = 'uniqueRef',

  /**
   * column name
   */
  updatedAt = 'updatedAt',
}

/**
 * input type for updating data in table "unit"
 */
export type unit_set_input = {
  connectionId?: string | undefined
  createdAt?: string | undefined
  entityId?: string | undefined
  id?: string | undefined
  metadata?: string | undefined
  name?: string | undefined
  status?: string | undefined
  teamId?: string | undefined
  uniqueRef?: string | undefined
  updatedAt?: string | undefined
}

/**
 * update columns of table "unit"
 */
export enum unit_update_column {
  /**
   * column name
   */
  connectionId = 'connectionId',

  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  entityId = 'entityId',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  metadata = 'metadata',

  /**
   * column name
   */
  name = 'name',

  /**
   * column name
   */
  status = 'status',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  uniqueRef = 'uniqueRef',

  /**
   * column name
   */
  updatedAt = 'updatedAt',
}

/**
 * columns and relationships of "user"
 */
export class user extends $Base<'user'> {
  constructor() {
    super('user')
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get email(): $Field<'email', string> {
    return this.$_select('email') as any
  }

  get id(): $Field<'id', string> {
    return this.$_select('id') as any
  }

  get isAdmin(): $Field<'isAdmin', boolean> {
    return this.$_select('isAdmin') as any
  }

  /**
   * An array relationship
   */
  memberships<
    Args extends VariabledInput<{
      distinct_on?: Array<teamUser_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<teamUser_order_by> | undefined
      where?: teamUser_bool_exp | undefined
    }>,
    Sel extends Selection<teamUser>
  >(
    args: Args,
    selectorFn: (s: teamUser) => [...Sel]
  ): $Field<'memberships', Array<GetOutput<Sel>>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[teamUser_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[teamUser_order_by!]',
        where: 'teamUser_bool_exp',
      },
      args,

      selection: selectorFn(new teamUser()),
    }
    return this.$_select('memberships', options) as any
  }

  /**
   * An aggregate relationship
   */
  memberships_aggregate<
    Args extends VariabledInput<{
      distinct_on?: Array<teamUser_select_column> | undefined
      limit?: number | undefined
      offset?: number | undefined
      order_by?: Array<teamUser_order_by> | undefined
      where?: teamUser_bool_exp | undefined
    }>,
    Sel extends Selection<teamUser_aggregate>
  >(
    args: Args,
    selectorFn: (s: teamUser_aggregate) => [...Sel]
  ): $Field<'memberships_aggregate', GetOutput<Sel>, GetVariables<Sel, Args>> {
    const options = {
      argTypes: {
        distinct_on: '[teamUser_select_column!]',
        limit: 'Int',
        offset: 'Int',
        order_by: '[teamUser_order_by!]',
        where: 'teamUser_bool_exp',
      },
      args,

      selection: selectorFn(new teamUser_aggregate()),
    }
    return this.$_select('memberships_aggregate', options) as any
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }

  get status(): $Field<'status', user_status_enum | undefined> {
    return this.$_select('status') as any
  }

  get sub(): $Field<'sub', string | undefined> {
    return this.$_select('sub') as any
  }

  get trialExpiryAt(): $Field<'trialExpiryAt', string | undefined> {
    return this.$_select('trialExpiryAt') as any
  }
}

/**
 * aggregated selection of "user"
 */
export class user_aggregate extends $Base<'user_aggregate'> {
  constructor() {
    super('user_aggregate')
  }

  aggregate<Sel extends Selection<user_aggregate_fields>>(
    selectorFn: (s: user_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new user_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<user>>(
    selectorFn: (s: user) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new user()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "user"
 */
export class user_aggregate_fields extends $Base<'user_aggregate_fields'> {
  constructor() {
    super('user_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<user_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[user_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<user_max_fields>>(
    selectorFn: (s: user_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new user_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<user_min_fields>>(
    selectorFn: (s: user_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new user_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * Boolean expression to filter rows from the table "user". All fields are combined with a logical 'AND'.
 */
export type user_bool_exp = {
  _and?: Array<user_bool_exp> | undefined
  _not?: user_bool_exp | undefined
  _or?: Array<user_bool_exp> | undefined
  createdAt?: timestamptz_comparison_exp | undefined
  email?: String_comparison_exp | undefined
  id?: uuid_comparison_exp | undefined
  isAdmin?: Boolean_comparison_exp | undefined
  memberships?: teamUser_bool_exp | undefined
  name?: String_comparison_exp | undefined
  status?: user_status_enum_comparison_exp | undefined
  sub?: String_comparison_exp | undefined
  trialExpiryAt?: timestamptz_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "user"
 */
export enum user_constraint {
  /**
   * unique or primary key constraint
   */
  user_pkey = 'user_pkey',
}

/**
 * input type for inserting data into table "user"
 */
export type user_insert_input = {
  createdAt?: string | undefined
  email?: string | undefined
  id?: string | undefined
  isAdmin?: boolean | undefined
  memberships?: teamUser_arr_rel_insert_input | undefined
  name?: string | undefined
  status?: user_status_enum | undefined
  sub?: string | undefined
  trialExpiryAt?: string | undefined
}

/**
 * aggregate max on columns
 */
export class user_max_fields extends $Base<'user_max_fields'> {
  constructor() {
    super('user_max_fields')
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get email(): $Field<'email', string | undefined> {
    return this.$_select('email') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }

  get sub(): $Field<'sub', string | undefined> {
    return this.$_select('sub') as any
  }

  get trialExpiryAt(): $Field<'trialExpiryAt', string | undefined> {
    return this.$_select('trialExpiryAt') as any
  }
}

/**
 * aggregate min on columns
 */
export class user_min_fields extends $Base<'user_min_fields'> {
  constructor() {
    super('user_min_fields')
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get email(): $Field<'email', string | undefined> {
    return this.$_select('email') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }

  get sub(): $Field<'sub', string | undefined> {
    return this.$_select('sub') as any
  }

  get trialExpiryAt(): $Field<'trialExpiryAt', string | undefined> {
    return this.$_select('trialExpiryAt') as any
  }
}

/**
 * response of any mutation on the table "user"
 */
export class user_mutation_response extends $Base<'user_mutation_response'> {
  constructor() {
    super('user_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<user>>(
    selectorFn: (s: user) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new user()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * input type for inserting object relation for remote table "user"
 */
export type user_obj_rel_insert_input = {
  data: user_insert_input
  on_conflict?: user_on_conflict | undefined
}

/**
 * on conflict condition type for table "user"
 */
export type user_on_conflict = {
  constraint: user_constraint
  update_columns: Array<user_update_column>
  where?: user_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "user".
 */
export type user_order_by = {
  createdAt?: order_by | undefined
  email?: order_by | undefined
  id?: order_by | undefined
  isAdmin?: order_by | undefined
  memberships_aggregate?: teamUser_aggregate_order_by | undefined
  name?: order_by | undefined
  status?: order_by | undefined
  sub?: order_by | undefined
  trialExpiryAt?: order_by | undefined
}

/**
 * primary key columns input for table: user
 */
export type user_pk_columns_input = {
  id: string
}

/**
 * select columns of table "user"
 */
export enum user_select_column {
  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  email = 'email',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  isAdmin = 'isAdmin',

  /**
   * column name
   */
  name = 'name',

  /**
   * column name
   */
  status = 'status',

  /**
   * column name
   */
  sub = 'sub',

  /**
   * column name
   */
  trialExpiryAt = 'trialExpiryAt',
}

/**
 * input type for updating data in table "user"
 */
export type user_set_input = {
  createdAt?: string | undefined
  email?: string | undefined
  id?: string | undefined
  isAdmin?: boolean | undefined
  name?: string | undefined
  status?: user_status_enum | undefined
  sub?: string | undefined
  trialExpiryAt?: string | undefined
}

export enum user_status_enum {
  active = 'active',

  banned = 'banned',

  disabled = 'disabled',

  trialExpired = 'trialExpired',
}

/**
 * Boolean expression to compare columns of type "user_status_enum". All fields are combined with logical 'AND'.
 */
export type user_status_enum_comparison_exp = {
  _eq?: user_status_enum | undefined
  _in?: Array<user_status_enum> | undefined
  _is_null?: boolean | undefined
  _neq?: user_status_enum | undefined
  _nin?: Array<user_status_enum> | undefined
}

/**
 * update columns of table "user"
 */
export enum user_update_column {
  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  email = 'email',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  isAdmin = 'isAdmin',

  /**
   * column name
   */
  name = 'name',

  /**
   * column name
   */
  status = 'status',

  /**
   * column name
   */
  sub = 'sub',

  /**
   * column name
   */
  trialExpiryAt = 'trialExpiryAt',
}

/**
 * columns and relationships of "user_status"
 */
export class userStatus extends $Base<'userStatus'> {
  constructor() {
    super('userStatus')
  }

  get name(): $Field<'name', string> {
    return this.$_select('name') as any
  }
}

/**
 * aggregated selection of "user_status"
 */
export class userStatus_aggregate extends $Base<'userStatus_aggregate'> {
  constructor() {
    super('userStatus_aggregate')
  }

  aggregate<Sel extends Selection<userStatus_aggregate_fields>>(
    selectorFn: (s: userStatus_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new userStatus_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<userStatus>>(
    selectorFn: (s: userStatus) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new userStatus()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "user_status"
 */
export class userStatus_aggregate_fields extends $Base<'userStatus_aggregate_fields'> {
  constructor() {
    super('userStatus_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<userStatus_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[userStatus_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<userStatus_max_fields>>(
    selectorFn: (s: userStatus_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new userStatus_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<userStatus_min_fields>>(
    selectorFn: (s: userStatus_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new userStatus_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * Boolean expression to filter rows from the table "user_status". All fields are combined with a logical 'AND'.
 */
export type userStatus_bool_exp = {
  _and?: Array<userStatus_bool_exp> | undefined
  _not?: userStatus_bool_exp | undefined
  _or?: Array<userStatus_bool_exp> | undefined
  name?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "user_status"
 */
export enum userStatus_constraint {
  /**
   * unique or primary key constraint
   */
  user_status_pkey = 'user_status_pkey',
}

/**
 * input type for inserting data into table "user_status"
 */
export type userStatus_insert_input = {
  name?: string | undefined
}

/**
 * aggregate max on columns
 */
export class userStatus_max_fields extends $Base<'userStatus_max_fields'> {
  constructor() {
    super('userStatus_max_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * aggregate min on columns
 */
export class userStatus_min_fields extends $Base<'userStatus_min_fields'> {
  constructor() {
    super('userStatus_min_fields')
  }

  get name(): $Field<'name', string | undefined> {
    return this.$_select('name') as any
  }
}

/**
 * response of any mutation on the table "user_status"
 */
export class userStatus_mutation_response extends $Base<'userStatus_mutation_response'> {
  constructor() {
    super('userStatus_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<userStatus>>(
    selectorFn: (s: userStatus) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new userStatus()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "user_status"
 */
export type userStatus_on_conflict = {
  constraint: userStatus_constraint
  update_columns: Array<userStatus_update_column>
  where?: userStatus_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "user_status".
 */
export type userStatus_order_by = {
  name?: order_by | undefined
}

/**
 * primary key columns input for table: userStatus
 */
export type userStatus_pk_columns_input = {
  name: string
}

/**
 * select columns of table "user_status"
 */
export enum userStatus_select_column {
  /**
   * column name
   */
  name = 'name',
}

/**
 * input type for updating data in table "user_status"
 */
export type userStatus_set_input = {
  name?: string | undefined
}

/**
 * update columns of table "user_status"
 */
export enum userStatus_update_column {
  /**
   * column name
   */
  name = 'name',
}

export type uuid = unknown

/**
 * Boolean expression to compare columns of type "uuid". All fields are combined with logical 'AND'.
 */
export type uuid_comparison_exp = {
  _eq?: string | undefined
  _gt?: string | undefined
  _gte?: string | undefined
  _in?: Array<string> | undefined
  _is_null?: boolean | undefined
  _lt?: string | undefined
  _lte?: string | undefined
  _neq?: string | undefined
  _nin?: Array<string> | undefined
}

/**
 * columns and relationships of "webhook"
 */
export class webhook extends $Base<'webhook'> {
  constructor() {
    super('webhook')
  }

  get createdAt(): $Field<'createdAt', string> {
    return this.$_select('createdAt') as any
  }

  headers<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'headers', string | undefined, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('headers', options) as any
  }

  get id(): $Field<'id', string> {
    return this.$_select('id') as any
  }

  /**
   * An object relationship
   */
  team<Sel extends Selection<team>>(
    selectorFn: (s: team) => [...Sel]
  ): $Field<'team', GetOutput<Sel>> {
    const options = {
      selection: selectorFn(new team()),
    }
    return this.$_select('team', options) as any
  }

  get teamId(): $Field<'teamId', string> {
    return this.$_select('teamId') as any
  }

  types<
    Args extends VariabledInput<{
      path?: string | undefined
    }>
  >(args: Args): $Field<'types', string, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        path: 'String',
      },
      args,
    }
    return this.$_select('types', options) as any
  }

  get types2(): $Field<'types2', string | undefined> {
    return this.$_select('types2') as any
  }

  get url(): $Field<'url', string> {
    return this.$_select('url') as any
  }
}

/**
 * aggregated selection of "webhook"
 */
export class webhook_aggregate extends $Base<'webhook_aggregate'> {
  constructor() {
    super('webhook_aggregate')
  }

  aggregate<Sel extends Selection<webhook_aggregate_fields>>(
    selectorFn: (s: webhook_aggregate_fields) => [...Sel]
  ): $Field<'aggregate', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new webhook_aggregate_fields()),
    }
    return this.$_select('aggregate', options) as any
  }

  nodes<Sel extends Selection<webhook>>(
    selectorFn: (s: webhook) => [...Sel]
  ): $Field<'nodes', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new webhook()),
    }
    return this.$_select('nodes', options) as any
  }
}

/**
 * aggregate fields of "webhook"
 */
export class webhook_aggregate_fields extends $Base<'webhook_aggregate_fields'> {
  constructor() {
    super('webhook_aggregate_fields')
  }

  count<
    Args extends VariabledInput<{
      columns?: Array<webhook_select_column> | undefined
      distinct?: boolean | undefined
    }>
  >(args: Args): $Field<'count', number, GetVariables<[], Args>> {
    const options = {
      argTypes: {
        columns: '[webhook_select_column!]',
        distinct: 'Boolean',
      },
      args,
    }
    return this.$_select('count', options) as any
  }

  max<Sel extends Selection<webhook_max_fields>>(
    selectorFn: (s: webhook_max_fields) => [...Sel]
  ): $Field<'max', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new webhook_max_fields()),
    }
    return this.$_select('max', options) as any
  }

  min<Sel extends Selection<webhook_min_fields>>(
    selectorFn: (s: webhook_min_fields) => [...Sel]
  ): $Field<'min', GetOutput<Sel> | undefined> {
    const options = {
      selection: selectorFn(new webhook_min_fields()),
    }
    return this.$_select('min', options) as any
  }
}

/**
 * order by aggregate values of table "webhook"
 */
export type webhook_aggregate_order_by = {
  count?: order_by | undefined
  max?: webhook_max_order_by | undefined
  min?: webhook_min_order_by | undefined
}

/**
 * append existing jsonb value of filtered columns with new jsonb value
 */
export type webhook_append_input = {
  headers?: string | undefined
  types?: string | undefined
}

/**
 * input type for inserting array relation for remote table "webhook"
 */
export type webhook_arr_rel_insert_input = {
  data: Array<webhook_insert_input>
  on_conflict?: webhook_on_conflict | undefined
}

/**
 * Boolean expression to filter rows from the table "webhook". All fields are combined with a logical 'AND'.
 */
export type webhook_bool_exp = {
  _and?: Array<webhook_bool_exp> | undefined
  _not?: webhook_bool_exp | undefined
  _or?: Array<webhook_bool_exp> | undefined
  createdAt?: timestamptz_comparison_exp | undefined
  headers?: jsonb_comparison_exp | undefined
  id?: uuid_comparison_exp | undefined
  team?: team_bool_exp | undefined
  teamId?: uuid_comparison_exp | undefined
  types?: jsonb_comparison_exp | undefined
  types2?: _text_comparison_exp | undefined
  url?: String_comparison_exp | undefined
}

/**
 * unique or primary key constraints on table "webhook"
 */
export enum webhook_constraint {
  /**
   * unique or primary key constraint
   */
  webhook_pkey = 'webhook_pkey',
}

/**
 * delete the field or element with specified path (for JSON arrays, negative integers count from the end)
 */
export type webhook_delete_at_path_input = {
  headers?: Array<string> | undefined
  types?: Array<string> | undefined
}

/**
 * delete the array element with specified index (negative integers count from the
end). throws an error if top level container is not an array
 */
export type webhook_delete_elem_input = {
  headers?: number | undefined
  types?: number | undefined
}

/**
 * delete key/value pair or string element. key/value pairs are matched based on their key value
 */
export type webhook_delete_key_input = {
  headers?: string | undefined
  types?: string | undefined
}

/**
 * input type for inserting data into table "webhook"
 */
export type webhook_insert_input = {
  createdAt?: string | undefined
  headers?: string | undefined
  id?: string | undefined
  team?: team_obj_rel_insert_input | undefined
  teamId?: string | undefined
  types?: string | undefined
  types2?: string | undefined
  url?: string | undefined
}

/**
 * aggregate max on columns
 */
export class webhook_max_fields extends $Base<'webhook_max_fields'> {
  constructor() {
    super('webhook_max_fields')
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get url(): $Field<'url', string | undefined> {
    return this.$_select('url') as any
  }
}

/**
 * order by max() on columns of table "webhook"
 */
export type webhook_max_order_by = {
  createdAt?: order_by | undefined
  id?: order_by | undefined
  teamId?: order_by | undefined
  url?: order_by | undefined
}

/**
 * aggregate min on columns
 */
export class webhook_min_fields extends $Base<'webhook_min_fields'> {
  constructor() {
    super('webhook_min_fields')
  }

  get createdAt(): $Field<'createdAt', string | undefined> {
    return this.$_select('createdAt') as any
  }

  get id(): $Field<'id', string | undefined> {
    return this.$_select('id') as any
  }

  get teamId(): $Field<'teamId', string | undefined> {
    return this.$_select('teamId') as any
  }

  get url(): $Field<'url', string | undefined> {
    return this.$_select('url') as any
  }
}

/**
 * order by min() on columns of table "webhook"
 */
export type webhook_min_order_by = {
  createdAt?: order_by | undefined
  id?: order_by | undefined
  teamId?: order_by | undefined
  url?: order_by | undefined
}

/**
 * response of any mutation on the table "webhook"
 */
export class webhook_mutation_response extends $Base<'webhook_mutation_response'> {
  constructor() {
    super('webhook_mutation_response')
  }

  /**
   * number of rows affected by the mutation
   */
  get affected_rows(): $Field<'affected_rows', number> {
    return this.$_select('affected_rows') as any
  }

  /**
   * data from the rows affected by the mutation
   */
  returning<Sel extends Selection<webhook>>(
    selectorFn: (s: webhook) => [...Sel]
  ): $Field<'returning', Array<GetOutput<Sel>>> {
    const options = {
      selection: selectorFn(new webhook()),
    }
    return this.$_select('returning', options) as any
  }
}

/**
 * on conflict condition type for table "webhook"
 */
export type webhook_on_conflict = {
  constraint: webhook_constraint
  update_columns: Array<webhook_update_column>
  where?: webhook_bool_exp | undefined
}

/**
 * Ordering options when selecting data from "webhook".
 */
export type webhook_order_by = {
  createdAt?: order_by | undefined
  headers?: order_by | undefined
  id?: order_by | undefined
  team?: team_order_by | undefined
  teamId?: order_by | undefined
  types?: order_by | undefined
  types2?: order_by | undefined
  url?: order_by | undefined
}

/**
 * primary key columns input for table: webhook
 */
export type webhook_pk_columns_input = {
  id: string
}

/**
 * prepend existing jsonb value of filtered columns with new jsonb value
 */
export type webhook_prepend_input = {
  headers?: string | undefined
  types?: string | undefined
}

/**
 * select columns of table "webhook"
 */
export enum webhook_select_column {
  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  headers = 'headers',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  types = 'types',

  /**
   * column name
   */
  types2 = 'types2',

  /**
   * column name
   */
  url = 'url',
}

/**
 * input type for updating data in table "webhook"
 */
export type webhook_set_input = {
  createdAt?: string | undefined
  headers?: string | undefined
  id?: string | undefined
  teamId?: string | undefined
  types?: string | undefined
  types2?: string | undefined
  url?: string | undefined
}

/**
 * update columns of table "webhook"
 */
export enum webhook_update_column {
  /**
   * column name
   */
  createdAt = 'createdAt',

  /**
   * column name
   */
  headers = 'headers',

  /**
   * column name
   */
  id = 'id',

  /**
   * column name
   */
  teamId = 'teamId',

  /**
   * column name
   */
  types = 'types',

  /**
   * column name
   */
  types2 = 'types2',

  /**
   * column name
   */
  url = 'url',
}

const $Root = {
  query: query_root,
  mutation: mutation_root,
  subscription: subscription_root,
}

namespace $RootTypes {
  export type query = query_root
  export type mutation = mutation_root
  export type subscription = subscription_root
}

export function query<Sel extends Selection<$RootTypes.query>>(
  selectFn: (q: $RootTypes.query) => [...Sel]
) {
  let field = new $Field<'query', GetOutput<Sel>, GetVariables<Sel>>('query', {
    selection: selectFn(new $Root.query()),
  })
  const str = fieldToQuery('query', field)

  return gql(str) as any as TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
}

export function mutation<Sel extends Selection<$RootTypes.mutation>>(
  selectFn: (q: $RootTypes.mutation) => [...Sel]
) {
  let field = new $Field<'mutation', GetOutput<Sel>, GetVariables<Sel>>('mutation', {
    selection: selectFn(new $Root.mutation()),
  })
  const str = fieldToQuery('mutation', field)

  return gql(str) as any as TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
}

export function subscription<Sel extends Selection<$RootTypes.subscription>>(
  selectFn: (q: $RootTypes.subscription) => [...Sel]
) {
  let field = new $Field<'subscription', GetOutput<Sel>, GetVariables<Sel>>('subscription', {
    selection: selectFn(new $Root.subscription()),
  })
  const str = fieldToQuery('subscription', field)

  return gql(str) as any as TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
}

const $InputTypes: { [key: string]: { [key: string]: string } } = {
  _text_comparison_exp: {
    _eq: '_text',
    _gt: '_text',
    _gte: '_text',
    _in: '[_text!]',
    _is_null: 'Boolean',
    _lt: '_text',
    _lte: '_text',
    _neq: '_text',
    _nin: '[_text!]',
  },
  booking_aggregate_order_by: {
    avg: 'booking_avg_order_by',
    count: 'order_by',
    max: 'booking_max_order_by',
    min: 'booking_min_order_by',
    stddev: 'booking_stddev_order_by',
    stddev_pop: 'booking_stddev_pop_order_by',
    stddev_samp: 'booking_stddev_samp_order_by',
    sum: 'booking_sum_order_by',
    var_pop: 'booking_var_pop_order_by',
    var_samp: 'booking_var_samp_order_by',
    variance: 'booking_variance_order_by',
  },
  booking_append_input: {
    metadata: 'jsonb',
  },
  booking_arr_rel_insert_input: {
    data: '[booking_insert_input!]!',
    on_conflict: 'booking_on_conflict',
  },
  booking_avg_order_by: {
    guests: 'order_by',
    nights: 'order_by',
  },
  booking_bool_exp: {
    _and: '[booking_bool_exp!]',
    _not: 'booking_bool_exp',
    _or: '[booking_bool_exp!]',
    bookedAt: 'timestamptz_comparison_exp',
    bookerName: 'String_comparison_exp',
    bookingChannel: 'booking_channel_enum_comparison_exp',
    checkIn: 'timestamptz_comparison_exp',
    checkOut: 'timestamptz_comparison_exp',
    confirmationCode: 'String_comparison_exp',
    connection: 'connection_bool_exp',
    connectionId: 'uuid_comparison_exp',
    createdAt: 'timestamptz_comparison_exp',
    currency: 'currency_enum_comparison_exp',
    entity: 'entity_bool_exp',
    entityId: 'uuid_comparison_exp',
    guestName: 'String_comparison_exp',
    guests: 'Int_comparison_exp',
    id: 'uuid_comparison_exp',
    isOTA: 'Boolean_comparison_exp',
    lines: 'line_bool_exp',
    metadata: 'jsonb_comparison_exp',
    nights: 'Int_comparison_exp',
    otaBooking: 'booking_bool_exp',
    otaBookingId: 'uuid_comparison_exp',
    relatedBookings: 'booking_bool_exp',
    status: 'booking_status_enum_comparison_exp',
    tags: 'tag_bool_exp',
    team: 'team_bool_exp',
    teamId: 'uuid_comparison_exp',
    uniqueRef: 'String_comparison_exp',
    unit: 'unit_bool_exp',
    unitId: 'uuid_comparison_exp',
    updatedAt: 'timestamptz_comparison_exp',
  },
  booking_channel_bool_exp: {
    _and: '[booking_channel_bool_exp!]',
    _not: 'booking_channel_bool_exp',
    _or: '[booking_channel_bool_exp!]',
    name: 'String_comparison_exp',
  },
  booking_channel_enum_comparison_exp: {
    _eq: 'booking_channel_enum',
    _in: '[booking_channel_enum!]',
    _is_null: 'Boolean',
    _neq: 'booking_channel_enum',
    _nin: '[booking_channel_enum!]',
  },
  booking_channel_insert_input: {
    name: 'String',
  },
  booking_channel_on_conflict: {
    constraint: 'booking_channel_constraint!',
    update_columns: '[booking_channel_update_column!]!',
    where: 'booking_channel_bool_exp',
  },
  booking_channel_order_by: {
    name: 'order_by',
  },
  booking_channel_pk_columns_input: {
    name: 'String!',
  },
  booking_channel_set_input: {
    name: 'String',
  },
  booking_delete_at_path_input: {
    metadata: '[String!]',
  },
  booking_delete_elem_input: {
    metadata: 'Int',
  },
  booking_delete_key_input: {
    metadata: 'String',
  },
  booking_inc_input: {
    guests: 'Int',
    nights: 'Int',
  },
  booking_insert_input: {
    bookedAt: 'timestamptz',
    bookerName: 'String',
    bookingChannel: 'booking_channel_enum',
    checkIn: 'timestamptz',
    checkOut: 'timestamptz',
    confirmationCode: 'String',
    connection: 'connection_obj_rel_insert_input',
    connectionId: 'uuid',
    createdAt: 'timestamptz',
    currency: 'currency_enum',
    entity: 'entity_obj_rel_insert_input',
    entityId: 'uuid',
    guestName: 'String',
    guests: 'Int',
    id: 'uuid',
    isOTA: 'Boolean',
    lines: 'line_arr_rel_insert_input',
    metadata: 'jsonb',
    nights: 'Int',
    otaBooking: 'booking_obj_rel_insert_input',
    otaBookingId: 'uuid',
    relatedBookings: 'booking_arr_rel_insert_input',
    status: 'booking_status_enum',
    tags: 'tag_arr_rel_insert_input',
    team: 'team_obj_rel_insert_input',
    teamId: 'uuid',
    uniqueRef: 'String',
    unit: 'unit_obj_rel_insert_input',
    unitId: 'uuid',
    updatedAt: 'timestamptz',
  },
  booking_max_order_by: {
    bookedAt: 'order_by',
    bookerName: 'order_by',
    checkIn: 'order_by',
    checkOut: 'order_by',
    confirmationCode: 'order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    entityId: 'order_by',
    guestName: 'order_by',
    guests: 'order_by',
    id: 'order_by',
    nights: 'order_by',
    otaBookingId: 'order_by',
    teamId: 'order_by',
    uniqueRef: 'order_by',
    unitId: 'order_by',
    updatedAt: 'order_by',
  },
  booking_min_order_by: {
    bookedAt: 'order_by',
    bookerName: 'order_by',
    checkIn: 'order_by',
    checkOut: 'order_by',
    confirmationCode: 'order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    entityId: 'order_by',
    guestName: 'order_by',
    guests: 'order_by',
    id: 'order_by',
    nights: 'order_by',
    otaBookingId: 'order_by',
    teamId: 'order_by',
    uniqueRef: 'order_by',
    unitId: 'order_by',
    updatedAt: 'order_by',
  },
  booking_obj_rel_insert_input: {
    data: 'booking_insert_input!',
    on_conflict: 'booking_on_conflict',
  },
  booking_on_conflict: {
    constraint: 'booking_constraint!',
    update_columns: '[booking_update_column!]!',
    where: 'booking_bool_exp',
  },
  booking_order_by: {
    bookedAt: 'order_by',
    bookerName: 'order_by',
    bookingChannel: 'order_by',
    checkIn: 'order_by',
    checkOut: 'order_by',
    confirmationCode: 'order_by',
    connection: 'connection_order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    currency: 'order_by',
    entity: 'entity_order_by',
    entityId: 'order_by',
    guestName: 'order_by',
    guests: 'order_by',
    id: 'order_by',
    isOTA: 'order_by',
    lines_aggregate: 'line_aggregate_order_by',
    metadata: 'order_by',
    nights: 'order_by',
    otaBooking: 'booking_order_by',
    otaBookingId: 'order_by',
    relatedBookings_aggregate: 'booking_aggregate_order_by',
    status: 'order_by',
    tags_aggregate: 'tag_aggregate_order_by',
    team: 'team_order_by',
    teamId: 'order_by',
    uniqueRef: 'order_by',
    unit: 'unit_order_by',
    unitId: 'order_by',
    updatedAt: 'order_by',
  },
  booking_pk_columns_input: {
    id: 'uuid!',
  },
  booking_prepend_input: {
    metadata: 'jsonb',
  },
  booking_set_input: {
    bookedAt: 'timestamptz',
    bookerName: 'String',
    bookingChannel: 'booking_channel_enum',
    checkIn: 'timestamptz',
    checkOut: 'timestamptz',
    confirmationCode: 'String',
    connectionId: 'uuid',
    createdAt: 'timestamptz',
    currency: 'currency_enum',
    entityId: 'uuid',
    guestName: 'String',
    guests: 'Int',
    id: 'uuid',
    isOTA: 'Boolean',
    metadata: 'jsonb',
    nights: 'Int',
    otaBookingId: 'uuid',
    status: 'booking_status_enum',
    teamId: 'uuid',
    uniqueRef: 'String',
    unitId: 'uuid',
    updatedAt: 'timestamptz',
  },
  booking_status_enum_comparison_exp: {
    _eq: 'booking_status_enum',
    _in: '[booking_status_enum!]',
    _is_null: 'Boolean',
    _neq: 'booking_status_enum',
    _nin: '[booking_status_enum!]',
  },
  booking_stddev_order_by: {
    guests: 'order_by',
    nights: 'order_by',
  },
  booking_stddev_pop_order_by: {
    guests: 'order_by',
    nights: 'order_by',
  },
  booking_stddev_samp_order_by: {
    guests: 'order_by',
    nights: 'order_by',
  },
  booking_sum_order_by: {
    guests: 'order_by',
    nights: 'order_by',
  },
  booking_var_pop_order_by: {
    guests: 'order_by',
    nights: 'order_by',
  },
  booking_var_samp_order_by: {
    guests: 'order_by',
    nights: 'order_by',
  },
  booking_variance_order_by: {
    guests: 'order_by',
    nights: 'order_by',
  },
  bookingStatus_bool_exp: {
    _and: '[bookingStatus_bool_exp!]',
    _not: 'bookingStatus_bool_exp',
    _or: '[bookingStatus_bool_exp!]',
    name: 'String_comparison_exp',
  },
  bookingStatus_insert_input: {
    name: 'String',
  },
  bookingStatus_on_conflict: {
    constraint: 'bookingStatus_constraint!',
    update_columns: '[bookingStatus_update_column!]!',
    where: 'bookingStatus_bool_exp',
  },
  bookingStatus_order_by: {
    name: 'order_by',
  },
  bookingStatus_pk_columns_input: {
    name: 'String!',
  },
  bookingStatus_set_input: {
    name: 'String',
  },
  Boolean_comparison_exp: {
    _eq: 'Boolean',
    _gt: 'Boolean',
    _gte: 'Boolean',
    _in: '[Boolean!]',
    _is_null: 'Boolean',
    _lt: 'Boolean',
    _lte: 'Boolean',
    _neq: 'Boolean',
    _nin: '[Boolean!]',
  },
  classification_bool_exp: {
    _and: '[classification_bool_exp!]',
    _not: 'classification_bool_exp',
    _or: '[classification_bool_exp!]',
    name: 'String_comparison_exp',
  },
  classification_enum_comparison_exp: {
    _eq: 'classification_enum',
    _in: '[classification_enum!]',
    _is_null: 'Boolean',
    _neq: 'classification_enum',
    _nin: '[classification_enum!]',
  },
  classification_insert_input: {
    name: 'String',
  },
  classification_on_conflict: {
    constraint: 'classification_constraint!',
    update_columns: '[classification_update_column!]!',
    where: 'classification_bool_exp',
  },
  classification_order_by: {
    name: 'order_by',
  },
  classification_pk_columns_input: {
    name: 'String!',
  },
  classification_set_input: {
    name: 'String',
  },
  connection_aggregate_order_by: {
    count: 'order_by',
    max: 'connection_max_order_by',
    min: 'connection_min_order_by',
  },
  connection_append_input: {
    credentials: 'jsonb',
    persistentState: 'jsonb',
  },
  connection_arr_rel_insert_input: {
    data: '[connection_insert_input!]!',
    on_conflict: 'connection_on_conflict',
  },
  connection_bool_exp: {
    _and: '[connection_bool_exp!]',
    _not: 'connection_bool_exp',
    _or: '[connection_bool_exp!]',
    bookings: 'booking_bool_exp',
    createdAt: 'timestamptz_comparison_exp',
    credentials: 'jsonb_comparison_exp',
    entities: 'entity_bool_exp',
    id: 'uuid_comparison_exp',
    integration: 'integration_bool_exp',
    integrationId: 'uuid_comparison_exp',
    jobs: 'job_bool_exp',
    lines: 'line_bool_exp',
    metrics: 'metric_bool_exp',
    name: 'String_comparison_exp',
    payments: 'payment_bool_exp',
    persistentState: 'jsonb_comparison_exp',
    status: 'String_comparison_exp',
    tags: 'tag_bool_exp',
    team: 'team_bool_exp',
    teamId: 'uuid_comparison_exp',
    units: 'unit_bool_exp',
    webhookKey: 'String_comparison_exp',
  },
  connection_delete_at_path_input: {
    credentials: '[String!]',
    persistentState: '[String!]',
  },
  connection_delete_elem_input: {
    credentials: 'Int',
    persistentState: 'Int',
  },
  connection_delete_key_input: {
    credentials: 'String',
    persistentState: 'String',
  },
  connection_insert_input: {
    bookings: 'booking_arr_rel_insert_input',
    createdAt: 'timestamptz',
    credentials: 'jsonb',
    entities: 'entity_arr_rel_insert_input',
    id: 'uuid',
    integration: 'integration_obj_rel_insert_input',
    integrationId: 'uuid',
    jobs: 'job_arr_rel_insert_input',
    lines: 'line_arr_rel_insert_input',
    metrics: 'metric_arr_rel_insert_input',
    name: 'String',
    payments: 'payment_arr_rel_insert_input',
    persistentState: 'jsonb',
    status: 'String',
    tags: 'tag_arr_rel_insert_input',
    team: 'team_obj_rel_insert_input',
    teamId: 'uuid',
    units: 'unit_arr_rel_insert_input',
    webhookKey: 'String',
  },
  connection_max_order_by: {
    createdAt: 'order_by',
    id: 'order_by',
    integrationId: 'order_by',
    name: 'order_by',
    status: 'order_by',
    teamId: 'order_by',
    webhookKey: 'order_by',
  },
  connection_min_order_by: {
    createdAt: 'order_by',
    id: 'order_by',
    integrationId: 'order_by',
    name: 'order_by',
    status: 'order_by',
    teamId: 'order_by',
    webhookKey: 'order_by',
  },
  connection_obj_rel_insert_input: {
    data: 'connection_insert_input!',
    on_conflict: 'connection_on_conflict',
  },
  connection_on_conflict: {
    constraint: 'connection_constraint!',
    update_columns: '[connection_update_column!]!',
    where: 'connection_bool_exp',
  },
  connection_order_by: {
    bookings_aggregate: 'booking_aggregate_order_by',
    createdAt: 'order_by',
    credentials: 'order_by',
    entities_aggregate: 'entity_aggregate_order_by',
    id: 'order_by',
    integration: 'integration_order_by',
    integrationId: 'order_by',
    jobs_aggregate: 'job_aggregate_order_by',
    lines_aggregate: 'line_aggregate_order_by',
    metrics_aggregate: 'metric_aggregate_order_by',
    name: 'order_by',
    payments_aggregate: 'payment_aggregate_order_by',
    persistentState: 'order_by',
    status: 'order_by',
    tags_aggregate: 'tag_aggregate_order_by',
    team: 'team_order_by',
    teamId: 'order_by',
    units_aggregate: 'unit_aggregate_order_by',
    webhookKey: 'order_by',
  },
  connection_pk_columns_input: {
    id: 'uuid!',
  },
  connection_prepend_input: {
    credentials: 'jsonb',
    persistentState: 'jsonb',
  },
  connection_set_input: {
    createdAt: 'timestamptz',
    credentials: 'jsonb',
    id: 'uuid',
    integrationId: 'uuid',
    name: 'String',
    persistentState: 'jsonb',
    status: 'String',
    teamId: 'uuid',
    webhookKey: 'String',
  },
  currency_bool_exp: {
    _and: '[currency_bool_exp!]',
    _not: 'currency_bool_exp',
    _or: '[currency_bool_exp!]',
    name: 'String_comparison_exp',
  },
  currency_enum_comparison_exp: {
    _eq: 'currency_enum',
    _in: '[currency_enum!]',
    _is_null: 'Boolean',
    _neq: 'currency_enum',
    _nin: '[currency_enum!]',
  },
  currency_insert_input: {
    name: 'String',
  },
  currency_on_conflict: {
    constraint: 'currency_constraint!',
    update_columns: '[currency_update_column!]!',
    where: 'currency_bool_exp',
  },
  currency_order_by: {
    name: 'order_by',
  },
  currency_pk_columns_input: {
    name: 'String!',
  },
  currency_set_input: {
    name: 'String',
  },
  entity_aggregate_order_by: {
    count: 'order_by',
    max: 'entity_max_order_by',
    min: 'entity_min_order_by',
  },
  entity_append_input: {
    diffJson: 'jsonb',
    json: 'jsonb',
    normalizedJson: 'jsonb',
  },
  entity_arr_rel_insert_input: {
    data: '[entity_insert_input!]!',
    on_conflict: 'entity_on_conflict',
  },
  entity_bool_exp: {
    _and: '[entity_bool_exp!]',
    _not: 'entity_bool_exp',
    _or: '[entity_bool_exp!]',
    bookings: 'booking_bool_exp',
    connection: 'connection_bool_exp',
    connectionId: 'uuid_comparison_exp',
    createdAt: 'timestamptz_comparison_exp',
    description: 'String_comparison_exp',
    diffJson: 'jsonb_comparison_exp',
    hash: 'String_comparison_exp',
    id: 'uuid_comparison_exp',
    job: 'job_bool_exp',
    jobId: 'uuid_comparison_exp',
    json: 'jsonb_comparison_exp',
    normalizedJson: 'jsonb_comparison_exp',
    normalizedType: 'normalized_type_enum_comparison_exp',
    parsedAt: 'timestamptz_comparison_exp',
    payments: 'payment_bool_exp',
    predecessorEntity: 'entity_bool_exp',
    predecessorEntityId: 'uuid_comparison_exp',
    status: 'entity_status_enum_comparison_exp',
    statusText: 'String_comparison_exp',
    successorEntities: 'entity_bool_exp',
    team: 'team_bool_exp',
    teamId: 'uuid_comparison_exp',
    type: 'String_comparison_exp',
    uniqueRef: 'String_comparison_exp',
    units: 'unit_bool_exp',
    updatedAt: 'timestamptz_comparison_exp',
  },
  entity_delete_at_path_input: {
    diffJson: '[String!]',
    json: '[String!]',
    normalizedJson: '[String!]',
  },
  entity_delete_elem_input: {
    diffJson: 'Int',
    json: 'Int',
    normalizedJson: 'Int',
  },
  entity_delete_key_input: {
    diffJson: 'String',
    json: 'String',
    normalizedJson: 'String',
  },
  entity_insert_input: {
    bookings: 'booking_arr_rel_insert_input',
    connection: 'connection_obj_rel_insert_input',
    connectionId: 'uuid',
    createdAt: 'timestamptz',
    description: 'String',
    diffJson: 'jsonb',
    hash: 'String',
    id: 'uuid',
    job: 'job_obj_rel_insert_input',
    jobId: 'uuid',
    json: 'jsonb',
    normalizedJson: 'jsonb',
    normalizedType: 'normalized_type_enum',
    parsedAt: 'timestamptz',
    payments: 'payment_arr_rel_insert_input',
    predecessorEntity: 'entity_obj_rel_insert_input',
    predecessorEntityId: 'uuid',
    status: 'entity_status_enum',
    statusText: 'String',
    successorEntities: 'entity_arr_rel_insert_input',
    team: 'team_obj_rel_insert_input',
    teamId: 'uuid',
    type: 'String',
    uniqueRef: 'String',
    units: 'unit_arr_rel_insert_input',
    updatedAt: 'timestamptz',
  },
  entity_max_order_by: {
    connectionId: 'order_by',
    createdAt: 'order_by',
    description: 'order_by',
    hash: 'order_by',
    id: 'order_by',
    jobId: 'order_by',
    parsedAt: 'order_by',
    predecessorEntityId: 'order_by',
    statusText: 'order_by',
    teamId: 'order_by',
    type: 'order_by',
    uniqueRef: 'order_by',
    updatedAt: 'order_by',
  },
  entity_min_order_by: {
    connectionId: 'order_by',
    createdAt: 'order_by',
    description: 'order_by',
    hash: 'order_by',
    id: 'order_by',
    jobId: 'order_by',
    parsedAt: 'order_by',
    predecessorEntityId: 'order_by',
    statusText: 'order_by',
    teamId: 'order_by',
    type: 'order_by',
    uniqueRef: 'order_by',
    updatedAt: 'order_by',
  },
  entity_obj_rel_insert_input: {
    data: 'entity_insert_input!',
    on_conflict: 'entity_on_conflict',
  },
  entity_on_conflict: {
    constraint: 'entity_constraint!',
    update_columns: '[entity_update_column!]!',
    where: 'entity_bool_exp',
  },
  entity_order_by: {
    bookings_aggregate: 'booking_aggregate_order_by',
    connection: 'connection_order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    description: 'order_by',
    diffJson: 'order_by',
    hash: 'order_by',
    id: 'order_by',
    job: 'job_order_by',
    jobId: 'order_by',
    json: 'order_by',
    normalizedJson: 'order_by',
    normalizedType: 'order_by',
    parsedAt: 'order_by',
    payments_aggregate: 'payment_aggregate_order_by',
    predecessorEntity: 'entity_order_by',
    predecessorEntityId: 'order_by',
    status: 'order_by',
    statusText: 'order_by',
    successorEntities_aggregate: 'entity_aggregate_order_by',
    team: 'team_order_by',
    teamId: 'order_by',
    type: 'order_by',
    uniqueRef: 'order_by',
    units_aggregate: 'unit_aggregate_order_by',
    updatedAt: 'order_by',
  },
  entity_pk_columns_input: {
    id: 'uuid!',
  },
  entity_prepend_input: {
    diffJson: 'jsonb',
    json: 'jsonb',
    normalizedJson: 'jsonb',
  },
  entity_set_input: {
    connectionId: 'uuid',
    createdAt: 'timestamptz',
    description: 'String',
    diffJson: 'jsonb',
    hash: 'String',
    id: 'uuid',
    jobId: 'uuid',
    json: 'jsonb',
    normalizedJson: 'jsonb',
    normalizedType: 'normalized_type_enum',
    parsedAt: 'timestamptz',
    predecessorEntityId: 'uuid',
    status: 'entity_status_enum',
    statusText: 'String',
    teamId: 'uuid',
    type: 'String',
    uniqueRef: 'String',
    updatedAt: 'timestamptz',
  },
  entity_status_enum_comparison_exp: {
    _eq: 'entity_status_enum',
    _in: '[entity_status_enum!]',
    _is_null: 'Boolean',
    _neq: 'entity_status_enum',
    _nin: '[entity_status_enum!]',
  },
  entityStatus_bool_exp: {
    _and: '[entityStatus_bool_exp!]',
    _not: 'entityStatus_bool_exp',
    _or: '[entityStatus_bool_exp!]',
    name: 'String_comparison_exp',
  },
  entityStatus_insert_input: {
    name: 'String',
  },
  entityStatus_on_conflict: {
    constraint: 'entityStatus_constraint!',
    update_columns: '[entityStatus_update_column!]!',
    where: 'entityStatus_bool_exp',
  },
  entityStatus_order_by: {
    name: 'order_by',
  },
  entityStatus_pk_columns_input: {
    name: 'String!',
  },
  entityStatus_set_input: {
    name: 'String',
  },
  float8_comparison_exp: {
    _eq: 'float8',
    _gt: 'float8',
    _gte: 'float8',
    _in: '[float8!]',
    _is_null: 'Boolean',
    _lt: 'float8',
    _lte: 'float8',
    _neq: 'float8',
    _nin: '[float8!]',
  },
  Int_comparison_exp: {
    _eq: 'Int',
    _gt: 'Int',
    _gte: 'Int',
    _in: '[Int!]',
    _is_null: 'Boolean',
    _lt: 'Int',
    _lte: 'Int',
    _neq: 'Int',
    _nin: '[Int!]',
  },
  integration_aggregate_order_by: {
    count: 'order_by',
    max: 'integration_max_order_by',
    min: 'integration_min_order_by',
  },
  integration_arr_rel_insert_input: {
    data: '[integration_insert_input!]!',
    on_conflict: 'integration_on_conflict',
  },
  integration_bool_exp: {
    _and: '[integration_bool_exp!]',
    _not: 'integration_bool_exp',
    _or: '[integration_bool_exp!]',
    apiDevUrl: 'String_comparison_exp',
    apiUrl: 'String_comparison_exp',
    connections: 'connection_bool_exp',
    icon: 'String_comparison_exp',
    id: 'uuid_comparison_exp',
    isApproved: 'Boolean_comparison_exp',
    isPrivate: 'Boolean_comparison_exp',
    jobs: 'job_bool_exp',
    name: 'String_comparison_exp',
    team: 'team_bool_exp',
    teamId: 'uuid_comparison_exp',
    type: 'integration_type_enum_comparison_exp',
    uniqueRef: 'String_comparison_exp',
  },
  integration_insert_input: {
    apiDevUrl: 'String',
    apiUrl: 'String',
    connections: 'connection_arr_rel_insert_input',
    icon: 'String',
    id: 'uuid',
    isApproved: 'Boolean',
    isPrivate: 'Boolean',
    jobs: 'job_arr_rel_insert_input',
    name: 'String',
    team: 'team_obj_rel_insert_input',
    teamId: 'uuid',
    type: 'integration_type_enum',
    uniqueRef: 'String',
  },
  integration_max_order_by: {
    apiDevUrl: 'order_by',
    apiUrl: 'order_by',
    icon: 'order_by',
    id: 'order_by',
    name: 'order_by',
    teamId: 'order_by',
    uniqueRef: 'order_by',
  },
  integration_min_order_by: {
    apiDevUrl: 'order_by',
    apiUrl: 'order_by',
    icon: 'order_by',
    id: 'order_by',
    name: 'order_by',
    teamId: 'order_by',
    uniqueRef: 'order_by',
  },
  integration_obj_rel_insert_input: {
    data: 'integration_insert_input!',
    on_conflict: 'integration_on_conflict',
  },
  integration_on_conflict: {
    constraint: 'integration_constraint!',
    update_columns: '[integration_update_column!]!',
    where: 'integration_bool_exp',
  },
  integration_order_by: {
    apiDevUrl: 'order_by',
    apiUrl: 'order_by',
    connections_aggregate: 'connection_aggregate_order_by',
    icon: 'order_by',
    id: 'order_by',
    isApproved: 'order_by',
    isPrivate: 'order_by',
    jobs_aggregate: 'job_aggregate_order_by',
    name: 'order_by',
    team: 'team_order_by',
    teamId: 'order_by',
    type: 'order_by',
    uniqueRef: 'order_by',
  },
  integration_pk_columns_input: {
    id: 'uuid!',
  },
  integration_set_input: {
    apiDevUrl: 'String',
    apiUrl: 'String',
    icon: 'String',
    id: 'uuid',
    isApproved: 'Boolean',
    isPrivate: 'Boolean',
    name: 'String',
    teamId: 'uuid',
    type: 'integration_type_enum',
    uniqueRef: 'String',
  },
  integration_type_enum_comparison_exp: {
    _eq: 'integration_type_enum',
    _in: '[integration_type_enum!]',
    _is_null: 'Boolean',
    _neq: 'integration_type_enum',
    _nin: '[integration_type_enum!]',
  },
  integrationType_bool_exp: {
    _and: '[integrationType_bool_exp!]',
    _not: 'integrationType_bool_exp',
    _or: '[integrationType_bool_exp!]',
    name: 'String_comparison_exp',
  },
  integrationType_insert_input: {
    name: 'String',
  },
  integrationType_on_conflict: {
    constraint: 'integrationType_constraint!',
    update_columns: '[integrationType_update_column!]!',
    where: 'integrationType_bool_exp',
  },
  integrationType_order_by: {
    name: 'order_by',
  },
  integrationType_pk_columns_input: {
    name: 'String!',
  },
  integrationType_set_input: {
    name: 'String',
  },
  issue_aggregate_order_by: {
    count: 'order_by',
    max: 'issue_max_order_by',
    min: 'issue_min_order_by',
  },
  issue_append_input: {
    requestParams: 'jsonb',
    resolveParams: 'jsonb',
  },
  issue_arr_rel_insert_input: {
    data: '[issue_insert_input!]!',
    on_conflict: 'issue_on_conflict',
  },
  issue_bool_exp: {
    _and: '[issue_bool_exp!]',
    _not: 'issue_bool_exp',
    _or: '[issue_bool_exp!]',
    code: 'String_comparison_exp',
    createdAt: 'timestamptz_comparison_exp',
    id: 'uuid_comparison_exp',
    isPublic: 'Boolean_comparison_exp',
    isResolved: 'Boolean_comparison_exp',
    job: 'job_bool_exp',
    jobId: 'uuid_comparison_exp',
    message: 'String_comparison_exp',
    requestParams: 'jsonb_comparison_exp',
    resolveParams: 'jsonb_comparison_exp',
    team: 'team_bool_exp',
    teamId: 'uuid_comparison_exp',
    type: 'String_comparison_exp',
    updatedAt: 'timestamptz_comparison_exp',
  },
  issue_delete_at_path_input: {
    requestParams: '[String!]',
    resolveParams: '[String!]',
  },
  issue_delete_elem_input: {
    requestParams: 'Int',
    resolveParams: 'Int',
  },
  issue_delete_key_input: {
    requestParams: 'String',
    resolveParams: 'String',
  },
  issue_insert_input: {
    code: 'String',
    createdAt: 'timestamptz',
    id: 'uuid',
    isPublic: 'Boolean',
    isResolved: 'Boolean',
    job: 'job_obj_rel_insert_input',
    jobId: 'uuid',
    message: 'String',
    requestParams: 'jsonb',
    resolveParams: 'jsonb',
    team: 'team_obj_rel_insert_input',
    teamId: 'uuid',
    type: 'String',
    updatedAt: 'timestamptz',
  },
  issue_max_order_by: {
    code: 'order_by',
    createdAt: 'order_by',
    id: 'order_by',
    jobId: 'order_by',
    message: 'order_by',
    teamId: 'order_by',
    type: 'order_by',
    updatedAt: 'order_by',
  },
  issue_min_order_by: {
    code: 'order_by',
    createdAt: 'order_by',
    id: 'order_by',
    jobId: 'order_by',
    message: 'order_by',
    teamId: 'order_by',
    type: 'order_by',
    updatedAt: 'order_by',
  },
  issue_on_conflict: {
    constraint: 'issue_constraint!',
    update_columns: '[issue_update_column!]!',
    where: 'issue_bool_exp',
  },
  issue_order_by: {
    code: 'order_by',
    createdAt: 'order_by',
    id: 'order_by',
    isPublic: 'order_by',
    isResolved: 'order_by',
    job: 'job_order_by',
    jobId: 'order_by',
    message: 'order_by',
    requestParams: 'order_by',
    resolveParams: 'order_by',
    team: 'team_order_by',
    teamId: 'order_by',
    type: 'order_by',
    updatedAt: 'order_by',
  },
  issue_pk_columns_input: {
    id: 'uuid!',
  },
  issue_prepend_input: {
    requestParams: 'jsonb',
    resolveParams: 'jsonb',
  },
  issue_set_input: {
    code: 'String',
    createdAt: 'timestamptz',
    id: 'uuid',
    isPublic: 'Boolean',
    isResolved: 'Boolean',
    jobId: 'uuid',
    message: 'String',
    requestParams: 'jsonb',
    resolveParams: 'jsonb',
    teamId: 'uuid',
    type: 'String',
    updatedAt: 'timestamptz',
  },
  job_aggregate_order_by: {
    count: 'order_by',
    max: 'job_max_order_by',
    min: 'job_min_order_by',
  },
  job_append_input: {
    logs: 'jsonb',
    params: 'jsonb',
    response: 'jsonb',
  },
  job_arr_rel_insert_input: {
    data: '[job_insert_input!]!',
    on_conflict: 'job_on_conflict',
  },
  job_bool_exp: {
    _and: '[job_bool_exp!]',
    _not: 'job_bool_exp',
    _or: '[job_bool_exp!]',
    apiVersion: 'String_comparison_exp',
    connection: 'connection_bool_exp',
    connectionId: 'uuid_comparison_exp',
    createdAt: 'timestamptz_comparison_exp',
    endedAt: 'timestamptz_comparison_exp',
    entities: 'entity_bool_exp',
    id: 'uuid_comparison_exp',
    integration: 'integration_bool_exp',
    integrationId: 'uuid_comparison_exp',
    integrationSdkVersion: 'String_comparison_exp',
    integrationVersion: 'String_comparison_exp',
    issues: 'issue_bool_exp',
    logFile: 'String_comparison_exp',
    logLink: 'String_comparison_exp',
    logs: 'jsonb_comparison_exp',
    method: 'job_method_enum_comparison_exp',
    params: 'jsonb_comparison_exp',
    requestId: 'String_comparison_exp',
    response: 'jsonb_comparison_exp',
    sdkVersion: 'String_comparison_exp',
    startedAt: 'timestamptz_comparison_exp',
    status: 'job_status_enum_comparison_exp',
    team: 'team_bool_exp',
    teamId: 'uuid_comparison_exp',
    updatedAt: 'timestamptz_comparison_exp',
  },
  job_delete_at_path_input: {
    logs: '[String!]',
    params: '[String!]',
    response: '[String!]',
  },
  job_delete_elem_input: {
    logs: 'Int',
    params: 'Int',
    response: 'Int',
  },
  job_delete_key_input: {
    logs: 'String',
    params: 'String',
    response: 'String',
  },
  job_insert_input: {
    apiVersion: 'String',
    connection: 'connection_obj_rel_insert_input',
    connectionId: 'uuid',
    createdAt: 'timestamptz',
    endedAt: 'timestamptz',
    entities: 'entity_arr_rel_insert_input',
    id: 'uuid',
    integration: 'integration_obj_rel_insert_input',
    integrationId: 'uuid',
    integrationSdkVersion: 'String',
    integrationVersion: 'String',
    issues: 'issue_arr_rel_insert_input',
    logFile: 'String',
    logLink: 'String',
    logs: 'jsonb',
    method: 'job_method_enum',
    params: 'jsonb',
    requestId: 'String',
    response: 'jsonb',
    sdkVersion: 'String',
    startedAt: 'timestamptz',
    status: 'job_status_enum',
    team: 'team_obj_rel_insert_input',
    teamId: 'uuid',
    updatedAt: 'timestamptz',
  },
  job_max_order_by: {
    apiVersion: 'order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    endedAt: 'order_by',
    id: 'order_by',
    integrationId: 'order_by',
    integrationSdkVersion: 'order_by',
    integrationVersion: 'order_by',
    logFile: 'order_by',
    logLink: 'order_by',
    requestId: 'order_by',
    sdkVersion: 'order_by',
    startedAt: 'order_by',
    teamId: 'order_by',
    updatedAt: 'order_by',
  },
  job_method_enum_comparison_exp: {
    _eq: 'job_method_enum',
    _in: '[job_method_enum!]',
    _is_null: 'Boolean',
    _neq: 'job_method_enum',
    _nin: '[job_method_enum!]',
  },
  job_min_order_by: {
    apiVersion: 'order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    endedAt: 'order_by',
    id: 'order_by',
    integrationId: 'order_by',
    integrationSdkVersion: 'order_by',
    integrationVersion: 'order_by',
    logFile: 'order_by',
    logLink: 'order_by',
    requestId: 'order_by',
    sdkVersion: 'order_by',
    startedAt: 'order_by',
    teamId: 'order_by',
    updatedAt: 'order_by',
  },
  job_obj_rel_insert_input: {
    data: 'job_insert_input!',
    on_conflict: 'job_on_conflict',
  },
  job_on_conflict: {
    constraint: 'job_constraint!',
    update_columns: '[job_update_column!]!',
    where: 'job_bool_exp',
  },
  job_order_by: {
    apiVersion: 'order_by',
    connection: 'connection_order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    endedAt: 'order_by',
    entities_aggregate: 'entity_aggregate_order_by',
    id: 'order_by',
    integration: 'integration_order_by',
    integrationId: 'order_by',
    integrationSdkVersion: 'order_by',
    integrationVersion: 'order_by',
    issues_aggregate: 'issue_aggregate_order_by',
    logFile: 'order_by',
    logLink: 'order_by',
    logs: 'order_by',
    method: 'order_by',
    params: 'order_by',
    requestId: 'order_by',
    response: 'order_by',
    sdkVersion: 'order_by',
    startedAt: 'order_by',
    status: 'order_by',
    team: 'team_order_by',
    teamId: 'order_by',
    updatedAt: 'order_by',
  },
  job_pk_columns_input: {
    id: 'uuid!',
  },
  job_prepend_input: {
    logs: 'jsonb',
    params: 'jsonb',
    response: 'jsonb',
  },
  job_set_input: {
    apiVersion: 'String',
    connectionId: 'uuid',
    createdAt: 'timestamptz',
    endedAt: 'timestamptz',
    id: 'uuid',
    integrationId: 'uuid',
    integrationSdkVersion: 'String',
    integrationVersion: 'String',
    logFile: 'String',
    logLink: 'String',
    logs: 'jsonb',
    method: 'job_method_enum',
    params: 'jsonb',
    requestId: 'String',
    response: 'jsonb',
    sdkVersion: 'String',
    startedAt: 'timestamptz',
    status: 'job_status_enum',
    teamId: 'uuid',
    updatedAt: 'timestamptz',
  },
  job_status_enum_comparison_exp: {
    _eq: 'job_status_enum',
    _in: '[job_status_enum!]',
    _is_null: 'Boolean',
    _neq: 'job_status_enum',
    _nin: '[job_status_enum!]',
  },
  jobMethod_bool_exp: {
    _and: '[jobMethod_bool_exp!]',
    _not: 'jobMethod_bool_exp',
    _or: '[jobMethod_bool_exp!]',
    name: 'String_comparison_exp',
  },
  jobMethod_insert_input: {
    name: 'String',
  },
  jobMethod_on_conflict: {
    constraint: 'jobMethod_constraint!',
    update_columns: '[jobMethod_update_column!]!',
    where: 'jobMethod_bool_exp',
  },
  jobMethod_order_by: {
    name: 'order_by',
  },
  jobMethod_pk_columns_input: {
    name: 'String!',
  },
  jobMethod_set_input: {
    name: 'String',
  },
  jobStatus_bool_exp: {
    _and: '[jobStatus_bool_exp!]',
    _not: 'jobStatus_bool_exp',
    _or: '[jobStatus_bool_exp!]',
    name: 'String_comparison_exp',
  },
  jobStatus_insert_input: {
    name: 'String',
  },
  jobStatus_on_conflict: {
    constraint: 'jobStatus_constraint!',
    update_columns: '[jobStatus_update_column!]!',
    where: 'jobStatus_bool_exp',
  },
  jobStatus_order_by: {
    name: 'order_by',
  },
  jobStatus_pk_columns_input: {
    name: 'String!',
  },
  jobStatus_set_input: {
    name: 'String',
  },
  jsonb_comparison_exp: {
    _contained_in: 'jsonb',
    _contains: 'jsonb',
    _eq: 'jsonb',
    _gt: 'jsonb',
    _gte: 'jsonb',
    _has_key: 'String',
    _has_keys_all: '[String!]',
    _has_keys_any: '[String!]',
    _in: '[jsonb!]',
    _is_null: 'Boolean',
    _lt: 'jsonb',
    _lte: 'jsonb',
    _neq: 'jsonb',
    _nin: '[jsonb!]',
  },
  line_aggregate_order_by: {
    avg: 'line_avg_order_by',
    count: 'order_by',
    max: 'line_max_order_by',
    min: 'line_min_order_by',
    stddev: 'line_stddev_order_by',
    stddev_pop: 'line_stddev_pop_order_by',
    stddev_samp: 'line_stddev_samp_order_by',
    sum: 'line_sum_order_by',
    var_pop: 'line_var_pop_order_by',
    var_samp: 'line_var_samp_order_by',
    variance: 'line_variance_order_by',
  },
  line_append_input: {
    metadata: 'jsonb',
  },
  line_arr_rel_insert_input: {
    data: '[line_insert_input!]!',
    on_conflict: 'line_on_conflict',
  },
  line_avg_order_by: {
    centTotal: 'order_by',
    originCentTotal: 'order_by',
    originExchangeRate: 'order_by',
  },
  line_bool_exp: {
    _and: '[line_bool_exp!]',
    _not: 'line_bool_exp',
    _or: '[line_bool_exp!]',
    booking: 'booking_bool_exp',
    bookingId: 'uuid_comparison_exp',
    centTotal: 'Int_comparison_exp',
    classification: 'classification_enum_comparison_exp',
    connection: 'connection_bool_exp',
    connectionId: 'uuid_comparison_exp',
    createdAt: 'timestamptz_comparison_exp',
    description: 'String_comparison_exp',
    enhancementLines: 'line_bool_exp',
    enhancingLine: 'line_bool_exp',
    enhancingLineId: 'uuid_comparison_exp',
    id: 'uuid_comparison_exp',
    invoiceStatus: 'String_comparison_exp',
    isEnhanced: 'Boolean_comparison_exp',
    metadata: 'jsonb_comparison_exp',
    originCentTotal: 'Int_comparison_exp',
    originCurrency: 'String_comparison_exp',
    originExchangeRate: 'numeric_comparison_exp',
    payment: 'payment_bool_exp',
    paymentId: 'uuid_comparison_exp',
    subclassification: 'subclassification_enum_comparison_exp',
    team: 'team_bool_exp',
    teamId: 'uuid_comparison_exp',
    type: 'String_comparison_exp',
    uniqueRef: 'String_comparison_exp',
    unitId: 'uuid_comparison_exp',
    updatedAt: 'timestamptz_comparison_exp',
  },
  line_delete_at_path_input: {
    metadata: '[String!]',
  },
  line_delete_elem_input: {
    metadata: 'Int',
  },
  line_delete_key_input: {
    metadata: 'String',
  },
  line_inc_input: {
    centTotal: 'Int',
    originCentTotal: 'Int',
    originExchangeRate: 'numeric',
  },
  line_insert_input: {
    booking: 'booking_obj_rel_insert_input',
    bookingId: 'uuid',
    centTotal: 'Int',
    classification: 'classification_enum',
    connection: 'connection_obj_rel_insert_input',
    connectionId: 'uuid',
    createdAt: 'timestamptz',
    description: 'String',
    enhancementLines: 'line_arr_rel_insert_input',
    enhancingLine: 'line_obj_rel_insert_input',
    enhancingLineId: 'uuid',
    id: 'uuid',
    invoiceStatus: 'String',
    isEnhanced: 'Boolean',
    metadata: 'jsonb',
    originCentTotal: 'Int',
    originCurrency: 'String',
    originExchangeRate: 'numeric',
    payment: 'payment_obj_rel_insert_input',
    paymentId: 'uuid',
    subclassification: 'subclassification_enum',
    team: 'team_obj_rel_insert_input',
    teamId: 'uuid',
    type: 'String',
    uniqueRef: 'String',
    unitId: 'uuid',
    updatedAt: 'timestamptz',
  },
  line_max_order_by: {
    bookingId: 'order_by',
    centTotal: 'order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    description: 'order_by',
    enhancingLineId: 'order_by',
    id: 'order_by',
    invoiceStatus: 'order_by',
    originCentTotal: 'order_by',
    originCurrency: 'order_by',
    originExchangeRate: 'order_by',
    paymentId: 'order_by',
    teamId: 'order_by',
    type: 'order_by',
    uniqueRef: 'order_by',
    unitId: 'order_by',
    updatedAt: 'order_by',
  },
  line_min_order_by: {
    bookingId: 'order_by',
    centTotal: 'order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    description: 'order_by',
    enhancingLineId: 'order_by',
    id: 'order_by',
    invoiceStatus: 'order_by',
    originCentTotal: 'order_by',
    originCurrency: 'order_by',
    originExchangeRate: 'order_by',
    paymentId: 'order_by',
    teamId: 'order_by',
    type: 'order_by',
    uniqueRef: 'order_by',
    unitId: 'order_by',
    updatedAt: 'order_by',
  },
  line_obj_rel_insert_input: {
    data: 'line_insert_input!',
    on_conflict: 'line_on_conflict',
  },
  line_on_conflict: {
    constraint: 'line_constraint!',
    update_columns: '[line_update_column!]!',
    where: 'line_bool_exp',
  },
  line_order_by: {
    booking: 'booking_order_by',
    bookingId: 'order_by',
    centTotal: 'order_by',
    classification: 'order_by',
    connection: 'connection_order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    description: 'order_by',
    enhancementLines_aggregate: 'line_aggregate_order_by',
    enhancingLine: 'line_order_by',
    enhancingLineId: 'order_by',
    id: 'order_by',
    invoiceStatus: 'order_by',
    isEnhanced: 'order_by',
    metadata: 'order_by',
    originCentTotal: 'order_by',
    originCurrency: 'order_by',
    originExchangeRate: 'order_by',
    payment: 'payment_order_by',
    paymentId: 'order_by',
    subclassification: 'order_by',
    team: 'team_order_by',
    teamId: 'order_by',
    type: 'order_by',
    uniqueRef: 'order_by',
    unitId: 'order_by',
    updatedAt: 'order_by',
  },
  line_pk_columns_input: {
    id: 'uuid!',
  },
  line_prepend_input: {
    metadata: 'jsonb',
  },
  line_set_input: {
    bookingId: 'uuid',
    centTotal: 'Int',
    classification: 'classification_enum',
    connectionId: 'uuid',
    createdAt: 'timestamptz',
    description: 'String',
    enhancingLineId: 'uuid',
    id: 'uuid',
    invoiceStatus: 'String',
    isEnhanced: 'Boolean',
    metadata: 'jsonb',
    originCentTotal: 'Int',
    originCurrency: 'String',
    originExchangeRate: 'numeric',
    paymentId: 'uuid',
    subclassification: 'subclassification_enum',
    teamId: 'uuid',
    type: 'String',
    uniqueRef: 'String',
    unitId: 'uuid',
    updatedAt: 'timestamptz',
  },
  line_stddev_order_by: {
    centTotal: 'order_by',
    originCentTotal: 'order_by',
    originExchangeRate: 'order_by',
  },
  line_stddev_pop_order_by: {
    centTotal: 'order_by',
    originCentTotal: 'order_by',
    originExchangeRate: 'order_by',
  },
  line_stddev_samp_order_by: {
    centTotal: 'order_by',
    originCentTotal: 'order_by',
    originExchangeRate: 'order_by',
  },
  line_sum_order_by: {
    centTotal: 'order_by',
    originCentTotal: 'order_by',
    originExchangeRate: 'order_by',
  },
  line_var_pop_order_by: {
    centTotal: 'order_by',
    originCentTotal: 'order_by',
    originExchangeRate: 'order_by',
  },
  line_var_samp_order_by: {
    centTotal: 'order_by',
    originCentTotal: 'order_by',
    originExchangeRate: 'order_by',
  },
  line_variance_order_by: {
    centTotal: 'order_by',
    originCentTotal: 'order_by',
    originExchangeRate: 'order_by',
  },
  metric_aggregate_order_by: {
    avg: 'metric_avg_order_by',
    count: 'order_by',
    max: 'metric_max_order_by',
    min: 'metric_min_order_by',
    stddev: 'metric_stddev_order_by',
    stddev_pop: 'metric_stddev_pop_order_by',
    stddev_samp: 'metric_stddev_samp_order_by',
    sum: 'metric_sum_order_by',
    var_pop: 'metric_var_pop_order_by',
    var_samp: 'metric_var_samp_order_by',
    variance: 'metric_variance_order_by',
  },
  metric_append_input: {
    metadata: 'jsonb',
  },
  metric_arr_rel_insert_input: {
    data: '[metric_insert_input!]!',
    on_conflict: 'metric_on_conflict',
  },
  metric_avg_order_by: {
    value: 'order_by',
  },
  metric_bool_exp: {
    _and: '[metric_bool_exp!]',
    _not: 'metric_bool_exp',
    _or: '[metric_bool_exp!]',
    connection: 'connection_bool_exp',
    connectionId: 'uuid_comparison_exp',
    createdAt: 'timestamptz_comparison_exp',
    ensuedAt: 'timestamptz_comparison_exp',
    id: 'uuid_comparison_exp',
    metadata: 'jsonb_comparison_exp',
    team: 'team_bool_exp',
    teamId: 'uuid_comparison_exp',
    text: 'String_comparison_exp',
    type: 'String_comparison_exp',
    uniqueRef: 'String_comparison_exp',
    unitId: 'uuid_comparison_exp',
    updatedAt: 'timestamptz_comparison_exp',
    value: 'float8_comparison_exp',
  },
  metric_delete_at_path_input: {
    metadata: '[String!]',
  },
  metric_delete_elem_input: {
    metadata: 'Int',
  },
  metric_delete_key_input: {
    metadata: 'String',
  },
  metric_inc_input: {
    value: 'float8',
  },
  metric_insert_input: {
    connection: 'connection_obj_rel_insert_input',
    connectionId: 'uuid',
    createdAt: 'timestamptz',
    ensuedAt: 'timestamptz',
    id: 'uuid',
    metadata: 'jsonb',
    team: 'team_obj_rel_insert_input',
    teamId: 'uuid',
    text: 'String',
    type: 'String',
    uniqueRef: 'String',
    unitId: 'uuid',
    updatedAt: 'timestamptz',
    value: 'float8',
  },
  metric_max_order_by: {
    connectionId: 'order_by',
    createdAt: 'order_by',
    ensuedAt: 'order_by',
    id: 'order_by',
    teamId: 'order_by',
    text: 'order_by',
    type: 'order_by',
    uniqueRef: 'order_by',
    unitId: 'order_by',
    updatedAt: 'order_by',
    value: 'order_by',
  },
  metric_min_order_by: {
    connectionId: 'order_by',
    createdAt: 'order_by',
    ensuedAt: 'order_by',
    id: 'order_by',
    teamId: 'order_by',
    text: 'order_by',
    type: 'order_by',
    uniqueRef: 'order_by',
    unitId: 'order_by',
    updatedAt: 'order_by',
    value: 'order_by',
  },
  metric_on_conflict: {
    constraint: 'metric_constraint!',
    update_columns: '[metric_update_column!]!',
    where: 'metric_bool_exp',
  },
  metric_order_by: {
    connection: 'connection_order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    ensuedAt: 'order_by',
    id: 'order_by',
    metadata: 'order_by',
    team: 'team_order_by',
    teamId: 'order_by',
    text: 'order_by',
    type: 'order_by',
    uniqueRef: 'order_by',
    unitId: 'order_by',
    updatedAt: 'order_by',
    value: 'order_by',
  },
  metric_pk_columns_input: {
    id: 'uuid!',
  },
  metric_prepend_input: {
    metadata: 'jsonb',
  },
  metric_set_input: {
    connectionId: 'uuid',
    createdAt: 'timestamptz',
    ensuedAt: 'timestamptz',
    id: 'uuid',
    metadata: 'jsonb',
    teamId: 'uuid',
    text: 'String',
    type: 'String',
    uniqueRef: 'String',
    unitId: 'uuid',
    updatedAt: 'timestamptz',
    value: 'float8',
  },
  metric_stddev_order_by: {
    value: 'order_by',
  },
  metric_stddev_pop_order_by: {
    value: 'order_by',
  },
  metric_stddev_samp_order_by: {
    value: 'order_by',
  },
  metric_sum_order_by: {
    value: 'order_by',
  },
  metric_var_pop_order_by: {
    value: 'order_by',
  },
  metric_var_samp_order_by: {
    value: 'order_by',
  },
  metric_variance_order_by: {
    value: 'order_by',
  },
  normalized_type_enum_comparison_exp: {
    _eq: 'normalized_type_enum',
    _in: '[normalized_type_enum!]',
    _is_null: 'Boolean',
    _neq: 'normalized_type_enum',
    _nin: '[normalized_type_enum!]',
  },
  normalizedType_bool_exp: {
    _and: '[normalizedType_bool_exp!]',
    _not: 'normalizedType_bool_exp',
    _or: '[normalizedType_bool_exp!]',
    name: 'String_comparison_exp',
  },
  normalizedType_insert_input: {
    name: 'String',
  },
  normalizedType_on_conflict: {
    constraint: 'normalizedType_constraint!',
    update_columns: '[normalizedType_update_column!]!',
    where: 'normalizedType_bool_exp',
  },
  normalizedType_order_by: {
    name: 'order_by',
  },
  normalizedType_pk_columns_input: {
    name: 'String!',
  },
  normalizedType_set_input: {
    name: 'String',
  },
  numeric_comparison_exp: {
    _eq: 'numeric',
    _gt: 'numeric',
    _gte: 'numeric',
    _in: '[numeric!]',
    _is_null: 'Boolean',
    _lt: 'numeric',
    _lte: 'numeric',
    _neq: 'numeric',
    _nin: '[numeric!]',
  },
  payment_aggregate_order_by: {
    avg: 'payment_avg_order_by',
    count: 'order_by',
    max: 'payment_max_order_by',
    min: 'payment_min_order_by',
    stddev: 'payment_stddev_order_by',
    stddev_pop: 'payment_stddev_pop_order_by',
    stddev_samp: 'payment_stddev_samp_order_by',
    sum: 'payment_sum_order_by',
    var_pop: 'payment_var_pop_order_by',
    var_samp: 'payment_var_samp_order_by',
    variance: 'payment_variance_order_by',
  },
  payment_append_input: {
    metadata: 'jsonb',
  },
  payment_arr_rel_insert_input: {
    data: '[payment_insert_input!]!',
    on_conflict: 'payment_on_conflict',
  },
  payment_avg_order_by: {
    centTotal: 'order_by',
  },
  payment_bool_exp: {
    _and: '[payment_bool_exp!]',
    _not: 'payment_bool_exp',
    _or: '[payment_bool_exp!]',
    arrivesAt: 'timestamptz_comparison_exp',
    centTotal: 'Int_comparison_exp',
    connection: 'connection_bool_exp',
    connectionId: 'uuid_comparison_exp',
    createdAt: 'timestamptz_comparison_exp',
    currency: 'currency_enum_comparison_exp',
    description: 'String_comparison_exp',
    entity: 'entity_bool_exp',
    entityId: 'uuid_comparison_exp',
    id: 'uuid_comparison_exp',
    lines: 'line_bool_exp',
    metadata: 'jsonb_comparison_exp',
    paidAt: 'timestamptz_comparison_exp',
    status: 'payment_status_enum_comparison_exp',
    tags: 'tag_bool_exp',
    team: 'team_bool_exp',
    teamId: 'uuid_comparison_exp',
    type: 'String_comparison_exp',
    uniqueRef: 'String_comparison_exp',
    updatedAt: 'timestamptz_comparison_exp',
  },
  payment_delete_at_path_input: {
    metadata: '[String!]',
  },
  payment_delete_elem_input: {
    metadata: 'Int',
  },
  payment_delete_key_input: {
    metadata: 'String',
  },
  payment_inc_input: {
    centTotal: 'Int',
  },
  payment_insert_input: {
    arrivesAt: 'timestamptz',
    centTotal: 'Int',
    connection: 'connection_obj_rel_insert_input',
    connectionId: 'uuid',
    createdAt: 'timestamptz',
    currency: 'currency_enum',
    description: 'String',
    entity: 'entity_obj_rel_insert_input',
    entityId: 'uuid',
    id: 'uuid',
    lines: 'line_arr_rel_insert_input',
    metadata: 'jsonb',
    paidAt: 'timestamptz',
    status: 'payment_status_enum',
    tags: 'tag_arr_rel_insert_input',
    team: 'team_obj_rel_insert_input',
    teamId: 'uuid',
    type: 'String',
    uniqueRef: 'String',
    updatedAt: 'timestamptz',
  },
  payment_max_order_by: {
    arrivesAt: 'order_by',
    centTotal: 'order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    description: 'order_by',
    entityId: 'order_by',
    id: 'order_by',
    paidAt: 'order_by',
    teamId: 'order_by',
    type: 'order_by',
    uniqueRef: 'order_by',
    updatedAt: 'order_by',
  },
  payment_min_order_by: {
    arrivesAt: 'order_by',
    centTotal: 'order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    description: 'order_by',
    entityId: 'order_by',
    id: 'order_by',
    paidAt: 'order_by',
    teamId: 'order_by',
    type: 'order_by',
    uniqueRef: 'order_by',
    updatedAt: 'order_by',
  },
  payment_obj_rel_insert_input: {
    data: 'payment_insert_input!',
    on_conflict: 'payment_on_conflict',
  },
  payment_on_conflict: {
    constraint: 'payment_constraint!',
    update_columns: '[payment_update_column!]!',
    where: 'payment_bool_exp',
  },
  payment_order_by: {
    arrivesAt: 'order_by',
    centTotal: 'order_by',
    connection: 'connection_order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    currency: 'order_by',
    description: 'order_by',
    entity: 'entity_order_by',
    entityId: 'order_by',
    id: 'order_by',
    lines_aggregate: 'line_aggregate_order_by',
    metadata: 'order_by',
    paidAt: 'order_by',
    status: 'order_by',
    tags_aggregate: 'tag_aggregate_order_by',
    team: 'team_order_by',
    teamId: 'order_by',
    type: 'order_by',
    uniqueRef: 'order_by',
    updatedAt: 'order_by',
  },
  payment_pk_columns_input: {
    id: 'uuid!',
  },
  payment_prepend_input: {
    metadata: 'jsonb',
  },
  payment_set_input: {
    arrivesAt: 'timestamptz',
    centTotal: 'Int',
    connectionId: 'uuid',
    createdAt: 'timestamptz',
    currency: 'currency_enum',
    description: 'String',
    entityId: 'uuid',
    id: 'uuid',
    metadata: 'jsonb',
    paidAt: 'timestamptz',
    status: 'payment_status_enum',
    teamId: 'uuid',
    type: 'String',
    uniqueRef: 'String',
    updatedAt: 'timestamptz',
  },
  payment_status_enum_comparison_exp: {
    _eq: 'payment_status_enum',
    _in: '[payment_status_enum!]',
    _is_null: 'Boolean',
    _neq: 'payment_status_enum',
    _nin: '[payment_status_enum!]',
  },
  payment_stddev_order_by: {
    centTotal: 'order_by',
  },
  payment_stddev_pop_order_by: {
    centTotal: 'order_by',
  },
  payment_stddev_samp_order_by: {
    centTotal: 'order_by',
  },
  payment_sum_order_by: {
    centTotal: 'order_by',
  },
  payment_var_pop_order_by: {
    centTotal: 'order_by',
  },
  payment_var_samp_order_by: {
    centTotal: 'order_by',
  },
  payment_variance_order_by: {
    centTotal: 'order_by',
  },
  paymentStatus_bool_exp: {
    _and: '[paymentStatus_bool_exp!]',
    _not: 'paymentStatus_bool_exp',
    _or: '[paymentStatus_bool_exp!]',
    name: 'String_comparison_exp',
  },
  paymentStatus_insert_input: {
    name: 'String',
  },
  paymentStatus_on_conflict: {
    constraint: 'paymentStatus_constraint!',
    update_columns: '[paymentStatus_update_column!]!',
    where: 'paymentStatus_bool_exp',
  },
  paymentStatus_order_by: {
    name: 'order_by',
  },
  paymentStatus_pk_columns_input: {
    name: 'String!',
  },
  paymentStatus_set_input: {
    name: 'String',
  },
  paymentType_bool_exp: {
    _and: '[paymentType_bool_exp!]',
    _not: 'paymentType_bool_exp',
    _or: '[paymentType_bool_exp!]',
    name: 'String_comparison_exp',
  },
  paymentType_insert_input: {
    name: 'String',
  },
  paymentType_on_conflict: {
    constraint: 'paymentType_constraint!',
    update_columns: '[paymentType_update_column!]!',
    where: 'paymentType_bool_exp',
  },
  paymentType_order_by: {
    name: 'order_by',
  },
  paymentType_pk_columns_input: {
    name: 'String!',
  },
  paymentType_set_input: {
    name: 'String',
  },
  String_comparison_exp: {
    _eq: 'String',
    _gt: 'String',
    _gte: 'String',
    _ilike: 'String',
    _in: '[String!]',
    _iregex: 'String',
    _is_null: 'Boolean',
    _like: 'String',
    _lt: 'String',
    _lte: 'String',
    _neq: 'String',
    _nilike: 'String',
    _nin: '[String!]',
    _niregex: 'String',
    _nlike: 'String',
    _nregex: 'String',
    _nsimilar: 'String',
    _regex: 'String',
    _similar: 'String',
  },
  subclassification_bool_exp: {
    _and: '[subclassification_bool_exp!]',
    _not: 'subclassification_bool_exp',
    _or: '[subclassification_bool_exp!]',
    name: 'String_comparison_exp',
  },
  subclassification_enum_comparison_exp: {
    _eq: 'subclassification_enum',
    _in: '[subclassification_enum!]',
    _is_null: 'Boolean',
    _neq: 'subclassification_enum',
    _nin: '[subclassification_enum!]',
  },
  subclassification_insert_input: {
    name: 'String',
  },
  subclassification_on_conflict: {
    constraint: 'subclassification_constraint!',
    update_columns: '[subclassification_update_column!]!',
    where: 'subclassification_bool_exp',
  },
  subclassification_order_by: {
    name: 'order_by',
  },
  subclassification_pk_columns_input: {
    name: 'String!',
  },
  subclassification_set_input: {
    name: 'String',
  },
  tag_aggregate_order_by: {
    count: 'order_by',
    max: 'tag_max_order_by',
    min: 'tag_min_order_by',
  },
  tag_append_input: {
    json: 'jsonb',
  },
  tag_arr_rel_insert_input: {
    data: '[tag_insert_input!]!',
    on_conflict: 'tag_on_conflict',
  },
  tag_bool_exp: {
    _and: '[tag_bool_exp!]',
    _not: 'tag_bool_exp',
    _or: '[tag_bool_exp!]',
    booking: 'booking_bool_exp',
    bookingId: 'uuid_comparison_exp',
    connection: 'connection_bool_exp',
    connectionId: 'uuid_comparison_exp',
    createdAt: 'timestamptz_comparison_exp',
    id: 'uuid_comparison_exp',
    json: 'jsonb_comparison_exp',
    payment: 'payment_bool_exp',
    paymentId: 'uuid_comparison_exp',
    team: 'team_bool_exp',
    teamId: 'uuid_comparison_exp',
    type: 'String_comparison_exp',
    uniqueRef: 'String_comparison_exp',
    unit: 'unit_bool_exp',
    unitId: 'uuid_comparison_exp',
    updatedAt: 'timestamptz_comparison_exp',
  },
  tag_delete_at_path_input: {
    json: '[String!]',
  },
  tag_delete_elem_input: {
    json: 'Int',
  },
  tag_delete_key_input: {
    json: 'String',
  },
  tag_insert_input: {
    booking: 'booking_obj_rel_insert_input',
    bookingId: 'uuid',
    connection: 'connection_obj_rel_insert_input',
    connectionId: 'uuid',
    createdAt: 'timestamptz',
    id: 'uuid',
    json: 'jsonb',
    payment: 'payment_obj_rel_insert_input',
    paymentId: 'uuid',
    team: 'team_obj_rel_insert_input',
    teamId: 'uuid',
    type: 'String',
    uniqueRef: 'String',
    unit: 'unit_obj_rel_insert_input',
    unitId: 'uuid',
    updatedAt: 'timestamptz',
  },
  tag_max_order_by: {
    bookingId: 'order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    id: 'order_by',
    paymentId: 'order_by',
    teamId: 'order_by',
    type: 'order_by',
    uniqueRef: 'order_by',
    unitId: 'order_by',
    updatedAt: 'order_by',
  },
  tag_min_order_by: {
    bookingId: 'order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    id: 'order_by',
    paymentId: 'order_by',
    teamId: 'order_by',
    type: 'order_by',
    uniqueRef: 'order_by',
    unitId: 'order_by',
    updatedAt: 'order_by',
  },
  tag_on_conflict: {
    constraint: 'tag_constraint!',
    update_columns: '[tag_update_column!]!',
    where: 'tag_bool_exp',
  },
  tag_order_by: {
    booking: 'booking_order_by',
    bookingId: 'order_by',
    connection: 'connection_order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    id: 'order_by',
    json: 'order_by',
    payment: 'payment_order_by',
    paymentId: 'order_by',
    team: 'team_order_by',
    teamId: 'order_by',
    type: 'order_by',
    uniqueRef: 'order_by',
    unit: 'unit_order_by',
    unitId: 'order_by',
    updatedAt: 'order_by',
  },
  tag_pk_columns_input: {
    id: 'uuid!',
  },
  tag_prepend_input: {
    json: 'jsonb',
  },
  tag_set_input: {
    bookingId: 'uuid',
    connectionId: 'uuid',
    createdAt: 'timestamptz',
    id: 'uuid',
    json: 'jsonb',
    paymentId: 'uuid',
    teamId: 'uuid',
    type: 'String',
    uniqueRef: 'String',
    unitId: 'uuid',
    updatedAt: 'timestamptz',
  },
  team_bool_exp: {
    _and: '[team_bool_exp!]',
    _not: 'team_bool_exp',
    _or: '[team_bool_exp!]',
    address: 'String_comparison_exp',
    bookings: 'booking_bool_exp',
    commissionPercentage: 'numeric_comparison_exp',
    connections: 'connection_bool_exp',
    createdAt: 'timestamptz_comparison_exp',
    email: 'String_comparison_exp',
    entities: 'entity_bool_exp',
    id: 'uuid_comparison_exp',
    integrations: 'integration_bool_exp',
    isActive: 'Boolean_comparison_exp',
    isTest: 'Boolean_comparison_exp',
    issues: 'issue_bool_exp',
    jobs: 'job_bool_exp',
    lines: 'line_bool_exp',
    members: 'teamUser_bool_exp',
    metrics: 'metric_bool_exp',
    name: 'String_comparison_exp',
    payments: 'payment_bool_exp',
    stripeId: 'String_comparison_exp',
    stripeSubscriptionItemId: 'String_comparison_exp',
    supportEmail: 'String_comparison_exp',
    supportPhone: 'String_comparison_exp',
    tags: 'tag_bool_exp',
    units: 'unit_bool_exp',
    webhooks: 'webhook_bool_exp',
    website: 'String_comparison_exp',
  },
  team_inc_input: {
    commissionPercentage: 'numeric',
  },
  team_insert_input: {
    address: 'String',
    bookings: 'booking_arr_rel_insert_input',
    commissionPercentage: 'numeric',
    connections: 'connection_arr_rel_insert_input',
    createdAt: 'timestamptz',
    email: 'String',
    entities: 'entity_arr_rel_insert_input',
    id: 'uuid',
    integrations: 'integration_arr_rel_insert_input',
    isActive: 'Boolean',
    isTest: 'Boolean',
    issues: 'issue_arr_rel_insert_input',
    jobs: 'job_arr_rel_insert_input',
    lines: 'line_arr_rel_insert_input',
    members: 'teamUser_arr_rel_insert_input',
    metrics: 'metric_arr_rel_insert_input',
    name: 'String',
    payments: 'payment_arr_rel_insert_input',
    stripeId: 'String',
    stripeSubscriptionItemId: 'String',
    supportEmail: 'String',
    supportPhone: 'String',
    tags: 'tag_arr_rel_insert_input',
    units: 'unit_arr_rel_insert_input',
    webhooks: 'webhook_arr_rel_insert_input',
    website: 'String',
  },
  team_obj_rel_insert_input: {
    data: 'team_insert_input!',
    on_conflict: 'team_on_conflict',
  },
  team_on_conflict: {
    constraint: 'team_constraint!',
    update_columns: '[team_update_column!]!',
    where: 'team_bool_exp',
  },
  team_order_by: {
    address: 'order_by',
    bookings_aggregate: 'booking_aggregate_order_by',
    commissionPercentage: 'order_by',
    connections_aggregate: 'connection_aggregate_order_by',
    createdAt: 'order_by',
    email: 'order_by',
    entities_aggregate: 'entity_aggregate_order_by',
    id: 'order_by',
    integrations_aggregate: 'integration_aggregate_order_by',
    isActive: 'order_by',
    isTest: 'order_by',
    issues_aggregate: 'issue_aggregate_order_by',
    jobs_aggregate: 'job_aggregate_order_by',
    lines_aggregate: 'line_aggregate_order_by',
    members_aggregate: 'teamUser_aggregate_order_by',
    metrics_aggregate: 'metric_aggregate_order_by',
    name: 'order_by',
    payments_aggregate: 'payment_aggregate_order_by',
    stripeId: 'order_by',
    stripeSubscriptionItemId: 'order_by',
    supportEmail: 'order_by',
    supportPhone: 'order_by',
    tags_aggregate: 'tag_aggregate_order_by',
    units_aggregate: 'unit_aggregate_order_by',
    webhooks_aggregate: 'webhook_aggregate_order_by',
    website: 'order_by',
  },
  team_pk_columns_input: {
    id: 'uuid!',
  },
  team_set_input: {
    address: 'String',
    commissionPercentage: 'numeric',
    createdAt: 'timestamptz',
    email: 'String',
    id: 'uuid',
    isActive: 'Boolean',
    isTest: 'Boolean',
    name: 'String',
    stripeId: 'String',
    stripeSubscriptionItemId: 'String',
    supportEmail: 'String',
    supportPhone: 'String',
    website: 'String',
  },
  teamUser_aggregate_order_by: {
    count: 'order_by',
    max: 'teamUser_max_order_by',
    min: 'teamUser_min_order_by',
  },
  teamUser_arr_rel_insert_input: {
    data: '[teamUser_insert_input!]!',
    on_conflict: 'teamUser_on_conflict',
  },
  teamUser_bool_exp: {
    _and: '[teamUser_bool_exp!]',
    _not: 'teamUser_bool_exp',
    _or: '[teamUser_bool_exp!]',
    createdAt: 'timestamptz_comparison_exp',
    id: 'uuid_comparison_exp',
    role: 'String_comparison_exp',
    team: 'team_bool_exp',
    teamId: 'uuid_comparison_exp',
    updatedAt: 'timestamptz_comparison_exp',
    user: 'user_bool_exp',
    userId: 'uuid_comparison_exp',
  },
  teamUser_insert_input: {
    createdAt: 'timestamptz',
    id: 'uuid',
    role: 'String',
    team: 'team_obj_rel_insert_input',
    teamId: 'uuid',
    updatedAt: 'timestamptz',
    user: 'user_obj_rel_insert_input',
    userId: 'uuid',
  },
  teamUser_max_order_by: {
    createdAt: 'order_by',
    id: 'order_by',
    role: 'order_by',
    teamId: 'order_by',
    updatedAt: 'order_by',
    userId: 'order_by',
  },
  teamUser_min_order_by: {
    createdAt: 'order_by',
    id: 'order_by',
    role: 'order_by',
    teamId: 'order_by',
    updatedAt: 'order_by',
    userId: 'order_by',
  },
  teamUser_on_conflict: {
    constraint: 'teamUser_constraint!',
    update_columns: '[teamUser_update_column!]!',
    where: 'teamUser_bool_exp',
  },
  teamUser_order_by: {
    createdAt: 'order_by',
    id: 'order_by',
    role: 'order_by',
    team: 'team_order_by',
    teamId: 'order_by',
    updatedAt: 'order_by',
    user: 'user_order_by',
    userId: 'order_by',
  },
  teamUser_pk_columns_input: {
    id: 'uuid!',
  },
  teamUser_set_input: {
    createdAt: 'timestamptz',
    id: 'uuid',
    role: 'String',
    teamId: 'uuid',
    updatedAt: 'timestamptz',
    userId: 'uuid',
  },
  timestamptz_comparison_exp: {
    _eq: 'timestamptz',
    _gt: 'timestamptz',
    _gte: 'timestamptz',
    _in: '[timestamptz!]',
    _is_null: 'Boolean',
    _lt: 'timestamptz',
    _lte: 'timestamptz',
    _neq: 'timestamptz',
    _nin: '[timestamptz!]',
  },
  unit_aggregate_order_by: {
    count: 'order_by',
    max: 'unit_max_order_by',
    min: 'unit_min_order_by',
  },
  unit_append_input: {
    metadata: 'jsonb',
  },
  unit_arr_rel_insert_input: {
    data: '[unit_insert_input!]!',
    on_conflict: 'unit_on_conflict',
  },
  unit_bool_exp: {
    _and: '[unit_bool_exp!]',
    _not: 'unit_bool_exp',
    _or: '[unit_bool_exp!]',
    bookings: 'booking_bool_exp',
    connection: 'connection_bool_exp',
    connectionId: 'uuid_comparison_exp',
    createdAt: 'timestamptz_comparison_exp',
    entity: 'entity_bool_exp',
    entityId: 'uuid_comparison_exp',
    id: 'uuid_comparison_exp',
    metadata: 'jsonb_comparison_exp',
    name: 'String_comparison_exp',
    status: 'String_comparison_exp',
    tags: 'tag_bool_exp',
    team: 'team_bool_exp',
    teamId: 'uuid_comparison_exp',
    uniqueRef: 'String_comparison_exp',
    updatedAt: 'timestamptz_comparison_exp',
  },
  unit_delete_at_path_input: {
    metadata: '[String!]',
  },
  unit_delete_elem_input: {
    metadata: 'Int',
  },
  unit_delete_key_input: {
    metadata: 'String',
  },
  unit_insert_input: {
    bookings: 'booking_arr_rel_insert_input',
    connection: 'connection_obj_rel_insert_input',
    connectionId: 'uuid',
    createdAt: 'timestamptz',
    entity: 'entity_obj_rel_insert_input',
    entityId: 'uuid',
    id: 'uuid',
    metadata: 'jsonb',
    name: 'String',
    status: 'String',
    tags: 'tag_arr_rel_insert_input',
    team: 'team_obj_rel_insert_input',
    teamId: 'uuid',
    uniqueRef: 'String',
    updatedAt: 'timestamptz',
  },
  unit_max_order_by: {
    connectionId: 'order_by',
    createdAt: 'order_by',
    entityId: 'order_by',
    id: 'order_by',
    name: 'order_by',
    status: 'order_by',
    teamId: 'order_by',
    uniqueRef: 'order_by',
    updatedAt: 'order_by',
  },
  unit_min_order_by: {
    connectionId: 'order_by',
    createdAt: 'order_by',
    entityId: 'order_by',
    id: 'order_by',
    name: 'order_by',
    status: 'order_by',
    teamId: 'order_by',
    uniqueRef: 'order_by',
    updatedAt: 'order_by',
  },
  unit_obj_rel_insert_input: {
    data: 'unit_insert_input!',
    on_conflict: 'unit_on_conflict',
  },
  unit_on_conflict: {
    constraint: 'unit_constraint!',
    update_columns: '[unit_update_column!]!',
    where: 'unit_bool_exp',
  },
  unit_order_by: {
    bookings_aggregate: 'booking_aggregate_order_by',
    connection: 'connection_order_by',
    connectionId: 'order_by',
    createdAt: 'order_by',
    entity: 'entity_order_by',
    entityId: 'order_by',
    id: 'order_by',
    metadata: 'order_by',
    name: 'order_by',
    status: 'order_by',
    tags_aggregate: 'tag_aggregate_order_by',
    team: 'team_order_by',
    teamId: 'order_by',
    uniqueRef: 'order_by',
    updatedAt: 'order_by',
  },
  unit_pk_columns_input: {
    id: 'uuid!',
  },
  unit_prepend_input: {
    metadata: 'jsonb',
  },
  unit_set_input: {
    connectionId: 'uuid',
    createdAt: 'timestamptz',
    entityId: 'uuid',
    id: 'uuid',
    metadata: 'jsonb',
    name: 'String',
    status: 'String',
    teamId: 'uuid',
    uniqueRef: 'String',
    updatedAt: 'timestamptz',
  },
  user_bool_exp: {
    _and: '[user_bool_exp!]',
    _not: 'user_bool_exp',
    _or: '[user_bool_exp!]',
    createdAt: 'timestamptz_comparison_exp',
    email: 'String_comparison_exp',
    id: 'uuid_comparison_exp',
    isAdmin: 'Boolean_comparison_exp',
    memberships: 'teamUser_bool_exp',
    name: 'String_comparison_exp',
    status: 'user_status_enum_comparison_exp',
    sub: 'String_comparison_exp',
    trialExpiryAt: 'timestamptz_comparison_exp',
  },
  user_insert_input: {
    createdAt: 'timestamptz',
    email: 'String',
    id: 'uuid',
    isAdmin: 'Boolean',
    memberships: 'teamUser_arr_rel_insert_input',
    name: 'String',
    status: 'user_status_enum',
    sub: 'String',
    trialExpiryAt: 'timestamptz',
  },
  user_obj_rel_insert_input: {
    data: 'user_insert_input!',
    on_conflict: 'user_on_conflict',
  },
  user_on_conflict: {
    constraint: 'user_constraint!',
    update_columns: '[user_update_column!]!',
    where: 'user_bool_exp',
  },
  user_order_by: {
    createdAt: 'order_by',
    email: 'order_by',
    id: 'order_by',
    isAdmin: 'order_by',
    memberships_aggregate: 'teamUser_aggregate_order_by',
    name: 'order_by',
    status: 'order_by',
    sub: 'order_by',
    trialExpiryAt: 'order_by',
  },
  user_pk_columns_input: {
    id: 'uuid!',
  },
  user_set_input: {
    createdAt: 'timestamptz',
    email: 'String',
    id: 'uuid',
    isAdmin: 'Boolean',
    name: 'String',
    status: 'user_status_enum',
    sub: 'String',
    trialExpiryAt: 'timestamptz',
  },
  user_status_enum_comparison_exp: {
    _eq: 'user_status_enum',
    _in: '[user_status_enum!]',
    _is_null: 'Boolean',
    _neq: 'user_status_enum',
    _nin: '[user_status_enum!]',
  },
  userStatus_bool_exp: {
    _and: '[userStatus_bool_exp!]',
    _not: 'userStatus_bool_exp',
    _or: '[userStatus_bool_exp!]',
    name: 'String_comparison_exp',
  },
  userStatus_insert_input: {
    name: 'String',
  },
  userStatus_on_conflict: {
    constraint: 'userStatus_constraint!',
    update_columns: '[userStatus_update_column!]!',
    where: 'userStatus_bool_exp',
  },
  userStatus_order_by: {
    name: 'order_by',
  },
  userStatus_pk_columns_input: {
    name: 'String!',
  },
  userStatus_set_input: {
    name: 'String',
  },
  uuid_comparison_exp: {
    _eq: 'uuid',
    _gt: 'uuid',
    _gte: 'uuid',
    _in: '[uuid!]',
    _is_null: 'Boolean',
    _lt: 'uuid',
    _lte: 'uuid',
    _neq: 'uuid',
    _nin: '[uuid!]',
  },
  webhook_aggregate_order_by: {
    count: 'order_by',
    max: 'webhook_max_order_by',
    min: 'webhook_min_order_by',
  },
  webhook_append_input: {
    headers: 'jsonb',
    types: 'jsonb',
  },
  webhook_arr_rel_insert_input: {
    data: '[webhook_insert_input!]!',
    on_conflict: 'webhook_on_conflict',
  },
  webhook_bool_exp: {
    _and: '[webhook_bool_exp!]',
    _not: 'webhook_bool_exp',
    _or: '[webhook_bool_exp!]',
    createdAt: 'timestamptz_comparison_exp',
    headers: 'jsonb_comparison_exp',
    id: 'uuid_comparison_exp',
    team: 'team_bool_exp',
    teamId: 'uuid_comparison_exp',
    types: 'jsonb_comparison_exp',
    types2: '_text_comparison_exp',
    url: 'String_comparison_exp',
  },
  webhook_delete_at_path_input: {
    headers: '[String!]',
    types: '[String!]',
  },
  webhook_delete_elem_input: {
    headers: 'Int',
    types: 'Int',
  },
  webhook_delete_key_input: {
    headers: 'String',
    types: 'String',
  },
  webhook_insert_input: {
    createdAt: 'timestamptz',
    headers: 'jsonb',
    id: 'uuid',
    team: 'team_obj_rel_insert_input',
    teamId: 'uuid',
    types: 'jsonb',
    types2: '_text',
    url: 'String',
  },
  webhook_max_order_by: {
    createdAt: 'order_by',
    id: 'order_by',
    teamId: 'order_by',
    url: 'order_by',
  },
  webhook_min_order_by: {
    createdAt: 'order_by',
    id: 'order_by',
    teamId: 'order_by',
    url: 'order_by',
  },
  webhook_on_conflict: {
    constraint: 'webhook_constraint!',
    update_columns: '[webhook_update_column!]!',
    where: 'webhook_bool_exp',
  },
  webhook_order_by: {
    createdAt: 'order_by',
    headers: 'order_by',
    id: 'order_by',
    team: 'team_order_by',
    teamId: 'order_by',
    types: 'order_by',
    types2: 'order_by',
    url: 'order_by',
  },
  webhook_pk_columns_input: {
    id: 'uuid!',
  },
  webhook_prepend_input: {
    headers: 'jsonb',
    types: 'jsonb',
  },
  webhook_set_input: {
    createdAt: 'timestamptz',
    headers: 'jsonb',
    id: 'uuid',
    teamId: 'uuid',
    types: 'jsonb',
    types2: '_text',
    url: 'String',
  },
}
