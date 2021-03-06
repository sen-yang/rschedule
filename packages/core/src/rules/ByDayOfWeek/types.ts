import { DateAdapter } from '@rschedule/core';

declare module '../../recurrence-rule-options' {
  namespace RuleOption {
    type ByDayOfWeek = DateAdapter.Weekday | [DateAdapter.Weekday, number];
  }
}
