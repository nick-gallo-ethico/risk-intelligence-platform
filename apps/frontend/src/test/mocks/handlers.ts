import { http, HttpResponse } from "msw";

/**
 * MSW request handlers for frontend tests.
 * These handlers mock the backend API endpoints.
 *
 * Note: Use wildcard URL patterns (*) to match the full axios baseURL
 * (http://localhost:3000/api/v1/...) regardless of environment.
 */

const API_BASE = "*/api/v1";

// Mock data for cases
const mockCases = [
  {
    id: "case-1",
    referenceNumber: "ETH-2026-00001",
    status: "OPEN",
    severity: "HIGH",
    summary: "Test case summary",
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-01-15T10:00:00Z",
    organizationId: "org-test",
  },
  {
    id: "case-2",
    referenceNumber: "ETH-2026-00002",
    status: "INVESTIGATING",
    severity: "MEDIUM",
    summary: "Another test case",
    createdAt: "2026-01-16T14:30:00Z",
    updatedAt: "2026-01-16T14:30:00Z",
    organizationId: "org-test",
  },
  {
    id: "case-3",
    referenceNumber: "ETH-2026-00003",
    status: "NEW",
    severity: "LOW",
    summary: "New case awaiting triage",
    createdAt: "2026-02-10T09:00:00Z",
    updatedAt: "2026-02-10T09:00:00Z",
    organizationId: "org-test",
  },
];

// Mock data for tasks (unified task format)
const mockTasks = [
  {
    id: "task-1",
    type: "CASE_ASSIGNMENT",
    entityType: "CASE",
    entityId: "case-1",
    title: "Review case ETH-2026-00001",
    description: "Initial case review required",
    dueDate: "2026-02-20T17:00:00Z",
    priority: "HIGH",
    status: "PENDING",
    assignedAt: "2026-02-14T10:00:00Z",
    url: "/cases/case-1",
    caseNumber: "ETH-2026-00001",
    categoryName: "Ethics Violation",
    severity: "HIGH",
  },
  {
    id: "task-2",
    type: "INVESTIGATION_STEP",
    entityType: "INVESTIGATION",
    entityId: "inv-1",
    title: "Complete interview notes",
    description: "Document witness interview",
    dueDate: "2026-02-18T17:00:00Z",
    priority: "MEDIUM",
    status: "PENDING",
    assignedAt: "2026-02-13T14:00:00Z",
    url: "/investigations/inv-1",
    caseNumber: "ETH-2026-00001",
    categoryName: "Ethics Violation",
    severity: "HIGH",
  },
];

// Mock dashboard statistics
const mockStats = {
  totalCases: 156,
  openCases: 42,
  pendingTasks: 8,
  completedThisMonth: 23,
};

// Mock current user
const mockCurrentUser = {
  id: "user-123",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  role: "COMPLIANCE_OFFICER",
  organizationId: "org-test",
  permissions: ["cases.view", "cases.edit", "investigations.view"],
};

export const handlers = [
  // =========================================
  // Cases endpoints
  // =========================================
  http.get(`${API_BASE}/cases`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    let filtered = mockCases;
    if (status) {
      filtered = mockCases.filter((c) => c.status === status);
    }

    return HttpResponse.json({
      data: filtered.slice(offset, offset + limit),
      total: filtered.length,
      limit,
      offset,
    });
  }),

  http.get(`${API_BASE}/cases/:id`, ({ params }) => {
    const caseItem = mockCases.find((c) => c.id === params.id);
    if (!caseItem) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(caseItem);
  }),

  // =========================================
  // Tasks endpoints
  // =========================================
  http.get(`${API_BASE}/tasks`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    return HttpResponse.json({
      data: mockTasks.slice(offset, offset + limit),
      total: mockTasks.length,
      limit,
      offset,
    });
  }),

  // =========================================
  // My Work endpoint (unified task view)
  // =========================================
  http.get(`${API_BASE}/my-work`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);

    // Group tasks into sections
    const sections = [
      {
        name: "Case Assignments",
        tasks: mockTasks.filter((t) => t.type === "CASE_ASSIGNMENT"),
        count: mockTasks.filter((t) => t.type === "CASE_ASSIGNMENT").length,
      },
      {
        name: "Investigation Tasks",
        tasks: mockTasks.filter((t) => t.type === "INVESTIGATION_STEP"),
        count: mockTasks.filter((t) => t.type === "INVESTIGATION_STEP").length,
      },
    ].filter((s) => s.count > 0);

    return HttpResponse.json({
      sections,
      total: mockTasks.length,
      hasMore: mockTasks.length > limit,
    });
  }),

  // =========================================
  // Dashboard stats endpoint
  // =========================================
  http.get(`${API_BASE}/dashboard/stats`, () => {
    return HttpResponse.json(mockStats);
  }),

  // =========================================
  // User endpoints
  // =========================================
  http.get(`${API_BASE}/users/me`, () => {
    return HttpResponse.json(mockCurrentUser);
  }),

  // =========================================
  // Auth endpoints (for completeness)
  // =========================================
  http.post(`${API_BASE}/auth/refresh`, () => {
    return HttpResponse.json({
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
    });
  }),
];

// Export mock data for direct use in tests
export const mockData = {
  cases: mockCases,
  tasks: mockTasks,
  stats: mockStats,
  currentUser: mockCurrentUser,
};
