/**
 * UserCertification Entity Description
 *
 * This file documents the UserCertification Prisma model.
 * The actual model is defined in schema.prisma.
 *
 * UserCertification tracks a user's progress and completion status
 * for a certification track. Supports both:
 * - Tenant users (client staff being certified)
 * - Internal users (Ethico staff being certified)
 *
 * Per CONTEXT.md:
 * - Version tracking for expiration management
 * - Certificate issuance on completion
 * - Expiration on major version updates
 *
 * @see schema.prisma for the actual model definition
 * @see certification.types.ts for TrackProgress interface
 */

/**
 * UserCertification tracks a user's progress in a certification track.
 */
export interface UserCertification {
  /** Unique identifier */
  id: string;

  /** FK to CertificationTrack */
  trackId: string;

  /** FK to tenant User (for client staff) */
  userId: string | null;

  /** FK to InternalUser (for Ethico staff) */
  internalUserId: string | null;

  /** When the user started the track */
  startedAt: Date;

  /** When the track was completed (null if in progress) */
  completedAt: Date | null;

  /** Track version when completed */
  completedVersion: string | null;

  /** FK to issued Certificate */
  certificateId: string | null;

  /** Certificate expiration date */
  expiresAt: Date | null;

  /** Record creation timestamp */
  createdAt: Date;

  /** Record last update timestamp */
  updatedAt: Date;
}

/**
 * DTO for starting a certification track.
 */
export interface StartCertificationDto {
  trackId: string;
  /** Either userId (client) or internalUserId (Ethico staff) must be provided */
  userId?: string;
  internalUserId?: string;
}

/**
 * DTO for completing a certification track.
 * Certificate is automatically issued on completion.
 */
export interface CompleteCertificationDto {
  certificationId: string;
  recipientName: string;
  /** For client certifications, include organization details */
  organizationId?: string;
  organizationName?: string;
}

/**
 * UserCertification with related track and certificate data.
 */
export interface UserCertificationWithDetails extends UserCertification {
  track: {
    id: string;
    name: string;
    type: string;
    level: string;
    version: string;
    versionMajor: number;
  };
  certificate: {
    id: string;
    certificateNumber: string;
    status: string;
    pdfUrl: string | null;
  } | null;
}

/**
 * Summary of user's certification status across all tracks.
 */
export interface CertificationSummary {
  /** Total tracks available */
  totalTracks: number;
  /** Tracks completed */
  completedTracks: number;
  /** Tracks in progress */
  inProgressTracks: number;
  /** Required tracks (Platform Fundamentals) completed */
  requiredTracksCompleted: number;
  /** Optional tracks completed */
  optionalTracksCompleted: number;
  /** Active certificates */
  activeCertificates: number;
  /** Expired certificates */
  expiredCertificates: number;
}
