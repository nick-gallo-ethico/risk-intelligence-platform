/**
 * GoLiveGate Entity Description
 *
 * This file documents the GoLiveGate Prisma model for tracking
 * hard gates (blocking requirements) for implementation go-live.
 *
 * Hard gates are defined in types/go-live.types.ts HARD_GATES array:
 * - auth_configured: Authentication configured
 * - admin_trained: At least 1 admin trained/certified
 * - terms_signed: Terms & data processing agreement signed
 * - contact_designated: Primary contact designated
 *
 * Each gate must be PASSED (or WAIVED with approval) before go-live.
 *
 * @see schema.prisma for the actual model definition
 * @see types/go-live.types.ts for gate definitions and types
 */

import { GateStatus, type HardGateId } from "../types/go-live.types";

/**
 * GoLiveGate represents a hard gate status for an implementation project.
 */
export interface GoLiveGate {
  /** Unique identifier */
  id: string;

  /** FK to ImplementationProject */
  projectId: string;

  /** Gate ID from HARD_GATES (auth_configured, admin_trained, etc.) */
  gateId: HardGateId;

  /** Current status of the gate */
  status: GateStatus;

  /** When the gate was last verified */
  checkedAt: Date | null;

  /** InternalUser ID who verified the gate */
  checkedById: string | null;

  /** Reason for waiver (required if status is WAIVED) */
  waiverReason: string | null;

  /** InternalUser ID who approved the waiver */
  waiverApprovedById: string | null;

  /** When the waiver was approved */
  waiverApprovedAt: Date | null;

  /** Additional notes */
  notes: string | null;

  /** Record creation timestamp */
  createdAt: Date;

  /** Record last update timestamp */
  updatedAt: Date;
}

/**
 * DTO for creating a go-live gate record.
 */
export interface CreateGoLiveGateDto {
  projectId: string;
  gateId: HardGateId;
  status?: GateStatus;
  notes?: string;
}

/**
 * DTO for updating a go-live gate status.
 */
export interface UpdateGoLiveGateDto {
  status?: GateStatus;
  checkedById?: string;
  waiverReason?: string;
  waiverApprovedById?: string;
  notes?: string;
}

/**
 * GoLiveGate with computed/joined fields for API responses.
 */
export interface GoLiveGateWithDetails extends GoLiveGate {
  /** Gate definition details */
  gateDefinition: {
    id: string;
    name: string;
    description: string;
    order: number;
  };
}
