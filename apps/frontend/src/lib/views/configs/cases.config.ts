/**
 * Cases Module View Configuration
 *
 * Defines columns, filters, bulk actions, and board configuration
 * for the Cases module's saved views system.
 */
import { Tag } from "lucide-react";
import type { ModuleViewConfig } from "@/types/view-config";
import type { BoardColumnConfig } from "@/lib/views/types";

// Case status options with colors (match database enum values)
const CASE_STATUSES: BoardColumnConfig[] = [
  { id: "NEW", label: "New", color: "#3B82F6" },
  { id: "OPEN", label: "Open", color: "#F59E0B" },
  { id: "CLOSED", label: "Closed", color: "#10B981" },
];

// Severity options (match database enum values)
const CASE_SEVERITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
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
  primaryColumnId: "referenceNumber",
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
      id: "referenceNumber",
      accessorKey: "referenceNumber",
      header: "Case #",
      type: "link",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 120,
    },
    {
      id: "summary",
      accessorKey: "summary",
      header: "Summary",
      type: "text",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 300,
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
      id: "severity",
      accessorKey: "severity",
      header: "Severity",
      type: "severity",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      filterOptions: CASE_SEVERITY_OPTIONS,
      width: 100,
    },
    {
      id: "primaryCategory",
      accessorKey: "primaryCategory.name",
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
      id: "createdBy",
      accessorKey: "createdBy.firstName",
      header: "Created By",
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
      propertyId: "severity",
      label: "Severity",
      type: "severity",
      options: CASE_SEVERITY_OPTIONS,
    },
    {
      propertyId: "createdBy",
      label: "Created By",
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
        "referenceNumber",
        "summary",
        "status",
        "severity",
        "primaryCategory",
        "createdBy",
        "createdAt",
      ],
      sortBy: "createdAt",
      sortOrder: "desc",
      isSystem: true,
    },
    {
      name: "My Cases",
      description: "Cases created by me",
      columns: [
        "referenceNumber",
        "summary",
        "status",
        "severity",
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
              operator: "is_any_of",
              value: ["{{currentUserId}}"],
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
      description: "All new and open cases",
      columns: [
        "referenceNumber",
        "summary",
        "severity",
        "primaryCategory",
        "createdBy",
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
              value: ["NEW", "OPEN"],
            },
          ],
        },
      ],
      sortBy: "severity",
      sortOrder: "desc",
      isSystem: true,
    },
    {
      name: "High Severity",
      description: "High severity cases",
      columns: [
        "referenceNumber",
        "summary",
        "status",
        "createdBy",
        "dueDate",
        "createdAt",
      ],
      filters: [
        {
          id: "high-severity-filter",
          conditions: [
            {
              id: "1",
              propertyId: "severity",
              operator: "is_any_of",
              value: ["HIGH"],
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
      { propertyId: "severity", label: "Severity" },
      { propertyId: "primaryCategory", label: "Category" },
    ],
    columns: CASE_STATUSES,
    cardConfig: {
      titleField: "summary",
      subtitleField: "referenceNumber",
      priorityField: "priority",
      ownerField: "assignee.name",
      dateField: "createdAt",
      displayFields: [{ key: "primaryCategory.name", type: "text", icon: Tag }],
    },
  },
};
