import { Include } from '../basic-utilities';
import { DateAdapter } from '../date-adapter';
import { DateTime } from '../date-time';
import { IDataContainer, IOccurrenceGenerator, OccurrenceGenerator } from '../interfaces';
import {
  CollectionIterator,
  ICollectionsArgs,
  ICollectionsRunArgs,
  IOccurrencesArgs,
  OccurrenceIterator,
} from '../iterators';
import { add, OccurrenceStream, OperatorFnOutput, pipeFn } from '../operators';

const CALENDAR_ID = Symbol.for('5e83caab-8318-43d9-bf3d-cb24fe152246');

type GetCalendarType<T> = Include<T, Calendar<any, any>> extends never
  ? Calendar<any, any>
  : Include<T, Calendar<any, any>>;

export class Calendar<T extends typeof DateAdapter, D = any> extends OccurrenceGenerator<T>
  implements IDataContainer<D> {
  /**
   * Similar to `Array.isArray()`, `isCalendar()` provides a surefire method
   * of determining if an object is a `Calendar` by checking against the
   * global symbol registry.
   */
  // @ts-ignore the check is working as intended but typescript doesn't like it for some reason
  static isCalendar<T>(object: T): object is GetCalendarType<T> {
    return !!(object && typeof object === 'object' && (object as any)[CALENDAR_ID]);
  }

  readonly schedules: ReadonlyArray<IOccurrenceGenerator<T>> = [];

  /**
   * Convenience property for holding arbitrary data. Accessible on individual DateAdapters
   * generated by this `Calendar` object via the `DateAdapter#generators` property.
   */
  data!: D;

  pipe: (...operatorFns: OperatorFnOutput<T>[]) => OccurrenceStream<T> = pipeFn(this);

  readonly isInfinite: boolean;
  readonly hasDuration: boolean;

  protected readonly [CALENDAR_ID] = true;

  constructor(
    args: {
      schedules?: ReadonlyArray<IOccurrenceGenerator<T>> | IOccurrenceGenerator<T>;
      data?: D;
      dateAdapter?: T;
      timezone?: string | null;
    } = {},
  ) {
    super(args);

    this.data = args.data as D;

    if (args.schedules) {
      this.schedules = Array.isArray(args.schedules) ? args.schedules : [args.schedules];
      this.schedules = this.schedules.map(schedule => schedule.set('timezone', this.timezone));
    }

    this.isInfinite = this.schedules.some(schedule => schedule.isInfinite);
    this.hasDuration = this.schedules.every(schedule => schedule.hasDuration);
  }

  occurrences(
    args: IOccurrencesArgs<T> = {},
  ): OccurrenceIterator<T, [this, ...IOccurrenceGenerator<T>[]]> {
    return new OccurrenceIterator(this, this.normalizeOccurrencesArgs(args));
  }

  collections(
    args: ICollectionsArgs<T> = {},
  ): CollectionIterator<T, [this, ...IOccurrenceGenerator<T>[]]> {
    return new CollectionIterator(this, this.normalizeCollectionsArgs(args));
  }

  set(prop: 'timezone', value: string | null, options?: { keepLocalTime?: boolean }) {
    return new Calendar({
      schedules: this.schedules.map(schedule => schedule.set(prop, value, options)),
      data: this.data,
      dateAdapter: this.dateAdapter,
      timezone: value,
    });
  }

  /**  @private use collections() instead */
  *_run(args: ICollectionsRunArgs = {}): IterableIterator<DateTime> {
    const count = args.take;

    delete args.take;

    let iterator: IterableIterator<DateTime>;

    switch (this.schedules.length) {
      case 0:
        return;
      case 1:
        iterator = this.schedules[0]._run(args);
        break;
      default:
        iterator = new OccurrenceStream({
          operators: [add<T>(...this.schedules)],
          dateAdapter: this.dateAdapter,
          timezone: this.timezone,
        })._run(args);
        break;
    }

    let date = iterator.next().value;
    let index = 0;

    while (date && (count === undefined || count > index)) {
      date.generators.unshift(this);

      const yieldArgs = yield this.normalizeRunOutput(date);

      date = iterator.next(yieldArgs).value;

      index++;
    }
  }
}
