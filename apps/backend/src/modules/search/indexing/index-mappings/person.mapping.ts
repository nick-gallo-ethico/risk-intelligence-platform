/**
 * Elasticsearch mapping for Person documents.
 *
 * Persons are individuals involved in cases (reporters, subjects, witnesses)
 * or employees in the organization. Used for cross-case pattern detection.
 */
export const PERSON_INDEX_MAPPING = {
  mappings: {
    properties: {
      // Identifiers
      id: { type: 'keyword' },
      organizationId: { type: 'keyword' },
      employeeId: { type: 'keyword' },

      // Type and Source
      type: { type: 'keyword' }, // EMPLOYEE, EXTERNAL_CONTACT, ANONYMOUS_PLACEHOLDER
      source: { type: 'keyword' }, // HRIS_SYNC, MANUAL, INTAKE_CREATED

      // Name fields (searchable)
      firstName: {
        type: 'text',
        fields: { keyword: { type: 'keyword' } },
      },
      lastName: {
        type: 'text',
        fields: { keyword: { type: 'keyword' } },
      },
      displayName: { type: 'text' },

      // Contact information
      email: { type: 'keyword' },
      phone: { type: 'keyword' },

      // Employment details
      jobTitle: { type: 'text' },
      department: { type: 'text' },
      businessUnitId: { type: 'keyword' },
      businessUnitName: { type: 'text' },
      locationId: { type: 'keyword' },
      locationName: { type: 'text' },
      employmentStatus: { type: 'keyword' }, // ACTIVE, TERMINATED, LEAVE, etc.

      // Manager
      managerId: { type: 'keyword' },
      managerName: { type: 'text' },

      // Case involvement counts (for pattern detection)
      caseCount: { type: 'integer' },
      subjectCount: { type: 'integer' },
      witnessCount: { type: 'integer' },
      reporterCount: { type: 'integer' },

      // Metadata
      createdById: { type: 'keyword' },
      isActive: { type: 'boolean' },

      // Timestamps
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },

      // ===========================================
      // CUSTOM FIELDS (Dynamic Object)
      // ===========================================
      customFields: {
        type: 'object',
        dynamic: true,
        properties: {},
      },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        // Standard analyzer for person names
        standard: {
          type: 'standard',
        },
      },
    },
  },
};

/**
 * TypeScript type for Person documents indexed in Elasticsearch.
 */
export interface PersonDocument {
  id: string;
  organizationId: string;
  employeeId?: string;

  type: string;
  source: string;

  firstName?: string;
  lastName?: string;
  displayName?: string;

  email?: string;
  phone?: string;

  jobTitle?: string;
  department?: string;
  businessUnitId?: string;
  businessUnitName?: string;
  locationId?: string;
  locationName?: string;
  employmentStatus?: string;

  managerId?: string;
  managerName?: string;

  caseCount?: number;
  subjectCount?: number;
  witnessCount?: number;
  reporterCount?: number;

  createdById?: string;
  isActive?: boolean;

  createdAt: string;
  updatedAt: string;

  customFields?: Record<string, unknown>;
}
