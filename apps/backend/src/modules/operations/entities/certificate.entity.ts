/**
 * Certificate Entity Description
 *
 * This file documents the Certificate Prisma model.
 * The actual model is defined in schema.prisma.
 *
 * Certificate represents an issued certification document.
 * Per CONTEXT.md:
 * - PDF certificates generated on completion
 * - Unique certificate numbers (CERT-YYYY-NNNNN format)
 * - Expiration tracking for major version updates
 * - Status lifecycle: ACTIVE -> EXPIRED or REVOKED
 *
 * @see schema.prisma for the actual model definition
 * @see certification.types.ts for CertificateStatus, CertificateData
 */

import {
  CertificateStatus,
  CertificateData,
} from "../types/certification.types";

/**
 * Certificate represents an issued certification document.
 */
export interface Certificate {
  /** Unique identifier */
  id: string;

  /** Human-readable certificate number (CERT-YYYY-NNNNN) */
  certificateNumber: string;

  /** Name of the certificate recipient */
  recipientName: string;

  /** Name of the certification track */
  trackName: string;

  /** Track version at time of completion */
  trackVersion: string;

  /** When the certificate was issued */
  issuedAt: Date;

  /** When the certificate expires (null = no expiration) */
  expiresAt: Date | null;

  /** Certificate status (ACTIVE, EXPIRED, REVOKED) */
  status: CertificateStatus;

  /** URL to the generated PDF */
  pdfUrl: string | null;

  /** Organization ID for client certifications */
  organizationId: string | null;

  /** Organization name for client certifications */
  organizationName: string | null;

  /** Record creation timestamp */
  createdAt: Date;
}

/**
 * DTO for issuing a certificate.
 */
export interface IssueCertificateDto {
  recipientName: string;
  trackId: string;
  trackName: string;
  trackVersion: string;
  /** Optional expiration date */
  expiresAt?: Date;
  /** For client certifications */
  organizationId?: string;
  organizationName?: string;
}

/**
 * DTO for updating certificate status.
 */
export interface UpdateCertificateStatusDto {
  certificateId: string;
  status: CertificateStatus;
  /** Reason for status change (required for REVOKED) */
  reason?: string;
}

/**
 * Certificate with PDF generation data.
 */
export interface CertificateWithPdfData extends Certificate {
  /** Data for PDF template rendering */
  pdfData: CertificateData;
}

/**
 * Query filters for certificate lookup.
 */
export interface CertificateQueryFilters {
  /** Filter by organization */
  organizationId?: string;
  /** Filter by status */
  status?: CertificateStatus;
  /** Filter by track name */
  trackName?: string;
  /** Include only active (non-expired) certificates */
  activeOnly?: boolean;
  /** Issued after this date */
  issuedAfter?: Date;
  /** Issued before this date */
  issuedBefore?: Date;
}

/**
 * Certificate number generation helper.
 * Format: CERT-YYYY-NNNNN (e.g., CERT-2026-00001)
 */
export function generateCertificateNumber(
  year: number,
  sequence: number,
): string {
  const paddedSequence = String(sequence).padStart(5, "0");
  return `CERT-${year}-${paddedSequence}`;
}

/**
 * Parse a certificate number to extract year and sequence.
 */
export function parseCertificateNumber(
  certificateNumber: string,
): { year: number; sequence: number } | null {
  const match = certificateNumber.match(/^CERT-(\d{4})-(\d{5})$/);
  if (!match) {
    return null;
  }
  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10),
  };
}
