import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatsCards } from "../stats-cards";
import type { Case } from "@/types/case";

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

// Create mock case data
const mockCases: Case[] = [
  {
    id: "case-1",
    referenceNumber: "ETH-2026-00001",
    status: "OPEN",
    severity: "HIGH",
    summary: "Open case 1",
    createdAt: new Date().toISOString(), // This month
    updatedAt: new Date().toISOString(),
    organizationId: "org-test",
  },
  {
    id: "case-2",
    referenceNumber: "ETH-2026-00002",
    status: "OPEN",
    severity: "MEDIUM",
    summary: "Open case 2",
    createdAt: new Date().toISOString(), // This month
    updatedAt: new Date().toISOString(),
    organizationId: "org-test",
  },
  {
    id: "case-3",
    referenceNumber: "ETH-2026-00003",
    status: "NEW",
    severity: "LOW",
    summary: "New case awaiting triage",
    createdAt: new Date().toISOString(), // This month
    updatedAt: new Date().toISOString(),
    organizationId: "org-test",
  },
  {
    id: "case-4",
    referenceNumber: "ETH-2026-00004",
    status: "CLOSED",
    severity: "MEDIUM",
    summary: "Closed case",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    updatedAt: new Date().toISOString(), // Closed today
    organizationId: "org-test",
  },
] as Case[];

describe("StatsCards", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe("loading state", () => {
    it("renders skeleton cards when loading", () => {
      const { container } = render(<StatsCards cases={[]} isLoading={true} />);

      // Should render 4 skeleton cards
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("does not render stat values when loading", () => {
      render(<StatsCards cases={mockCases} isLoading={true} />);

      // The actual stat values should not be visible
      expect(screen.queryByText("2")).not.toBeInTheDocument(); // Open cases count
    });
  });

  describe("data display", () => {
    it("renders all four stat cards", () => {
      render(<StatsCards cases={mockCases} isLoading={false} />);

      expect(screen.getByText("Cases This Month")).toBeInTheDocument();
      expect(screen.getByText("Open Cases")).toBeInTheDocument();
      expect(screen.getByText(/New.*Unassigned/i)).toBeInTheDocument();
      expect(screen.getByText("Avg Resolution Time")).toBeInTheDocument();
    });

    it("displays cases this month count", () => {
      render(<StatsCards cases={mockCases} isLoading={false} />);

      // All 4 mock cases are from this month
      const totalCard = screen.getByText("Cases This Month").closest("div");
      expect(totalCard?.parentElement).toHaveTextContent("4");
    });

    it("displays open cases count", () => {
      render(<StatsCards cases={mockCases} isLoading={false} />);

      // 2 cases have OPEN status
      const openCard = screen.getByText("Open Cases").closest("div");
      expect(openCard?.parentElement).toHaveTextContent("2");
    });

    it("displays new/unassigned cases count", () => {
      render(<StatsCards cases={mockCases} isLoading={false} />);

      // 1 case has NEW status
      const newCard = screen.getByText(/New.*Unassigned/i).closest("div");
      expect(newCard?.parentElement).toHaveTextContent("1");
    });

    it("displays average resolution time for closed cases", () => {
      render(<StatsCards cases={mockCases} isLoading={false} />);

      // We have one closed case from 5 days ago
      const avgCard = screen.getByText("Avg Resolution Time").closest("div");
      expect(avgCard?.parentElement).toHaveTextContent("5d");
    });

    it("displays dash when no closed cases", () => {
      const openCasesOnly = mockCases.filter((c) => c.status !== "CLOSED");
      render(<StatsCards cases={openCasesOnly} isLoading={false} />);

      const avgCard = screen.getByText("Avg Resolution Time").closest("div");
      // Should show dash or "No data yet" message
      expect(avgCard?.parentElement?.textContent).toContain("—");
    });
  });

  describe("empty state", () => {
    it("renders zero counts when no cases", () => {
      render(<StatsCards cases={[]} isLoading={false} />);

      // All counts should be 0
      expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("navigation", () => {
    it("navigates to open cases when clicking Open Cases card", async () => {
      const user = userEvent.setup();
      render(<StatsCards cases={mockCases} isLoading={false} />);

      const openCard = screen
        .getByText("Open Cases")
        .closest('[class*="cursor-pointer"]');
      expect(openCard).toBeInTheDocument();

      if (openCard) {
        await user.click(openCard);
        expect(mockPush).toHaveBeenCalledWith("/cases?status=OPEN");
      }
    });

    it("navigates to new cases when clicking New (Unassigned) card", async () => {
      const user = userEvent.setup();
      render(<StatsCards cases={mockCases} isLoading={false} />);

      const newCard = screen
        .getByText(/New.*Unassigned/i)
        .closest('[class*="cursor-pointer"]');
      expect(newCard).toBeInTheDocument();

      if (newCard) {
        await user.click(newCard);
        expect(mockPush).toHaveBeenCalledWith("/cases?status=NEW");
      }
    });
  });
});
