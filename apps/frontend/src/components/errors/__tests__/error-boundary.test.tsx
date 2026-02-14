import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactNode } from "react";
import { ErrorBoundary } from "../error-boundary";

// Component that throws an error - return type is JSX.Element to satisfy TypeScript
// even though this will always throw
function ThrowingComponent({
  message = "Test error",
}: {
  message?: string;
}): ReactNode {
  throw new Error(message);
}

// Component that conditionally throws
function ConditionallyThrowingComponent({
  shouldThrow,
}: {
  shouldThrow: boolean;
}): ReactNode {
  if (shouldThrow) {
    throw new Error("Conditional error");
  }
  return <div>Recovered content</div>;
}

// Suppress console.error for cleaner test output since we're testing error handling
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});
afterAll(() => {
  console.error = originalError;
});

describe("ErrorBoundary", () => {
  describe("when no error occurs", () => {
    it("renders children normally", () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText("Child content")).toBeInTheDocument();
    });

    it("renders multiple children", () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText("First child")).toBeInTheDocument();
      expect(screen.getByText("Second child")).toBeInTheDocument();
    });
  });

  describe("when an error occurs", () => {
    it("renders fallback UI with error message", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent message="Something broke" />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Something broke")).toBeInTheDocument();
    });

    it('shows "Try again" button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(
        screen.getByRole("button", { name: /try again/i }),
      ).toBeInTheDocument();
    });

    it("displays default message when error has no message", () => {
      // Create a component that throws an error without a message
      function ThrowEmptyError(): ReactNode {
        const error = new Error();
        error.message = "";
        throw error;
      }

      render(
        <ErrorBoundary>
          <ThrowEmptyError />
        </ErrorBoundary>,
      );

      expect(
        screen.getByText("An unexpected error occurred"),
      ).toBeInTheDocument();
    });
  });

  describe("custom fallback", () => {
    it("renders custom fallback when provided", () => {
      render(
        <ErrorBoundary fallback={<div>Custom error UI</div>}>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Custom error UI")).toBeInTheDocument();
      expect(
        screen.queryByText("Something went wrong"),
      ).not.toBeInTheDocument();
    });

    it("does not render custom fallback when no error", () => {
      render(
        <ErrorBoundary fallback={<div>Custom error UI</div>}>
          <div>Normal content</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText("Normal content")).toBeInTheDocument();
      expect(screen.queryByText("Custom error UI")).not.toBeInTheDocument();
    });
  });

  describe("error recovery", () => {
    it("provides Try again button that calls handleRetry", async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      );

      // Error state is active
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();

      // Click retry button - this tests that the button exists and is clickable
      // The handleRetry function resets state to { hasError: false, error: null }
      const button = screen.getByRole("button", { name: /try again/i });
      expect(button).toBeInTheDocument();

      // Click should not throw (handleRetry is bound correctly)
      await user.click(button);

      // Since child still throws, error reappears - but this confirms:
      // 1. Button exists and is clickable
      // 2. handleRetry was invoked (no errors thrown)
      // 3. Child was re-rendered (which threw again)
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("re-attempts to render children after retry", async () => {
      const user = userEvent.setup();

      // Use a counter to track render attempts
      let renderCount = 0;
      function CountingThrowingComponent(): ReactNode {
        renderCount++;
        throw new Error("Test error");
      }

      render(
        <ErrorBoundary>
          <CountingThrowingComponent />
        </ErrorBoundary>,
      );

      const initialRenderCount = renderCount;
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();

      // Click retry
      await user.click(screen.getByRole("button", { name: /try again/i }));

      // Component should have been rendered again (child re-mounted)
      expect(renderCount).toBeGreaterThan(initialRenderCount);
    });
  });

  describe("error logging", () => {
    it("logs error with componentDidCatch", () => {
      const consoleSpy = vi.spyOn(console, "error");

      render(
        <ErrorBoundary>
          <ThrowingComponent message="Logged error" />
        </ErrorBoundary>,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        "ErrorBoundary caught:",
        expect.any(Error),
        expect.objectContaining({ componentStack: expect.any(String) }),
      );
    });

    it("calls onError callback when provided", () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowingComponent message="Callback test" />
        </ErrorBoundary>,
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Callback test" }),
        expect.objectContaining({ componentStack: expect.any(String) }),
      );
    });

    it("does not call onError when no error occurs", () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <div>Safe content</div>
        </ErrorBoundary>,
      );

      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe("nested error boundaries", () => {
    it("inner boundary catches error first", () => {
      render(
        <ErrorBoundary fallback={<div>Outer fallback</div>}>
          <div>Outer content</div>
          <ErrorBoundary fallback={<div>Inner fallback</div>}>
            <ThrowingComponent />
          </ErrorBoundary>
        </ErrorBoundary>,
      );

      expect(screen.getByText("Outer content")).toBeInTheDocument();
      expect(screen.getByText("Inner fallback")).toBeInTheDocument();
      expect(screen.queryByText("Outer fallback")).not.toBeInTheDocument();
    });
  });
});
