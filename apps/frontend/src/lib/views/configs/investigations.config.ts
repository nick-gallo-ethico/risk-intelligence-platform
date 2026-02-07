/**
 * Investigations Module View Configuration
 *
 * Defines columns, filters, bulk actions, and board configuration
 * for the Investigations module's saved views system.
 */
import { FileText, AlertCircle } from "lucide-react";
import type { ModuleViewConfig } from "@/types/view-config";
import type { BoardColumnConfig } from "@/lib/views/types";

// Investigation stage options with colors
const INVESTIGATION_STAGES: BoardColumnConfig[] = [
  { id: "planning", label: "Planning", color: "#6366F1" },
  { id: "evidence_gathering", label: "Evidence Gathering", color: "#3B82F6" },
  { id: "interviews", label: "Interviews", color: "#8B5CF6" },
  { id: "analysis", label: "Analysis", color: "#F59E0B" },
  { id: "findings", label: "Findings", color: "#EC4899" },
  { id: "remediation", label: "Remediation", color: "#10B981" },
  { id: "closed", label: "Closed", color: "#6B7280" },
];

const INVESTIGATION_TYPE_OPTIONS = [
  { value: "internal", label: "Internal Investigation" },
  { value: "external", label: "External Investigation" },
  { value: "regulatory", label: "Regulatory Investigation" },
  { value: "audit", label: "Audit Follow-up" },
];

const INVESTIGATION_OUTCOME_OPTIONS = [
  { value: "substantiated", label: "Substantiated" },
  { value: "unsubstantiated", label: "Unsubstantiated" },
  { value: "inconclusive", label: "Inconclusive" },
  { value: "pending", label: "Pending" },
];

/**
 * Complete Investigations module view configuration
 */
export const INVESTIGATIONS_VIEW_CONFIG: ModuleViewConfig = {
  moduleType: "INVESTIGATIONS",
  entityName: {
    singular: "Investigation",
    plural: "Investigations",
  },
  primaryColumnId: "investigationNumber",
  endpoints: {
    list: "/investigations",
    export: "/investigations/export",
    bulk: "/investigations/bulk",
    single: (id: string) => `/investigations/${id}`,
  },

  // Property groups for column picker organization
  propertyGroups: [
    { id: "core", label: "Core Fields" },
    { id: "assignment", label: "Assignment" },
    { id: "associations", label: "Associations" },
    { id: "dates", label: "Dates" },
    { id: "progress", label: "Progress" },
  ],

  // Column definitions
  columns: [
    // Core fields
    {
      id: "investigationNumber",
      accessorKey: "investigationNumber",
      header: "Investigation #",
      type: "link",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 140,
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
      id: "stage",
      accessorKey: "stage",
      header: "Stage",
      type: "status",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      filterOptions: INVESTIGATION_STAGES.map((s) => ({
        value: s.id,
        label: s.label,
      })),
      width: 150,
    },
    {
      id: "type",
      accessorKey: "type",
      header: "Type",
      type: "enum",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      filterOptions: INVESTIGATION_TYPE_OPTIONS,
      width: 150,
    },
    {
      id: "outcome",
      accessorKey: "outcome",
      header: "Outcome",
      type: "enum",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      filterOptions: INVESTIGATION_OUTCOME_OPTIONS,
      width: 130,
    },

    // Assignment fields
    {
      id: "leadInvestigator",
      accessorKey: "leadInvestigator.name",
      header: "Lead Investigator",
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

    // Associations
    {
      id: "caseNumber",
      accessorKey: "case.caseNumber",
      header: "Related Case",
      type: "link",
      group: "associations",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 120,
    },
    {
      id: "subjectCount",
      accessorKey: "subjectCount",
      header: "Subjects",
      type: "number",
      group: "associations",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 100,
    },

    // Date fields
    {
      id: "startedAt",
      accessorKey: "startedAt",
      header: "Start Date",
      type: "date",
      group: "dates",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 120,
    },
    {
      id: "targetEndDate",
      accessorKey: "targetEndDate",
      header: "Target End Date",
      type: "date",
      group: "dates",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 130,
    },
    {
      id: "completedAt",
      accessorKey: "completedAt",
      header: "Completed Date",
      type: "datetime",
      group: "dates",
      sortable: true,
      filterable: true,
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

    // Progress fields
    {
      id: "interviewCount",
      accessorKey: "interviewCount",
      header: "Interviews",
      type: "number",
      group: "progress",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 100,
    },
    {
      id: "checklistProgress",
      accessorKey: "checklistProgress",
      header: "Checklist %",
      type: "number",
      group: "progress",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 100,
    },
    {
      id: "documentCount",
      accessorKey: "documentCount",
      header: "Documents",
      type: "number",
      group: "progress",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 100,
    },
  ],

  // Quick filter properties
  quickFilterProperties: [
    {
      propertyId: "stage",
      label: "Stage",
      type: "status",
      options: INVESTIGATION_STAGES.map((s) => ({
        value: s.id,
        label: s.label,
      })),
    },
    {
      propertyId: "type",
      label: "Type",
      type: "enum",
      options: INVESTIGATION_TYPE_OPTIONS,
    },
    {
      propertyId: "leadInvestigator",
      label: "Lead Investigator",
      type: "user",
    },
    {
      propertyId: "startedAt",
      label: "Start Date",
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
      id: "stage",
      label: "Change Stage",
    },
    {
      id: "merge",
      label: "Merge",
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
        "Are you sure you want to delete the selected investigations?",
    },
  ],

  // Default views
  defaultViews: [
    {
      name: "All Investigations",
      description: "All investigations sorted by start date",
      columns: [
        "investigationNumber",
        "title",
        "stage",
        "type",
        "outcome",
        "leadInvestigator",
        "startedAt",
      ],
      sortBy: "startedAt",
      sortOrder: "desc",
      isSystem: true,
    },
    {
      name: "My Investigations",
      description: "Investigations assigned to me",
      columns: [
        "investigationNumber",
        "title",
        "stage",
        "targetEndDate",
        "checklistProgress",
      ],
      filters: [
        {
          id: "my-investigations-filter",
          conditions: [
            {
              id: "1",
              propertyId: "leadInvestigator",
              operator: "is",
              value: "{{currentUserId}}",
            },
          ],
        },
      ],
      sortBy: "targetEndDate",
      sortOrder: "asc",
      isSystem: true,
    },
    {
      name: "Active Investigations",
      description: "All non-closed investigations",
      columns: [
        "investigationNumber",
        "title",
        "stage",
        "leadInvestigator",
        "targetEndDate",
      ],
      filters: [
        {
          id: "active-filter",
          conditions: [
            {
              id: "1",
              propertyId: "stage",
              operator: "is_none_of",
              value: ["closed"],
            },
          ],
        },
      ],
      sortBy: "stage",
      sortOrder: "asc",
      isSystem: true,
    },
    {
      name: "Overdue",
      description: "Investigations past their target end date",
      columns: [
        "investigationNumber",
        "title",
        "stage",
        "leadInvestigator",
        "targetEndDate",
        "startedAt",
      ],
      filters: [
        {
          id: "overdue-filter",
          conditions: [
            {
              id: "1",
              propertyId: "targetEndDate",
              operator: "is_before",
              value: "{{today}}",
            },
            {
              id: "2",
              propertyId: "stage",
              operator: "is_none_of",
              value: ["closed"],
            },
          ],
        },
      ],
      sortBy: "targetEndDate",
      sortOrder: "asc",
      isSystem: true,
    },
  ],

  // Board view configuration
  boardConfig: {
    defaultGroupBy: "stage",
    groupByOptions: [
      { propertyId: "stage", label: "Stage" },
      { propertyId: "type", label: "Type" },
      { propertyId: "outcome", label: "Outcome" },
    ],
    columns: INVESTIGATION_STAGES,
    cardConfig: {
      titleField: "title",
      subtitleField: "investigationNumber",
      ownerField: "leadInvestigator.name",
      dateField: "startedAt",
      displayFields: [
        { key: "type", type: "text", icon: FileText },
        { key: "caseNumber", type: "text", icon: AlertCircle },
      ],
    },
  },
};
