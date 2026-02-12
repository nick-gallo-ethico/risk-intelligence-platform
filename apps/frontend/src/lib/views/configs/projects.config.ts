/**
 * Projects Module View Configuration
 *
 * Defines columns, filters, bulk actions, and board configuration
 * for the Projects module's saved views system.
 */
import { FolderKanban, User } from "lucide-react";
import type { ModuleViewConfig } from "@/types/view-config";
import type { BoardColumnConfig } from "@/lib/views/types";

// Project status options with colors (match MilestoneStatus enum)
const PROJECT_STATUSES: BoardColumnConfig[] = [
  { id: "NOT_STARTED", label: "Not Started", color: "#6B7280" },
  { id: "IN_PROGRESS", label: "In Progress", color: "#3B82F6" },
  { id: "AT_RISK", label: "At Risk", color: "#F59E0B" },
  { id: "COMPLETED", label: "Completed", color: "#10B981" },
  { id: "CANCELLED", label: "Cancelled", color: "#EF4444" },
];

// Project category options (match MilestoneCategory enum)
const PROJECT_CATEGORY_OPTIONS = [
  { value: "AUDIT", label: "Audit" },
  { value: "INVESTIGATION", label: "Investigation" },
  { value: "CAMPAIGN", label: "Campaign" },
  { value: "PROJECT", label: "Project" },
  { value: "TRAINING", label: "Training" },
  { value: "REMEDIATION", label: "Remediation" },
  { value: "OTHER", label: "Other" },
];

/**
 * Complete Projects module view configuration
 */
export const PROJECTS_VIEW_CONFIG: ModuleViewConfig = {
  moduleType: "PROJECTS" as "CASES", // Cast needed until ViewEntityType is extended
  entityName: {
    singular: "Project",
    plural: "Projects",
  },
  primaryColumnId: "name",
  endpoints: {
    list: "/projects",
    export: "/projects/export",
    bulk: "/projects/bulk",
    single: (id: string) => `/projects/${id}`,
  },

  // Property groups for column picker organization
  propertyGroups: [
    { id: "core", label: "Core Fields" },
    { id: "progress", label: "Progress" },
    { id: "dates", label: "Dates" },
    { id: "assignment", label: "Assignment" },
  ],

  // Column definitions
  columns: [
    // Core fields
    {
      id: "name",
      accessorKey: "name",
      header: "Project Name",
      type: "link",
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
      filterOptions: PROJECT_STATUSES.map((s) => ({
        value: s.id,
        label: s.label,
      })),
      width: 130,
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
      filterOptions: PROJECT_CATEGORY_OPTIONS,
      width: 130,
    },
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      type: "text",
      group: "core",
      sortable: false,
      filterable: false,
      defaultVisible: false,
      width: 200,
    },

    // Progress fields
    {
      id: "progressPercent",
      accessorKey: "progressPercent",
      header: "Progress",
      type: "number",
      group: "progress",
      sortable: true,
      filterable: false,
      defaultVisible: true,
      width: 120,
    },
    {
      id: "taskCount",
      accessorKey: "taskCount",
      header: "Tasks",
      type: "number",
      group: "progress",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 100,
    },
    {
      id: "completedTaskCount",
      accessorKey: "completedTaskCount",
      header: "Completed",
      type: "number",
      group: "progress",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 120,
    },

    // Assignment fields
    {
      id: "owner",
      accessorKey: "owner.name",
      header: "Owner",
      type: "user",
      group: "assignment",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 150,
    },

    // Date fields
    {
      id: "targetDate",
      accessorKey: "targetDate",
      header: "Target Date",
      type: "date",
      group: "dates",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 130,
    },
    {
      id: "completedAt",
      accessorKey: "completedAt",
      header: "Completed Date",
      type: "datetime",
      group: "dates",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 150,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: "Created Date",
      type: "datetime",
      group: "dates",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 150,
    },
    {
      id: "updatedAt",
      accessorKey: "updatedAt",
      header: "Last Updated",
      type: "datetime",
      group: "dates",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 150,
    },
  ],

  // Quick filter properties
  quickFilterProperties: [
    {
      propertyId: "status",
      label: "Status",
      type: "status",
      options: PROJECT_STATUSES.map((s) => ({ value: s.id, label: s.label })),
    },
    {
      propertyId: "category",
      label: "Category",
      type: "enum",
      options: PROJECT_CATEGORY_OPTIONS,
    },
    {
      propertyId: "owner",
      label: "Owner",
      type: "user",
    },
    {
      propertyId: "targetDate",
      label: "Target Date",
      type: "date",
    },
  ],

  // Bulk actions
  bulkActions: [
    {
      id: "status",
      label: "Change Status",
    },
    {
      id: "assign",
      label: "Change Owner",
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
        "Are you sure you want to delete the selected projects?",
    },
  ],

  // Default views
  defaultViews: [
    {
      name: "All Projects",
      description: "All projects sorted by target date",
      columns: [
        "name",
        "status",
        "category",
        "progressPercent",
        "owner",
        "targetDate",
      ],
      sortBy: "targetDate",
      sortOrder: "asc",
      isSystem: true,
    },
    {
      name: "Active Projects",
      description: "Projects currently in progress or at risk",
      columns: ["name", "status", "progressPercent", "owner", "targetDate"],
      filters: [
        {
          id: "active-projects-filter",
          conditions: [
            {
              id: "1",
              propertyId: "status",
              operator: "is_any_of",
              value: ["IN_PROGRESS", "AT_RISK"],
            },
          ],
        },
      ],
      sortBy: "targetDate",
      sortOrder: "asc",
      isSystem: true,
    },
    {
      name: "My Projects",
      description: "Projects owned by me",
      columns: ["name", "status", "category", "progressPercent", "targetDate"],
      filters: [
        {
          id: "my-projects-filter",
          conditions: [
            {
              id: "1",
              propertyId: "ownerId",
              operator: "is_any_of",
              value: ["{{currentUserId}}"],
            },
          ],
        },
      ],
      sortBy: "targetDate",
      sortOrder: "asc",
      isSystem: true,
    },
    {
      name: "At Risk",
      description: "Projects flagged as at risk",
      columns: ["name", "progressPercent", "owner", "targetDate", "createdAt"],
      filters: [
        {
          id: "at-risk-filter",
          conditions: [
            {
              id: "1",
              propertyId: "status",
              operator: "is_any_of",
              value: ["AT_RISK"],
            },
          ],
        },
      ],
      sortBy: "targetDate",
      sortOrder: "asc",
      isSystem: true,
    },
  ],

  // Board view configuration
  boardConfig: {
    defaultGroupBy: "status",
    groupByOptions: [
      { propertyId: "status", label: "Status" },
      { propertyId: "category", label: "Category" },
    ],
    columns: PROJECT_STATUSES,
    cardConfig: {
      titleField: "name",
      subtitleField: "category",
      priorityField: undefined, // Projects don't have priority
      ownerField: "owner.name",
      dateField: "targetDate",
      displayFields: [
        { key: "progressPercent", type: "number" },
        { key: "category", type: "text", icon: FolderKanban },
      ],
    },
  },
};
