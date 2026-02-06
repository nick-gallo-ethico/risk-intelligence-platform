/**
 * GoLiveSignoff Entity Description
 *
 * This file documents the GoLiveSignoff Prisma model for capturing
 * client acknowledgment to proceed with go-live below the recommended
 * readiness threshold.
 *
 * Per CONTEXT.md, go-live requires either:
 * 1. All hard gates passed AND readiness score >= 85%
 * 2. OR Client sign-off acknowledging the risks
 *
 * Sign-off captures:
 * - Scores at time of sign-off (for audit trail)
 * - Acknowledged risks (specific items the client accepts)
 * - Client signature (name, email, timestamp)
 * - Internal approval (for additional oversight)
 *
 * @see schema.prisma for the actual model definition
 * @see types/go-live.types.ts for SignoffType enum
 */

import { SignoffType } from "../types/go-live.types";

/**
 * GoLiveSignoff represents a client acknowledgment to proceed below threshold.
 */
export interface GoLiveSignoff {
  /** Unique identifier */
  id: string;

  /** FK to ImplementationProject (unique - one sign-off per project) */
  projectId: string;

  /** Type of sign-off (CLIENT or INTERNAL) */
  type: SignoffType;

  /** Readiness score at time of sign-off */
  readinessScoreAtSignoff: number;

  /** Number of hard gates passed at sign-off */
  gatesPassedAtSignoff: number;

  /** Total number of hard gates at sign-off */
  gatesTotalAtSignoff: number;

  /** List of acknowledged risks */
  acknowledgedRisks: string[];

  /** Sign-off statement (e.g., "I acknowledge that...") */
  signoffStatement: string;

  /** Client signer's name */
  clientSignerName: string | null;

  /** Client signer's email */
  clientSignerEmail: string | null;

  /** When the client signed */
  clientSignedAt: Date | null;

  /** Internal approver's name */
  internalApproverName: string | null;

  /** InternalUser ID who approved */
  internalApproverId: string | null;

  /** When internal approval was given */
  internalApprovedAt: Date | null;

  /** Record creation timestamp */
  createdAt: Date;
}

/**
 * DTO for creating a go-live sign-off.
 */
export interface CreateGoLiveSignoffDto {
  projectId: string;
  type: SignoffType;
  readinessScoreAtSignoff: number;
  gatesPassedAtSignoff: number;
  gatesTotalAtSignoff: number;
  acknowledgedRisks: string[];
  signoffStatement: string;
  clientSignerName?: string;
  clientSignerEmail?: string;
}

/**
 * DTO for adding internal approval to a sign-off.
 */
export interface AddInternalApprovalDto {
  internalApproverName: string;
  internalApproverId: string;
}

/**
 * DTO for adding client signature to a sign-off.
 */
export interface AddClientSignatureDto {
  clientSignerName: string;
  clientSignerEmail: string;
}

/**
 * GoLiveSignoff with validation status for API responses.
 */
export interface GoLiveSignoffWithStatus extends GoLiveSignoff {
  /** Whether client has signed */
  hasClientSignature: boolean;
  /** Whether internal approval exists */
  hasInternalApproval: boolean;
  /** Whether sign-off is complete (both signatures if required) */
  isComplete: boolean;
}
