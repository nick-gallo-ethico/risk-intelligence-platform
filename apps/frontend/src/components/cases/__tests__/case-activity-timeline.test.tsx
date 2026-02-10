import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import {
  CaseActivityTimeline,
  CaseActivityTimelineSkeleton,
} from "../case-activity-timeline";
import { apiClient } from "@/lib/api";
import type { Case } from "@/types/case";
import type { Activity, ActivityListResponse } from "@/types/activity";

// Mock the API client
vi.mock("@/lib/api", () => ({
  apiClient: {
    get: vi.fn(),
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

const mockActivities: Activity[] = [
  {
    id: "activity-1",
    entityType: "CASE",
    entityId: mockCase.id,
    action: "created",
    actionDescription: "Jane Admin created the case",
    changes: null,
    actorUserId: "user-123",
    actorType: "USER",
    actorName: "Jane Admin",
    createdAt: getRecentDate(4),
  },
  {
    id: "activity-2",
    entityType: "CASE",
    entityId: mockCase.id,
    action: "status_changed",
    actionDescription: "John Doe changed status from NEW to OPEN",
    changes: { status: { old: "NEW", new: "OPEN" } },
    actorUserId: "user-456",
    actorType: "USER",
    actorName: "John Doe",
    createdAt: getRecentDate(3),
  },
  {
    id: "activity-3",
    entityType: "CASE",
    entityId: mockCase.id,
    action: "commented",
    actionDescription: "Sarah Smith added a note",
    changes: null,
    actorUserId: "user-789",
    actorType: "USER",
    actorName: "Sarah Smith",
    createdAt: getRecentDate(2),
  },
  {
    id: "activity-4",
    entityType: "CASE",
    entityId: mockCase.id,
    action: "file_uploaded",
    actionDescription: "Mike Johnson uploaded evidence.pdf",
    changes: null,
    actorUserId: "user-101",
    actorType: "USER",
    actorName: "Mike Johnson",
    createdAt: getRecentDate(1),
  },
];

describe("CaseActivityTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock - successful API response
    const mockResponse: ActivityListResponse = {
      data: mockActivities,
      total: mockActivities.length,
      limit: 50,
      offset: 0,
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeleton when isLoading is true", () => {
    render(<CaseActivityTimeline caseData={null} isLoading={true} />);

    // Should show skeleton elements
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders null when no case data and not loading", () => {
    const { container } = render(
      <CaseActivityTimeline caseData={null} isLoading={false} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders case details section", async () => {
    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    expect(screen.getByText("Case Details")).toBeInTheDocument();
    expect(
      screen.getByText("This is the detailed description of the case report."),
    ).toBeInTheDocument();
  });

  it("renders action buttons", async () => {
    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    expect(
      screen.getByRole("button", { name: /add.*note/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /log call/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send email/i }),
    ).toBeInTheDocument();
  });

  it("renders Add Note button that opens modal when clicked", async () => {
    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    const addNoteButton = screen.getByRole("button", { name: /add.*note/i });

    await act(async () => {
      fireEvent.click(addNoteButton);
    });

    // Modal placeholder should appear
    expect(
      screen.getByText("Note creation will be implemented in a future task."),
    ).toBeInTheDocument();
  });

  it("fetches activities from API", async () => {
    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(
        `/activity/entity/CASE/${mockCase.id}`,
      );
    });
  });

  it("renders activity entries after loading", async () => {
    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

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

  it("renders filter tabs", async () => {
    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /all/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("tab", { name: /notes/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /status changes/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /files/i })).toBeInTheDocument();
  });

  it("filters activities when Notes tab is clicked", async () => {
    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(
        screen.getByText("Jane Admin created the case"),
      ).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /notes/i }));
    });

    expect(screen.getByText("Sarah Smith added a note")).toBeInTheDocument();
    expect(
      screen.queryByText("Jane Admin created the case"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("John Doe changed status from NEW to OPEN"),
    ).not.toBeInTheDocument();
  });

  it("filters activities when Status Changes tab is clicked", async () => {
    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(
        screen.getByText("Jane Admin created the case"),
      ).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /status changes/i }));
    });

    expect(
      screen.getByText("John Doe changed status from NEW to OPEN"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Sarah Smith added a note"),
    ).not.toBeInTheDocument();
  });

  it("filters activities when Files tab is clicked", async () => {
    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(
        screen.getByText("Jane Admin created the case"),
      ).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /files/i }));
    });

    expect(
      screen.getByText("Mike Johnson uploaded evidence.pdf"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Sarah Smith added a note"),
    ).not.toBeInTheDocument();
  });

  it("shows empty state when no activities match filter", async () => {
    const activitiesWithoutNotes = mockActivities.filter(
      (a) => a.action !== "commented",
    );
    const mockResponse: ActivityListResponse = {
      data: activitiesWithoutNotes,
      total: activitiesWithoutNotes.length,
      limit: 50,
      offset: 0,
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(
        screen.getByText("Jane Admin created the case"),
      ).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /notes/i }));
    });

    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText("No notes yet")).toBeInTheDocument();
  });

  it("shows empty state with appropriate message for all filter", async () => {
    const emptyResponse: ActivityListResponse = {
      data: [],
      total: 0,
      limit: 50,
      offset: 0,
    };
    (apiClient.get as ReturnType<typeof vi.fn>).mockResolvedValue(
      emptyResponse,
    );

    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });

    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });

  it("groups activities by date with date group labels", async () => {
    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      // Activities should be grouped - look for at least one group label
      // The activities are all from today (getRecentDate returns hours ago)
      const entries = screen.getAllByTestId("activity-entry");
      expect(entries.length).toBe(4);
    });

    // Check that a date group header exists (Today, Yesterday, or another group)
    // The exact label depends on when the test runs, so just verify structure
    const container = document.querySelector('[role="tabpanel"]');
    expect(container).toBeInTheDocument();
    expect(container?.querySelector("h4")).toBeInTheDocument();
  });

  it("displays activity counts in filter tabs", async () => {
    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      // All activities count (4)
      expect(screen.getByText("4")).toBeInTheDocument();
    });

    // Check that counts appear in the filter tabs by looking at the tablist
    const tablist = screen.getByRole("tablist");
    expect(tablist).toHaveTextContent("4"); // all
    expect(tablist).toHaveTextContent("1"); // notes, status, files each have 1
  });

  it("handles API error gracefully with fallback activity", async () => {
    (apiClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error"),
    );

    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    // Should show fallback activity from case data
    await waitFor(() => {
      expect(screen.getByText("Case created")).toBeInTheDocument();
    });

    expect(screen.getByText(/Jane Admin/)).toBeInTheDocument();
  });

  it("displays correct icons for different activity types", async () => {
    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      const entries = screen.getAllByTestId("activity-entry");
      expect(entries.length).toBe(4);
    });

    // Check that different colored icons are rendered
    expect(document.querySelector(".bg-green-100")).toBeInTheDocument(); // created
    expect(document.querySelector(".bg-purple-100")).toBeInTheDocument(); // status_changed
    expect(document.querySelector(".bg-teal-100")).toBeInTheDocument(); // commented
    expect(document.querySelector(".bg-amber-100")).toBeInTheDocument(); // file_uploaded
  });

  it("renders relative timestamps for activities", async () => {
    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    await waitFor(() => {
      expect(
        screen.getByText("Jane Admin created the case"),
      ).toBeInTheDocument();
    });

    // Check that timestamps are rendered (they contain "ago" or "hours" or similar)
    const timestamps = screen.getAllByTestId("activity-timestamp");
    expect(timestamps.length).toBe(4);

    // Each timestamp should have time-related text
    timestamps.forEach((ts) => {
      expect(ts.textContent).toMatch(/ago|hour|minute|Just now/i);
    });
  });

  it("closes modal when Close button is clicked", async () => {
    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    const addNoteButton = screen.getByRole("button", { name: /add.*note/i });

    await act(async () => {
      fireEvent.click(addNoteButton);
    });

    // Modal should show the placeholder text
    expect(
      screen.getByText("Note creation will be implemented in a future task."),
    ).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: /^close$/i });

    await act(async () => {
      fireEvent.click(closeButton);
    });

    expect(
      screen.queryByText("Note creation will be implemented in a future task."),
    ).not.toBeInTheDocument();
  });

  it("closes modal when clicking backdrop", async () => {
    render(<CaseActivityTimeline caseData={mockCase} isLoading={false} />);

    const addNoteButton = screen.getByRole("button", { name: /add.*note/i });

    await act(async () => {
      fireEvent.click(addNoteButton);
    });

    // Modal should show the placeholder text
    expect(
      screen.getByText("Note creation will be implemented in a future task."),
    ).toBeInTheDocument();

    // Click the backdrop (the outer fixed div)
    const backdrop = document.querySelector(".fixed.inset-0.bg-black\\/50");

    await act(async () => {
      fireEvent.click(backdrop!);
    });

    expect(
      screen.queryByText("Note creation will be implemented in a future task."),
    ).not.toBeInTheDocument();
  });
});

describe("CaseActivityTimelineSkeleton", () => {
  it("renders skeleton elements", () => {
    render(<CaseActivityTimelineSkeleton />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders action bar skeletons", () => {
    render(<CaseActivityTimelineSkeleton />);

    // Should have 3 button skeletons in the action bar
    const actionBar = document.querySelector(".bg-gray-50.border-b");
    const skeletons = actionBar?.querySelectorAll(".animate-pulse");
    expect(skeletons?.length).toBe(3);
  });

  it("renders filter tab skeletons", () => {
    render(<CaseActivityTimelineSkeleton />);

    // Filter skeleton area should have 4 tab skeletons
    const filterArea = document.querySelector(".flex.gap-2.border-b");
    const skeletons = filterArea?.querySelectorAll(".animate-pulse");
    expect(skeletons?.length).toBe(4);
  });
});
