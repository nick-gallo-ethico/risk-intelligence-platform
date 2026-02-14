/**
 * CertificationTrack Entity Description
 *
 * This file documents the CertificationTrack Prisma model.
 * The actual model is defined in schema.prisma.
 *
 * CertificationTrack represents a modular training track within the
 * certification system. Per CONTEXT.md:
 * - Platform Fundamentals is REQUIRED for all users
 * - Specialty tracks (Case Management, Campaigns, etc.) are optional
 * - Tracks have version tracking for expiration management
 *
 * @see schema.prisma for the actual model definition
 * @see certification.types.ts for TrackType, CertificationLevel enums
 */

import { CertificationLevel, TrackType } from "../types/certification.types";

/**
 * CertificationTrack represents a modular training track.
 */
export interface CertificationTrack {
  /** Unique identifier */
  id: string;

  /** Track display name */
  name: string;

  /** URL-friendly slug (unique) */
  slug: string;

  /** Track description */
  description: string | null;

  /** Track type (PLATFORM_FUNDAMENTALS, CASE_MANAGEMENT, etc.) */
  type: TrackType;

  /** Track difficulty level */
  level: CertificationLevel;

  /** Whether this track is required (Platform Fundamentals = true) */
  isRequired: boolean;

  /** Version string (e.g., "1.0", "2.1") */
  version: string;

  /** Major version number for expiration tracking */
  versionMajor: number;

  /** Estimated completion time in minutes */
  estimatedMinutes: number;

  /** Sort order for display */
  sortOrder: number;

  /** Whether the track is active */
  isActive: boolean;

  /** Record creation timestamp */
  createdAt: Date;

  /** Record last update timestamp */
  updatedAt: Date;
}

/**
 * DTO for creating a certification track.
 */
export interface CreateCertificationTrackDto {
  name: string;
  slug: string;
  description?: string;
  type: TrackType;
  level: CertificationLevel;
  isRequired?: boolean;
  estimatedMinutes?: number;
  sortOrder?: number;
}

/**
 * DTO for updating a certification track.
 */
export interface UpdateCertificationTrackDto {
  name?: string;
  description?: string;
  level?: CertificationLevel;
  estimatedMinutes?: number;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * DTO for incrementing track version.
 * Major version bump triggers certificate expiration.
 */
export interface BumpTrackVersionDto {
  /** New version string */
  version: string;
  /** Whether this is a major version (triggers expiration) */
  isMajorVersion: boolean;
}
