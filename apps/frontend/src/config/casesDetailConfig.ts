import type { RecordDetailConfig, PipelineStage } from "@/types/record-detail";

/**
 * Default pipeline stages for cases.
 * These represent the standard case lifecycle from New to Archived.
 * Tenants can customize their own pipelines via the /api/pipelines endpoint.
 */
export const DEFAULT_CASE_PIPELINE: PipelineStage[] = [
  {
    id: "new",
    name: "New",
    order: 0,
    color: "#6B7280",
    isClosed: false,
    allowedTransitions: ["assigned"],
  },
  {
    id: "assigned",
    name: "Assigned",
    order: 1,
    color: "#3B82F6",
    isClosed: false,
    allowedTransitions: ["active", "new"],
  },
  {
    id: "active",
    name: "Active",
    order: 2,
    color: "#8B5CF6",
    isClosed: false,
    allowedTransitions: ["review", "assigned"],
  },
  {
    id: "review",
    name: "Review",
    order: 3,
    color: "#F59E0B",
    isClosed: false,
    allowedTransitions: ["active", "closed"],
  },
  {
    id: "closed",
    name: "Closed",
    order: 4,
    color: "#10B981",
    isClosed: true,
    allowedTransitions: ["remediation", "active"],
  },
  {
    id: "remediation",
    name: "Remediation",
    order: 5,
    color: "#EF4444",
    isClosed: false,
    allowedTransitions: ["archived", "closed"],
  },
  {
    id: "archived",
    name: "Archived",
    order: 6,
    color: "#9CA3AF",
    isClosed: true,
    allowedTransitions: [],
  },
];

/**
 * Configuration object for Case Detail Page.
 *
 * This config-driven architecture enables:
 * - Consistent structure across case, investigation, and disclosure detail pages
 * - Easy customization of tabs, sidebar cards, and actions
 * - Future tenant-specific customization
 *
 * Tab components are placeholder functions for now - Plans 05-07 will wire
 * actual tab components as they are built/refactored.
 */
export const CASES_DETAIL_CONFIG: RecordDetailConfig = {
  moduleType: "cases",
  primaryDisplayProperty: "referenceNumber",
  statusProperty: "status",
  severityProperty: "severity",

  pipeline: {
    enabled: true,
    configEndpoint: "/api/pipelines",
    defaultStages: DEFAULT_CASE_PIPELINE,
  },

  // 6 tabs total: Overview (default), Activities, Investigations, Messages, Files, Remediation
  // No URL state syncing - tab state is local only
  tabs: [
    {
      id: "overview",
      label: "Overview",
      component: () => null,
      isDefault: true, // Overview is default - provides context before diving in
    },
    { id: "activities", label: "Activities", component: () => null },
    { id: "investigations", label: "Investigations", component: () => null },
    { id: "messages", label: "Messages", component: () => null },
    { id: "files", label: "Files", component: () => null },
    { id: "remediation", label: "Remediation", component: () => null },
  ],

  leftSidebar: {
    cards: [
      {
        id: "about",
        type: "about",
        label: "About This Case",
        collapsedByDefault: false,
      },
      {
        id: "intake",
        type: "intake",
        label: "Intake Information",
        collapsedByDefault: true,
      },
      {
        id: "classification",
        type: "classification",
        label: "Classification",
        collapsedByDefault: false,
      },
    ],
  },

  rightSidebar: {
    cards: [
      { id: "workflow" },
      { id: "people" },
      { id: "rius" },
      { id: "related-cases" },
      { id: "policies" },
      { id: "documents" },
      { id: "tasks" },
      { id: "remediation-status" },
      { id: "ai" },
    ],
  },

  quickActions: ["note", "email", "task", "document", "interview"],

  actionsMenu: [
    "assign",
    "change_status",
    "merge",
    "follow",
    "view_properties",
    "view_history",
    "export",
    "delete",
  ],

  activityTypes: [
    "note",
    "email",
    "call",
    "task",
    "interview",
    "document_upload",
    "status_change",
    "assignment_change",
    "system_event",
  ],

  dataHighlights: [
    "severity",
    "status",
    "caseAge",
    "slaStatus",
    "assignedTo",
    "sourceChannel",
  ],
};
