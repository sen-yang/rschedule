_implements [IHasOccurrences](./README.md#shared-interfaces)_

RRule objects implement the `RRULE` portion of the [iCAL spec](https://tools.ietf.org/html/rfc5545), and hold/process recurrence rules. While they can be used stand-alone, I expect most people to use them inside of `Schedule` objects.

Rule objects are created with a variety of [iCAL spec](https://tools.ietf.org/html/rfc5545) options which are summarized below. If you're not familiar, you can read the [recurrence rule section of the ICAL spec](https://tools.ietf.org/html/rfc5545#section-3.3.10) to really familiarize yourself with the concepts (its not long).

Rule objects support:

```typescript
interface ProvidedOptions<T extends DateAdapterConstructor> {
  // start date, DateProp<T> is the type of the date object your date adapter
  // is wrapping. DateAdapter<T> is an instance of a date adapter.
  start: DateProp<T> | DateAdapter<T>;

  // 'YEARLY' | 'MONTHLY' | 'WEEKLY' | 'DAILY' | 'HOURLY' | 'MINUTELY' | 'SECONDLY'
  frequency: Frequency;

  interval?: number;

  // end date. Types are the same as `start`
  until?: DateProp<T> | DateAdapter<T>;

  // cap on the number of occurrences
  count?: number;

  // default is 'MO'
  weekStart?: DateAdapter.Weekday; // 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA'

  byMonthOfYear?: ByMonthOfYear[];
  byDayOfMonth?: ByDayOfMonth[];
  byDayOfWeek?: ByDayOfWeek[];
  byHourOfDay?: ByHourOfDay[];
  byMinuteOfHour?: ByMinuteOfHour[];
  bySecondOfMinute?: BySecondOfMinute[];
}

const options: ProvidedOptions = {
  // choose your options
};

const rule = new RRule(options, {
  dateAdapter: StandardDateAdapter,
  data: 'Holds anything I want',
});
```

Rule objects must be created with a start date and a frequency.

## Rules

The following is largely copy-pasted from the [ICAL spec](https://tools.ietf.org/html/rfc5545#section-3.3.10). Because the ICAL spec names things a little weird, you'll notice the text has different names. You should be able to figure it out though.

### Frequency

> The FREQ rule part identifies the type of recurrence rule. This
> rule part MUST be specified in the recurrence rule. Valid values
> include SECONDLY, to specify repeating events based on an interval
> of a second or more; MINUTELY, to specify repeating events based
> on an interval of a minute or more; HOURLY, to specify repeating
> events based on an interval of an hour or more; DAILY, to specify
> repeating events based on an interval of a day or more; WEEKLY, to
> specify repeating events based on an interval of a week or more;
> MONTHLY, to specify repeating events based on an interval of a
> month or more; and YEARLY, to specify repeating events based on an
> interval of a year or more.

- Accepts a `Frequency` value.

```typescript
type Frequency = 'YEARLY' | 'MONTHLY' | 'WEEKLY' | 'DAILY' | 'HOURLY' | 'MINUTELY' | 'SECONDLY';
```

### Interval

> The INTERVAL rule part contains a positive integer representing at
> which intervals the recurrence rule repeats. The default value is
> "1", meaning every second for a SECONDLY rule, every minute for a
> MINUTELY rule, every hour for an HOURLY rule, every day for a
> DAILY rule, every week for a WEEKLY rule, every month for a
> MONTHLY rule, and every year for a YEARLY rule. For example,
> within a DAILY rule, a value of "8" means every eight days.

- Accepts a `number`.

### Until

> The UNTIL rule part defines a DATE or DATE-TIME value that bounds
> the recurrence rule in an inclusive manner. If the value
> specified by UNTIL is synchronized with the specified recurrence,
> this DATE or DATE-TIME becomes the last instance of the
> recurrence. The value of the UNTIL rule part MUST have the same
> value type as the "DTSTART" property. Furthermore, if the
> "DTSTART" property is specified as a date with local time, then
> the UNTIL rule part MUST also be specified as a date with local
> time. If the "DTSTART" property is specified as a date with UTC
> time or a date with local time and time zone reference, then the
> UNTIL rule part MUST be specified as a date with UTC time. In the
> case of the "STANDARD" and "DAYLIGHT" sub-components the UNTIL
> rule part MUST always be specified as a date with UTC time. If
> specified as a DATE-TIME value, then it MUST be specified in a UTC
> time format. If not present, and the COUNT rule part is also not
> present, the "RRULE" is considered to repeat forever.

- Accepts a date or date adapter object.

### Count

> The COUNT rule part defines the number of occurrences at which to
> range-bound the recurrence. ~~The "DTSTART" property value always
> counts as the first occurrence.~~ Note: rSchedule does not automatically do this. You can add an RDATE equal to the start time if you want this behavior.

- Accepts a `number`

### WeekStart

> The WKST rule part specifies the day on which the workweek starts.
> Valid values are MO, TU, WE, TH, FR, SA, and SU. This is
> significant when a WEEKLY "RRULE" has an interval greater than 1,
> and a BYDAY rule part is specified. This is also significant when
> in a YEARLY "RRULE" when a BYWEEKNO rule part is specified. The
> default value is MO.

- Accepts a `Weekday` value.

```typescript
type Weekday = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';
```

### ByMonthOfYear

> The BYMONTH rule part specifies a COMMA-separated list of months
> of the year. Valid values are 1 to 12.

```typescript
type ByMonthOfYear = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
```

### ByDayOfMonth

> The BYMONTHDAY rule part specifies a COMMA-separated list of days
> of the month. Valid values are 1 to 31 or -31 to -1. For
> example, -10 represents the tenth to the last day of the month.
> The BYMONTHDAY rule part MUST NOT be specified when the FREQ rule
> part is set to WEEKLY.

```typescript
type ByDayOfMonth = 1 | 2 | // ... | 31 | -1 | -2 | ... | -31
```

### ByDayOfWeek

> The BYDAY rule part specifies a COMMA-separated list of days of
> the week; SU indicates Sunday; MO indicates Monday; TU indicates
> Tuesday; WE indicates Wednesday; TH indicates Thursday; FR
> indicates Friday; and SA indicates Saturday.

**NOTE: the exact syntax described below is different from rSchedule's syntax**

> Each BYDAY value can also be preceded by a positive (+n) or
> negative (-n) integer. If present, this indicates the nth
> occurrence of a specific day within the MONTHLY or YEARLY "RRULE".

> For example, within a MONTHLY rule, +1MO (or simply 1MO)
> represents the first Monday within the month, whereas -1MO
> represents the last Monday of the month. The numeric value in a
> BYDAY rule part with the FREQ rule part set to YEARLY corresponds
> to an offset within the month when the BYMONTH rule part is
> present, and corresponds to an offset within the year when the
> BYWEEKNO or BYMONTH rule parts are present. If an integer
> modifier is not present, it means all days of this type within the
> specified frequency. For example, within a MONTHLY rule, MO
> represents all Mondays within the month. The BYDAY rule part MUST
> NOT be specified with a numeric value when the FREQ rule part is
> not set to MONTHLY or YEARLY. Furthermore, the BYDAY rule part
> MUST NOT be specified with a numeric value with the FREQ rule part
> set to YEARLY when the BYWEEKNO rule part is specified.

#### rSchedule's syntax

```typescript
type ByDayOfWeek = (Weekday | [Weekday, number])[];
```

Example

```typescript
new RRule({
  // ...
  byDayOfWeek: ['TU', ['TH', 3]],
});
```

### ByHourOfDay

> The BYHOUR rule part specifies a COMMA-
> separated list of hours of the day. Valid values are 0 to 23.

- Accepts `ByHourOfDay`

```typescript
type ByHourOfDay = 0 | 1 | 2 | // ... | 23
```

### ByMinuteOfHour

> The BYMINUTE rule
> part specifies a COMMA-separated list of minutes within an hour.
> Valid values are 0 to 59.

- Accepts `ByMinuteOfHour`

```typescript
type ByMinuteOfHour = 0 | 1 | 2 | // ... | 59
```

### BySecondOfMinute

> The BYSECOND rule part specifies a COMMA-separated list of seconds
> within a minute. Valid values are 0 to 60.

- Accepts `BySecondOfMinute`

```typescript
type BySecondOfMinute = 0 | 1 | 2 | // ... | 60
```