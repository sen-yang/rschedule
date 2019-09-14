import { IRecurrenceRuleModule, RuleOptionError } from '@rschedule/core';
import { ByHourOfDayRuleModule } from '../ByHourOfDay';
import { ByMillisecondOfSecondRuleModule } from '../ByMillisecondOfSecond';
import { ByMinuteOfHourRuleModule } from '../ByMinuteOfHour';
import { BySecondOfMinuteRuleModule } from '../BySecondOfMinute';
import { FrequencyRuleModule } from '../Frequency';
import { RevByDayOfMonthRule } from './rev-rule';
import { ByDayOfMonthRule, IByDayOfMonthRuleOptions, INormByDayOfMonthRuleOptions } from './rule';

export const ByDayOfMonthRuleModule: IRecurrenceRuleModule<
  IByDayOfMonthRuleOptions,
  INormByDayOfMonthRuleOptions
> = {
  name: 'ByDayOfMonth',
  get: processor => {
    if (processor.options.byDayOfMonth === undefined) return null;
    if (processor.reverse) return new RevByDayOfMonthRule(processor);
    return new ByDayOfMonthRule(processor);
  },
  normalizeOptions: (options, norm) => {
    if (options.byDayOfMonth !== undefined) {
      if (options.frequency === 'WEEKLY') {
        throw new RuleOptionError('when "frequency" is "WEEKLY", "byDayOfMonth" cannot be present');
      }

      if (!Array.isArray(options.byDayOfMonth)) {
        throw new RuleOptionError('"byDayOfMonth" expects an array');
      }

      if (options.byDayOfMonth.some((num: number) => num === 0 || num < -31 || num > 31)) {
        throw new RuleOptionError(
          '"byDayOfMonth" values must be `num !== 0 && num < 31 && num > -31`',
        );
      }

      norm.byDayOfMonth = options.byDayOfMonth.slice();
    } else if (
      !(options.byDayOfMonth || (options as any).byDayOfWeek) &&
      ['YEARLY', 'MONTHLY'].includes(options.frequency)
    ) {
      norm.byDayOfMonth = [norm.start.get('day')];
    }
  },
  deps: () => [
    FrequencyRuleModule,
    ByDayOfMonthRuleModule,
    ByHourOfDayRuleModule,
    ByMinuteOfHourRuleModule,
    BySecondOfMinuteRuleModule,
    ByMillisecondOfSecondRuleModule,
  ],
};
