/**
 * Disclosures Module View Configuration
 *
 * Defines columns, filters, bulk actions, and board configuration
 * for the Disclosures module's saved views system.
 *
 * Disclosures include COI, gifts & entertainment, outside activities,
 * and financial interests submitted through campaigns.
 */
import { AlertTriangle, Users, DollarSign, Briefcase } from "lucide-react";
import type { ModuleViewConfig } from "@/types/view-config";
import type { BoardColumnConfig } from "@/lib/views/types";

// Disclosure status options with colors
const DISCLOSURE_STATUSES: BoardColumnConfig[] = [
  { id: "pending_review", label: "Pending Review", color: "#F59E0B" },
  { id: "under_review", label: "Under Review", color: "#3B82F6" },
  { id: "approved", label: "Approved", color: "#10B981" },
  { id: "requires_action", label: "Requires Action", color: "#EF4444" },
  { id: "rejected", label: "Rejected", color: "#DC2626" },
  { id: "closed", label: "Closed", color: "#6B7280" },
];

const DISCLOSURE_TYPE_OPTIONS = [
  { value: "conflict_of_interest", label: "Conflict of Interest" },
  { value: "gift_received", label: "Gift Received" },
  { value: "gift_given", label: "Gift Given" },
  { value: "entertainment", label: "Entertainment" },
  { value: "outside_activity", label: "Outside Activity" },
  { value: "financial_interest", label: "Financial Interest" },
  { value: "family_relationship", label: "Family/Personal Relationship" },
  { value: "other", label: "Other" },
];

const RISK_LEVEL_OPTIONS = [
  { value: "low", label: "Low Risk" },
  { value: "medium", label: "Medium Risk" },
  { value: "high", label: "High Risk" },
];

/**
 * Complete Disclosures module view configuration
 */
export const DISCLOSURES_VIEW_CONFIG: ModuleViewConfig = {
  moduleType: "DISCLOSURES",
  entityName: {
    singular: "Disclosure",
    plural: "Disclosures",
  },
  primaryColumnId: "disclosureNumber",
  endpoints: {
    list: "/disclosures",
    export: "/disclosures/export",
    bulk: "/disclosures/bulk",
    single: (id: string) => `/disclosures/${id}`,
  },

  // Property groups for column picker organization
  propertyGroups: [
    { id: "core", label: "Core Fields" },
    { id: "submitter", label: "Submitter" },
    { id: "review", label: "Review" },
    { id: "dates", label: "Dates" },
    { id: "gift", label: "Gift/Entertainment" },
    { id: "relationship", label: "Relationship" },
    { id: "outside_activity", label: "Outside Activity" },
    { id: "campaign", label: "Campaign" },
    { id: "outcome", label: "Outcome" },
  ],

  // Column definitions
  columns: [
    // Core fields
    {
      id: "disclosureNumber",
      accessorKey: "disclosureNumber",
      header: "Disclosure #",
      type: "link",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 130,
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
      filterOptions: DISCLOSURE_TYPE_OPTIONS,
      width: 180,
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
      filterOptions: DISCLOSURE_STATUSES.map((s) => ({
        value: s.id,
        label: s.label,
      })),
      width: 140,
    },
    {
      id: "riskLevel",
      accessorKey: "riskLevel",
      header: "Risk Level",
      type: "severity",
      group: "core",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      filterOptions: RISK_LEVEL_OPTIONS,
      width: 120,
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
    {
      id: "submitterTitle",
      accessorKey: "submitter.title",
      header: "Job Title",
      type: "text",
      group: "submitter",
      sortable: true,
      filterable: false,
      defaultVisible: false,
      width: 150,
    },

    // Review fields
    {
      id: "reviewer",
      accessorKey: "reviewer.name",
      header: "Reviewer",
      type: "user",
      group: "review",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 150,
    },
    {
      id: "reviewNotes",
      accessorKey: "reviewNotes",
      header: "Review Notes",
      type: "text",
      group: "review",
      sortable: false,
      filterable: false,
      defaultVisible: false,
      width: 250,
    },

    // Date fields
    {
      id: "submittedAt",
      accessorKey: "submittedAt",
      header: "Submitted Date",
      type: "datetime",
      group: "dates",
      sortable: true,
      filterable: true,
      defaultVisible: true,
      width: 150,
    },
    {
      id: "reviewedAt",
      accessorKey: "reviewedAt",
      header: "Review Date",
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

    // Gift/Entertainment specific fields
    {
      id: "giftValue",
      accessorKey: "giftValue",
      header: "Gift Value",
      type: "currency",
      group: "gift",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 110,
    },
    {
      id: "giftDescription",
      accessorKey: "giftDescription",
      header: "Gift Description",
      type: "text",
      group: "gift",
      sortable: false,
      filterable: true,
      defaultVisible: false,
      width: 200,
    },
    {
      id: "giftGiver",
      accessorKey: "giftGiver",
      header: "Giver/Recipient",
      type: "text",
      group: "gift",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 150,
    },

    // Relationship fields
    {
      id: "thirdParty",
      accessorKey: "thirdParty",
      header: "Third Party",
      type: "text",
      group: "relationship",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 150,
    },
    {
      id: "relationship",
      accessorKey: "relationship",
      header: "Relationship",
      type: "text",
      group: "relationship",
      sortable: false,
      filterable: true,
      defaultVisible: false,
      width: 150,
    },
    {
      id: "conflictNature",
      accessorKey: "conflictNature",
      header: "Nature of Conflict",
      type: "text",
      group: "relationship",
      sortable: false,
      filterable: false,
      defaultVisible: false,
      width: 200,
    },

    // Outside activity specific fields
    {
      id: "activityName",
      accessorKey: "activityName",
      header: "Activity",
      type: "text",
      group: "outside_activity",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 200,
    },
    {
      id: "hoursPerWeek",
      accessorKey: "hoursPerWeek",
      header: "Hours/Week",
      type: "number",
      group: "outside_activity",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 100,
    },
    {
      id: "compensation",
      accessorKey: "compensation",
      header: "Compensation",
      type: "boolean",
      group: "outside_activity",
      sortable: false,
      filterable: true,
      defaultVisible: false,
      width: 110,
    },

    // Campaign info
    {
      id: "campaignName",
      accessorKey: "campaign.name",
      header: "Campaign",
      type: "text",
      group: "campaign",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 150,
    },
    {
      id: "campaignYear",
      accessorKey: "campaign.year",
      header: "Year",
      type: "number",
      group: "campaign",
      sortable: true,
      filterable: true,
      defaultVisible: false,
      width: 80,
    },

    // Outcome
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
  ],

  // Quick filter properties
  quickFilterProperties: [
    {
      propertyId: "type",
      label: "Type",
      type: "enum",
      options: DISCLOSURE_TYPE_OPTIONS,
    },
    {
      propertyId: "status",
      label: "Status",
      type: "status",
      options: DISCLOSURE_STATUSES.map((s) => ({
        value: s.id,
        label: s.label,
      })),
    },
    {
      propertyId: "riskLevel",
      label: "Risk Level",
      type: "severity",
      options: RISK_LEVEL_OPTIONS,
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
      label: "Assign Reviewer",
    },
    {
      id: "status",
      label: "Change Status",
    },
    {
      id: "risk",
      label: "Set Risk Level",
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
        "Are you sure you want to delete the selected disclosures?",
    },
  ],

  // Default views
  defaultViews: [
    {
      name: "All Disclosures",
      description: "All disclosures sorted by submission date",
      columns: [
        "disclosureNumber",
        "type",
        "status",
        "riskLevel",
        "submitter",
        "submittedAt",
      ],
      sortBy: "submittedAt",
      sortOrder: "desc",
      isSystem: true,
    },
    {
      name: "Pending Review",
      description: "Disclosures awaiting review",
      columns: [
        "disclosureNumber",
        "type",
        "riskLevel",
        "submitter",
        "submittedAt",
        "dueDate",
      ],
      filters: [
        {
          id: "pending-review-filter",
          conditions: [
            {
              id: "1",
              propertyId: "status",
              operator: "is_any_of",
              value: ["pending_review"],
            },
          ],
        },
      ],
      sortBy: "riskLevel",
      sortOrder: "desc",
      isSystem: true,
    },
    {
      name: "High Risk",
      description: "High risk disclosures requiring attention",
      columns: [
        "disclosureNumber",
        "type",
        "status",
        "submitter",
        "thirdParty",
        "submittedAt",
      ],
      filters: [
        {
          id: "high-risk-filter",
          conditions: [
            {
              id: "1",
              propertyId: "riskLevel",
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
    {
      name: "Gifts Over $100",
      description: "Gift disclosures exceeding $100 threshold",
      columns: [
        "disclosureNumber",
        "submitter",
        "giftValue",
        "giftDescription",
        "thirdParty",
        "status",
      ],
      filters: [
        {
          id: "gifts-over-100-filter",
          conditions: [
            {
              id: "1",
              propertyId: "type",
              operator: "is_any_of",
              value: ["gift_received", "gift_given"],
            },
            {
              id: "2",
              propertyId: "giftValue",
              operator: "is_greater_than",
              value: 100,
            },
          ],
        },
      ],
      sortBy: "giftValue",
      sortOrder: "desc",
      isSystem: true,
    },
    {
      name: "Conflicts of Interest",
      description: "All COI disclosures",
      columns: [
        "disclosureNumber",
        "status",
        "riskLevel",
        "submitter",
        "thirdParty",
        "relationship",
        "submittedAt",
      ],
      filters: [
        {
          id: "coi-filter",
          conditions: [
            {
              id: "1",
              propertyId: "type",
              operator: "is_any_of",
              value: ["conflict_of_interest"],
            },
          ],
        },
      ],
      sortBy: "submittedAt",
      sortOrder: "desc",
      isSystem: true,
    },
    {
      name: "Outside Activities",
      description: "All outside activity disclosures",
      columns: [
        "disclosureNumber",
        "status",
        "submitter",
        "activityName",
        "hoursPerWeek",
        "compensation",
        "submittedAt",
      ],
      filters: [
        {
          id: "outside-activities-filter",
          conditions: [
            {
              id: "1",
              propertyId: "type",
              operator: "is_any_of",
              value: ["outside_activity"],
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
      { propertyId: "type", label: "Type" },
      { propertyId: "riskLevel", label: "Risk Level" },
    ],
    columns: DISCLOSURE_STATUSES,
    cardConfig: {
      titleField: "disclosureNumber",
      subtitleField: "type",
      ownerField: "submitter.name",
      dateField: "submittedAt",
      displayFields: [
        { key: "riskLevel", type: "text", icon: AlertTriangle },
        { key: "thirdParty", type: "text", icon: Users },
      ],
    },
  },
};
