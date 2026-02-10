import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
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

// Mock sonner toast
vi.mock("@/components/ui/toaster", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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
    render(<CaseInvestigationsPanel caseData={null} isLoading={true} />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders null when no case data and not loading", () => {
    const { container } = render(
      <CaseInvestigationsPanel caseData={null} isLoading={false} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders panel with investigation cards", async () => {
    render(<CaseInvestigationsPanel caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(screen.getByText("Investigations")).toBeInTheDocument();
    });

    expect(screen.getByTestId("investigations-list")).toBeInTheDocument();
    expect(screen.getAllByTestId("investigation-card")).toHaveLength(2);
  });

  it("displays investigation count badge", async () => {
    render(<CaseInvestigationsPanel caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(screen.getByText("(2)")).toBeInTheDocument();
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

    render(<CaseInvestigationsPanel caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    expect(screen.getByText("No investigations yet")).toBeInTheDocument();
    expect(
      screen.getByText("Create an investigation to begin"),
    ).toBeInTheDocument();
  });

  it("shows Create Investigation button in header", async () => {
    render(<CaseInvestigationsPanel caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(
        screen.getByTestId("create-investigation-button"),
      ).toBeInTheDocument();
    });
  });

  it("shows Create Investigation button in empty state", async () => {
    const emptyResponse: InvestigationListResponse = {
      data: [],
      total: 0,
      limit: 50,
      page: 1,
    };
    (
      investigationApi.getInvestigationsForCase as ReturnType<typeof vi.fn>
    ).mockResolvedValue(emptyResponse);

    render(<CaseInvestigationsPanel caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(
        screen.getByTestId("empty-state-create-button"),
      ).toBeInTheDocument();
    });
  });

  it("opens create dialog when Create button is clicked", async () => {
    const user = userEvent.setup();
    render(<CaseInvestigationsPanel caseData={mockCase} isLoading={false} />);

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

  it("opens create dialog from empty state button", async () => {
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
    render(<CaseInvestigationsPanel caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(
        screen.getByTestId("empty-state-create-button"),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("empty-state-create-button"));

    // Check for dialog by role
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("fetches investigations from API on mount", async () => {
    render(<CaseInvestigationsPanel caseData={mockCase} isLoading={false} />);

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

    render(<CaseInvestigationsPanel caseData={mockCase} isLoading={false} />);

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

    render(<CaseInvestigationsPanel caseData={mockCase} isLoading={false} />);

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
    render(<CaseInvestigationsPanel caseData={mockCase} isLoading={false} />);

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

    const newInvestigation: Investigation = {
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
    };
    (
      investigationApi.createInvestigation as ReturnType<typeof vi.fn>
    ).mockResolvedValue(newInvestigation);

    const user = userEvent.setup();
    render(<CaseInvestigationsPanel caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    // Open dialog
    await user.click(screen.getByTestId("empty-state-create-button"));

    // Submit form
    const submitButton = screen.getByTestId("submit-button");
    await user.click(submitButton);

    // Wait for investigation to be added to list
    await waitFor(() => {
      expect(screen.getByTestId("investigations-list")).toBeInTheDocument();
    });

    expect(screen.getAllByTestId("investigation-card")).toHaveLength(1);
  });

  it("renders AI Summary section", async () => {
    render(<CaseInvestigationsPanel caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(screen.getByText("AI Summary")).toBeInTheDocument();
    });
  });

  it("renders Related Cases section", async () => {
    render(<CaseInvestigationsPanel caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(screen.getByText("Related Cases")).toBeInTheDocument();
    });
  });

  it("renders Subjects section", async () => {
    render(<CaseInvestigationsPanel caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(screen.getByText("Subjects")).toBeInTheDocument();
    });
  });

  it("shows AI summary when available", async () => {
    const caseWithSummary: Case = {
      ...mockCase,
      aiSummary: "This is an AI-generated summary of the case.",
      aiSummaryGeneratedAt: "2026-01-15T11:00:00Z",
    };

    render(
      <CaseInvestigationsPanel caseData={caseWithSummary} isLoading={false} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("This is an AI-generated summary of the case."),
      ).toBeInTheDocument();
    });
  });
});

describe("CaseInvestigationsPanelSkeleton", () => {
  it("renders skeleton elements", () => {
    render(<CaseInvestigationsPanelSkeleton />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders multiple card skeletons", () => {
    render(<CaseInvestigationsPanelSkeleton />);

    // Should render 4 card sections (Investigations, AI Summary, Related Cases, Subjects)
    const cards = document.querySelectorAll('[class*="rounded-lg"]');
    expect(cards.length).toBeGreaterThan(0);
  });
});
