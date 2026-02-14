import "@testing-library/jest-dom";
import { afterEach, afterAll, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./mocks/server";

/**
 * Test setup for Vitest + React Testing Library + MSW.
 *
 * This file:
 * 1. Starts MSW server before all tests
 * 2. Resets handlers after each test (prevents test pollution)
 * 3. Closes server after all tests
 * 4. Mocks Next.js navigation hooks
 */

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: "warn", // Warn about unhandled requests (helps catch missing handlers)
  });
});

// Reset handlers and cleanup DOM after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// Close server after all tests
afterAll(() => {
  server.close();
});

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock window.matchMedia for components using media queries
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver for components that use it
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage for auth-storage and other localStorage-dependent code
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(() => null),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});
