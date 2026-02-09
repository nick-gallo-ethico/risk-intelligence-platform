/**
 * Intake Forms Module View Configuration
 *
 * Defines columns, filters, bulk actions, and board configuration
 * for the Intake Forms module's saved views system.
 *
 * Intake Forms track submissions from various channels: web forms,
 * employee portal, ethics portal, and mobile app.
 */
import { FileText, Send, User, AlertCircle } from "lucide-react";
import type { ModuleViewConfig } from "@/types/view-config";
import type { BoardColumnConfig } from "@/lib/views/types";

// Intake form status options with colors
const INTAKE_FORM_STATUSES: BoardColumnConfig[] = [
  { id: "draft", label: "Draft", color: "#6B7280" },
  { id: "submitted", label: "Submitted", color: "#3B82F6" },
  { id: "in_review", label: "In Review", color: "#F59E0B" },
  { id: "processed", label: "Processed", color: "#10B981" },
  { id: "cancelled", label: "Cancelled", color: "#9CA3AF" },
];

const INTAKE_FORM_TYPE_OPTIONS = [
  { value: "ethics_report", label: "Ethics Report" },
  { value: "incident_report", label: "Incident Report" },
  { value: "grievance", label: "Grievance" },
  { value: "feedback", label: "Feedback" },
  { value: "suggestion", label: "Suggestion" },
  { value: "question", label: "Question" },
  { value: "compliance_concern", label: "Compliance Concern" },
  { value: "other", label: "Other" },
];

const SOURCE_CHANNEL_OPTIONS = [
  { value: "web_form", label: "Web Form" },
  { value: "employee_portal", label: "Employee Portal" },
  { value: "ethics_portal", label: "Ethics Portal" },
  { value: "mobile_app", label: "Mobile App" },
];

const AI_PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

/**
 * Complete Intake Forms module view configuration
 */
export const INTAKE_FORMS_VIEW_CONFIG: ModuleViewConfig = {
  moduleType: "INTAKE_FORMS",
  entityName: {
    singular: "Submission",
    plural: "Submissions",
  },
  primaryColumnId: "submissionId",
  endpoints: {
    list: "/intake-forms/submissions",
    export: "/intake-forms/submissions/export",
    bulk: "/intake-forms/submissions/bulk",
    single: (id: string) => `/intake-forms/submissions/${id}`,
  },

  // Property groups for column picker organization
  propertyGroups: [
    { id: "core", label: "Core Fields" },
    { id: "submitter", label: "Submitter" },
    { id: "dates", label: "Dates" },
    { id: "assignment", label: "Assignment" },
    { id: "outcome", label: "Outcome" },
    { id: "ai", label: "AI Triage" },
  ],

  // Column definitions
  columns: [
    // Core fields
    {
      id: "submissionId",
      accessorKey: "submissionId",
      header: "Submission #",
      type: "link",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 130,
    },
    {
      id: "formName",
      accessorKey: "form.name",
      header: "Form",
      type: "enum",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 180,
    },
    {
      id: "formType",
      accessorKey: "form.type",
      header: "Form Type",
      type: "enum",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      filterOptions: INTAKE_FORM_TYPE_OPTIONS,
      width: 150,
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
      filterOptions: INTAKE_FORM_STATUSES.map((s) => ({
        value: s.id,
        label: s.label,
      })),
      width: 120,
    },
    {
      id: "sourceChannel",
      accessorKey: "sourceChannel",
      header: "Source",
      type: "enum",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      filterOptions: SOURCE_CHANNEL_OPTIONS,
      width: 130,
    },

    // Submitter fields
    {
      id: "submitter",
      accessorKey: "submitter.name",
      header: "Submitter",
      type: "user",
      group: "submitter",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 150,
    },
    {
      id: "isAnonymous",
      accessorKey: "isAnonymous",
      header: "Anonymous",
      type: "boolean",
      group: "submitter",
      sortable: false,
      filterable: true,
      defaultVisible: false,
      width: 100,
    },
    {
      id: "submitterEmail",
      accessorKey: "submitter.email",
      header: "Email",
      type: "text",
      group: "submitter",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 200,
    },
    {
      id: "submitterDepartment",
      accessorKey: "submitter.department.name",
      header: "Department",
      type: "enum",
      group: "submitter",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 150,
    },

    // Date fields
    {
      id: "submittedAt",
      accessorKey: "submittedAt",
      header: "Submitted",
      type: "datetime",
      group: "dates",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 150,
    },
    {
      id: "processedAt",
      accessorKey: "processedAt",
      header: "Processed",
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

    // Assignment fields
    {
      id: "assignee",
      accessorKey: "assignee.name",
      header: "Assigned To",
      type: "user",
      group: "assignment",
      sortable: true,
      filterable: true,
      defaultVisible: false,
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

    // Outcome fields
    {
      id: "createdRiu",
      accessorKey: "createdRiu",
      header: "Created RIU",
      type: "boolean",
      group: "outcome",
      sortable: false,
      filterable: true,
      defaultVisible: false,
      width: 100,
    },
    {
      id: "createdCase",
      accessorKey: "createdCase",
      header: "Created Case",
      type: "boolean",
      group: "outcome",
      sortable: false,
      filterable: true,
      defaultVisible: false,
      width: 110,
    },
    {
      id: "linkedCaseNumber",
      accessorKey: "linkedCase.caseNumber",
      header: "Case #",
      type: "link",
      group: "outcome",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 120,
    },
    {
      id: "linkedRiuNumber",
      accessorKey: "linkedRiu.riuNumber",
      header: "RIU #",
      type: "link",
      group: "outcome",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 120,
    },

    // AI Triage fields
    {
      id: "aiCategory",
      accessorKey: "aiCategory",
      header: "AI Category",
      type: "text",
      group: "ai",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 130,
    },
    {
      id: "aiPriority",
      accessorKey: "aiPriority",
      header: "AI Priority",
      type: "severity",
      group: "ai",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      filterOptions: AI_PRIORITY_OPTIONS,
      width: 110,
    },
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
      id: "aiConfidence",
      accessorKey: "aiConfidence",
      header: "AI Confidence",
      type: "number",
      group: "ai",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 110,
    },
  ],

  // Quick filter properties
  quickFilterProperties: [
    {
      propertyId: "formType",
      label: "Form Type",
      type: "enum",
      options: INTAKE_FORM_TYPE_OPTIONS,
    },
    {
      propertyId: "status",
      label: "Status",
      type: "status",
      options: INTAKE_FORM_STATUSES.map((s) => ({
        value: s.id,
        label: s.label,
      })),
    },
    {
      propertyId: "submitter",
      label: "Submitter",
      type: "user",
    },
    {
      propertyId: "submittedAt",
      label: "Submitted Date",
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
      id: "create-cases",
      label: "Create Cases",
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
        "Are you sure you want to delete the selected submissions?",
    },
  ],

  // Default views
  defaultViews: [
    {
      name: "All Submissions",
      description: "All intake form submissions sorted by date",
      columns: [
        "submissionId",
        "formName",
        "formType",
        "status",
        "submitter",
        "submittedAt",
      ],
      sortBy: "submittedAt",
      sortOrder: "desc",
      isSystem: true,
    },
    {
      name: "Pending Review",
      description: "Submissions awaiting review or processing",
      columns: [
        "submissionId",
        "formName",
        "formType",
        "submitter",
        "submittedAt",
        "assignee",
      ],
      filters: [
        {
          id: "pending-review-filter",
          conditions: [
            {
              id: "1",
              propertyId: "status",
              operator: "is_any_of",
              value: ["submitted", "in_review"],
            },
          ],
        },
      ],
      sortBy: "submittedAt",
      sortOrder: "asc",
      isSystem: true,
    },
    {
      name: "Anonymous Reports",
      description: "All anonymous submissions",
      columns: [
        "submissionId",
        "formType",
        "status",
        "submittedAt",
        "aiCategory",
        "aiPriority",
      ],
      filters: [
        {
          id: "anonymous-filter",
          conditions: [
            {
              id: "1",
              propertyId: "isAnonymous",
              operator: "is_true",
            },
          ],
        },
      ],
      sortBy: "submittedAt",
      sortOrder: "desc",
      isSystem: true,
    },
    {
      name: "Ethics Reports",
      description: "All ethics report submissions",
      columns: [
        "submissionId",
        "status",
        "submitter",
        "submittedAt",
        "aiPriority",
        "createdCase",
      ],
      filters: [
        {
          id: "ethics-filter",
          conditions: [
            {
              id: "1",
              propertyId: "formType",
              operator: "is_any_of",
              value: ["ethics_report"],
            },
          ],
        },
      ],
      sortBy: "submittedAt",
      sortOrder: "desc",
      isSystem: true,
    },
    {
      name: "Compliance Concerns",
      description: "Compliance-related submissions",
      columns: [
        "submissionId",
        "status",
        "submitter",
        "submittedAt",
        "aiCategory",
        "createdCase",
      ],
      filters: [
        {
          id: "compliance-filter",
          conditions: [
            {
              id: "1",
              propertyId: "formType",
              operator: "is_any_of",
              value: ["compliance_concern"],
            },
          ],
        },
      ],
      sortBy: "submittedAt",
      sortOrder: "desc",
      isSystem: true,
    },
    {
      name: "High Priority (AI)",
      description: "Submissions flagged as high priority by AI triage",
      columns: [
        "submissionId",
        "formType",
        "status",
        "submitter",
        "aiCategory",
        "aiPriority",
        "submittedAt",
      ],
      filters: [
        {
          id: "ai-high-priority-filter",
          conditions: [
            {
              id: "1",
              propertyId: "aiPriority",
              operator: "is_any_of",
              value: ["high"],
            },
          ],
        },
      ],
      sortBy: "submittedAt",
      sortOrder: "desc",
      isSystem: true,
    },
  ],

  // Board view configuration
  boardConfig: {
    defaultGroupBy: "status",
    groupByOptions: [
      { propertyId: "status", label: "Status" },
      { propertyId: "formType", label: "Form Type" },
      { propertyId: "sourceChannel", label: "Source" },
    ],
    columns: INTAKE_FORM_STATUSES,
    cardConfig: {
      titleField: "submissionId",
      subtitleField: "formName",
      ownerField: "submitter.name",
      dateField: "submittedAt",
      displayFields: [
        { key: "formType", type: "text", icon: FileText },
        { key: "sourceChannel", type: "text", icon: Send },
      ],
    },
  },
};
