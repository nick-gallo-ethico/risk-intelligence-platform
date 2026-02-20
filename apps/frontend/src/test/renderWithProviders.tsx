import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactElement, ReactNode } from "react";

// Re-export everything from RTL for convenience
export * from "@testing-library/react";

/**
 * Creates a fresh QueryClient configured for testing.
 *
 * Configuration:
 * - retry: false - prevents test flakiness from retry delays
 * - gcTime: 0 - ensures no cache pollution between tests
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

/**
 * Props for AllTheProviders wrapper.
 */
interface AllTheProvidersProps {
  children: ReactNode;
}

/**
 * Wrapper component that provides all necessary context providers for testing.
 * Creates a fresh QueryClient for each render to ensure test isolation.
 */
function AllTheProviders({ children }: AllTheProvidersProps): ReactElement {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

/**
 * Custom render options that extend RTL's RenderOptions.
 * Excludes wrapper since we provide our own.
 */
type CustomRenderOptions = Omit<RenderOptions, "wrapper">;

/**
 * Custom render function that wraps components with all necessary providers.
 *
 * Usage:
 * ```typescript
 * import { renderWithProviders, screen } from '@/test/renderWithProviders';
 *
 * test('my component', () => {
 *   renderWithProviders(<MyComponent />);
 *   expect(screen.getByText('Hello')).toBeInTheDocument();
 * });
 * ```
 *
 * @param ui - The React element to render
 * @param options - Optional RTL render options (excluding wrapper)
 * @returns The RTL render result
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions,
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}
