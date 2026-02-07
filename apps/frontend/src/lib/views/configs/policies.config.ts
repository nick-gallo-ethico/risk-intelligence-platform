/**
 * Policies Module View Configuration
 *
 * Defines columns, filters, bulk actions, and board configuration
 * for the Policies module's saved views system.
 */
import { FileText, Shield } from "lucide-react";
import type { ModuleViewConfig } from "@/types/view-config";
import type { BoardColumnConfig } from "@/lib/views/types";

// Policy status options with colors
const POLICY_STATUSES: BoardColumnConfig[] = [
  { id: "draft", label: "Draft", color: "#6B7280" },
  { id: "pending_review", label: "Pending Review", color: "#F59E0B" },
  { id: "pending_approval", label: "Pending Approval", color: "#8B5CF6" },
  { id: "approved", label: "Approved", color: "#3B82F6" },
  { id: "published", label: "Published", color: "#10B981" },
  { id: "archived", label: "Archived", color: "#9CA3AF" },
];

const POLICY_CATEGORY_OPTIONS = [
  { value: "code_of_conduct", label: "Code of Conduct" },
  { value: "anti_harassment", label: "Anti-Harassment" },
  { value: "data_privacy", label: "Data Privacy" },
  { value: "conflict_of_interest", label: "Conflict of Interest" },
  { value: "gifts_entertainment", label: "Gifts & Entertainment" },
  { value: "whistleblower", label: "Whistleblower" },
  { value: "information_security", label: "Information Security" },
  { value: "hr", label: "HR Policy" },
  { value: "financial", label: "Financial Controls" },
  { value: "health_safety", label: "Health & Safety" },
];

/**
 * Complete Policies module view configuration
 */
export const POLICIES_VIEW_CONFIG: ModuleViewConfig = {
  moduleType: "POLICIES",
  entityName: {
    singular: "Policy",
    plural: "Policies",
  },
  primaryColumnId: "policyNumber",
  endpoints: {
    list: "/policies",
    export: "/policies/export",
    bulk: "/policies/bulk",
    single: (id: string) => `/policies/${id}`,
  },

  // Property groups for column picker organization
  propertyGroups: [
    { id: "core", label: "Core Fields" },
    { id: "ownership", label: "Ownership" },
    { id: "dates", label: "Dates" },
    { id: "attestation", label: "Attestation" },
    { id: "content", label: "Content" },
  ],

  // Column definitions
  columns: [
    // Core fields
    {
      id: "policyNumber",
      accessorKey: "policyNumber",
      header: "Policy #",
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
      filterOptions: POLICY_STATUSES.map((s) => ({
        value: s.id,
        label: s.label,
      })),
      width: 140,
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
      filterOptions: POLICY_CATEGORY_OPTIONS,
      width: 160,
    },
    {
      id: "version",
      accessorKey: "version",
      header: "Version",
      type: "text",
      group: "core",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 80,
    },

    // Ownership fields
    {
      id: "owner",
      accessorKey: "owner.name",
      header: "Owner",
      type: "user",
      group: "ownership",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 150,
    },
    {
      id: "department",
      accessorKey: "department.name",
      header: "Department",
      type: "enum",
      group: "ownership",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 150,
    },
    {
      id: "createdBy",
      accessorKey: "createdBy.name",
      header: "Created By",
      type: "user",
      group: "ownership",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 150,
    },

    // Date fields
    {
      id: "effectiveDate",
      accessorKey: "effectiveDate",
      header: "Effective Date",
      type: "date",
      group: "dates",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 120,
    },
    {
      id: "lastReviewDate",
      accessorKey: "lastReviewDate",
      header: "Last Review",
      type: "date",
      group: "dates",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 120,
    },
    {
      id: "nextReviewDate",
      accessorKey: "nextReviewDate",
      header: "Next Review",
      type: "date",
      group: "dates",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 120,
    },
    {
      id: "publishedAt",
      accessorKey: "publishedAt",
      header: "Published Date",
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

    // Attestation fields
    {
      id: "attestationRate",
      accessorKey: "attestationRate",
      header: "Attestation %",
      type: "number",
      group: "attestation",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 110,
    },
    {
      id: "totalAttestations",
      accessorKey: "totalAttestations",
      header: "Total Attestations",
      type: "number",
      group: "attestation",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 130,
    },
    {
      id: "pendingAttestations",
      accessorKey: "pendingAttestations",
      header: "Pending",
      type: "number",
      group: "attestation",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 100,
    },

    // Content fields
    {
      id: "translationsCount",
      accessorKey: "translationsCount",
      header: "Translations",
      type: "number",
      group: "content",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 100,
    },
    {
      id: "wordCount",
      accessorKey: "wordCount",
      header: "Word Count",
      type: "number",
      group: "content",
      sortable: true,
      filterable: false,
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
      options: POLICY_STATUSES.map((s) => ({ value: s.id, label: s.label })),
    },
    {
      propertyId: "category",
      label: "Category",
      type: "enum",
      options: POLICY_CATEGORY_OPTIONS,
    },
    {
      propertyId: "owner",
      label: "Owner",
      type: "user",
    },
    {
      propertyId: "effectiveDate",
      label: "Effective Date",
      type: "date",
    },
  ],

  // Bulk actions
  bulkActions: [
    {
      id: "assign",
      label: "Assign Owner",
    },
    {
      id: "status",
      label: "Change Status",
    },
    {
      id: "publish",
      label: "Publish",
    },
    {
      id: "archive",
      label: "Archive",
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
        "Are you sure you want to delete the selected policies?",
    },
  ],

  // Default views
  defaultViews: [
    {
      name: "All Policies",
      description: "All policies sorted by title",
      columns: [
        "policyNumber",
        "title",
        "status",
        "category",
        "owner",
        "effectiveDate",
        "version",
      ],
      sortBy: "title",
      sortOrder: "asc",
      isSystem: true,
    },
    {
      name: "Published Policies",
      description: "All currently published policies",
      columns: [
        "policyNumber",
        "title",
        "category",
        "owner",
        "publishedAt",
        "attestationRate",
      ],
      filters: [
        {
          id: "published-filter",
          conditions: [
            {
              id: "1",
              propertyId: "status",
              operator: "is",
              value: "published",
            },
          ],
        },
      ],
      sortBy: "publishedAt",
      sortOrder: "desc",
      isSystem: true,
    },
    {
      name: "Review Needed",
      description: "Policies due for review in the next 30 days",
      columns: [
        "policyNumber",
        "title",
        "category",
        "owner",
        "nextReviewDate",
        "lastReviewDate",
      ],
      filters: [
        {
          id: "review-needed-filter",
          conditions: [
            {
              id: "1",
              propertyId: "nextReviewDate",
              operator: "is_less_than_n_ago",
              value: 30,
              unit: "day",
            },
          ],
        },
      ],
      sortBy: "nextReviewDate",
      sortOrder: "asc",
      isSystem: true,
    },
    {
      name: "Drafts",
      description: "Policies in draft status",
      columns: [
        "policyNumber",
        "title",
        "category",
        "owner",
        "createdAt",
        "updatedAt",
      ],
      filters: [
        {
          id: "drafts-filter",
          conditions: [
            {
              id: "1",
              propertyId: "status",
              operator: "is",
              value: "draft",
            },
          ],
        },
      ],
      sortBy: "updatedAt",
      sortOrder: "desc",
      isSystem: true,
    },
    {
      name: "Pending Approval",
      description: "Policies awaiting approval",
      columns: ["policyNumber", "title", "category", "owner", "createdAt"],
      filters: [
        {
          id: "pending-approval-filter",
          conditions: [
            {
              id: "1",
              propertyId: "status",
              operator: "is_any_of",
              value: ["pending_review", "pending_approval"],
            },
          ],
        },
      ],
      sortBy: "createdAt",
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
    columns: POLICY_STATUSES,
    cardConfig: {
      titleField: "title",
      subtitleField: "policyNumber",
      ownerField: "owner.name",
      dateField: "effectiveDate",
      displayFields: [
        { key: "category", type: "text", icon: FileText },
        { key: "version", type: "text", icon: Shield },
      ],
    },
  },
};
