export class InvalidDateAdapterError extends Error {}

export interface DateAdapterType {
  base: DateAdapterBase;
}

export interface DateAdapterCTorType {
  base: typeof DateAdapterBase & (new (date: any) => DateAdapterBase);
}

// taken from https://stackoverflow.com/a/50375286/5490505
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((
  k: infer I,
) => void)
  ? I
  : never;

export type DateAdapter = UnionToIntersection<DateAdapterType[keyof DateAdapterType]>;

export type DateAdapterCTor = UnionToIntersection<DateAdapterCTorType[keyof DateAdapterCTorType]>;

export type DateInput = DateAdapter['date'] | DateAdapter | DateTime;

let dateAdapterConfig: DateAdapterCTor | undefined;

export abstract class DateAdapterBase {
  static set adapter(value: DateAdapterCTor) {
    if (dateAdapterConfig) {
      throw new Error(`"${dateAdapterConfig.name}" has already been configured.`);
    }

    dateAdapterConfig = value;
  }

  static get adapter(): DateAdapterCTor {
    if (!dateAdapterConfig) {
      throw new Error('No date adapter has been configured. See rSchedule docs.');
    }

    return dateAdapterConfig;
  }

  static readonly date: object;
  static readonly hasTimezoneSupport: boolean = false;

  static isDate(_object: unknown): boolean {
    throw unimplementedError('isDate()');
  }

  static fromDate(_date: DateAdapter['date'], _options?: { duration?: number }): DateAdapter {
    throw unimplementedError('fromDate()');
  }

  static fromJSON(_json: DateAdapter.JSON): DateAdapter {
    throw unimplementedError('fromJSON()');
  }

  static fromDateTime(_datetime: DateTime): DateAdapter {
    throw unimplementedError('fromDateTime()');
  }

  abstract readonly date: object;
  abstract readonly timezone: string | null;
  /** A length of time in milliseconds */
  readonly duration: number;

  /**
   * Returns `undefined` if `this.duration` is falsey. Else returns
   * the `end` date.
   */
  abstract end: object | undefined;

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
  readonly generators: ReadonlyArray<unknown> = [];

  protected constructor(_date: unknown, options?: { duration?: number }) {
    this.duration = (options && options.duration) || 0;

    if (!Number.isInteger(this.duration) || this.duration < 0) {
      throw new InvalidDateAdapterError('duration must be a non-negative integer');
    }
  }

  abstract set(prop: 'timezone', value: string | null): this;
  abstract set(prop: 'duration', value: number): this;

  abstract valueOf(): number;

  abstract toISOString(): string;

  toDateTime(): DateTime {
    const date = DateTime.fromJSON(this.toJSON());
    (date.generators as any[]).push(...this.generators);
    return date;
  }

  abstract toJSON(): DateAdapter.JSON;

  abstract assertIsValid(): boolean;
}

function unimplementedError(name: string) {
  return new Error(`You must implement the "${name}" method for this DateAdapter class`);
}

export namespace DateAdapter {
  export const WEEKDAYS: ReadonlyArray<'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA'> = [
    'SU',
    'MO',
    'TU',
    'WE',
    'TH',
    'FR',
    'SA',
  ];

  export const MILLISECONDS_IN_SECOND = 1000;
  export const MILLISECONDS_IN_MINUTE = MILLISECONDS_IN_SECOND * 60;
  export const MILLISECONDS_IN_HOUR = MILLISECONDS_IN_MINUTE * 60;
  export const MILLISECONDS_IN_DAY = MILLISECONDS_IN_HOUR * 24;
  export const MILLISECONDS_IN_WEEK = MILLISECONDS_IN_DAY * 7;

  export type Weekday = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';

  export type TimeUnit = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond';

  // tslint:disable-next-line: interface-name
  export interface JSON {
    timezone: string | null;
    duration?: number;
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
  }

  export type Year = number;

  export type YearDay = number;

  export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

  // >= 1 && <= 31
  export type Day =
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23
    | 24
    | 25
    | 26
    | 27
    | 28
    | 29
    | 30
    | 31;

  // >= 0 && <= 23
  export type Hour =
    | 0
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23;

  // >= 0 && <= 59
  export type Minute =
    | 0
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23
    | 24
    | 25
    | 26
    | 27
    | 28
    | 29
    | 30
    | 31
    | 32
    | 33
    | 34
    | 35
    | 36
    | 37
    | 38
    | 39
    | 40
    | 41
    | 42
    | 43
    | 44
    | 45
    | 46
    | 47
    | 48
    | 49
    | 50
    | 51
    | 52
    | 53
    | 54
    | 55
    | 56
    | 57
    | 58
    | 59;

  export type Second = Minute;

  export type Millisecond = number;
}

export class InvalidDateTimeError extends Error {}

export class DateTime {
  // /**
  //  * Similar to `Array.isArray()`, `isInstance()` provides a surefire method
  //  * of determining if an object is a `DateTime` by checking against the
  //  * global symbol registry.
  //  */
  // static isInstance(object: any): object is DateTime {
  //   return !!(object && object[DATETIME_ID]);
  // }

  static fromJSON(json: DateAdapter.JSON) {
    const date = new Date(
      Date.UTC(
        json.year,
        json.month - 1,
        json.day,
        json.hour,
        json.minute,
        json.second,
        json.millisecond,
      ),
    );

    return new DateTime(date, json.timezone, json.duration);
  }

  static fromDateAdapter(adapter: DateAdapter) {
    return DateTime.fromJSON(adapter.toJSON());
  }

  readonly date: Date;

  /**
   * This property contains an ordered array of the generator objects
   * responsible for producing this DateAdapter.
   *
   * - If this DateAdapter was produced by a `Rule` object, this array
   *   will just contain the `Rule` object.
   * - If this DateAdapter was produced by a `Schedule` object, this
   *   array will contain the `Schedule` object as well as the `Rule`
   *   or `Dates` object which generated it.
   * - If this DateAdapter was produced by a `Calendar` object, this
   *   array will contain, at minimum, the `Calendar`, `Schedule`, and
   *   `Rule`/`Dates` objects which generated it.
   */
  readonly generators: ReadonlyArray<unknown>;

  readonly timezone: string | null;

  readonly duration: number;

  private _end: DateTime | undefined;

  private constructor(
    date: Date,
    timezone?: string | null,
    duration?: number,
    generators?: ReadonlyArray<unknown>,
  ) {
    this.date = new Date(date);
    this.timezone = timezone || null;
    this.duration = duration || 0;
    this.generators = generators || [];

    if (!Number.isInteger(this.duration) || this.duration < 0) {
      throw new InvalidDateTimeError('duration must be a non-negative integer');
    }

    this.assertIsValid();
  }

  /**
   * Returns `undefined` if `duration` is `0`. Else returns
   * the `end` date.
   */
  get end(): DateTime | undefined {
    if (!this.duration) return;

    if (this._end) return this._end;

    this._end = this.add(this.duration, 'millisecond');

    return this._end;
  }

  // While we constrain the argument to be another DateAdapter in typescript
  // we handle the case of someone passing in another type of object in javascript
  isEqual(object?: DateTime): boolean {
    if (!object) {
      return false;
    }

    assertSameTimeZone(this, object);

    return this.valueOf() === object.valueOf();
  }

  isBefore(object: DateTime): boolean {
    assertSameTimeZone(this, object);

    return this.valueOf() < object.valueOf();
  }

  isBeforeOrEqual(object: DateTime): boolean {
    assertSameTimeZone(this, object);

    return this.valueOf() <= object.valueOf();
  }

  isAfter(object: DateTime): boolean {
    assertSameTimeZone(this, object);

    return this.valueOf() > object.valueOf();
  }

  isAfterOrEqual(object: DateTime): boolean {
    assertSameTimeZone(this, object);

    return this.valueOf() >= object.valueOf();
  }

  isOccurring(object: DateTime) {
    if (!this.duration) {
      throw new Error('DateTime#isOccurring() is only applicable to DateTimes with durations');
    }

    assertSameTimeZone(this, object);

    return (
      object.isAfterOrEqual(this) && object.isBeforeOrEqual(this.add(this.duration!, 'millisecond'))
    );
  }

  add(amount: number, unit: DateAdapter.TimeUnit | 'week'): DateTime;
  add(amount: unknown, unit: 'generator'): DateTime;
  add(amount: number | unknown, unit: DateAdapter.TimeUnit | 'week' | 'generator'): DateTime {
    switch (unit) {
      case 'generator': {
        const generators = this.generators.slice();
        generators.unshift(amount);
        return new DateTime(this.date, this.timezone, this.duration, generators);
      }
      case 'year':
        return this.forkDateTime(addUTCYears(this.date, amount as number));
      case 'month':
        return this.forkDateTime(addUTCMonths(this.date, amount as number));
      case 'week':
        return this.forkDateTime(addUTCWeeks(this.date, amount as number));
      case 'day':
        return this.forkDateTime(addUTCDays(this.date, amount as number));
      case 'hour':
        return this.forkDateTime(addUTCHours(this.date, amount as number));
      case 'minute':
        return this.forkDateTime(addUTCMinutes(this.date, amount as number));
      case 'second':
        return this.forkDateTime(addUTCSeconds(this.date, amount as number));
      case 'millisecond':
        return this.forkDateTime(addUTCMilliseconds(this.date, amount as number));
      default:
        throw new Error('Invalid unit provided to `DateTime#add`');
    }
  }

  subtract(amount: number, unit: DateAdapter.TimeUnit | 'week'): DateTime {
    switch (unit) {
      case 'year':
        return this.forkDateTime(subUTCYears(this.date, amount));
      case 'month':
        return this.forkDateTime(subUTCMonths(this.date, amount));
      case 'week':
        return this.forkDateTime(subUTCWeeks(this.date, amount));
      case 'day':
        return this.forkDateTime(subUTCDays(this.date, amount));
      case 'hour':
        return this.forkDateTime(subUTCHours(this.date, amount));
      case 'minute':
        return this.forkDateTime(subUTCMinutes(this.date, amount));
      case 'second':
        return this.forkDateTime(subUTCSeconds(this.date, amount));
      case 'millisecond':
        return this.forkDateTime(subUTCMilliseconds(this.date, amount));
      default:
        throw new Error('Invalid unit provided to `DateTime#subtract`');
    }
  }

  get(unit: 'year'): DateAdapter.Year;
  get(unit: 'yearday'): DateAdapter.YearDay;
  get(unit: 'month'): DateAdapter.Month;
  get(unit: 'weekday'): DateAdapter.Weekday;
  get(unit: 'day'): DateAdapter.Day;
  get(unit: 'hour'): DateAdapter.Hour;
  get(unit: 'minute'): DateAdapter.Minute;
  get(unit: 'second'): DateAdapter.Second;
  get(unit: 'millisecond'): DateAdapter.Millisecond;
  get(unit: DateAdapter.TimeUnit | 'yearday' | 'weekday'): any {
    switch (unit) {
      case 'year':
        return this.date.getUTCFullYear() as DateAdapter.Year;
      case 'month':
        return (this.date.getUTCMonth() + 1) as DateAdapter.Month;
      case 'yearday':
        return getUTCYearDay(this.date) as DateAdapter.YearDay;
      case 'weekday':
        return DateAdapter.WEEKDAYS[this.date.getUTCDay()] as DateAdapter.Weekday;
      case 'day':
        return this.date.getUTCDate() as DateAdapter.Day;
      case 'hour':
        return this.date.getUTCHours() as DateAdapter.Hour;
      case 'minute':
        return this.date.getUTCMinutes() as DateAdapter.Minute;
      case 'second':
        return this.date.getUTCSeconds() as DateAdapter.Second;
      case 'millisecond':
        return this.date.getUTCMilliseconds() as DateAdapter.Millisecond;
      default:
        throw new Error('Invalid unit provided to `DateTime#set`');
    }
  }

  set(unit: DateAdapter.TimeUnit | 'duration', value: number): DateTime {
    if (unit === 'duration') {
      return new DateTime(this.date, this.timezone, value as number);
    }

    let date = new Date(this.date);

    switch (unit) {
      case 'year':
        date.setUTCFullYear(value as number);
        break;
      case 'month': {
        // If the current day of the month
        // is greater than days in the month we are moving to, we need to also
        // set the day to the end of that month.
        const length = monthLength(value as number, date.getUTCFullYear());
        const day = date.getUTCDate();

        if (day > length) {
          date.setUTCDate(1);
          date.setUTCMonth(value as number);
          date = subUTCDays(date, 1);
        } else {
          date.setUTCMonth((value as number) - 1);
        }

        break;
      }
      case 'day':
        date.setUTCDate(value as number);
        break;
      case 'hour':
        date.setUTCHours(value as number);
        break;
      case 'minute':
        date.setUTCMinutes(value as number);
        break;
      case 'second':
        date.setUTCSeconds(value as number);
        break;
      case 'millisecond':
        date.setUTCMilliseconds(value as number);
        break;
      default:
        throw new Error('Invalid unit provided to `DateTime#set`');
    }

    return this.forkDateTime(date);
  }

  granularity(
    granularity: DateAdapter.TimeUnit | 'week',
    opt: { weekStart?: DateAdapter.Weekday } = {},
  ) {
    let date = this.forkDateTime(this.date);

    switch (granularity) {
      case 'year':
        date = date.set('month', 1);
      case 'month':
        date = date.set('day', 1);
        break;
      case 'week':
        date = setDateToStartOfWeek(date, opt.weekStart!);
    }

    switch (granularity) {
      case 'year':
      case 'month':
      case 'week':
      case 'day':
        date = date.set('hour', 0);
      case 'hour':
        date = date.set('minute', 0);
      case 'minute':
        date = date.set('second', 0);
      case 'second':
        date = date.set('millisecond', 0);
      case 'millisecond':
        return date;
      default:
        throw new Error('Invalid granularity provided to `DateTime#granularity`: ' + granularity);
    }
  }

  endGranularity(
    granularity: DateAdapter.TimeUnit | 'week',
    opt: { weekStart?: DateAdapter.Weekday } = {},
  ) {
    let date = this.forkDateTime(this.date);

    switch (granularity) {
      case 'year':
        date = date.set('month', 12);
      case 'month':
        date = date.set('day', monthLength(date.get('month'), date.get('year')));
        break;
      case 'week':
        date = setDateToEndOfWeek(date, opt.weekStart!);
    }

    switch (granularity) {
      case 'year':
      case 'month':
      case 'week':
      case 'day':
        date = date.set('hour', 23);
      case 'hour':
        date = date.set('minute', 59);
      case 'minute':
        date = date.set('second', 59);
      case 'second':
        date = date.set('millisecond', 999);
      case 'millisecond':
        return date;
      default:
        throw new Error('Invalid granularity provided to `DateTime#granularity`: ' + granularity);
    }
  }

  toISOString() {
    return this.date.toISOString();
  }

  toDateTime() {
    return this;
  }

  toJSON(): DateAdapter.JSON {
    const json: DateAdapter.JSON = {
      timezone: this.timezone,
      year: this.get('year'),
      month: this.get('month'),
      day: this.get('day'),
      hour: this.get('hour'),
      minute: this.get('minute'),
      second: this.get('second'),
      millisecond: this.get('millisecond'),
    };

    if (this.duration) {
      json.duration = this.duration;
    }

    return json;
  }

  valueOf() {
    return this.date.valueOf();
  }

  assertIsValid() {
    if (isNaN(this.valueOf())) {
      throw new InvalidDateTimeError('DateTime has invalid date.');
    }

    return true;
  }

  private forkDateTime(date: Date) {
    return new DateTime(date, this.timezone, this.duration);
  }
}

function assertSameTimeZone(x: DateTime | DateAdapter, y: DateTime | DateAdapter) {
  if (x.timezone !== y.timezone) {
    throw new InvalidDateTimeError(
      'Attempted to compare a datetime to another date in a different timezone: ' +
        JSON.stringify(x) +
        ' and ' +
        JSON.stringify(y),
    );
  }

  return true;
}

function setDateToStartOfWeek(date: DateTime, wkst: DateAdapter.Weekday) {
  const index = orderedWeekdays(wkst).indexOf(date.get('weekday'));
  return date.subtract(index, 'day');
}

function setDateToEndOfWeek(date: DateTime, wkst: DateAdapter.Weekday) {
  const index = orderedWeekdays(wkst).indexOf(date.get('weekday'));
  return date.add(6 - index, 'day');
}

export function dateTimeSortComparer(a: DateTime, b: DateTime) {
  if (a.isAfter(b)) return 1;
  if (a.isBefore(b)) return -1;
  if (a.duration && b.duration) {
    if (a.duration > b.duration) return 1;
    if (a.duration < b.duration) return -1;
  }
  return 0;
}

export function uniqDateTimes(dates: DateTime[]) {
  return Array.from(
    new Map(dates.map(date => [date.toISOString(), date]) as Array<[string, DateTime]>).values(),
  );
}

export function orderedWeekdays(wkst: DateAdapter.Weekday = 'SU') {
  const wkdays = DateAdapter.WEEKDAYS.slice();
  let index = wkdays.indexOf(wkst);

  while (index !== 0) {
    shiftArray(wkdays);
    index--;
  }

  return wkdays;
}

function shiftArray(array: any[], from: 'first' | 'last' = 'first') {
  if (array.length === 0) {
    return array;
  } else if (from === 'first') {
    array.push(array.shift());
  } else {
    array.unshift(array.pop());
  }

  return array;
}

export function getDifferenceBetweenWeekdays(x: DateAdapter.Weekday, y: DateAdapter.Weekday) {
  if (x === y) return 0;

  const result = DateAdapter.WEEKDAYS.indexOf(x) - DateAdapter.WEEKDAYS.indexOf(y);

  return result > 0 ? 7 - result : Math.abs(result);
}

/**
 * Returns the days in the given month.
 *
 * @param month base-1
 * @param year
 */
function monthLength(month: number, year: number) {
  const block = {
    1: 31,
    2: getDaysInFebruary(year),
    3: 31,
    4: 30,
    5: 31,
    6: 30,
    7: 31,
    8: 31,
    9: 30,
    10: 31,
    11: 30,
    12: 31,
  };

  return (block as { [key: number]: number })[month];
}

function getDaysInFebruary(year: number) {
  return isLeapYear(year) ? 29 : 28;
}

// taken from date-fn
export function isLeapYear(year: number) {
  return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

export function getDaysInYear(year: number) {
  return isLeapYear(year) ? 366 : 365;
}

function getUTCYearDay(now: Date) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const diff = now.valueOf() - start.valueOf();

  return 1 + Math.floor(diff / DateAdapter.MILLISECONDS_IN_DAY);
}

/**
 * These functions are basically lifted from `date-fns`, but changed
 * to use the UTC date methods, which `date-fns` doesn't support.
 */

function toInteger(input: any) {
  if (input === null || input === true || input === false) {
    return NaN;
  }

  const int = Number(input);

  if (isNaN(int)) {
    return int;
  }

  return int < 0 ? Math.ceil(int) : Math.floor(int);
}

function addMilliseconds(dirtyDate: Date, dirtyAmount: number) {
  if (arguments.length < 2) {
    throw new TypeError('2 arguments required, but only ' + arguments.length + ' present');
  }

  const timestamp = dirtyDate.valueOf();
  const amount = toInteger(dirtyAmount);
  return new Date(timestamp + amount);
}

function addUTCYears(date: Date, input: number) {
  const amount = toInteger(input);
  return addUTCMonths(date, amount * 12);
}

function addUTCMonths(date: Date, input: number) {
  const amount = toInteger(input);
  date = new Date(date);
  const desiredMonth = date.getUTCMonth() + amount;
  const dateWithDesiredMonth = new Date(0);
  dateWithDesiredMonth.setUTCFullYear(date.getUTCFullYear(), desiredMonth, 1);
  dateWithDesiredMonth.setUTCHours(0, 0, 0, 0);
  const daysInMonth = monthLength(
    dateWithDesiredMonth.getUTCMonth() + 1,
    dateWithDesiredMonth.getUTCFullYear(),
  );
  // Set the last day of the new month
  // if the original date was the last day of the longer month
  date.setUTCMonth(desiredMonth, Math.min(daysInMonth, date.getUTCDate()));
  return date;
}

function addUTCWeeks(date: Date, input: number) {
  const amount = toInteger(input);
  const days = amount * 7;
  return addUTCDays(date, days);
}

function addUTCDays(date: Date, input: number) {
  // by adding milliseconds rather than days, we supress the native Date object's automatic
  // daylight savings time conversions which we don't want in UTC mode
  return addUTCMilliseconds(date, toInteger(input) * DateAdapter.MILLISECONDS_IN_DAY);
}

function addUTCHours(date: Date, input: number) {
  const amount = toInteger(input);
  return addMilliseconds(date, amount * DateAdapter.MILLISECONDS_IN_HOUR);
}

function addUTCMinutes(date: Date, input: number) {
  const amount = toInteger(input);
  return addMilliseconds(date, amount * DateAdapter.MILLISECONDS_IN_MINUTE);
}

function addUTCSeconds(date: Date, input: number) {
  const amount = toInteger(input);
  return addMilliseconds(date, amount * DateAdapter.MILLISECONDS_IN_SECOND);
}

function addUTCMilliseconds(date: Date, input: number) {
  const amount = toInteger(input);
  const timestamp = date.getTime();
  return new Date(timestamp + amount);
}

function subUTCYears(date: Date, amount: number) {
  return addUTCYears(date, -amount);
}

function subUTCMonths(date: Date, amount: number) {
  return addUTCMonths(date, -amount);
}

function subUTCWeeks(date: Date, amount: number) {
  return addUTCWeeks(date, -amount);
}

function subUTCDays(date: Date, amount: number) {
  return addUTCDays(date, -amount);
}

function subUTCHours(date: Date, amount: number) {
  return addUTCHours(date, -amount);
}

function subUTCMinutes(date: Date, amount: number) {
  return addUTCMinutes(date, -amount);
}

function subUTCSeconds(date: Date, amount: number) {
  return addUTCSeconds(date, -amount);
}

function subUTCMilliseconds(date: Date, amount: number) {
  return addUTCMilliseconds(date, -amount);
}
