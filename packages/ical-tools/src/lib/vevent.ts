import {
  add,
  ArgumentError,
  CollectionIterator,
  DateAdapter,
  DateInput,
  Dates,
  DateTime,
  ICollectionsArgs,
  IOccurrencesArgs,
  IProvidedRuleOptions,
  IRunArgs,
  IScheduleLike,
  OccurrenceGenerator,
  OccurrenceIterator,
  OccurrenceStream,
  Omit,
  OperatorFnOutput,
  pipeFn,
  Rule,
  subtract,
  unique,
} from '@rschedule/rschedule';

const VEVENT_ID = Symbol.for('b1666600-db88-4d8e-9e40-05fdbc48d650');

export type IVEventRuleOptions<T extends typeof DateAdapter> = Omit<
  IProvidedRuleOptions<T>,
  'start' | 'duration'
>;

export class VEvent<T extends typeof DateAdapter, D = any> extends OccurrenceGenerator<T>
  implements IScheduleLike<T> {
  /**
   * Similar to `Array.isArray`, `isVEvent` provides a surefire method
   * of determining if an object is a `VEvent` by checking against the
   * global symbol registry.
   */
  static isVEvent(object: unknown): object is VEvent<any> {
    return !!(object && typeof object === 'object' && (object as any)[VEVENT_ID]);
  }

  // For some reason, error is thrown if typed as `readonly Rule<T>[]`
  readonly rrules: ReadonlyArray<Rule<T>> = [];
  readonly exrules: ReadonlyArray<Rule<T>> = [];
  readonly rdates: Dates<T>;
  readonly exdates: Dates<T>;

  pipe: (...operatorFns: OperatorFnOutput<T>[]) => OccurrenceStream<T> = pipeFn(this);

  /** Convenience property for holding arbitrary data */
  data!: D;

  readonly start: InstanceType<T>;
  readonly isInfinite: boolean;
  readonly duration?: number;
  readonly hasDuration: boolean;
  readonly timezone: string | null;

  protected readonly [VEVENT_ID] = true;

  private readonly _start: DateTime;
  private readonly occurrenceStream: OccurrenceStream<T>;

  constructor(args: {
    start: DateInput<T>;
    dateAdapter?: T;
    data?: D;
    rrules?: ReadonlyArray<IVEventRuleOptions<T> | Rule<T>>;
    exrules?: ReadonlyArray<IVEventRuleOptions<T> | Rule<T>>;
    rdates?: ReadonlyArray<DateInput<T>> | Dates<T>;
    exdates?: ReadonlyArray<DateInput<T>> | Dates<T>;
  }) {
    super(args);

    this.start = this.normalizeDateInputToAdapter(args.start);
    this._start = this.start.toDateTime();

    this.timezone = this.start.timezone;

    if (args.data) {
      this.data = args.data;
    }

    if (args.rrules) {
      this.rrules = args.rrules.map(ruleArgs => {
        if (Rule.isRule(ruleArgs)) {
          if (!this.normalizeDateInput(ruleArgs.options.start).isEqual(this._start)) {
            throw new ArgumentError(
              'When passing a `Rule` object to the `VEvent` constructor, ' +
                'the rule `start` time must equal the `VEvent` start time.',
            );
          } else if (ruleArgs.timezone !== this.timezone) {
            throw new ArgumentError(
              'When passing a `Rule` object to the `VEvent` constructor, ' +
                "the rule `timezone` time must equal the timezone of the VEvent's `start` time.",
            );
          }

          return ruleArgs;
        } else {
          return new Rule(standardizeVEventRuleOptions(ruleArgs as IVEventRuleOptions<T>, args), {
            dateAdapter: this.dateAdapter,
            timezone: this.timezone,
          });
        }
      });
    }

    if (args.exrules) {
      this.exrules = args.exrules.map(ruleArgs => {
        if (Rule.isRule(ruleArgs)) {
          if (!this.normalizeDateInput(ruleArgs.options.start).isEqual(this._start)) {
            throw new ArgumentError(
              'When passing a `Rule` object to the `VEvent` constructor, ' +
                'the rule `start` time must equal the `VEvent` start time.',
            );
          } else if (ruleArgs.timezone !== this.timezone) {
            throw new ArgumentError(
              'When passing a `Rule` object to the `VEvent` constructor, ' +
                "the rule `timezone` time must equal the timezone of the VEvent's `start` time.",
            );
          }

          return ruleArgs;
        } else {
          return new Rule(standardizeVEventRuleOptions(ruleArgs as IVEventRuleOptions<T>, args), {
            dateAdapter: this.dateAdapter,
            timezone: this.timezone,
          });
        }
      });
    }

    if (args.rdates) {
      this.rdates = Dates.isDates(args.rdates)
        ? args.rdates.set('timezone', this.timezone)
        : new Dates({
            dates: args.rdates as ReadonlyArray<DateInput<T>>,
            dateAdapter: this.dateAdapter,
            timezone: this.timezone,
          });
    } else {
      this.rdates = new Dates({ dateAdapter: this.dateAdapter, timezone: this.timezone });
    }

    if (args.exdates) {
      this.exdates = Dates.isDates(args.exdates)
        ? args.exdates.set('timezone', this.timezone)
        : new Dates({
            dates: args.exdates as ReadonlyArray<DateInput<T>>,
            dateAdapter: this.dateAdapter,
            timezone: this.timezone,
          });
    } else {
      this.exdates = new Dates({ dateAdapter: this.dateAdapter, timezone: this.timezone });
    }

    // this.duration = args.duration;
    this.hasDuration = !!this.duration;

    this.isInfinite = this.rrules.some(rule => rule.isInfinite);

    this.occurrenceStream = new OccurrenceStream({
      operators: [
        add<T>(...this.rrules),
        subtract<T>(...this.exrules),
        add<T>(
          new Dates({
            dates: [this.start],
            timezone: this.timezone,
            dateAdapter: this.dateAdapter,
          }),
        ),
        add<T>(this.rdates),
        subtract<T>(this.exdates),
        unique<T>(),
      ],
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

  add(prop: 'rrule' | 'exrule', value: Rule<T, unknown>): VEvent<T, D>;
  add(prop: 'rdate' | 'exdate', value: DateInput<T>): VEvent<T, D>;
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

    return new VEvent({
      start: this.start,
      dateAdapter: this.dateAdapter,
      data: this.data,
      rrules,
      exrules,
      rdates,
      exdates,
    });
  }

  remove(prop: 'rrule' | 'exrule', value: Rule<T, unknown>): VEvent<T, D>;
  remove(prop: 'rdate' | 'exdate', value: DateInput<T>): VEvent<T, D>;
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

    return new VEvent({
      start: this.start,
      dateAdapter: this.dateAdapter,
      data: this.data,
      rrules,
      exrules,
      rdates,
      exdates,
    });
  }

  set(prop: 'timezone', value: string | null, options?: { keepLocalTime?: boolean }): VEvent<T, D>;
  set(prop: 'start', value: DateInput<T>): VEvent<T, D>;
  set(prop: 'rrules' | 'exrules', value: Rule<T, unknown>[]): VEvent<T, D>;
  set(prop: 'rdates' | 'exdates', value: Dates<T, unknown>): VEvent<T, D>;
  set(
    prop: 'start' | 'timezone' | 'rrules' | 'exrules' | 'rdates' | 'exdates',
    value: DateInput<T> | string | null | Rule<T, unknown>[] | Dates<T, unknown>,
    options: { keepLocalTime?: boolean } = {},
  ) {
    let start = this.start;
    let rrules = this.rrules;
    let exrules = this.exrules;
    let rdates = this.rdates;
    let exdates = this.exdates;

    switch (prop) {
      case 'timezone': {
        if (value === this.timezone && !options.keepLocalTime) return this;
        else if (options.keepLocalTime) {
          const json = start.toJSON();
          json.timezone = value as string | null;
          start = this.dateAdapter.fromJSON(json) as InstanceType<T>;
        } else {
          start = start.set('timezone', value as string | null) as InstanceType<T>;
        }
        break;
      }
      case 'start': {
        const newStart = this.normalizeDateInputToAdapter(value);

        if (start.timezone === newStart.timezone && start.valueOf() === newStart.valueOf()) {
          return this;
        }

        start = newStart;
        break;
      }
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

    return new VEvent({
      start,
      dateAdapter: this.dateAdapter,
      data: this.data,
      rrules,
      exrules,
      rdates,
      exdates,
    });
  }

  /**  @private use occurrences() instead */
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

  protected normalizeRunOutput(date: DateTime) {
    if (this.duration) {
      return super.normalizeRunOutput(date).set('duration', this.duration);
    }

    return super.normalizeRunOutput(date);
  }
}

function standardizeVEventRuleOptions<T extends typeof DateAdapter>(
  options: IVEventRuleOptions<T>,
  args: {
    start: DateInput<T>;
    duration?: number;
  },
): IProvidedRuleOptions<T> {
  options = { ...options };
  delete (options as any).duration;
  return {
    ...options,
    ...pluckProperties(args, 'start', 'duration'),
  };
}

function pluckProperties<T extends { [key: string]: unknown }>(obj: T, ...props: string[]) {
  const newObj: T = {} as any;

  for (const prop in obj) {
    if (obj.hasOwnProperty(prop) && props.includes(prop)) {
      newObj[prop] = obj[prop];
    }
  }

  return newObj;
}
