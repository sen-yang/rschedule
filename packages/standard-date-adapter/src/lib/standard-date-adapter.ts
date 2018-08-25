import { DateAdapter, Schedule, RRule, RDates, Calendar, ParsedDatetime, Utils } from '@rschedule/rschedule';

import {
  addDays,
  addWeeks,
  addMonths,
  addSeconds,
  addMinutes,
  addHours,
  addYears,
  subYears,
  subMonths,
  subWeeks,
  subDays,
  subHours,
  subMinutes,
  subSeconds,
  addMilliseconds,
  subMilliseconds,
} from 'date-fns'

const STANDARD_DATE_ADAPTER_ID = Symbol.for('9d2c0b75-7a72-4f24-b57f-c27e131e37b2')

export class StandardDateAdapter
  implements DateAdapter<StandardDateAdapter, Date> {
  public date: Date
  
  private _timezone: 'UTC' | undefined

  public get utcOffset() {
    return this._timezone === 'UTC' ? 0 : this.date.getTimezoneOffset()
  }

  /** The `Rule` which generated this `DateAdapter` */
  public rule: RRule<StandardDateAdapter> | RDates<StandardDateAdapter> | undefined
  /** The `Schedule` which generated this `DateAdapter` */
  public schedule: Schedule<StandardDateAdapter> | undefined
  /** The `Calendar` which generated this `DateAdapter` */
  public calendar: Calendar<StandardDateAdapter, Schedule<StandardDateAdapter>> | undefined

  constructor(date?: Date, args: {timezone?: 'UTC' | undefined} = {}) {
    this.date = date ? new Date(date) : new Date()
    this.set('timezone', args.timezone)
    this.assertIsValid([date, 'constructing'])
  }

  public readonly [STANDARD_DATE_ADAPTER_ID] = true

  /**
   * Similar to `Array.isArray()`, `isInstance()` provides a surefire method
   * of determining if an object is a `StandardDateAdapter` by checking against the
   * global symbol registry.
   */
  static isInstance(object: any): object is StandardDateAdapter {
    return !!(object && object[Symbol.for('9d2c0b75-7a72-4f24-b57f-c27e131e37b2')])
  }

  static readonly hasTimezoneSupport = false;

  static fromTimeObject(args: {
    datetimes: ParsedDatetime[]
    timezone: string | undefined
    raw: string
  }): StandardDateAdapter[] {
    const dates = args.datetimes.map(datetime => {
      // adjust for `Date`'s base-0 months
      datetime[1] = datetime[1] - 1

      switch (args.timezone) {
        case 'UTC':
          // TS doesn't like my use of the spread operator
          // @ts-ignore
          return new StandardDateAdapter(new Date(Date.UTC(...datetime)), {timezone: 'UTC'})
        case undefined:
        case 'DATE':
          // TS doesn't like my use of the spread operator
          // @ts-ignore
          return new StandardDateAdapter(new Date(...datetime))
        default:
          throw new DateAdapter.InvalidDateError(
            'The `StandardDateAdapter` only supports datetimes in UTC or LOCAL time. ' +
              `You attempted to parse an ICAL string with a "${args.timezone}" timezone.`
          )
      }
    })

    return dates
  }

  /**
   * Returns a clone of the date adapter including a cloned
   * date property. Does not clone the `rule`, `schedule`,
   * or `calendar` properties, but does copy them over to the
   * new object.
   */
  clone(): StandardDateAdapter {
    const adapter = new StandardDateAdapter(this.date, {timezone: this._timezone})
    adapter.rule = this.rule
    adapter.schedule = this.schedule
    adapter.calendar = this.calendar
    return adapter
  }

  isSameClass(object: any): object is StandardDateAdapter {
    return StandardDateAdapter.isInstance(object)
  }

  // While we constrain the argument to be another DateAdapter in typescript
  // we handle the case of someone passing in another type of object in javascript
  isEqual<T extends DateAdapter<T>>(object?: T): boolean {
    return !!object && typeof object.valueOf === 'function' && object.valueOf() === this.valueOf()
  }
  isBefore<T extends DateAdapter<T>>(object: T): boolean {
    return this.valueOf() < object.valueOf()
  }
  isBeforeOrEqual<T extends DateAdapter<T>>(object: T): boolean {
    return this.valueOf() <= object.valueOf()
  }
  isAfter<T extends DateAdapter<T>>(object: T): boolean {
    return this.valueOf() > object.valueOf()
  }
  isAfterOrEqual<T extends DateAdapter<T>>(object: T): boolean {
    return this.valueOf() >= object.valueOf()
  }

  add(amount: number, unit: DateAdapter.Unit): StandardDateAdapter {
    const context = [this.date.toISOString(), 'add', amount, unit]

    if (this._timezone === undefined) {
      switch (unit) {
        case 'year':
          this.date = addYears(this.date, amount)
          break
        case 'month':
          this.date = addMonths(this.date, amount)
          break
        case 'week':
          this.date = addWeeks(this.date, amount)
          break
        case 'day':
          this.date = addDays(this.date, amount)
          break
        case 'hour':
          this.date = addHours(this.date, amount)
          break
        case 'minute':
          this.date = addMinutes(this.date, amount)
          break
        case 'second':
          this.date = addSeconds(this.date, amount)
          break
        case 'millisecond':
          this.date = addMilliseconds(this.date, amount)
          break
        default:
          throw new Error('Invalid unit provided to `StandardDateAdapter#add`')
      }  
    }
    else {
      switch (unit) {
        case 'year':
          this.date = addUTCYears(this.date, amount)
          break
        case 'month':
          this.date = addUTCMonths(this.date, amount)
          break
        case 'week':
          this.date = addUTCWeeks(this.date, amount)
          break
        case 'day':
          this.date = addUTCDays(this.date, amount)
          break
        case 'hour':
          this.date = addUTCHours(this.date, amount)
          break
        case 'minute':
          this.date = addUTCMinutes(this.date, amount)
          break
        case 'second':
          this.date = addUTCSeconds(this.date, amount)
          break
        case 'millisecond':
          this.date = addUTCMilliseconds(this.date, amount)
          break
        default:
          throw new Error('Invalid unit provided to `StandardDateAdapter#add`')
      }  
    }

    this.assertIsValid(context)

    return this
  }

  subtract(amount: number, unit: DateAdapter.Unit): StandardDateAdapter {
    const context = [this.date.toISOString(), 'subtract', amount, unit]

    if (this._timezone === undefined) {
      switch (unit) {
        case 'year':
          this.date = subYears(this.date, amount)
          break
        case 'month':
          this.date = subMonths(this.date, amount)
          break
        case 'week':
          this.date = subWeeks(this.date, amount)
          break
        case 'day':
          this.date = subDays(this.date, amount)
          break
        case 'hour':
          this.date = subHours(this.date, amount)
          break
        case 'minute':
          this.date = subMinutes(this.date, amount)
          break
        case 'second':
          this.date = subSeconds(this.date, amount)
          break
        case 'millisecond':
          this.date = subMilliseconds(this.date, amount)
          break
        default:
          throw new Error('Invalid unit provided to `StandardDateAdapter#subtract`')
      }
    }
    else {
      switch (unit) {
        case 'year':
          this.date = subUTCYears(this.date, amount)
          break
        case 'month':
          this.date = subUTCMonths(this.date, amount)
          break
        case 'week':
          this.date = subUTCWeeks(this.date, amount)
          break
        case 'day':
          this.date = subUTCDays(this.date, amount)
          break
        case 'hour':
          this.date = subUTCHours(this.date, amount)
          break
        case 'minute':
          this.date = subUTCMinutes(this.date, amount)
          break
        case 'second':
          this.date = subUTCSeconds(this.date, amount)
          break
        case 'millisecond':
          this.date = subUTCMilliseconds(this.date, amount)
          break
        default:
          throw new Error('Invalid unit provided to `StandardDateAdapter#add`')
      }  
    }

    this.assertIsValid(context)

    return this
  }

  get(unit: 'year'): number
  get(unit: 'month'): number
  get(unit: 'yearday'): number
  get(unit: 'weekday'): DateAdapter.Weekday
  get(unit: 'day'): number
  get(unit: 'hour'): number
  get(unit: 'minute'): number
  get(unit: 'second'): number
  get(unit: 'millisecond'): number
  get(unit: 'timezone'): 'UTC' | undefined
  get(
    unit:
      | 'year'
      | 'month'
      | 'yearday'
      | 'weekday'
      | 'day'
      | 'hour'
      | 'minute'
      | 'second'
      | 'millisecond'
      | 'timezone'
  ) {
    if (this._timezone === undefined) {
      switch (unit) {
        case 'year':
          return this.date.getFullYear()
        case 'month':
          return this.date.getMonth() + 1
        case 'yearday':
          return Utils.getYearDay(this.get('year'), this.get('month'), this.get('day'))
        case 'weekday':
          return Utils.WEEKDAYS[this.date.getDay()]
        case 'day':
          return this.date.getDate()
        case 'hour':
          return this.date.getHours()
        case 'minute':
          return this.date.getMinutes()
        case 'second':
          return this.date.getSeconds()
        case 'millisecond':
          return this.date.getMilliseconds()
        case 'timezone':
          return this._timezone
        default:
          throw new Error('Invalid unit provided to `StandardDateAdapter#set`')
      }
    } else {
      switch (unit) {
        case 'year':
          return this.date.getUTCFullYear()
        case 'month':
          return this.date.getUTCMonth() + 1
        case 'yearday':
          return Utils.getYearDay(this.get('year'), this.get('month'), this.get('day'))
        case 'weekday':
          return Utils.WEEKDAYS[this.date.getUTCDay()]
        case 'day':
          return this.date.getUTCDate()
        case 'hour':
          return this.date.getUTCHours()
        case 'minute':
          return this.date.getUTCMinutes()
        case 'second':
          return this.date.getUTCSeconds()
        case 'millisecond':
          return this.date.getUTCMilliseconds()
        case 'timezone':
          return this._timezone
        default:
          throw new Error('Invalid unit provided to `StandardDateAdapter#set`')
      }
    }
  }

  set(unit: 'timezone', value: 'UTC' | undefined, options?: {keepLocalTime?: boolean}): StandardDateAdapter
  set(unit: DateAdapter.Unit, value: number): StandardDateAdapter
  set(unit: DateAdapter.Unit | 'timezone', value: number | 'UTC' | undefined, options: {keepLocalTime?: boolean} = {}): StandardDateAdapter {
    const context = [this.date.toISOString(), 'set', value, unit]

    if (this._timezone === undefined) {
      switch (unit) {
        case 'year':
          this.date.setFullYear(value as number)
          break
        case 'month':
          this.date.setMonth((value as number) - 1)
          break
        case 'day':
          this.date.setDate(value as number)
          break
        case 'hour':
          this.date.setHours(value as number)
          break
        case 'minute':
          this.date.setMinutes(value as number)
          break
        case 'second':
          this.date.setSeconds(value as number)
          break
        case 'millisecond':
          this.date.setMilliseconds(value as number)
          break
        case 'timezone':
          switch (value) {
            case 'UTC':
              if (options.keepLocalTime) {
                this.date = new Date(Date.UTC(
                  this.get('year'),
                  this.get('month') - 1,
                  this.get('day'),
                  this.get('hour'),
                  this.get('minute'),
                  this.get('second'),
                  this.get('millisecond'),
                ))
                this._timezone = value
              }
              else this._timezone = value;
            case undefined: break
            default:
              throw new DateAdapter.InvalidDateError(
                `StandardDateAdapter does not support "${value}" timezone.`
              )
          }
          break    
        default:
          throw new Error('Invalid unit provided to `StandardDateAdapter#set`')
      }
    } else {
      switch (unit) {
        case 'year':
          this.date.setUTCFullYear(value as number)
          break
        case 'month':
          this.date.setUTCMonth(value as number - 1)
          break
        case 'day':
          this.date.setUTCDate(value as number)
          break
        case 'hour':
          this.date.setUTCHours(value as number)
          break
        case 'minute':
          this.date.setUTCMinutes(value as number)
          break
        case 'second':
          this.date.setUTCSeconds(value as number)
          break
        case 'millisecond':
          this.date.setUTCMilliseconds(value as number)
          break
        case 'timezone':
          switch (value) {
            case undefined:
              if (options.keepLocalTime) {
                this.date = new Date(
                  this.get('year'),
                  this.get('month') - 1,
                  this.get('day'),
                  this.get('hour'),
                  this.get('minute'),
                  this.get('second'),
                  this.get('millisecond'),
                )
                this._timezone = value
              }
              else this._timezone = value;
            case 'UTC': break
            default:
              throw new DateAdapter.InvalidDateError(
                `StandardDateAdapter does not support "${value}" timezone.`
              )
          }
          break
        default:
          throw new Error('Invalid unit provided to `StandardDateAdapter#set`')
      }
    }

    this.assertIsValid(context)

    return this
  }

  toISOString() {
    return this.date.toISOString()
  }

  toICal(options: {format?: string} = {}): string {
    const format = options.format || this._timezone;

    if (format === 'UTC')
      return `${Utils.dateToStandardizedString(this as StandardDateAdapter)}Z`
    else
      return `${Utils.dateToStandardizedString(this as StandardDateAdapter)}`
  }

  valueOf() { return this.date.valueOf() }

  assertIsValid(context?: any) {

    if (isNaN(this.valueOf()) || !['UTC', undefined].includes(this._timezone)) {
      const was = context.shift()
      const change = context.map((val: any) => `"${val}"`).join(' ')
      
      throw new DateAdapter.InvalidDateError(
        'DateAdapter has invalid date. ' +
        `Was "${was}". ` + (change ? `Change ${change}.` : '')
      )
    }

    return true
  }
}

/**
 * These functions are basically lifted from `date-fns`, but changed
 * to use the UTC date methods, which `date-fns` doesn't support.
 */

export function toInteger (input: any) {
  if (input === null || input === true || input === false) {
    return NaN
  }

  var number = Number(input)

  if (isNaN(number)) {
    return number
  }

  return number < 0 ? Math.ceil(number) : Math.floor(number)
}

export function addUTCYears (date: Date, input: number) {
  const amount = toInteger(input)
  return addUTCMonths(date, amount * 12)
}

export function addUTCMonths (date: Date, input: number) {
  const amount = toInteger(input)
  date = new Date(date)
  const desiredMonth = date.getUTCMonth() + amount
  const dateWithDesiredMonth = new Date(0)
  dateWithDesiredMonth.setUTCFullYear(date.getUTCFullYear(), desiredMonth, 1)
  dateWithDesiredMonth.setUTCHours(0, 0, 0, 0)
  const daysInMonth = Utils.getDaysInMonth(dateWithDesiredMonth.getUTCMonth() + 1, dateWithDesiredMonth.getUTCFullYear())
  // Set the last day of the new month
  // if the original date was the last day of the longer month
  date.setUTCMonth(desiredMonth, Math.min(daysInMonth, date.getUTCDate()))
  return date
}

export function addUTCWeeks (date: Date, input: number) {
  const amount = toInteger(input)
  const days = amount * 7
  return addUTCDays(date, days)
}

export function addUTCDays (date: Date, input: number) {
  // by adding milliseconds rather than days, we supress the native Date object's automatic
  // daylight savings time conversions which we don't want in UTC mode
  return addUTCMilliseconds(date, toInteger(input) * Utils.MILLISECONDS_IN_DAY)
}

export function addUTCHours (date: Date, input: number) {
  const amount = toInteger(input)
  return addMilliseconds(date, amount * Utils.MILLISECONDS_IN_HOUR)
}

export function addUTCMinutes (date: Date, input: number) {
  const amount = toInteger(input)
  return addMilliseconds(date, amount * Utils.MILLISECONDS_IN_MINUTE)
}

export function addUTCSeconds (date: Date, input: number) {
  const amount = toInteger(input)
  return addMilliseconds(date, amount * Utils.MILLISECONDS_IN_SECOND)
}

export function addUTCMilliseconds (date: Date, input: number) {
  const amount = toInteger(input)
  var timestamp = date.getTime()
  return new Date(timestamp + amount)
}

export function subUTCYears (date: Date, amount: number) {
  return addUTCYears(date, -amount)
}

export function subUTCMonths (date: Date, amount: number) {
  return addUTCMonths(date, -amount)
}

export function subUTCWeeks (date: Date, amount: number) {
  return addUTCWeeks(date, -amount)
}

export function subUTCDays (date: Date, amount: number) {
  return addUTCDays(date, -amount)
}

export function subUTCHours (date: Date, amount: number) {
  return addUTCHours(date, -amount)
}

export function subUTCMinutes (date: Date, amount: number) {
  return addUTCMinutes(date, -amount)
}

export function subUTCSeconds (date: Date, amount: number) {
  return addUTCSeconds(date, -amount)
}

export function subUTCMilliseconds (date: Date, amount: number) {
  return addUTCMilliseconds(date, -amount)
}
