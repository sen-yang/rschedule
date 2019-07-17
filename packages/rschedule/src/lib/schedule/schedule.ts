import { DateAdapter } from '../date-adapter';
import { DateTime } from '../date-time';
import { Dates } from '../dates';
import { IDataContainer, IRunArgs, IScheduleLike, OccurrenceGenerator } from '../interfaces';
import {
  CollectionIterator,
  ICollectionsArgs,
  IOccurrencesArgs,
  OccurrenceIterator,
} from '../iterators';
import { add, OccurrenceStream, OperatorFnOutput, pipeFn, subtract, unique } from '../operators';
import { RScheduleConfig } from '../rschedule-config';
import { IProvidedRuleOptions, Rule } from '../rule';
import { DateInput } from '../utilities';

const SCHEDULE_ID = Symbol.for('35d5d3f8-8924-43d2-b100-48e04b0cf500');

export class Schedule<T extends typeof DateAdapter, D = any> extends OccurrenceGenerator<T>
  implements IScheduleLike<T>, IDataContainer<D> {
  /**
   * Similar to `Array.isArray`, `isSchedule` provides a surefire method
   * of determining if an object is a `Schedule` by checking against the
   * global symbol registry.
   */
  static isSchedule(object: unknown): object is Schedule<any> {
    return !!(object && typeof object === 'object' && (object as any)[SCHEDULE_ID]);
  }

  readonly rrules: ReadonlyArray<Rule<T>> = [];
  readonly exrules: ReadonlyArray<Rule<T>> = [];
  readonly rdates: Dates<T>;
  readonly exdates: Dates<T>;

  pipe: (...operatorFns: OperatorFnOutput<T>[]) => OccurrenceStream<T> = pipeFn(this);

  /**
   * Convenience property for holding arbitrary data. Accessible on individual DateAdapters
   * generated by this `Schedule` object via the `DateAdapter#generators` property. Unlike
   * the rest of the `Schedule` object, the data property is mutable.
   */
  data!: D;

  readonly isInfinite: boolean;
  readonly hasDuration: boolean;
  readonly maxDuration: number | undefined;

  protected readonly [SCHEDULE_ID] = true;

  private readonly occurrenceStream: OccurrenceStream<T>;

  /**
   * Create a new Schedule object with the specified options.
   *
   * The order of precidence for rrules, rdates, exrules, and exdates is:
   *
   * 1. rrules are included
   * 2. exrules are excluded
   * 3. rdates are included
   * 4. exdates are excluded
   *
   * ### Options
   *
   * - **timezone**: the timezone that yielded occurrences should be in.
   * - **data**: arbitrary data you can associate with this Schedule. This
   *   is the only mutable property of `Schedule` objects.
   * - **dateAdapter**: the DateAdapter class that should be used for this Schedule.
   * - **maxDuration**: currently unused.
   * - **rrules**: rules specifying when occurrences happen. See the "Rule Config"
   *   section below.
   * - **rdates**: individual dates that should be _included_ in the schedule.
   * - **exdates**: individual dates that should be _excluded_ from the schedule.
   * - **exrules**: rules specifying when occurrences shouldn't happen. See the
   *   "Rule Config" section below.
   *
   * ### Rule Config
   *
   * - #### frequency
   *
   *   The frequency rule part identifies the type of recurrence rule. Valid values
   *   include `"SECONDLY"`, `"MINUTELY"`, `"HOURLY"`, `"DAILY"`, `"WEEKLY"`,
   *   `"MONTHLY"`, or `"YEARLY"`.
   *
   * - #### start
   *
   *   The start of the rule (not necessarily the first occurrence).
   *   Either a `DateAdapter` instance, date object, or `DateTime` object.
   *   The type of date object depends on the `DateAdapter` class used for this
   *   `Rule`.
   *
   * - #### end?
   *
   *   The end of the rule (not necessarily the last occurrence).
   *   Either a `DateAdapter` instance, date object, or `DateTime` object.
   *   The type of date object depends on the `DateAdapter` class used for this
   *   `Rule`.
   *
   * - #### duration?
   *
   *   A length of time expressed in milliseconds.
   *
   * - #### interval?
   *
   *   The interval rule part contains a positive integer representing at
   *   which intervals the recurrence rule repeats. The default value is
   *   `1`, meaning every second for a SECONDLY rule, every minute for a
   *   MINUTELY rule, every hour for an HOURLY rule, every day for a
   *   DAILY rule, every week for a WEEKLY rule, every month for a
   *   MONTHLY rule, and every year for a YEARLY rule. For example,
   *   within a DAILY rule, a value of `8` means every eight days.
   *
   * - #### count?
   *
   *   The count rule part defines the number of occurrences at which to
   *   range-bound the recurrence. `count` and `end` are both two different
   *   ways of specifying how a recurrence completes.
   *
   * - #### weekStart?
   *
   *   The weekStart rule part specifies the day on which the workweek starts.
   *   Valid values are `"MO"`, `"TU"`, `"WE"`, `"TH"`, `"FR"`, `"SA"`, and `"SU"`.
   *   This is significant when a WEEKLY rule has an interval greater than 1,
   *   and a `byDayOfWeek` rule part is specified. The
   *   default value is `"MO"`.
   *
   * - #### bySecondOfMinute?
   *
   *   The bySecondOfMinute rule part expects an array of seconds
   *   within a minute. Valid values are 0 to 60.
   *
   * - #### byMinuteOfHour?
   *
   *   The byMinuteOfHour rule part expects an array of minutes within an hour.
   *   Valid values are 0 to 59.
   *
   * - #### byHourOfDay?
   *
   *   The byHourOfDay rule part expects an array of hours of the day.
   *   Valid values are 0 to 23.
   *
   * - #### byDayOfWeek?
   *
   *   *note: the byDayOfWeek rule part is kinda complex. Blame the ICAL spec.*
   *
   *   The byDayOfWeek rule part expects an array. Each array entry can
   *   be a day of the week (`"SU"`, `"MO"` , `"TU"`, `"WE"`, `"TH"`,
   *   `"FR"`, `"SA"`). If the rule's `frequency` is either MONTHLY or YEARLY,
   *   Any entry can also be a tuple where the first value of the tuple is a
   *   day of the week and the second value is an positive/negative integer
   *   (e.g. `["SU", 1]`). In this case, the number indicates the nth occurrence of
   *   the specified day within the MONTHLY or YEARLY rule.
   *
   *   The behavior of byDayOfWeek changes depending on the `frequency`
   *   of the rule.
   *
   *   Within a MONTHLY rule, `["MO", 1]` represents the first Monday
   *   within the month, whereas `["MO", -1]` represents the last Monday
   *   of the month.
   *
   *   Within a YEARLY rule, the numeric value in a byDayOfWeek tuple entry
   *   corresponds to an offset within the month when the byMonthOfYear rule part is
   *   present, and corresponds to an offset within the year otherwise.
   *
   *   Regardless of rule `frequency`, if a byDayOfWeek entry is a string
   *   (rather than a tuple), it means "all of these days" within the specified
   *   frequency (e.g. within a MONTHLY rule, `"MO"` represents all Mondays within
   *   the month).
   *
   * - #### byDayOfMonth?
   *
   *   The byDayOfMonth rule part expects an array of days
   *   of the month. Valid values are 1 to 31 or -31 to -1.
   *
   *   For example, -10 represents the tenth to the last day of the month.
   *   The byDayOfMonth rule part *must not* be specified when the rule's
   *   `frequency` is set to WEEKLY.
   *
   * - #### byMonthOfYear?
   *
   *   The byMonthOfYear rule part expects an array of months
   *   of the year. Valid values are 1 to 12.
   *
   */
  constructor(
    options: {
      dateAdapter?: T;
      timezone?: string | null;
      data?: D;
      rrules?: ReadonlyArray<IProvidedRuleOptions<T> | Rule<T>>;
      exrules?: ReadonlyArray<IProvidedRuleOptions<T> | Rule<T>>;
      rdates?: ReadonlyArray<DateInput<T>> | Dates<T>;
      exdates?: ReadonlyArray<DateInput<T>> | Dates<T>;
      maxDuration?: number;
    } = {},
  ) {
    super(options);

    this.data = options.data as D;

    if (options.rrules) {
      this.rrules = options.rrules.map(ruleArgs => {
        if (Rule.isRule(ruleArgs)) {
          return ruleArgs.set('timezone', this.timezone);
        } else {
          return new Rule(ruleArgs as IProvidedRuleOptions<T>, {
            dateAdapter: this.dateAdapter as any,
            timezone: this.timezone,
          });
        }
      });
    }

    if (options.exrules) {
      this.exrules = options.exrules.map(ruleArgs => {
        if (Rule.isRule(ruleArgs)) {
          return ruleArgs.set('timezone', this.timezone);
        } else {
          return new Rule(ruleArgs as IProvidedRuleOptions<T>, {
            dateAdapter: this.dateAdapter as any,
            timezone: this.timezone,
          });
        }
      });
    }

    if (options.rdates) {
      this.rdates = Dates.isDates(options.rdates)
        ? options.rdates.set('timezone', this.timezone)
        : new Dates({
            dates: options.rdates as ReadonlyArray<DateInput<T>>,
            dateAdapter: this.dateAdapter as any,
            timezone: this.timezone,
          });
    } else {
      this.rdates = new Dates({
        dateAdapter: this.dateAdapter as any,
        timezone: this.timezone,
      });
    }

    if (options.exdates) {
      this.exdates = Dates.isDates(options.exdates)
        ? options.exdates.set('timezone', this.timezone)
        : new Dates({
            dates: options.exdates as ReadonlyArray<DateInput<T>>,
            dateAdapter: this.dateAdapter as any,
            timezone: this.timezone,
          });
    } else {
      this.exdates = new Dates({ dateAdapter: this.dateAdapter as any, timezone: this.timezone });
    }

    this.hasDuration =
      this.rrules.every(rule => rule.hasDuration) &&
      this.exrules.every(rule => rule.hasDuration) &&
      this.rdates.hasDuration &&
      this.exdates.hasDuration;

    this.isInfinite = this.rrules.some(rule => rule.isInfinite);

    const operators = [
      add<T>(...this.rrules),
      subtract<T>(...this.exrules),
      add<T>(this.rdates),
      subtract<T>(this.exdates),
      unique<T>(),
    ];

    this.occurrenceStream = new OccurrenceStream({
      operators,
      dateAdapter: this.dateAdapter,
      timezone: this.timezone,
    });
  }

  occurrences(args: IOccurrencesArgs<T> = {}): OccurrenceIterator<T, [this, Rule<T> | Dates<T>]> {
    return new OccurrenceIterator(this, this.normalizeOccurrencesArgs(args));
  }

  collections(args: ICollectionsArgs<T> = {}): CollectionIterator<T, [this, Rule<T> | Dates<T>]> {
    return new CollectionIterator(this, this.normalizeCollectionsArgs(args));
  }

  add(prop: 'rrule' | 'exrule', value: Rule<T, unknown>): Schedule<T, D>;
  add(prop: 'rdate' | 'exdate', value: DateInput<T>): Schedule<T, D>;
  add(prop: 'rdate' | 'exdate' | 'rrule' | 'exrule', value: Rule<T, unknown> | DateInput<T>) {
    const rrules = this.rrules.slice();
    const exrules = this.exrules.slice();
    let rdates = this.rdates;
    let exdates = this.exdates;

    switch (prop) {
      case 'rrule':
        rrules.push(value as Rule<T>);
        break;
      case 'exrule':
        exrules.push(value as Rule<T>);
        break;
      case 'rdate':
        rdates = this.rdates.add(value as DateInput<T>);
        break;
      case 'exdate':
        exdates = this.exdates.add(value as DateInput<T>);
        break;
    }

    return new Schedule({
      dateAdapter: this.dateAdapter,
      timezone: this.timezone,
      data: this.data,
      rrules,
      exrules,
      rdates,
      exdates,
    });
  }

  remove(prop: 'rrule' | 'exrule', value: Rule<T, unknown>): Schedule<T, D>;
  remove(prop: 'rdate' | 'exdate', value: DateInput<T>): Schedule<T, D>;
  remove(prop: 'rdate' | 'exdate' | 'rrule' | 'exrule', value: Rule<T, unknown> | DateInput<T>) {
    let rrules = this.rrules;
    let exrules = this.exrules;
    let rdates = this.rdates;
    let exdates = this.exdates;

    switch (prop) {
      case 'rrule':
        rrules = rrules.filter(rule => rule !== value);
        break;
      case 'exrule':
        exrules = exrules.filter(rule => rule !== value);
        break;
      case 'rdate':
        rdates = this.rdates.remove(value as DateInput<T>);
        break;
      case 'exdate':
        exdates = this.exdates.remove(value as DateInput<T>);
        break;
    }

    return new Schedule({
      dateAdapter: this.dateAdapter,
      timezone: this.timezone,
      data: this.data,
      rrules,
      exrules,
      rdates,
      exdates,
    });
  }

  set(
    prop: 'timezone',
    value: string | null,
    options?: { keepLocalTime?: boolean },
  ): Schedule<T, D>;
  set(prop: 'rrules' | 'exrules', value: Rule<T, unknown>[]): Schedule<T, D>;
  set(prop: 'rdates' | 'exdates', value: Dates<T, unknown>): Schedule<T, D>;
  set(
    prop: 'timezone' | 'rrules' | 'exrules' | 'rdates' | 'exdates',
    value: string | null | Rule<T, unknown>[] | Dates<T, unknown>,
    options: { keepLocalTime?: boolean } = {},
  ) {
    let timezone = this.timezone;
    let rrules = this.rrules;
    let exrules = this.exrules;
    let rdates = this.rdates;
    let exdates = this.exdates;

    switch (prop) {
      case 'timezone':
        if (value === this.timezone && !options.keepLocalTime) return this;
        else if (options.keepLocalTime) {
          rrules = rrules.map(rule => rule.set('timezone', value as string | null, options));
          exrules = exrules.map(rule => rule.set('timezone', value as string | null, options));
          rdates = rdates.set('timezone', value as string | null, options);
          exdates = exdates.set('timezone', value as string | null, options);
        }

        timezone = value as string | null;
        break;
      case 'rrules':
        rrules = value as Rule<T>[];
        break;
      case 'exrules':
        exrules = value as Rule<T>[];
        break;
      case 'rdates':
        rdates = value as Dates<T>;
        break;
      case 'exdates':
        exdates = value as Dates<T>;
        break;
    }

    return new Schedule({
      dateAdapter: this.dateAdapter,
      timezone,
      data: this.data,
      rrules,
      exrules,
      rdates,
      exdates,
    });
  }

  /**  @internal use occurrences() instead */
  *_run(args: IRunArgs = {}): IterableIterator<DateTime> {
    const count = args.take;

    delete args.take;

    const iterator = this.occurrenceStream._run(args);

    let date = iterator.next().value;
    let index = 0;

    while (date && (count === undefined || count > index)) {
      date.generators.unshift(this);

      const yieldArgs = yield this.normalizeRunOutput(date);

      date = iterator.next(yieldArgs).value;

      index++;
    }
  }
}
