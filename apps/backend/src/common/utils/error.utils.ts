/**
 * Utility functions for error handling in catch blocks.
 * TypeScript strict mode requires explicit handling of unknown error type in catch blocks.
 */

/**
 * Extract error message from unknown error type.
 * Use this in catch blocks when strict mode is enabled.
 *
 * @example
 * ```typescript
 * try {
 *   // ...
 * } catch (error) {
 *   this.logger.error(getErrorMessage(error));
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Unknown error";
}

/**
 * Extract error stack from unknown error type.
 *
 * @example
 * ```typescript
 * try {
 *   // ...
 * } catch (error) {
 *   this.logger.error(getErrorMessage(error), getErrorStack(error));
 * }
 * ```
 */
export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}
