import { toast } from "sonner";

/**
 * Standard error response from backend API
 */
interface ApiErrorResponse {
  message?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Extract user-friendly error message from various error types.
 */
function extractErrorMessage(error: unknown): string {
  // Axios-style error with response
  if (error && typeof error === "object" && "response" in error) {
    const response = (
      error as { response?: { data?: ApiErrorResponse; status?: number } }
    ).response;
    const data = response?.data;

    // Use backend message if available
    if (data?.message) return data.message;
    if (data?.error) return data.error;

    // HTTP status fallbacks
    const status = response?.status;
    if (status === 401) return "Session expired. Please log in again.";
    if (status === 403)
      return "You do not have permission to perform this action.";
    if (status === 404) return "The requested resource was not found.";
    if (status === 500) return "Server error. Please try again later.";
  }

  // Error with message property
  if (error instanceof Error) {
    return error.message;
  }

  // String error
  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred";
}

/**
 * Handle API error by showing toast notification.
 * Use this in catch blocks where console.error was previously used.
 *
 * @param error - The caught error
 * @param context - Optional context for the error (e.g., "Failed to save case")
 *
 * @example
 * ```ts
 * try {
 *   await saveCase(data);
 * } catch (error) {
 *   handleApiError(error, 'Failed to save case');
 * }
 * ```
 */
export function handleApiError(error: unknown, context?: string): void {
  const message = extractErrorMessage(error);
  const fullMessage = context ? `${context}: ${message}` : message;

  // Always log to console for debugging
  console.error("[API Error]", { context, error });

  // Show user-visible toast
  toast.error(fullMessage);
}

/**
 * Show a simple error toast without logging.
 * Use for validation errors or user input issues.
 */
export function showError(message: string): void {
  toast.error(message);
}

/**
 * Show a success toast.
 */
export function showSuccess(message: string): void {
  toast.success(message);
}

/**
 * Show an info toast.
 */
export function showInfo(message: string): void {
  toast.info(message);
}

/**
 * Show a loading toast with promise resolution.
 * Automatically shows success or error based on promise outcome.
 *
 * @example
 * ```ts
 * showPromiseToast(
 *   saveCase(data),
 *   { loading: 'Saving...', success: 'Case saved', error: 'Failed to save case' }
 * );
 * ```
 */
export function showPromiseToast<T>(
  promise: Promise<T>,
  messages: { loading: string; success: string; error: string },
): void {
  toast.promise(promise, messages);
}
