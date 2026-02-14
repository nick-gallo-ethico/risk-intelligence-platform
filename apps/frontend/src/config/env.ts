/**
 * Centralized environment configuration for the frontend.
 *
 * All environment variables should be accessed through this config object
 * to ensure consistent defaults and build-time validation.
 */

// Default values for development
const DEFAULT_API_URL = "http://localhost:3001";
const DEFAULT_WS_URL = "http://localhost:3001";

// Read from environment
const apiUrl = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
const wsUrl =
  process.env.NEXT_PUBLIC_WS_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  DEFAULT_WS_URL;

// Environment detection
const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

// Warn on missing env vars in production builds
if (isProduction && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn(
    "[env] Warning: NEXT_PUBLIC_API_URL is not set. Using default value. " +
      "Set this environment variable for production deployments.",
  );
}

/**
 * Centralized configuration object.
 *
 * Usage:
 * ```ts
 * import { config } from '@/config/env';
 *
 * fetch(`${config.apiUrl}/api/v1/users`);
 * const socket = io(config.wsUrl);
 * ```
 */
export const config = {
  /** API base URL (e.g., http://localhost:3001) */
  apiUrl,

  /** WebSocket URL (e.g., http://localhost:3001) */
  wsUrl,

  /** True if NODE_ENV is 'development' */
  isDevelopment,

  /** True if NODE_ENV is 'production' */
  isProduction,
} as const;

// Type for the config object
export type Config = typeof config;
