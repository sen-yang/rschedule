import { context } from '../../../../../../tests/utilities';
import { RuleOption } from '../rule-options';
import {
  ByDayOfWeekPipe,
  getNextWeekdaysOfMonth,
  getNextWeekdaysOfYear,
  IByDayOfWeekRuleOptions,
} from './06-by-day-of-week.pipe';
import { buildPipeFn, dateTime } from './test-utilities';

const buildPipe = buildPipeFn<typeof ByDayOfWeekPipe, IByDayOfWeekRuleOptions>(ByDayOfWeekPipe);

describe('ByDayOfWeekPipe', () => {
  let byDayOfWeek: RuleOption.ByDayOfWeek[];
  let byMonthOfYear: RuleOption.ByMonthOfYear[] | undefined;

  afterEach(() => {
    byDayOfWeek = [];
    byMonthOfYear = undefined;
  });

  context('YEARLY', (frequency: 'YEARLY') => {
    context(dateTime(2019, 1, 1, 2, 3, 4, 5), date => {
      it('TU', () => {
        byDayOfWeek = ['TU'];

        const nextWeekdays = getNextWeekdaysOfYear(date, byDayOfWeek);

        expect(nextWeekdays).toEqual([date]);

        const pipe = buildPipe(date, { byDayOfWeek, byMonthOfYear, frequency });

        expect(pipe.run({ date })).toEqual({ date });
      });

      it('FR,TH,20MO', () => {
        byDayOfWeek = ['FR', 'TH', ['MO', 20]];

        const nextWeekdays = getNextWeekdaysOfYear(date, byDayOfWeek);

        expect(nextWeekdays).toEqual([
          dateTime(2019, 1, 3, 2, 3, 4, 5),
          dateTime(2019, 1, 4, 2, 3, 4, 5),
          dateTime(2019, 5, 20, 2, 3, 4, 5),
        ]);

        const pipe = buildPipe(date, { byDayOfWeek, byMonthOfYear, frequency });

        expect(pipe.run({ date })).toEqual({
          date,
          invalidDate: true,
          skipToDate: dateTime(2019, 1, 3),
        });
      });

      it('FR,TH,3MO and 1,5', () => {
        byDayOfWeek = ['FR', 'TH', ['MO', 3]];
        byMonthOfYear = [1, 5];

        const nextWeekdays = getNextWeekdaysOfMonth(date, byDayOfWeek);

        expect(nextWeekdays).toEqual([
          dateTime(2019, 1, 3, 2, 3, 4, 5),
          dateTime(2019, 1, 4, 2, 3, 4, 5),
          dateTime(2019, 1, 21, 2, 3, 4, 5),
        ]);

        const pipe = buildPipe(date, { byDayOfWeek, byMonthOfYear, frequency });

        expect(pipe.run({ date })).toEqual({
          date,
          invalidDate: true,
          skipToDate: dateTime(2019, 1, 3),
        });
      });
    });

    context(dateTime(2019, 1, 16, 2, 3, 4, 5), date => {
      it('TU', () => {
        byDayOfWeek = ['TU'];

        const nextWeekdays = getNextWeekdaysOfYear(date, byDayOfWeek);

        expect(nextWeekdays).toEqual([dateTime(2019, 1, 22, 2, 3, 4, 5)]);

        const pipe = buildPipe(date, { byDayOfWeek, byMonthOfYear, frequency });

        expect(pipe.run({ date })).toEqual({
          date,
          invalidDate: true,
          skipToDate: dateTime(2019, 1, 22),
        });
      });

      it('FR,TH,20MO', () => {
        byDayOfWeek = ['FR', 'TH', ['MO', 20]];

        const nextWeekdays = getNextWeekdaysOfYear(date, byDayOfWeek);

        expect(nextWeekdays).toEqual([
          dateTime(2019, 1, 17, 2, 3, 4, 5),
          dateTime(2019, 1, 18, 2, 3, 4, 5),
          dateTime(2019, 5, 20, 2, 3, 4, 5),
        ]);

        const pipe = buildPipe(date, { byDayOfWeek, byMonthOfYear, frequency });

        expect(pipe.run({ date })).toEqual({
          date,
          invalidDate: true,
          skipToDate: dateTime(2019, 1, 17),
        });
      });
    });

    context(dateTime(2019, 3, 16, 2, 3, 4, 5), date => {
      it('3MO and 1,5', () => {
        byDayOfWeek = [['MO', 3]];
        byMonthOfYear = [1, 5];

        const nextWeekdays = getNextWeekdaysOfMonth(date, byDayOfWeek);

        expect(nextWeekdays).toEqual([dateTime(2019, 3, 18, 2, 3, 4, 5)]);

        const pipe = buildPipe(date, { byDayOfWeek, byMonthOfYear, frequency });

        expect(pipe.run({ date })).toEqual({
          date,
          invalidDate: true,
          skipToDate: dateTime(2019, 3, 18),
        });
      });

      it('3MO and 2', () => {
        byDayOfWeek = [['MO', 3]];
        byMonthOfYear = [2];

        const nextWeekdays = getNextWeekdaysOfMonth(date, byDayOfWeek);

        expect(nextWeekdays).toEqual([dateTime(2019, 3, 18, 2, 3, 4, 5)]);

        const pipe = buildPipe(date, { byDayOfWeek, byMonthOfYear, frequency });

        expect(pipe.run({ date })).toEqual({
          date,
          invalidDate: true,
          skipToDate: dateTime(2019, 3, 18),
        });
      });
    });
  });

  context('MONTHLY', (frequency: 'MONTHLY') => {
    context(dateTime(2019, 1, 1, 2, 3, 4, 5), date => {
      it('TU', () => {
        byDayOfWeek = ['TU'];

        const nextWeekdays = getNextWeekdaysOfMonth(date, byDayOfWeek);

        expect(nextWeekdays).toEqual([date]);

        const pipe = buildPipe(date, { byDayOfWeek, byMonthOfYear, frequency });

        expect(pipe.run({ date })).toEqual({ date });
      });
    });

    context(dateTime(2019, 1, 16, 2, 3, 4, 5), date => {
      it('FR,TH,3MO', () => {
        byDayOfWeek = ['FR', 'TH', ['MO', 3]];

        const nextWeekdays = getNextWeekdaysOfMonth(date, byDayOfWeek);

        expect(nextWeekdays).toEqual([
          dateTime(2019, 1, 17, 2, 3, 4, 5),
          dateTime(2019, 1, 18, 2, 3, 4, 5),
          dateTime(2019, 1, 21, 2, 3, 4, 5),
        ]);

        const pipe = buildPipe(date, { byDayOfWeek, byMonthOfYear, frequency });

        expect(pipe.run({ date })).toEqual({
          date,
          invalidDate: true,
          skipToDate: dateTime(2019, 1, 17),
        });
      });
    });

    context(dateTime(2019, 3, 16, 2, 3, 4, 5), date => {
      it('3MO and 2', () => {
        byDayOfWeek = [['MO', 3]];
        byMonthOfYear = [2];

        const nextWeekdays = getNextWeekdaysOfMonth(date, byDayOfWeek);

        expect(nextWeekdays).toEqual([dateTime(2019, 3, 18, 2, 3, 4, 5)]);

        const pipe = buildPipe(date, { byDayOfWeek, byMonthOfYear, frequency });

        expect(pipe.run({ date })).toEqual({
          date,
          invalidDate: true,
          skipToDate: dateTime(2019, 3, 18),
        });
      });
    });

    context(dateTime(2019, 3, 30, 2, 3, 4, 5), date => {
      it('3MO and 1,5', () => {
        byDayOfWeek = ['MO'];
        byMonthOfYear = [1, 5];

        const pipe = buildPipe(date, { byDayOfWeek, byMonthOfYear, frequency });

        expect(pipe.run({ date })).toEqual({
          date,
          invalidDate: true,
          skipToDate: dateTime(2019, 4, 1),
        });
      });
    });
  });

  context('DAILY', (frequency: 'DAILY') => {
    context(dateTime(2019, 1, 1, 2, 3, 4, 5), date => {
      it('TU', () => {
        byDayOfWeek = ['TU'];

        const pipe = buildPipe(date, { byDayOfWeek, byMonthOfYear, frequency });

        expect(pipe.run({ date })).toEqual({ date });
      });

      it('FR,TH', () => {
        byDayOfWeek = ['FR', 'TH'];
        byMonthOfYear = [1, 5];

        const pipe = buildPipe(date, { byDayOfWeek, byMonthOfYear, frequency });

        expect(pipe.run({ date })).toEqual({
          date,
          invalidDate: true,
          skipToDate: dateTime(2019, 1, 3),
        });
      });
    });
  });
});