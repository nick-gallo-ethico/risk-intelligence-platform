import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  renderWithProviders,
  screen,
  waitFor,
} from "@/test/renderWithProviders";
import userEvent from "@testing-library/user-event";
import {
  CaseInvestigationsPanel,
  CaseInvestigationsPanelSkeleton,
} from "../case-investigations-panel";
import * as investigationApi from "@/lib/investigation-api";
import type { Case } from "@/types/case";
import type {
  Investigation,
  InvestigationListResponse,
} from "@/types/investigation";

// Mock the investigation API
vi.mock("@/lib/investigation-api", () => ({
  getInvestigationsForCase: vi.fn(),
  createInvestigation: vi.fn(),
}));

// Mock toaster (component imports from @/components/ui/toaster)
vi.mock("@/components/ui/toaster", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock api-error-handler
vi.mock("@/lib/api-error-handler", () => ({
  handleApiError: vi.fn(),
}));

// Mock CreateInvestigationDialog
vi.mock("../create-investigation-dialog", () => ({
  CreateInvestigationDialog: ({
    open,
    onSuccess,
  }: {
    open: boolean;
    onSuccess: (inv: Investigation) => void;
  }) =>
    open ? (
      <div role="dialog" data-testid="create-dialog">
        <p>Start a new investigation for this case</p>
        <button
          data-testid="submit-button"
          onClick={() =>
            onSuccess({
              id: "inv-new",
              caseId: "case-456",
              organizationId: "org-789",
              investigationNumber: 1,
              categoryId: null,
              investigationType: "FULL",
              department: null,
              assignedTo: [],
              primaryInvestigatorId: null,
              assignedAt: null,
              assignedById: null,
              status: "NEW",
              statusRationale: null,
              statusChangedAt: null,
              dueDate: null,
              slaStatus: "ON_TRACK",
              findingsSummary: null,
              findingsDetail: null,
              outcome: null,
              rootCause: null,
              lessonsLearned: null,
              findingsDate: null,
              closedAt: null,
              closedById: null,
              closureNotes: null,
              createdAt: "2026-01-17T10:00:00Z",
              updatedAt: "2026-01-17T10:00:00Z",
              createdById: "user-admin",
            } as Investigation)
          }
        >
          Create
        </button>
      </div>
    ) : null,
}));

// Mock InvestigationDetailPanel
vi.mock("@/components/investigations", () => ({
  InvestigationDetailPanel: () => null,
}));

// Mock pointer capture methods for Radix UI in jsdom
beforeEach(() => {
  Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

const mockCase: Case = {
  id: "case-456",
  referenceNumber: "ETH-2026-00001",
  organizationId: "org-123",
  status: "OPEN",
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
  summary: "Test case summary",
  severity: "HIGH",
  severityReason: "Potential policy violation",
  tags: ["urgent"],
  aiSummary: null,
  aiSummaryGeneratedAt: null,
  createdAt: "2026-01-15T10:00:00Z",
  updatedAt: "2026-01-15T10:30:00Z",
  createdById: "user-123",
};

const mockInvestigations: Investigation[] = [
  {
    id: "inv-1",
    caseId: "case-456",
    organizationId: "org-789",
    investigationNumber: 1,
    categoryId: null,
    investigationType: "FULL",
    department: "HR",
    assignedTo: ["user-1"],
    primaryInvestigatorId: "user-1",
    primaryInvestigator: {
      id: "user-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
    },
    assignedAt: "2026-01-15T10:00:00Z",
    assignedById: "user-admin",
    status: "INVESTIGATING",
    statusRationale: null,
    statusChangedAt: null,
    dueDate: "2026-02-15T00:00:00Z",
    slaStatus: "ON_TRACK",
    findingsSummary: null,
    findingsDetail: null,
    outcome: null,
    rootCause: null,
    lessonsLearned: null,
    findingsDate: null,
    closedAt: null,
    closedById: null,
    closureNotes: null,
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-01-15T10:00:00Z",
    createdById: "user-admin",
  },
  {
    id: "inv-2",
    caseId: "case-456",
    organizationId: "org-789",
    investigationNumber: 2,
    categoryId: null,
    investigationType: "LIMITED",
    department: "LEGAL",
    assignedTo: [],
    primaryInvestigatorId: null,
    assignedAt: null,
    assignedById: null,
    status: "NEW",
    statusRationale: null,
    statusChangedAt: null,
    dueDate: null,
    slaStatus: "ON_TRACK",
    findingsSummary: null,
    findingsDetail: null,
    outcome: null,
    rootCause: null,
    lessonsLearned: null,
    findingsDate: null,
    closedAt: null,
    closedById: null,
    closureNotes: null,
    createdAt: "2026-01-16T10:00:00Z",
    updatedAt: "2026-01-16T10:00:00Z",
    createdById: "user-admin",
  },
];

describe("CaseInvestigationsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock - successful API response with investigations
    const mockResponse: InvestigationListResponse = {
      data: mockInvestigations,
      total: mockInvestigations.length,
      limit: 50,
      page: 1,
    };
    (
      investigationApi.getInvestigationsForCase as ReturnType<typeof vi.fn>
    ).mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton when isLoading is true", () => {
    renderWithProviders(
      <CaseInvestigationsPanel caseData={null} isLoading={true} />,
    );

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders null when no case data and not loading", () => {
    const { container } = renderWithProviders(
      <CaseInvestigationsPanel caseData={null} isLoading={false} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders panel with investigations header", async () => {
    renderWithProviders(
      <CaseInvestigationsPanel caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Investigations")).toBeInTheDocument();
    });

    expect(screen.getByTestId("investigations-list")).toBeInTheDocument();
  });

  it("displays investigation count badge", async () => {
    renderWithProviders(
      <CaseInvestigationsPanel caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      // Badge shows count without parentheses
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("renders empty state when no investigations", async () => {
    const emptyResponse: InvestigationListResponse = {
      data: [],
      total: 0,
      limit: 50,
      page: 1,
    };
    (
      investigationApi.getInvestigationsForCase as ReturnType<typeof vi.fn>
    ).mockResolvedValue(emptyResponse);

    renderWithProviders(
      <CaseInvestigationsPanel caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(screen.getByText("No investigations yet")).toBeInTheDocument();
    });
  });

  it("shows Create Investigation button in header", async () => {
    renderWithProviders(
      <CaseInvestigationsPanel caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("create-investigation-button"),
      ).toBeInTheDocument();
    });
  });

  it("shows Link Existing button in header", async () => {
    renderWithProviders(
      <CaseInvestigationsPanel caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("link-investigation-button"),
      ).toBeInTheDocument();
    });
  });

  it("opens create dialog when Create button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CaseInvestigationsPanel caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("create-investigation-button"),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("create-investigation-button"));

    // Check for dialog by role
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/Start a new investigation for this case/),
    ).toBeInTheDocument();
  });

  it("fetches investigations from API on mount", async () => {
    renderWithProviders(
      <CaseInvestigationsPanel caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(investigationApi.getInvestigationsForCase).toHaveBeenCalledWith(
        "case-456",
      );
    });
  });

  it("shows error state when API fails", async () => {
    (
      investigationApi.getInvestigationsForCase as ReturnType<typeof vi.fn>
    ).mockRejectedValue(new Error("Network error"));

    renderWithProviders(
      <CaseInvestigationsPanel caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Failed to load investigations"),
      ).toBeInTheDocument();
    });
  });

  it("shows retry button on error", async () => {
    (
      investigationApi.getInvestigationsForCase as ReturnType<typeof vi.fn>
    ).mockRejectedValue(new Error("Network error"));

    renderWithProviders(
      <CaseInvestigationsPanel caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });
  });

  it("retries fetching investigations when Retry is clicked", async () => {
    (investigationApi.getInvestigationsForCase as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        data: mockInvestigations,
        total: mockInvestigations.length,
        limit: 50,
        page: 1,
      });

    const user = userEvent.setup();
    renderWithProviders(
      <CaseInvestigationsPanel caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(investigationApi.getInvestigationsForCase).toHaveBeenCalledTimes(
        2,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("investigations-list")).toBeInTheDocument();
    });
  });

  it("adds new investigation to list after creation", async () => {
    const emptyResponse: InvestigationListResponse = {
      data: [],
      total: 0,
      limit: 50,
      page: 1,
    };
    (
      investigationApi.getInvestigationsForCase as ReturnType<typeof vi.fn>
    ).mockResolvedValue(emptyResponse);

    const user = userEvent.setup();
    renderWithProviders(
      <CaseInvestigationsPanel caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(screen.getByText("No investigations yet")).toBeInTheDocument();
    });

    // Open dialog via header button
    await user.click(screen.getByTestId("create-investigation-button"));

    // Submit form via mock dialog
    const submitButton = screen.getByTestId("submit-button");
    await user.click(submitButton);

    // Wait for investigation to be added to list
    await waitFor(() => {
      expect(screen.getByTestId("investigations-list")).toBeInTheDocument();
    });
  });

  it("renders investigation cards with status badges", async () => {
    renderWithProviders(
      <CaseInvestigationsPanel caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      // Investigation status should be shown
      expect(screen.getByText("INVESTIGATING")).toBeInTheDocument();
    });
  });
});

describe("CaseInvestigationsPanelSkeleton", () => {
  it("renders skeleton elements", () => {
    renderWithProviders(<CaseInvestigationsPanelSkeleton />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders multiple skeleton cards", () => {
    renderWithProviders(<CaseInvestigationsPanelSkeleton />);

    // Should render skeleton cards
    const cards = document.querySelectorAll('[class*="rounded-lg"]');
    expect(cards.length).toBeGreaterThan(0);
  });
});
