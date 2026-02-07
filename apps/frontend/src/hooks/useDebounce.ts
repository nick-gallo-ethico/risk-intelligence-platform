/**
 * useDebounce Hook
 *
 * Debounces a callback function by the specified delay.
 * Useful for search inputs and other user interactions that
 * should not trigger immediately.
 */
import { useEffect, useRef } from "react";

/**
 * Debounces the provided callback function.
 *
 * @param callback - Function to call after the debounce delay
 * @param delay - Delay in milliseconds
 * @param dependencies - Dependencies array that triggers the debounce
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState('');
 *
 * useDebounce(
 *   () => {
 *     fetchResults(search);
 *   },
 *   300,
 *   [search]
 * );
 * ```
 */
export function useDebounce(
  callback: () => void,
  delay: number,
  dependencies: unknown[]
): void {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    timeoutRef.current = setTimeout(callback, delay);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}
