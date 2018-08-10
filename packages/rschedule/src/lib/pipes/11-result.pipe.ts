import { DateAdapter } from '../date-adapter'
import { IPipeRule, IPipeRunFn, PipeRule } from './interfaces'

export class PipeError extends Error {}

export class ResultPipe<T extends DateAdapter<T>> extends PipeRule<T>
  implements IPipeRule<T> {
  private invalidIterationCount = 0
  private previousIterationDate?: T

  // This pipe exists to facilitate the adding of dev callbacks to an iteration
  // of the pipe. It is meant to always be the last pipe in the chain.
  public run(args: IPipeRunFn<T>) {
    if (this.controller.invalid) {
      throw new Error("Ooops! You've continued to use a rule iterator object " +
        'after having updated `Rule#options`. ' +
        'See the PipeController#invalid source code for more info.')
    }

    if (this.end && args.date.isAfter(this.end)) { return null }

    if (args.invalidDate) {
      // To prevent getting into an infinite loop.
      // - I somewhat arbitrarily chose 50
      // - I noticed that, when limited to 10 iterations, some tests failed
      this.invalidIterationCount++
      if (this.invalidIterationCount > 50) {
        throw new PipeError(
          'Failed to find a single matching occurrence in 50 iterations. ' +
            `Last iterated date: "${args.date.toISOString()}"`
        )
      }
    } else {
      if (
        this.previousIterationDate &&
        this.previousIterationDate.isAfterOrEqual(args.date)
      ) {
        console.error(
          `Previous run's date is after or equal current run's date of "${args.date.toISOString()}". ` +
            'This is probably caused by a bug.'
        )
        return null
      }

      this.previousIterationDate = args.date.clone()
      this.invalidIterationCount = 0
    }

    return args.invalidDate
      ? this.focusedPipe.run({ ...args, invalidDate: false })
      : args.date
  }
}
