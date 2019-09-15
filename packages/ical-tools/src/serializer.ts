import { DateAdapter, DateAdapterBase, DateInput, DateTime, RuleOption } from '@rschedule/core';
import { Dates } from '@rschedule/core/generators';
import { IRRuleOptions } from '@rschedule/core/rules/ICAL_RULES';
import { stringify } from 'ical.js';
import { VEvent } from './vevent';

export class SerializeICalError extends Error {}

export interface IJCalProperty extends Array<any> {
  [0]: string;
  [1]: { [property: string]: string };
  [2]: string;
  [3]: any;
}

export interface IJCalComponent {
  [0]: string;
  [1]: IJCalProperty[];
  [2]: IJCalComponent[];
}

/**
 * Serializes an array of date adapters into JCal format.
 *
 * @param dates array of DateAdapter dates
 * @param type whether these are RDATEs or EXDATEs
 */
function datesToJCalProps(type: 'RDATE' | 'EXDATE', dates: Dates): IJCalProperty[] {
  const adapters = dates.adapters.map(adapter => adapter.toDateTime());

  // group dates by timezone
  const timezones = new Map<string, string[]>();

  adapters
    .slice()
    .sort((a, b) => {
      if (a.isAfter(b)) {
        return 1;
      } else if (b.isAfter(a)) {
        return -1;
      } else {
        return 0;
      }
    })
    .forEach(date => {
      const timezone = date.timezone || 'local';

      if (!timezones.has(timezone)) {
        timezones.set(timezone, []);
      }

      timezones.get(timezone)!.push(dateTimeToJCal(date));
    });

  const result: Array<[string, {} | { tzid: string }, string, ...string[]]> = [];

  for (const [timezone, dateStrings] of timezones) {
    if (timezone === 'local' || timezone === 'UTC') {
      result.push([type.toLowerCase(), {}, 'date-time', ...dateStrings]);
    } else {
      result.push([type.toLowerCase(), { tzid: timezone }, 'date-time', ...dateStrings]);
    }
  }

  return result as IJCalProperty;
}

function normalizeDateInput(date: DateInput): DateTime {
  if (date instanceof DateTime) {
    return date;
  }

  return date instanceof DateAdapterBase
    ? date.toDateTime()
    : DateAdapterBase.adapter.fromDate(date).toDateTime();
}

/**
 * Converts an options object to an [ICAL](https://tools.ietf.org/html/rfc5545)
 * complient string.
 *
 * @param options ProvidedOptions
 * @param type Determins if the serialized options object is labeled as an
 * "RRULE" or an "EXRULE".
 */
function ruleOptionsToJCalProp(
  type: 'RRULE' | 'EXRULE',
  ruleOptions: IRRuleOptions,
): IJCalProperty {
  const start = normalizeDateInput(ruleOptions.start);

  let end: DateTime | undefined;

  if (ruleOptions.end) {
    end = normalizeDateInput(ruleOptions.end);

    if (start.timezone) {
      end = DateAdapterBase.adapter
        .fromDateTime(end)
        .set('timezone', 'UTC')
        .toDateTime();
    }
  }

  const stringOptions: any = {};

  for (const option in ruleOptions) {
    if (ruleOptions.hasOwnProperty(option) && (ruleOptions as any)[option] !== undefined) {
      switch (option) {
        case 'frequency':
          stringOptions.freq = ruleOptions.frequency;
          break;
        case 'interval':
          stringOptions.interval = ruleOptions.interval;

          stringOptions.push(`INTERVAL=${ruleOptions.interval}`);
          break;
        case 'end':
          stringOptions.until = dateTimeToJCal(end!);
          break;
        case 'count':
          stringOptions.count = ruleOptions.count;
          break;
        case 'bySecondOfMinute':
          stringOptions.bysecond = ruleOptions.bySecondOfMinute!;
          break;
        case 'byMinuteOfHour':
          stringOptions.byminute = ruleOptions.byMinuteOfHour;
          break;
        case 'byHourOfDay':
          stringOptions.byhour = ruleOptions.byHourOfDay;
          break;
        case 'byDayOfWeek':
          stringOptions.byday = ruleOptions.byDayOfWeek!.map(day => serializeByDayOfWeek(day));
          break;
        case 'byDayOfMonth':
          stringOptions.bymonthday = ruleOptions.byDayOfMonth;
          break;
        case 'byMonthOfYear':
          stringOptions.bymonth = ruleOptions.byMonthOfYear;
          break;
        case 'weekStart':
          stringOptions.wkst = DateAdapter.WEEKDAYS.indexOf(ruleOptions.weekStart!) + 1;
          break;
      }
    }
  }

  return [type.toLowerCase(), {}, 'recur', stringOptions];
}

function vEventToJCal(vevent: VEvent): IJCalComponent {
  return wrapInVEVENT(
    dateToJCalDTSTART(vevent.start.toDateTime()),
    // prettier-ignore
    ...(typeof vevent.duration === 'number' ? numberToJCalDURATION(vevent.duration)
      : vevent.duration ? dateToJCalDTEND(vevent.duration.toDateTime())
      : []),
    ...vevent.rrules.map(rule => ruleOptionsToJCalProp('RRULE', rule.options)),
    ...vevent.exrules.map(rule => ruleOptionsToJCalProp('EXRULE', rule.options)),
    ...datesToJCalProps('RDATE', vevent.rdates),
    ...datesToJCalProps('EXDATE', vevent.exdates),
  );
}

export function serializeToJCal(input: VEvent): IJCalComponent {
  if (!(input instanceof VEvent)) {
    throw new SerializeICalError(`Unsupported input type "${input}"`);
  }

  return vEventToJCal(input);
}

export function serializeToICal(input: VEvent): string {
  const jCal = serializeToJCal(input);

  // ical.js makes new lines with `\r\n` instead of just `\n`
  // `\r` is a "Carriage Return" character. We'll remove it.
  return stringify((jCal as any) as any[]).replace(/\r/g, '');
}

function serializeByDayOfWeek(arg: RuleOption.ByDayOfWeek) {
  return Array.isArray(arg) ? `${arg[1]}${arg[0]}` : arg;
}

function dateToJCalDTSTART(date: DateTime) {
  const timezone = date.timezone || 'UTC';

  return [
    'dtstart',
    timezone !== 'UTC' ? { tzid: timezone } : {},
    'date-time',
    dateTimeToJCal(date),
  ];
}

function dateToJCalDTEND(date: DateTime) {
  const timezone = date.timezone || 'UTC';

  return [
    ['dtend', timezone !== 'UTC' ? { tzid: timezone } : {}, 'date-time', dateTimeToJCal(date)],
  ];
}

function numberToJCalDURATION(duration: number) {
  const weeks = Math.floor(duration / DateAdapter.MILLISECONDS_IN_WEEK);
  duration = duration - weeks * DateAdapter.MILLISECONDS_IN_WEEK;
  const days = Math.floor(duration / DateAdapter.MILLISECONDS_IN_DAY);
  duration = duration - days * DateAdapter.MILLISECONDS_IN_DAY;
  const hours = Math.floor(duration / DateAdapter.MILLISECONDS_IN_HOUR);
  duration = duration - hours * DateAdapter.MILLISECONDS_IN_HOUR;
  const minutes = Math.floor(duration / DateAdapter.MILLISECONDS_IN_MINUTE);
  duration = duration - minutes * DateAdapter.MILLISECONDS_IN_MINUTE;
  const seconds = Math.ceil(duration / DateAdapter.MILLISECONDS_IN_SECOND);

  let val = 'P';

  if (weeks > 0) val += `${weeks}W`;
  if (days > 0) val += `${days}D`;
  if (hours > 0 || minutes > 0 || seconds > 0) {
    val += 'T';
    if (hours > 0) val += `${hours}H`;
    if (minutes > 0) val += `${minutes}M`;
    if (seconds > 0) val += `${seconds}S`;
  }

  if (val === 'P') {
    return [];
  }

  return [['duration', {}, 'duration', val]];
}

function dateTimeToJCal(input: DateTime) {
  const ints = [
    input.get('year'),
    input.get('month'),
    input.get('day'),
    input.get('hour'),
    input.get('minute'),
    input.get('second'),
  ].map(int => normalizeTimeLength(int));

  let text = `${ints[0]}-${ints[1]}-${ints[2]}T` + `${ints[3]}:${ints[4]}:${ints[5]}`;

  if (input.timezone === 'UTC') {
    text = `${text}Z`;
  }

  return text;
}

function normalizeTimeLength(input: number) {
  const int = input.toString();

  return int.length > 1 ? int : `0${int}`;
}

function wrapInVEVENT(...inputs: any[]): IJCalComponent {
  return ['vevent', [...inputs], []];
}