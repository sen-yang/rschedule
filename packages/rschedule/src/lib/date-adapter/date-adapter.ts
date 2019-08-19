import { DateTime, IDateAdapter } from '../date-time';

export class InvalidDateAdapterError extends Error {}

const DATE_ADAPTER_ID = Symbol.for('9d2c0b75-7a72-4f24-b57f-c27e131e37b2');

export class DateAdapter implements IDateAdapter<unknown> {
  static readonly date: unknown;
  static readonly hasTimezoneSupport: boolean = false;

  /**
   * Similar to `Array.isArray()`, `isInstance()` provides a surefire method
   * of determining if an object is a `DateAdapter` by checking against the
   * global symbol registry.
   */
  static isInstance(object: unknown): object is DateAdapter {
    return !!(object && typeof object === 'object' && (object as any)[DATE_ADAPTER_ID]);
  }

  static isDate(_object: unknown): boolean {
    throw unimplementedError('isDate()');
  }

  static fromJSON(_json: IDateAdapter.JSON): DateAdapter {
    throw unimplementedError('fromJSON()');
  }

  static fromDateTime(_datetime: DateTime): DateAdapter {
    throw unimplementedError('fromDateTime()');
  }

  readonly date!: unknown;
  readonly timezone!: string | null;
  /** A length of time in milliseconds */
  readonly duration!: number;

  /**
   * An array of OccurrenceGenerator objects which produced this DateAdapter.
   *
   * #### Details
   *
   * When a Rule object creates a DateAdapter, that Rule object adds itself to
   * the DateAdapter's generators property before yielding the DateAdapter. If you are using a Rule
   * object directly, the process ends there and the DateAdapter is yielded to you (in this case,
   * generators will have the type `[Rule]`)
   *
   * If you are using another object, like a Schedule however, then each DateAdapter is generated
   * by either a Dates (rdates) or Rule (rrule) within the Schedule. After being originally
   * generated by a Dates/Rule, the DateAdapter is then filtered by any exdate/exrules and,
   * assuming it passes, then the DateAdapter "bubbles up" to the Schedule object itself. At this
   * point the Schedule adds itself to the generators array of the DateAdapter and yields the date
   * to you. So each DateAdapter produced by a Schedule has a generators property of type
   * `[Schedule, Rule | Dates]`.
   *
   * The generators property pairs well with the `data` property on many OccurrenceGenerators. You
   * can access the OccurrenceGenerators which produced a DateAdapter via `generators`, and then
   * access any arbitrary data via the `data` property.
   *
   * _Note: occurrence operators are never included in the generators array._
   *
   */
  // using `unknown[]` instead of `never[]` to support convenient generator typing in `Calendar`.
  // If `never[]` is used, then `Calendar#schedules` *must* be typed as a tuple in order to
  // access any values in `generators` beyond the first (Calendar) value (the rest of the values
  // get typed as `never`). This would prevent passing a variable to `Calendar#schedules`.
  readonly generators: unknown[] = [];

  protected readonly [DATE_ADAPTER_ID] = true;

  constructor(_date: unknown, options?: { duration?: number }) {
    this.duration = (options && options.duration) || 0;

    if (!Number.isInteger(this.duration) || this.duration < 0) {
      throw new InvalidDateAdapterError('duration must be a non-negative integer');
    }
  }

  /**
   * Returns `undefined` if `this.duration` is falsey. Else returns
   * the `end` date.
   */
  get end(): unknown | undefined {
    throw unimplementedError('end');
  }

  set(prop: 'timezone', value: string | null): DateAdapter;
  set(prop: 'duration', value: number): DateAdapter;
  set(_prop: 'timezone' | 'duration', _value: number | string | null): DateAdapter {
    throw unimplementedError('set()');
  }

  valueOf(): number {
    throw unimplementedError('valueOf()');
  }

  toISOString(): string {
    throw unimplementedError('toISOString()');
  }

  toDateTime(): DateTime {
    const date = DateTime.fromJSON(this.toJSON());
    date.generators.push(...this.generators);
    return date;
  }

  toJSON(): IDateAdapter.JSON {
    throw unimplementedError('toJSON()');
  }

  assertIsValid(): boolean {
    throw unimplementedError('assertIsValid()');
  }
}

function unimplementedError(name: string) {
  return new Error(`You must implement the "${name}" method for this DateAdapter class`);
}
