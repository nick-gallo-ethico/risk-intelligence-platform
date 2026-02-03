/**
 * Progress Bar Utilities for Seed Data Generation
 *
 * Provides consistent progress tracking for long-running seed operations.
 * Uses cli-progress for visual feedback during batch operations.
 */

import * as cliProgress from 'cli-progress';
import * as chalk from 'chalk';

/**
 * Default progress bar format with name, bar, percentage, and ETA
 */
const DEFAULT_FORMAT =
  '{name} |' +
  chalk.cyan('{bar}') +
  '| {percentage}% | {value}/{total} | ETA: {eta}s';

/**
 * Progress bar configuration options
 */
export interface ProgressBarOptions {
  /**
   * Display name for the operation
   */
  name: string;

  /**
   * Total number of items to process
   */
  total: number;

  /**
   * Custom format string (optional)
   */
  format?: string;

  /**
   * Width of the progress bar in characters
   * Default: 40
   */
  barWidth?: number;

  /**
   * Hide the cursor during progress
   * Default: true
   */
  hideCursor?: boolean;
}

/**
 * Create a progress bar for batch operations.
 *
 * Returns a cli-progress SingleBar configured with sensible defaults.
 *
 * @param options Progress bar configuration
 * @returns Configured progress bar instance
 *
 * @example
 * const bar = createProgressBar({ name: 'Employees', total: 20000 });
 * bar.start(20000, 0);
 * for (const emp of employees) {
 *   await createEmployee(emp);
 *   bar.increment();
 * }
 * bar.stop();
 */
export function createProgressBar(
  options: ProgressBarOptions,
): cliProgress.SingleBar {
  const {
    name,
    total,
    format = DEFAULT_FORMAT,
    barWidth = 40,
    hideCursor = true,
  } = options;

  const bar = new cliProgress.SingleBar(
    {
      format,
      barCompleteChar: '\u2588', // Full block
      barIncompleteChar: '\u2591', // Light shade
      hideCursor,
      clearOnComplete: false,
      stopOnComplete: true,
    },
    cliProgress.Presets.shades_classic,
  );

  // Store name in payload for format string
  bar.start(total, 0, { name: name.padEnd(15) });

  return bar;
}

/**
 * Batch progress tracker for complex seeding operations.
 *
 * Wraps cli-progress with a simpler interface and provides
 * summary statistics when complete.
 */
export class BatchProgress {
  private bar: cliProgress.SingleBar;
  private startTime: number = 0;
  private total: number;
  private name: string;
  private processed: number = 0;
  private errors: number = 0;

  /**
   * Create a new batch progress tracker
   *
   * @param name Display name for the operation
   * @param total Total items to process
   */
  constructor(name: string, total: number) {
    this.name = name;
    this.total = total;
    this.bar = new cliProgress.SingleBar(
      {
        format:
          `${chalk.bold(name.padEnd(18))} |` +
          chalk.cyan('{bar}') +
          '| {percentage}% | {value}/{total} | {duration}s',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        clearOnComplete: false,
        stopOnComplete: false,
      },
      cliProgress.Presets.shades_classic,
    );
  }

  /**
   * Start the progress tracking
   */
  start(): void {
    this.startTime = Date.now();
    this.bar.start(this.total, 0);
  }

  /**
   * Increment progress by one item
   *
   * @param isError Whether this item resulted in an error
   */
  increment(isError: boolean = false): void {
    this.processed++;
    if (isError) {
      this.errors++;
    }
    this.bar.increment();
  }

  /**
   * Increment progress by multiple items
   *
   * @param count Number of items processed
   * @param errors Number of errors in this batch
   */
  incrementBy(count: number, errors: number = 0): void {
    this.processed += count;
    this.errors += errors;
    this.bar.increment(count);
  }

  /**
   * Stop progress tracking and print summary
   */
  stop(): void {
    this.bar.stop();

    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const rate = (this.processed / parseFloat(duration)).toFixed(0);

    console.log(
      chalk.green(`  Completed ${this.name}: `) +
        chalk.white(`${this.processed} items in ${duration}s `) +
        chalk.gray(`(${rate}/s)`),
    );

    if (this.errors > 0) {
      console.log(
        chalk.yellow(`  Warnings: `) + chalk.white(`${this.errors} errors`),
      );
    }
  }

  /**
   * Get current statistics
   */
  getStats(): { processed: number; errors: number; duration: number } {
    return {
      processed: this.processed,
      errors: this.errors,
      duration: Date.now() - this.startTime,
    };
  }
}

/**
 * Multi-bar progress tracker for parallel operations.
 *
 * Allows tracking multiple progress bars simultaneously.
 */
export class MultiProgress {
  private multiBar: cliProgress.MultiBar;
  private bars: Map<string, cliProgress.SingleBar> = new Map();

  constructor() {
    this.multiBar = new cliProgress.MultiBar(
      {
        format:
          '{name} |' +
          chalk.cyan('{bar}') +
          '| {percentage}% | {value}/{total}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        clearOnComplete: false,
        stopOnComplete: true,
      },
      cliProgress.Presets.shades_classic,
    );
  }

  /**
   * Add a new progress bar
   *
   * @param name Unique identifier for the bar
   * @param total Total items to process
   * @returns The created progress bar
   */
  addBar(name: string, total: number): cliProgress.SingleBar {
    const bar = this.multiBar.create(total, 0, { name: name.padEnd(15) });
    this.bars.set(name, bar);
    return bar;
  }

  /**
   * Increment a specific bar by name
   *
   * @param name The bar identifier
   */
  increment(name: string): void {
    const bar = this.bars.get(name);
    if (bar) {
      bar.increment();
    }
  }

  /**
   * Stop all progress bars
   */
  stop(): void {
    this.multiBar.stop();
  }
}

/**
 * Simple spinner for indeterminate progress.
 *
 * Useful when total count is unknown.
 */
export function logProgress(message: string, current: number): void {
  const spinner = ['|', '/', '-', '\\'];
  const frame = spinner[current % spinner.length];
  process.stdout.write(`\r${chalk.cyan(frame)} ${message}`);
}

/**
 * Clear the current line and print a completion message.
 */
export function logComplete(message: string): void {
  process.stdout.write(`\r${chalk.green('\u2714')} ${message}\n`);
}

/**
 * Print a section header for seed operations.
 */
export function logSection(title: string): void {
  console.log();
  console.log(chalk.bold.blue(`=== ${title} ===`));
  console.log();
}

/**
 * Print an info message.
 */
export function logInfo(message: string): void {
  console.log(chalk.gray(`  ${message}`));
}

/**
 * Print a warning message.
 */
export function logWarning(message: string): void {
  console.log(chalk.yellow(`  \u26A0 ${message}`));
}

/**
 * Print an error message.
 */
export function logError(message: string): void {
  console.log(chalk.red(`  \u2718 ${message}`));
}
