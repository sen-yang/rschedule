# rSchedule

[![NPM version](https://flat.badgen.net/npm/v/@rschedule/rschedule)](https://www.npmjs.com/package/@rschedule/rschedule) [![Size when minified & gzipped](https://flat.badgen.net/bundlephobia/minzip/@rschedule/rschedule)](https://bundlephobia.com/result?p=@rschedule/rschedule)

### Still pre-1.0 release (i.e. Beta)

A javascript library, written in typescript, for working with recurring dates. Rules can be imported / exported in [ICAL](https://tools.ietf.org/html/rfc5545) spec format, and Rule objects themselves adhere to the javascript iterator protocol. The library is "date agnostic" and usable with standard `Date`, [`Moment`](https://momentjs.com), or luxon [`DateTime`](https://moment.github.io/luxon/) objects through a [`IDateAdapter` interface](./docs/date-adapter).

At this point, the library's core functionality is feature complete and the tests are passing. This being said, I'm still adjusting the library ahead of a 1.0 release as I dog food it in my own app. See the [1.0 roadmap](#roadmap-to-10) below. If you're looking for something more mature, check out [rrulejs](https://github.com/jakubroztocil/rrule).

### Example usage:

#### Iterate using standard javascript syntax

```typescript
RScheduleConfig.defaultDateAdapter = StandardDateAdapter;

const rule = new Rule({
  frequency: 'YEARLY',
  byMonthOfYear: [2, 6],
  byDayOfWeek: ['SU', ['MO', 3]],
  start: new Date(2010, 1, 7),
});

let index = 0;
for (const date of rule.occurrences()) {
  date.toISOString();
  index++;

  if (index > 10) break;
}
```

#### Get the first 5 occurrences after a starting date

```typescript
rule
  .occurrences({
    start: new Date(2010, 5, 7),
    take: 5,
  })
  .toArray()
  .map(date => date.toISOString());
```

#### Add another rule, subtract specific dates, filter to only return unique dates, and query to see if the result occurs on a Monday before `2013/11/15`.

```typescript
const secondRule = new Rule({
  start: new Date(2011, 1, 7),
  frequency: 'DAILY',
  byDayOfWeek: ['MO'],
});

const dates = new Dates({
  dates: [new Date(2010, 10, 15), new Date(2010, 11, 3)],
});

rule
  .pipe(
    add(secondRule),
    subtract(dates),
    unique(),
  )
  .occursOn({ weekday: 'MO', before: new Date(2013, 10, 15) }); // true
```

## Docs

- [Version 0.10 docs (current)](https://gitlab.com/john.carroll.p/rschedule/tree/f46bf244370dd476633b944e424096a6ae629305/docs#brief-overview)
- [Version 0.9 docs](https://gitlab.com/john.carroll.p/rschedule/tree/a80b576c981570710def8f83575a4932b12f8f34/docs#brief-overview)
- [Version 0.7 docs](https://gitlab.com/john.carroll.p/rschedule/wikis/home)

[Master branch docs (unreleased)](./docs#brief-overview)

## Roadmap to 1.0

- Flesh out `duration` support in the library.
  - Basic `duration` support for dates currently exists (which _may_ be sufficient for 1.0), but I think I'd like to create one or two operators that manipulate durations before 1.0--just to make sure the current API is sufficient/future proofed.
- Make sure the `ical-tools` covers the important ICAL use cases.
  - I'm currently not familiar with the `VTIMEZONE` ICAL component. I want to do some research to understand its effect on `VEVENT` and how rSchedule can represent this.
- Revisit decision not to support `ByDayOfYear`, `ByPositionInSet`, and `ByWeekOfYear` rules.
- **Most important:** more real world testing to make sure the API is appropriate and everything works as expected.

## Installation

```bash
# To install both the main package and the `StandardDateAdapter` for standard javascript dates */

yarn add @rschedule/rschedule @rschedule/standard-date-adapter

# or

npm install @rschedule/rschedule @rschedule/standard-date-adapter

# Current DateAdapter packages

@rschedule/standard-date-adapter
@rschedule/moment-date-adapter
@rschedule/moment-tz-date-adapter
@rschedule/luxon-date-adapter
```

## Known Limitations

- No [`BYWEEKNO`](https://gitlab.com/john.carroll.p/rschedule/issues/2), [`BYYEARDAY`](https://gitlab.com/john.carroll.p/rschedule/issues/3), or [`BYSETPOS`](https://gitlab.com/john.carroll.p/rschedule/issues/4) rule support. "By day of year" and "by position in set" should both be pretty straightforward to implement (if someone else wants to), they're just not something I need so not on my todo list.
  - "By week of year" is different though. I spent a fair bit trying to get it to work and its just SUPER annoying (because it can create a valid date for year A in year B. e.g. the Saturday of the last week of 1998 _is in the year 1999_). Anyway, obviously doable, I have no plans to implement it though.
- No `VCALENDAR` iCal support.
- `VEVENT` iCal support includes iteration logic, but it doesn't include all of the spec. For example, it doesn't support the `VTIMEZONE` component.

## About

The library, itself, has been created from scratch by me, John Carroll. Most of the RRULE tests were taken from the excellent [rrule.js](https://github.com/jakubroztocil/rrule) library (which were, themselves, taken from a python library, I believe).

This library was built using the [typescript starter repo](https://github.com/bitjson/typescript-starter). My implementation strategy has drawn inspiration from the [Angular Material2](https://github.com/angular/material2) Date Picker component (which makes use of date adapters to support different javascript date libraries), as well as [rrulejs](https://github.com/jakubroztocil/rrule) and [ice_cube](https://github.com/seejohnrun/ice_cube).

_This project is not affiliated with any of these projects._
