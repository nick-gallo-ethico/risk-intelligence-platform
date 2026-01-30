import { z } from 'zod';

/**
 * Zod schema for case creation form validation.
 * Matches backend CreateCaseDto requirements.
 */

// Enum values matching backend Prisma schema
export const sourceChannelOptions = [
  { value: 'HOTLINE', label: 'Hotline' },
  { value: 'WEB_FORM', label: 'Web Form' },
  { value: 'PROXY', label: 'Proxy Submission' },
  { value: 'DIRECT_ENTRY', label: 'Direct Entry' },
  { value: 'CHATBOT', label: 'Chatbot' },
] as const;

export const caseTypeOptions = [
  { value: 'REPORT', label: 'Report' },
  { value: 'INQUIRY', label: 'Inquiry' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
] as const;

export const severityOptions = [
  { value: 'LOW', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-800' },
] as const;

export const reporterTypeOptions = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'ANONYMOUS', label: 'Anonymous' },
  { value: 'OTHER', label: 'Other' },
] as const;

// Common country list (top countries + alphabetical)
export const countryOptions = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'JP', label: 'Japan' },
  { value: 'CN', label: 'China' },
  { value: 'IN', label: 'India' },
  { value: 'BR', label: 'Brazil' },
  { value: 'MX', label: 'Mexico' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'SE', label: 'Sweden' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'SG', label: 'Singapore' },
  { value: 'KR', label: 'South Korea' },
  { value: 'OTHER', label: 'Other' },
] as const;

// Source channel values
const sourceChannelValues = ['HOTLINE', 'WEB_FORM', 'PROXY', 'DIRECT_ENTRY', 'CHATBOT'] as const;
const caseTypeValues = ['REPORT', 'INQUIRY', 'FOLLOW_UP'] as const;
const severityValues = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const reporterTypeValues = ['EMPLOYEE', 'VENDOR', 'CUSTOMER', 'ANONYMOUS', 'OTHER'] as const;

export const caseCreationSchema = z.object({
  // Section 1: Basic Information
  sourceChannel: z.enum(sourceChannelValues, {
    message: 'Source channel is required',
  }),
  caseType: z.enum(caseTypeValues).optional(),
  severity: z.enum(severityValues).optional(),

  // Section 2: Details
  summary: z
    .string()
    .max(500, 'Summary must be 500 characters or less')
    .optional()
    .or(z.literal('')),
  details: z
    .string()
    .min(10, 'Details must be at least 10 characters')
    .max(50000, 'Details must be 50,000 characters or less'),

  // Section 3: Reporter Information (all optional)
  reporterType: z.enum(reporterTypeValues).optional(),
  reporterAnonymous: z.boolean().optional(),
  reporterName: z
    .string()
    .max(255, 'Name must be 255 characters or less')
    .optional()
    .or(z.literal('')),
  reporterEmail: z
    .string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be 255 characters or less')
    .optional()
    .or(z.literal('')),
  reporterPhone: z
    .string()
    .max(50, 'Phone must be 50 characters or less')
    .optional()
    .or(z.literal('')),

  // Section 4: Location (all optional)
  locationCountry: z.string().optional().or(z.literal('')),
  locationState: z
    .string()
    .max(100, 'Region must be 100 characters or less')
    .optional()
    .or(z.literal('')),
  locationCity: z
    .string()
    .max(100, 'Location must be 100 characters or less')
    .optional()
    .or(z.literal('')),
});

export type CaseCreationFormData = z.infer<typeof caseCreationSchema>;

// Export value types for type safety
export type SourceChannel = (typeof sourceChannelValues)[number];
export type CaseType = (typeof caseTypeValues)[number];
export type Severity = (typeof severityValues)[number];
export type ReporterType = (typeof reporterTypeValues)[number];

/**
 * Default values for the case creation form
 */
export const defaultCaseFormValues: Partial<CaseCreationFormData> = {
  sourceChannel: 'DIRECT_ENTRY',
  caseType: 'REPORT',
  severity: 'MEDIUM',
  details: '',
  summary: '',
  reporterAnonymous: false,
  reporterName: '',
  reporterEmail: '',
  reporterPhone: '',
  locationCountry: '',
  locationState: '',
  locationCity: '',
};
