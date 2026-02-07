/**
 * Cases Module View Configuration
 *
 * Defines columns, filters, bulk actions, and board configuration
 * for the Cases module's saved views system.
 */
import { Tag } from "lucide-react";
import type { ModuleViewConfig } from "@/types/view-config";
import type { BoardColumnConfig } from "@/lib/views/types";

// Case status options with colors
const CASE_STATUSES: BoardColumnConfig[] = [
  { id: "open", label: "Open", color: "#3B82F6" },
  { id: "in_progress", label: "In Progress", color: "#F59E0B" },
  { id: "pending_review", label: "Pending Review", color: "#8B5CF6" },
  { id: "closed", label: "Closed", color: "#10B981" },
  { id: "archived", label: "Archived", color: "#6B7280" },
];

const CASE_PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const CASE_CATEGORY_OPTIONS = [
  { value: "harassment", label: "Harassment" },
  { value: "discrimination", label: "Discrimination" },
  { value: "fraud", label: "Fraud" },
  { value: "theft", label: "Theft" },
  { value: "conflict_of_interest", label: "Conflict of Interest" },
  { value: "safety", label: "Safety Violation" },
  { value: "policy_violation", label: "Policy Violation" },
  { value: "other", label: "Other" },
];

const SOURCE_CHANNEL_OPTIONS = [
  { value: "hotline", label: "Hotline" },
  { value: "web_form", label: "Web Form" },
  { value: "email", label: "Email" },
  { value: "chatbot", label: "Chatbot" },
  { value: "manager", label: "Manager Report" },
];

/**
 * Complete Cases module view configuration
 */
export const CASES_VIEW_CONFIG: ModuleViewConfig = {
  moduleType: "CASES",
  entityName: {
    singular: "Case",
    plural: "Cases",
  },
  primaryColumnId: "caseNumber",
  endpoints: {
    list: "/cases",
    export: "/cases/export",
    bulk: "/cases/bulk",
    single: (id: string) => `/cases/${id}`,
  },

  // Property groups for column picker organization
  propertyGroups: [
    { id: "core", label: "Core Fields" },
    { id: "assignment", label: "Assignment" },
    { id: "dates", label: "Dates" },
    { id: "source", label: "Source" },
    { id: "organization", label: "Organization" },
    { id: "investigation", label: "Investigation" },
    { id: "ai", label: "AI Enrichment" },
  ],

  // Column definitions
  columns: [
    // Core fields
    {
      id: "caseNumber",
      accessorKey: "caseNumber",
      header: "Case #",
      type: "link",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 120,
    },
    {
      id: "title",
      accessorKey: "title",
      header: "Title",
      type: "text",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 250,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      type: "status",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      filterOptions: CASE_STATUSES.map((s) => ({
        value: s.id,
        label: s.label,
      })),
      width: 130,
    },
    {
      id: "priority",
      accessorKey: "priority",
      header: "Priority",
      type: "severity",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      filterOptions: CASE_PRIORITY_OPTIONS,
      width: 100,
    },
    {
      id: "category",
      accessorKey: "category",
      header: "Category",
      type: "enum",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      filterOptions: CASE_CATEGORY_OPTIONS,
      width: 150,
    },

    // Assignment fields
    {
      id: "assignee",
      accessorKey: "assignee.name",
      header: "Assignee",
      type: "user",
      group: "assignment",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 150,
    },
    {
      id: "team",
      accessorKey: "team.name",
      header: "Team",
      type: "enum",
      group: "assignment",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 120,
    },

    // Date fields
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: "Created Date",
      type: "datetime",
      group: "dates",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 150,
    },
    {
      id: "updatedAt",
      accessorKey: "updatedAt",
      header: "Last Updated",
      type: "datetime",
      group: "dates",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 150,
    },
    {
      id: "dueDate",
      accessorKey: "dueDate",
      header: "Due Date",
      type: "date",
      group: "dates",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 120,
    },
    {
      id: "closedAt",
      accessorKey: "closedAt",
      header: "Closed Date",
      type: "datetime",
      group: "dates",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 150,
    },

    // Source fields
    {
      id: "sourceChannel",
      accessorKey: "sourceChannel",
      header: "Source",
      type: "enum",
      group: "source",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      filterOptions: SOURCE_CHANNEL_OPTIONS,
      width: 120,
    },

    // Organization fields
    {
      id: "businessUnit",
      accessorKey: "businessUnit.name",
      header: "Business Unit",
      type: "enum",
      group: "organization",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 150,
    },
    {
      id: "location",
      accessorKey: "location",
      header: "Location",
      type: "text",
      group: "organization",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 150,
    },

    // Investigation fields
    {
      id: "investigationsCount",
      accessorKey: "investigationsCount",
      header: "Investigations",
      type: "number",
      group: "investigation",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 100,
    },
    {
      id: "hasOpenInvestigation",
      accessorKey: "hasOpenInvestigation",
      header: "Active Investigation",
      type: "boolean",
      group: "investigation",
      sortable: false,
      filterable: true,
      defaultVisible: false,
      width: 120,
    },

    // AI fields
    {
      id: "aiSummary",
      accessorKey: "aiSummary",
      header: "AI Summary",
      type: "text",
      group: "ai",
      sortable: false,
      filterable: false,
      defaultVisible: false,
      width: 300,
    },
    {
      id: "aiRiskScore",
      accessorKey: "aiRiskScore",
      header: "Risk Score",
      type: "number",
      group: "ai",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 100,
    },
  ],

  // Quick filter properties
  quickFilterProperties: [
    {
      propertyId: "status",
      label: "Status",
      type: "status",
      options: CASE_STATUSES.map((s) => ({ value: s.id, label: s.label })),
    },
    {
      propertyId: "priority",
      label: "Priority",
      type: "severity",
      options: CASE_PRIORITY_OPTIONS,
    },
    {
      propertyId: "assignee",
      label: "Assignee",
      type: "user",
    },
    {
      propertyId: "createdAt",
      label: "Created Date",
      type: "date",
    },
  ],

  // Bulk actions
  bulkActions: [
    {
      id: "assign",
      label: "Assign",
    },
    {
      id: "status",
      label: "Change Status",
    },
    {
      id: "priority",
      label: "Set Priority",
    },
    {
      id: "export",
      label: "Export Selected",
    },
    {
      id: "delete",
      label: "Delete",
      destructive: true,
      requiresConfirmation: true,
      confirmationMessage:
        "Are you sure you want to delete the selected cases?",
    },
  ],

  // Default views
  defaultViews: [
    {
      name: "All Cases",
      description: "All cases sorted by creation date",
      columns: [
        "caseNumber",
        "title",
        "status",
        "priority",
        "category",
        "assignee",
        "createdAt",
      ],
      sortBy: "createdAt",
      sortOrder: "desc",
      isSystem: true,
    },
    {
      name: "My Cases",
      description: "Cases assigned to me",
      columns: [
        "caseNumber",
        "title",
        "status",
        "priority",
        "dueDate",
        "updatedAt",
      ],
      filters: [
        {
          id: "my-cases-filter",
          conditions: [
            {
              id: "1",
              propertyId: "assignee",
              operator: "is",
              value: "{{currentUserId}}",
            },
          ],
        },
      ],
      sortBy: "updatedAt",
      sortOrder: "desc",
      isSystem: true,
    },
    {
      name: "Open Cases",
      description: "All open and in-progress cases",
      columns: [
        "caseNumber",
        "title",
        "priority",
        "category",
        "assignee",
        "createdAt",
        "dueDate",
      ],
      filters: [
        {
          id: "open-cases-filter",
          conditions: [
            {
              id: "1",
              propertyId: "status",
              operator: "is_any_of",
              value: ["open", "in_progress"],
            },
          ],
        },
      ],
      sortBy: "priority",
      sortOrder: "desc",
      isSystem: true,
    },
    {
      name: "High Priority",
      description: "High and critical priority cases",
      columns: [
        "caseNumber",
        "title",
        "status",
        "assignee",
        "dueDate",
        "createdAt",
      ],
      filters: [
        {
          id: "high-priority-filter",
          conditions: [
            {
              id: "1",
              propertyId: "priority",
              operator: "is_any_of",
              value: ["high", "critical"],
            },
          ],
        },
      ],
      sortBy: "createdAt",
      sortOrder: "desc",
      isSystem: true,
    },
  ],

  // Board view configuration
  boardConfig: {
    defaultGroupBy: "status",
    groupByOptions: [
      { propertyId: "status", label: "Status" },
      { propertyId: "priority", label: "Priority" },
      { propertyId: "category", label: "Category" },
    ],
    columns: CASE_STATUSES,
    cardConfig: {
      titleField: "title",
      subtitleField: "caseNumber",
      priorityField: "priority",
      ownerField: "assignee.name",
      dateField: "createdAt",
      displayFields: [{ key: "category", type: "text", icon: Tag }],
    },
  },
};
