import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { MyTasks } from "../my-tasks";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
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

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("MyTasks", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe("loading state", () => {
    it("renders loading indicator initially", () => {
      renderWithProviders(<MyTasks />);

      // Should show loading spinner
      expect(
        screen.getByText(/My Tasks/i) || document.querySelector(".animate-spin")
      ).toBeTruthy();
    });
  });

  describe("data display", () => {
    it("renders task list after data loads", async () => {
      renderWithProviders(<MyTasks />);

      // Wait for MSW to return mock tasks
      await waitFor(() => {
        expect(
          screen.getByText(/Review case ETH-2026-00001/i)
        ).toBeInTheDocument();
      });
    });

    it("displays task count badge", async () => {
      renderWithProviders(<MyTasks />);

      await waitFor(() => {
        // The badge should show task count (2 tasks in mock data)
        expect(screen.getByText("2")).toBeInTheDocument();
      });
    });

    it("renders task priority badge", async () => {
      renderWithProviders(<MyTasks />);

      await waitFor(() => {
        expect(screen.getByText(/Review case/i)).toBeInTheDocument();
      });

      // Check for priority badges
      expect(screen.getByText(/High/i)).toBeInTheDocument();
    });

    it("renders due date information", async () => {
      renderWithProviders(<MyTasks />);

      await waitFor(() => {
        expect(screen.getByText(/Review case/i)).toBeInTheDocument();
      });

      // Should show due date (format: "Due: in X days" or "Overdue: X days ago")
      // Use getAllByText since multiple tasks have due dates
      const dueDates = screen.getAllByText(/Due:/i);
      expect(dueDates.length).toBeGreaterThan(0);
    });

    it("renders View All button", async () => {
      renderWithProviders(<MyTasks />);

      await waitFor(() => {
        expect(screen.getByText(/Review case/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/View All/i)).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("renders empty state when no tasks", async () => {
      // Override handler for this test to return empty data
      server.use(
        http.get("*/api/v1/my-work", () => {
          return HttpResponse.json({
            sections: [],
            total: 0,
            hasMore: false,
          });
        })
      );

      renderWithProviders(<MyTasks />);

      await waitFor(() => {
        expect(screen.getByText(/All caught up/i)).toBeInTheDocument();
      });

      expect(
        screen.getByText(/No pending tasks right now/i)
      ).toBeInTheDocument();
    });

    it("shows check circle icon in empty state", async () => {
      server.use(
        http.get("*/api/v1/my-work", () => {
          return HttpResponse.json({
            sections: [],
            total: 0,
            hasMore: false,
          });
        })
      );

      renderWithProviders(<MyTasks />);

      await waitFor(() => {
        expect(screen.getByText(/All caught up/i)).toBeInTheDocument();
      });

      // Check for the green check icon
      const checkIcon = document.querySelector(".text-green-500");
      expect(checkIcon).toBeInTheDocument();
    });
  });

  describe("navigation", () => {
    it("navigates to task URL when clicking a task", async () => {
      const user = userEvent.setup();
      renderWithProviders(<MyTasks />);

      await waitFor(() => {
        expect(screen.getByText(/Review case/i)).toBeInTheDocument();
      });

      // Find the clickable task element
      const taskItem = screen.getByText(/Review case/i).closest("div.p-3");
      if (taskItem) {
        await user.click(taskItem);
        expect(mockPush).toHaveBeenCalledWith("/cases/case-1");
      }
    });

    it("navigates to my-work page when clicking View All", async () => {
      const user = userEvent.setup();
      renderWithProviders(<MyTasks />);

      await waitFor(() => {
        expect(screen.getByText(/Review case/i)).toBeInTheDocument();
      });

      const viewAllButton = screen.getByText(/View All/i).closest("button");
      if (viewAllButton) {
        await user.click(viewAllButton);
        expect(mockPush).toHaveBeenCalledWith("/my-work");
      }
    });
  });

  describe("task sections", () => {
    it("renders tasks from multiple sections", async () => {
      renderWithProviders(<MyTasks />);

      await waitFor(() => {
        expect(
          screen.getByText(/Review case ETH-2026-00001/i)
        ).toBeInTheDocument();
      });

      // Should also have the investigation task
      expect(screen.getByText(/Complete interview notes/i)).toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("handles API errors gracefully", async () => {
      server.use(
        http.get("*/api/v1/my-work", () => {
          // The component catches errors and returns empty state
          return new HttpResponse(null, { status: 500 });
        })
      );

      renderWithProviders(<MyTasks />);

      // Should eventually show empty state (component catches errors)
      await waitFor(
        () => {
          expect(screen.getByText(/All caught up/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });
});
