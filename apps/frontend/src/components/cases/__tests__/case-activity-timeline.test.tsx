import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { renderWithProviders } from "@/test/renderWithProviders";
import {
  CaseActivityTimeline,
  CaseActivityTimelineSkeleton,
} from "../case-activity-timeline";
import { apiClient } from "@/lib/api";
import type { Case } from "@/types/case";

// Mock the API client
vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

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
  details: "This is the detailed description of the case report.",
  summary: "Test case summary",
  severity: "HIGH",
  severityReason: "Potential policy violation",
  tags: ["urgent", "hr"],
  aiSummary: "AI-generated summary",
  aiSummaryGeneratedAt: "2026-01-15T11:00:00Z",
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

// Use dates relative to "now" for testing
const now = new Date();
const getRecentDate = (hoursAgo: number) => {
  const date = new Date(now);
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
};

// Mock response in TimelineResponse format (from backend)
const mockTimelineResponse = {
  entries: [
    {
      id: "activity-1",
      entityType: "CASE",
      entityId: mockCase.id,
      action: "created",
      actionDescription: "Jane Admin created the case",
      actorUserId: "user-123",
      actorName: "Jane Admin",
      createdAt: getRecentDate(4),
      isRelatedEntity: false,
      changes: null,
      context: null,
    },
    {
      id: "activity-2",
      entityType: "CASE",
      entityId: mockCase.id,
      action: "status_changed",
      actionDescription: "John Doe changed status from NEW to OPEN",
      actorUserId: "user-456",
      actorName: "John Doe",
      createdAt: getRecentDate(3),
      isRelatedEntity: false,
      changes: { status: { old: "NEW", new: "OPEN" } },
      context: null,
    },
    {
      id: "activity-3",
      entityType: "CASE",
      entityId: mockCase.id,
      action: "commented",
      actionDescription: "Sarah Smith added a note",
      actorUserId: "user-789",
      actorName: "Sarah Smith",
      createdAt: getRecentDate(2),
      isRelatedEntity: false,
      changes: null,
      context: null,
    },
    {
      id: "activity-4",
      entityType: "CASE",
      entityId: mockCase.id,
      action: "file_uploaded",
      actionDescription: "Mike Johnson uploaded evidence.pdf",
      actorUserId: "user-101",
      actorName: "Mike Johnson",
      createdAt: getRecentDate(1),
      isRelatedEntity: false,
      changes: null,
      context: null,
    },
  ],
  total: 4,
  hasMore: false,
  page: 1,
  limit: 100,
};

describe("CaseActivityTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage for pinned activities
    localStorage.clear();

    // Default mock - successful API response in TimelineResponse format
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockTimelineResponse,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders loading skeleton when isLoading is true", () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={null} isLoading={true} />,
    );

    // Should show skeleton elements
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders null when no case data and not loading", () => {
    const { container } = renderWithProviders(
      <CaseActivityTimeline caseData={null} isLoading={false} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders case details section", async () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    expect(screen.getByText("Case Details")).toBeInTheDocument();
    expect(
      screen.getByText("This is the detailed description of the case report."),
    ).toBeInTheDocument();
  });

  it("renders action buttons", async () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    expect(
      screen.getByRole("button", { name: /add a note to this case/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /log call/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send email/i }),
    ).toBeInTheDocument();
  });

  it("Add Note button is clickable", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    const addNoteButton = screen.getByRole("button", {
      name: /add a note to this case/i,
    });

    await act(async () => {
      fireEvent.click(addNoteButton);
    });

    // Component logs "Add note clicked" to console (TODO implementation)
    expect(consoleSpy).toHaveBeenCalledWith("Add note clicked");
    consoleSpy.mockRestore();
  });

  it("fetches activities from API", async () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        `/activity/CASE/${mockCase.id}?includeRelated=true&limit=100`,
      );
    });
  });

  it("renders activity entries after loading", async () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Jane Admin created the case"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("John Doe changed status from NEW to OPEN"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sarah Smith added a note")).toBeInTheDocument();
    expect(
      screen.getByText("Mike Johnson uploaded evidence.pdf"),
    ).toBeInTheDocument();
  });

  it("renders activity type filter checkboxes", async () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      // HubSpot-style checkbox filters (8 types)
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/emails/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/calls/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tasks/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/interviews/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/documents/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status changes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/system events/i)).toBeInTheDocument();
    });
  });

  it("filters activities when unchecking type checkboxes", async () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Jane Admin created the case"),
      ).toBeInTheDocument();
    });

    // Click "Deselect all" first
    await act(async () => {
      fireEvent.click(screen.getByText("Deselect all"));
    });

    // Now only check "Notes" to see just notes
    await act(async () => {
      fireEvent.click(screen.getByLabelText(/^notes$/i));
    });

    // Should see the note activity
    expect(screen.getByText("Sarah Smith added a note")).toBeInTheDocument();
  });

  it("filters activities when checking Status Changes", async () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Jane Admin created the case"),
      ).toBeInTheDocument();
    });

    // Deselect all, then select only status changes
    await act(async () => {
      fireEvent.click(screen.getByText("Deselect all"));
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText(/status changes/i));
    });

    // Should see status change activity
    expect(
      screen.getByText("John Doe changed status from NEW to OPEN"),
    ).toBeInTheDocument();
  });

  it("filters activities when checking Documents", async () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Jane Admin created the case"),
      ).toBeInTheDocument();
    });

    // Deselect all, then select only documents
    await act(async () => {
      fireEvent.click(screen.getByText("Deselect all"));
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText(/documents/i));
    });

    // Should see file upload activity
    expect(
      screen.getByText("Mike Johnson uploaded evidence.pdf"),
    ).toBeInTheDocument();
  });

  it("shows filter message when no activities match filters", async () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Jane Admin created the case"),
      ).toBeInTheDocument();
    });

    // Deselect all
    await act(async () => {
      fireEvent.click(screen.getByText("Deselect all"));
    });

    // Should show filter message
    await waitFor(() => {
      expect(
        screen.getByText("No activities match your current filters."),
      ).toBeInTheDocument();
    });
  });

  it("shows empty state with appropriate message when no activities exist", async () => {
    const emptyResponse = {
      entries: [],
      total: 0,
      hasMore: false,
      page: 1,
      limit: 100,
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      emptyResponse,
    );

    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    expect(screen.getByText("No activities yet")).toBeInTheDocument();
  });

  it("groups activities by date with date group labels", async () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      const entries = screen.getAllByTestId("activity-entry");
      expect(entries.length).toBe(4);
    });

    // Check that a date group header exists (Today, Yesterday, or another group)
    const container = document.querySelector('[role="region"]');
    expect(container).toBeInTheDocument();
    expect(container?.querySelector("h4")).toBeInTheDocument();
  });

  it("displays activity count in filter indicator", async () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      // Filter activity count indicator shows (visible/total)
      expect(screen.getByText(/Filter activity/)).toBeInTheDocument();
    });
  });

  it("handles API error gracefully and shows error state", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error"),
    );

    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    // Should show error state with retry button
    await waitFor(() => {
      expect(
        screen.getByText("Failed to load activities. Please try again."),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("displays correct icon backgrounds for different activity types", async () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      const entries = screen.getAllByTestId("activity-entry");
      expect(entries.length).toBe(4);
    });

    // Check that icon backgrounds are rendered (colors come from activity-icons config)
    const iconContainers = document.querySelectorAll(
      '[data-testid="activity-entry"] .rounded-full',
    );
    expect(iconContainers.length).toBe(4);
  });

  it("renders relative timestamps for activities", async () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Jane Admin created the case"),
      ).toBeInTheDocument();
    });

    // Check that timestamps are rendered
    const timestamps = screen.getAllByTestId("activity-timestamp");
    expect(timestamps.length).toBe(4);

    // Each timestamp should have time-related text
    timestamps.forEach((ts) => {
      expect(ts.textContent).toMatch(/ago|hour|minute|Just now/i);
    });
  });

  it("supports search query filtering", async () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Jane Admin created the case"),
      ).toBeInTheDocument();
    });

    // Find and use the search input
    const searchInput = screen.getByPlaceholderText(/search activities/i);

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "Sarah" } });
    });

    // Only Sarah's activity should be visible
    await waitFor(() => {
      expect(screen.getByText("Sarah Smith added a note")).toBeInTheDocument();
    });
  });

  it("supports select all types", async () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Jane Admin created the case"),
      ).toBeInTheDocument();
    });

    // Click Select all button
    await act(async () => {
      fireEvent.click(screen.getByText("Select all"));
    });

    // All activities should be visible
    expect(screen.getByText("Jane Admin created the case")).toBeInTheDocument();
    expect(
      screen.getByText("John Doe changed status from NEW to OPEN"),
    ).toBeInTheDocument();
    expect(screen.getByText("Sarah Smith added a note")).toBeInTheDocument();
    expect(
      screen.getByText("Mike Johnson uploaded evidence.pdf"),
    ).toBeInTheDocument();
  });

  it("renders user filter dropdown", async () => {
    renderWithProviders(
      <CaseActivityTimeline caseData={mockCase} isLoading={false} />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Jane Admin created the case"),
      ).toBeInTheDocument();
    });

    // Should have user and team filter dropdowns (2 comboboxes)
    const comboboxes = screen.getAllByRole("combobox");
    expect(comboboxes.length).toBe(2);
  });
});

describe("CaseActivityTimelineSkeleton", () => {
  it("renders skeleton elements", () => {
    renderWithProviders(<CaseActivityTimelineSkeleton />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders action bar skeletons", () => {
    renderWithProviders(<CaseActivityTimelineSkeleton />);

    // Should have 3 button skeletons in the action bar (uses bg-muted/50)
    const actionBar = document.querySelector(".bg-muted\\/50.border-b");
    expect(actionBar).toBeInTheDocument();
    const skeletons = actionBar?.querySelectorAll(".animate-pulse");
    expect(skeletons?.length).toBe(3);
  });

  it("renders filter bar skeletons", () => {
    renderWithProviders(<CaseActivityTimelineSkeleton />);

    // Filter bar skeleton has 8 type checkbox skeletons in flex wrap area
    const filterArea = document.querySelector(".px-6.py-4.border-b.space-y-4");
    expect(filterArea).toBeInTheDocument();
    // The filter area contains checkbox skeletons in a flex wrap container
    const checkboxSkeletons = filterArea?.querySelectorAll(
      ".flex.flex-wrap.gap-4 .animate-pulse",
    );
    expect(checkboxSkeletons?.length).toBe(8);
  });
});
