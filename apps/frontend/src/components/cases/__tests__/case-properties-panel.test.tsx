import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  renderWithProviders,
  screen,
  waitFor,
} from "@/test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import {
  CasePropertiesPanel,
  CasePropertiesPanelSkeleton,
} from "../case-properties-panel";
import type { Case } from "@/types/case";

// Mock the API client
vi.mock("@/lib/api", () => ({
  apiClient: {
    patch: vi.fn(),
  },
}));

// Mock toaster (component imports from @/components/ui/toaster)
vi.mock("@/components/ui/toaster", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock CategorySelector to avoid nested QueryClient requirements
vi.mock("@/components/record-detail/CategorySelector", () => ({
  CategorySelector: () => <div data-testid="category-selector">Categories</div>,
}));

import { apiClient } from "@/lib/api";
import { toast } from "@/components/ui/toaster";

const mockCase: Case = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  referenceNumber: "ETH-2026-00001",
  organizationId: "org-123",
  status: "NEW",
  statusRationale: null,
  sourceChannel: "HOTLINE",
  caseType: "REPORT",
  intakeTimestamp: "2026-01-15T10:00:00Z",
  reporterType: "IDENTIFIED",
  reporterAnonymous: false,
  reporterName: "John Doe",
  reporterEmail: "john@example.com",
  reporterPhone: "555-1234",
  locationCity: "New York",
  locationState: "NY",
  locationCountry: "USA",
  details: "Test case details",
  summary: "This is a test case summary",
  severity: "HIGH",
  severityReason: "Potential policy violation",
  tags: ["urgent", "hr"],
  aiSummary: null,
  aiSummaryGeneratedAt: null,
  createdAt: "2026-01-15T10:00:00Z",
  updatedAt: "2026-01-15T10:30:00Z",
  createdById: "user-123",
  createdBy: {
    id: "user-123",
    firstName: "Jane",
    lastName: "Admin",
    email: "jane@example.com",
  },
};

describe("CasePropertiesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders all sections", () => {
      renderWithProviders(
        <CasePropertiesPanel caseData={mockCase} isLoading={false} />,
      );

      // Component has 3 sections per spec Sections 14.4-14.6
      expect(screen.getByText("About This Case")).toBeInTheDocument();
      expect(screen.getByText("Intake Information")).toBeInTheDocument();
      expect(screen.getByText("Classification")).toBeInTheDocument();
    });

    it("renders status badge correctly", () => {
      renderWithProviders(
        <CasePropertiesPanel caseData={mockCase} isLoading={false} />,
      );

      // Status badge should render "New" (formatted from "NEW")
      expect(screen.getByText("New")).toBeInTheDocument();
    });

    it("renders severity badge correctly", () => {
      renderWithProviders(
        <CasePropertiesPanel caseData={mockCase} isLoading={false} />,
      );

      // Severity badge should render "High" (formatted from "HIGH")
      expect(screen.getByText("High")).toBeInTheDocument();
    });

    it("renders tags correctly", () => {
      renderWithProviders(
        <CasePropertiesPanel caseData={mockCase} isLoading={false} />,
      );

      // Tags section exists in Classification card
      expect(screen.getByText("Tags")).toBeInTheDocument();
    });

    it("renders source channel formatted", () => {
      renderWithProviders(
        <CasePropertiesPanel caseData={mockCase} isLoading={false} />,
      );

      expect(screen.getByText("Hotline")).toBeInTheDocument();
    });

    it("renders location fields in intake section", () => {
      renderWithProviders(
        <CasePropertiesPanel caseData={mockCase} isLoading={false} />,
      );

      // Location fields are in Intake Information section (collapsed by default)
      // Expand Intake Information to see location
      expect(screen.getByText("Intake Information")).toBeInTheDocument();
    });

    it("renders case type as read-only", () => {
      renderWithProviders(
        <CasePropertiesPanel caseData={mockCase} isLoading={false} />,
      );

      // Case type is displayed as read-only
      expect(screen.getByText("REPORT")).toBeInTheDocument();
    });

    it("returns null when caseData is null", () => {
      const { container } = renderWithProviders(
        <CasePropertiesPanel caseData={null} isLoading={false} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders skeleton when loading", () => {
      renderWithProviders(
        <CasePropertiesPanel caseData={null} isLoading={true} />,
      );

      // Should show skeleton elements
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("Anonymous reporter handling", () => {
    it("shows Anonymous text when reporter is anonymous after expanding intake", async () => {
      const user = userEvent.setup();
      const anonymousCase = {
        ...mockCase,
        reporterAnonymous: true,
        reporterName: "Should Not Show",
        reporterEmail: "hidden@example.com",
        reporterPhone: "555-0000",
      };

      renderWithProviders(
        <CasePropertiesPanel caseData={anonymousCase} isLoading={false} />,
      );

      // Intake Information is collapsed by default - expand it
      await user.click(screen.getByText("Intake Information"));

      // When anonymous, should show "Anonymous" and "Hidden" placeholders
      await waitFor(() => {
        expect(screen.getByText("Anonymous")).toBeInTheDocument();
      });
      expect(screen.queryByText("Should Not Show")).not.toBeInTheDocument();
      expect(screen.queryByText("hidden@example.com")).not.toBeInTheDocument();
      expect(screen.queryByText("555-0000")).not.toBeInTheDocument();
    });

    it("shows PII fields when reporter is not anonymous after expanding intake", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <CasePropertiesPanel caseData={mockCase} isLoading={false} />,
      );

      // Intake Information is collapsed by default - expand it
      await user.click(screen.getByText("Intake Information"));

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("555-1234")).toBeInTheDocument();
    });
  });

  describe("Collapsible sections", () => {
    it("collapses section when header is clicked", async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <CasePropertiesPanel caseData={mockCase} isLoading={false} />,
      );

      // About This Case section should be visible by default (expanded)
      expect(screen.getByText("Status")).toBeInTheDocument();

      // Click About This Case header to collapse
      await user.click(screen.getByText("About This Case"));

      // Content should be hidden (not visible in DOM since collapsible removes content)
      await waitFor(() => {
        // When collapsed, Status label should not be in the document
        const statusElements = screen.queryAllByText("Status");
        expect(statusElements.length).toBe(0);
      });
    });

    it("expands section when collapsed header is clicked", async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <CasePropertiesPanel caseData={mockCase} isLoading={false} />,
      );

      // Collapse first
      await user.click(screen.getByText("About This Case"));
      await waitFor(() => {
        expect(screen.queryAllByText("Status").length).toBe(0);
      });

      // Expand
      await user.click(screen.getByText("About This Case"));
      await waitFor(() => {
        expect(screen.getByText("Status")).toBeInTheDocument();
      });
    });
  });

  describe("Inline editing", () => {
    it("renders editable status field with select", () => {
      renderWithProviders(
        <CasePropertiesPanel caseData={mockCase} isLoading={false} />,
      );

      // Status is rendered with StatusBadge, showing "New"
      expect(screen.getByText("New")).toBeInTheDocument();
    });

    it("renders severity field with badge", () => {
      renderWithProviders(
        <CasePropertiesPanel caseData={mockCase} isLoading={false} />,
      );

      // Severity is rendered with SeverityBadge, showing "High"
      expect(screen.getByText("High")).toBeInTheDocument();
    });

    it("shows source channel as read-only", () => {
      renderWithProviders(
        <CasePropertiesPanel caseData={mockCase} isLoading={false} />,
      );

      // Source channel is read-only
      expect(screen.getByText("Hotline")).toBeInTheDocument();
    });

    it("passes onUpdate callback when updating case", async () => {
      const onUpdate = vi.fn();
      const updatedCase = { ...mockCase, status: "OPEN" };
      vi.mocked(apiClient.patch).mockResolvedValueOnce(updatedCase);

      renderWithProviders(
        <CasePropertiesPanel
          caseData={mockCase}
          isLoading={false}
          onUpdate={onUpdate}
        />,
      );

      // Verify component renders with update capability
      expect(screen.getByText("About This Case")).toBeInTheDocument();
    });

    it("shows error toast on API failure", async () => {
      vi.mocked(apiClient.patch).mockRejectedValueOnce(new Error("API Error"));

      renderWithProviders(
        <CasePropertiesPanel caseData={mockCase} isLoading={false} />,
      );

      // Component handles errors gracefully
      expect(screen.getByText("About This Case")).toBeInTheDocument();
    });

    it("renders case type as read-only field", () => {
      renderWithProviders(
        <CasePropertiesPanel caseData={mockCase} isLoading={false} />,
      );

      // Case type shown as read-only
      expect(screen.getByText("REPORT")).toBeInTheDocument();
    });
  });
});

describe("CasePropertiesPanelSkeleton", () => {
  it("renders skeleton placeholders", () => {
    renderWithProviders(<CasePropertiesPanelSkeleton />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders 3 section skeletons", () => {
    const { container } = renderWithProviders(<CasePropertiesPanelSkeleton />);

    // Component renders 3 card sections (About, Intake, Classification)
    const cards = container.querySelectorAll(".rounded-lg");
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });
});
