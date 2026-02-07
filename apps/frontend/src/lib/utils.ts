import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function for merging Tailwind CSS classes.
 * Uses clsx for conditional classes and tailwind-merge to handle conflicts.
 *
 * Usage:
 * cn('px-4 py-2', isActive && 'bg-primary', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a random ID for client-side use.
 * Not cryptographically secure - use for UI elements only.
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
