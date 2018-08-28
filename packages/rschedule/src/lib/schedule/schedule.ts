import {
  DateAdapter,
  IDateAdapterConstructor,
  InstanceOfDateAdapterConstructor,
} from '../date-adapter'
import { parseICalStrings } from '../ical/parser'
import {
  HasOccurrences,
  IHasOccurrences,
  OccurrenceIterator,
  OccurrencesArgs,
  RunnableIterator,
  Serializable,
} from '../interfaces'
import { RRule, Rule, RuleArgs } from '../rule'
import { EXDates, RDates } from '../dates'
import { Options } from '../rule/rule-options'
import { UnionOperator, ExcludeOperator, UniqueOperator, TakeOperator } from '../operators';

const SCHEDULE_ID = Symbol.for('35d5d3f8-8924-43d2-b100-48e04b0cf500')

export class Schedule<
  T extends DateAdapter<T>,
  D = any
> extends HasOccurrences<T>
  implements
    Serializable,
    RunnableIterator<T>,
    IHasOccurrences<T, Schedule<T, D>> {

  get isInfinite() {
    return this.rrules.some(rule => rule.isInfinite)
  }

  public readonly [SCHEDULE_ID] = true

  /**
   * Similar to `Array.isArray`, `isSchedule` provides a surefire method
   * of determining if an object is a `Schedule` by checking against the
   * global symbol registry.
   */
  public static isSchedule(object: any): object is Schedule<any> {
    return !!(object && object[Symbol.for('35d5d3f8-8924-43d2-b100-48e04b0cf500')])
  }

  public static fromICal<T extends IDateAdapterConstructor<T>, D = undefined>(
    icals: string | string[],
    dateAdapterConstructor: T,
    args: {
      data?: D
    } = {}
  ): Schedule<InstanceOfDateAdapterConstructor<T>, D> { // specifying the return fixes a build bug
    if (!Array.isArray(icals)) { icals = [icals] }

    const options = parseICalStrings(icals, dateAdapterConstructor)

    return new Schedule({
      ...options,
      data: args.data
    })
  }
  
  public rrules: RRule<T>[] = []
  public rdates = new RDates<T>()
  public exdates = new EXDates<T>()

  /** Convenience property for holding arbitrary data */
  public data!: D

  constructor(args: {
    data?: D
    rrules?: (RuleArgs<T> | Options.ProvidedOptions<T> | RRule<T>)[]
    rdates?: T[] | RDates<T>
    exdates?: T[] | EXDates<T>
  } = {}) {
    super()

    if (args.data) this.data = args.data;
    if (args.rrules) {
      this.rrules = args.rrules.map(args => {
        if (Array.isArray(args))
          // @ts-ignore typescript doesn't like spread operator
          return  new RRule(...args)
        else if (RRule.isRRule(args))
          return args.clone()
        else
          return new RRule(args)
      })
    }
    if (args.rdates) { this.rdates = RDates.isRDates(args.rdates) ? args.rdates.clone() : new RDates({dates: args.rdates}) }
    if (args.exdates) { this.exdates = EXDates.isEXDates(args.exdates) ? args.exdates.clone() : new EXDates({dates: args.exdates}) }
  }

  public toICal() {
    const icals: string[] = []

    this.rrules.forEach(rule => icals.push(rule.toICal()))
    if (this.rdates.length > 0) { icals.push(this.rdates.toICal()) }
    if (this.exdates.length > 0) { icals.push(this.exdates.toICal()) }

    return icals
  }

  /**
   * Update all `rrules`, `rdates`, and `exdates` of this schedule to use a
   * new timezone. This mutates the schedule's `rrules`, `rdates`, and `exdates`.
   */
  public setTimezone(timezone: string | undefined, options: {keepLocalTime?: boolean} = {}) {
    this.rrules.forEach(rule => rule.setTimezone(timezone, options))
    this.rdates.setTimezone(timezone, options)
    this.exdates.setTimezone(timezone, options)

    return this
  }

  /**
   * Returns a clone of the Schedule object and all properties except the data property
   * (instead, the original data property is included as the data property of the
   * new Schedule).
   */
  public clone() {
    return new Schedule<T, D>({
      data: this.data,
      rrules: this.rrules,
      rdates: this.rdates,
      exdates: this.exdates,
    })
  }

  public occurrences(
    args: OccurrencesArgs<T> = {}
  ): OccurrenceIterator<T, Schedule<T, D>> {
    return new OccurrenceIterator(this, args)
  }


  /**
   * Checks to see if an occurrence exists which equals the given date.
   */
  public occursOn(args: {date: T}): boolean
  /**
   * Checks to see if an occurrence exists with a weekday === the `weekday` argument.
   * 
   * Optional arguments:
   * 
   * - `after` and `before` arguments can be provided which limit the
   *   possible occurrences to ones *after or equal* or *before or equal* the given dates.
   *   - If `excludeEnds` is `true`, then the after/before arguments become exclusive rather
   *       than inclusive.
   */
  public occursOn(args: {weekday: DateAdapter.Weekday; after?: T; before?: T; excludeEnds?: boolean}): boolean
  public occursOn(args: {date?: T; weekday?: DateAdapter.Weekday; after?: T; before?: T; excludeEnds?: boolean}): boolean {
    if (args.weekday) {
      let before = args.before && (args.excludeEnds ? args.before.clone().subtract(1, 'day') : args.before)
      let after = args.after && (args.excludeEnds ? args.after.clone().add(1, 'day') : args.after)

      // Filter to get relevant exdates
      const excludeDates = this.exdates.dates.filter(date => 
        date.get('weekday') === args.weekday && (
          !after || date.isAfterOrEqual(after)
        ) && (
          !before || date.isBeforeOrEqual(before)
        )
      )

      const rules: (Rule<T> | RDates<T>)[] = this.rrules.slice()
      rules.push(this.rdates)

      return rules.some(rule => rule.occursOn({...args as {weekday: DateAdapter.Weekday}, excludeDates}))
    }
    else
      return super.occursOn(args as {date: T})
  }

  /**  @private use occurrences() instead */
  _run(args: OccurrencesArgs<T> = {}) {
    const rruleOccurrences = new UnionOperator<T>(this.rrules)

    // const exruleOccurrences = new UnionOperator<T>(this.exrules)

    // const stepOne = new ExcludeOperator(exruleOccurrences, rruleOccurrences)

    const stepTwo = new UnionOperator<T>([rruleOccurrences, this.rdates])

    const stepThree = new ExcludeOperator(this.exdates, stepTwo)

    const stepFour = new UniqueOperator(stepThree)

    const stepFive = new TakeOperator(stepFour)

    return stepFive._run(args)
  }
}
