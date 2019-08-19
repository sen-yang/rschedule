import { ArgumentError } from '../basic-utilities';
import { DateAdapter } from '../date-adapter';
import { DateTime, dateTimeSortComparer } from '../date-time';
import { IDataContainer, IRunArgs, OccurrenceGenerator } from '../interfaces';
import {
  CollectionIterator,
  ICollectionsArgs,
  IOccurrencesArgs,
  OccurrenceIterator,
} from '../iterators';
import { OccurrenceStream, OperatorFnOutput, pipeFn } from '../operators';
import { DateInput } from '../utilities';

const DATES_ID = Symbol.for('1a872780-b812-4991-9ca7-00c47cfdeeac');

export class Dates<T extends typeof DateAdapter, D = any> extends OccurrenceGenerator<T>
  implements IDataContainer<D> {
  /**
   * Similar to `Array.isArray()`, `isDates()` provides a surefire method
   * of determining if an object is a `Dates` by checking against the
   * global symbol registry.
   */
  static isDates(object: unknown): object is Dates<any> {
    return !!(object && typeof object === 'object' && (object as any)[DATES_ID]);
  }

  readonly adapters: ReadonlyArray<InstanceType<T>> = [];

  get length() {
    return this.adapters.length;
  }

  /** Returns the first occurrence or, if there are no occurrences, null. */
  get firstDate(): InstanceType<T> | null {
    return this.adapters[0] || null;
  }

  /** Returns the last occurrence or, if there are no occurrences, null. */
  get lastDate(): InstanceType<T> | null {
    return this.adapters[this.length - 1] || null;
  }

  readonly isInfinite = false;
  readonly hasDuration: boolean;
  readonly maxDuration: number = 0;
  readonly timezone!: string | null; // set by `OccurrenceGenerator`

  pipe: (...operatorFns: OperatorFnOutput<T>[]) => OccurrenceStream<T> = pipeFn(this);

  /**
   * Convenience property for holding arbitrary data. Accessible on individual DateAdapters
   * generated by this `Dates` object via the `DateAdapter#generators` property. Unlike
   * the rest of the `Dates` object, the data property is mutable.
   */
  data!: D;

  protected readonly [DATES_ID] = true;

  private readonly datetimes: DateTime[] = [];

  constructor(
    args: {
      timezone?: string | null;
      duration?: number;
      dates?: ReadonlyArray<DateInput<T>>;
      data?: D;
      dateAdapter?: T;
    } = {},
  ) {
    super(args);

    this.data = args.data as D;

    if (args.dates) {
      this.adapters = args.dates.map(date => {
        let adapter = this.normalizeDateInputToAdapter(date);

        if (args.duration && !adapter.duration) {
          adapter = adapter.set('duration', args.duration) as InstanceType<T>;
        }

        return adapter.set('timezone', this.timezone) as InstanceType<T>;
      });

      this.datetimes = this.adapters.map(adapter => adapter.toDateTime());
    }

    this.hasDuration = this.datetimes.every(date => !!date.duration);

    if (this.hasDuration) {
      this.maxDuration = this.adapters.reduce(
        (prev, curr) => (curr.duration > prev ? curr.duration : prev),
        0,
      )!;
    }
  }

  occurrences(args: IOccurrencesArgs<T> = {}): OccurrenceIterator<T, [this]> {
    return new OccurrenceIterator(this, this.normalizeOccurrencesArgs(args));
  }

  collections(args: ICollectionsArgs<T> = {}): CollectionIterator<T, [this]> {
    return new CollectionIterator(this, this.normalizeCollectionsArgs(args));
  }

  add(value: DateInput<T>) {
    return new Dates({
      dates: [...this.adapters, value],
      timezone: this.timezone,
      data: this.data,
      dateAdapter: this.dateAdapter,
    });
  }

  remove(value: DateInput<T>) {
    const dates = this.adapters.slice();
    const input = this.normalizeDateInputToAdapter(value);
    const index = dates.findIndex(date => date.valueOf() === input.valueOf());

    if (index >= 0) {
      dates.splice(index, 1);
    }

    return new Dates({
      dates,
      timezone: this.timezone,
      data: this.data,
      dateAdapter: this.dateAdapter,
    });
  }

  /**
   * Dates are immutable. This allows you to create a new `Dates` with the
   * specified property changed.
   *
   * ### Important!
   *
   * When updating `Dates#timezone`, this does not actually change the timezone of the
   * underlying date objects wrapped by this `Dates` instance. Instead, when this `Dates`
   * object is iterated and a specific date is found to be
   * valid, only then is that date converted to the timezone you specify here and returned to
   * you.
   *
   * This distinction might matter when viewing the timezone associated with
   * `Dates#adapters`. If you wish to update the timezone associated with the `date` objects
   * this `Dates` is wrapping, you must update the individual dates themselves by setting
   * the `dates` property.
   *
   */
  set(prop: 'timezone', value: string | null, options?: { keepLocalTime?: boolean }): Dates<T, D>;
  /**
   * Dates are immutable. This allows you to create a new `Dates` with new date objects.
   */
  set(prop: 'dates', value: DateInput<T>[]): Dates<T, D>;
  /**
   * Dates are immutable. This allows you to create a new `Dates` with all of the underlying
   * date objects set to have the specified `duration`. Duration is a length of time,
   * expressed in milliseconds.
   */
  set(prop: 'duration', value: number | undefined): Dates<T, D>;
  set(
    prop: 'timezone' | 'dates' | 'duration',
    value: DateInput<T>[] | string | number | null | undefined,
    options: { keepLocalTime?: boolean } = {},
  ) {
    let timezone = this.timezone;
    let dates: DateInput<T>[] = this.adapters.slice();

    if (prop === 'timezone') {
      if (value === this.timezone) return this;
      else if (options.keepLocalTime) {
        dates = this.adapters.map(adapter => {
          const json = adapter.toJSON();
          json.timezone = value as string | null;
          return this.dateAdapter.fromJSON(json);
        });
      }

      timezone = value as string | null;
    } else if (prop === 'dates') {
      dates = value as DateInput<T>[];
    } else if (prop === 'duration') {
      dates = (dates as InstanceType<T>[]).map(date =>
        date.set('duration', (value as number | undefined) || 0),
      );
    } else {
      throw new ArgumentError(
        `Unexpected prop argument "${prop}". Accepted values are "timezone" or "dates"`,
      );
    }

    return new Dates({
      dates,
      data: this.data,
      dateAdapter: this.dateAdapter,
      timezone,
    });
  }

  filter(
    fn: (date: InstanceType<T>, index: number, array: ReadonlyArray<InstanceType<T>>) => boolean,
  ) {
    return new Dates({
      dates: this.adapters.filter(fn),
      data: this.data,
      dateAdapter: this.dateAdapter,
      timezone: this.timezone,
    });
  }

  /** @internal */
  *_run(args: IRunArgs = {}) {
    let dates = this.datetimes.sort(dateTimeSortComparer);

    if (args.start) {
      dates = dates.filter(date => date.isAfterOrEqual(args.start!));
    }

    if (args.end) {
      dates = dates.filter(date => date.isBeforeOrEqual(args.end!));
    }

    if (args.reverse) {
      dates = dates.slice().reverse();
    }

    if (args.take) {
      dates = dates.slice(0, args.take);
    }

    let dateCache = dates.slice();
    let date = dateCache.shift();
    let yieldArgs: { skipToDate?: DateTime } | undefined;

    while (date) {
      if (yieldArgs) {
        if (
          yieldArgs.skipToDate &&
          (args.reverse ? yieldArgs.skipToDate.isBefore(date) : yieldArgs.skipToDate.isAfter(date))
        ) {
          date = dateCache.shift();
          continue;
        }

        yieldArgs = undefined;
      }

      date.generators.unshift(this);

      yieldArgs = yield this.normalizeRunOutput(date);

      if (yieldArgs && yieldArgs.skipToDate) {
        // need to reset the date cache to allow the same date to be picked again.
        // Also, I suppose it's possible someone might want to go back in time,
        // which this allows.
        dateCache = dates.slice();
      }

      date = dateCache.shift();
    }
  }
}
