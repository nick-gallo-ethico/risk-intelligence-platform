/**
 * Shared types for association services.
 *
 * These types define the common structure for all association services
 * (PersonCase, CaseCase, PersonPerson, PersonRiu).
 */

import { AuditEntityType, AuditActionCategory } from "@prisma/client";

/**
 * Configuration for an association service.
 * Defines the entity types, event names, and audit behavior.
 */
export interface AssociationConfig {
  /** Name of the association type (e.g., "person-case", "case-case") */
  readonly associationType: string;

  /** Prisma model name (e.g., "personCaseAssociation") */
  readonly prismaModelName: string;

  /** Event prefix for emitted events (e.g., "association.person-case") */
  readonly eventPrefix: string;

  /** Primary audit entity type (e.g., "CASE", "RIU", "PERSON") */
  readonly primaryAuditEntityType: AuditEntityType;
}

/**
 * Base interface for association DTOs.
 * All association create DTOs should extend this.
 */
export interface BaseAssociationDto {
  notes?: string;
}

/**
 * Result of a delete operation.
 */
export interface DeleteResult {
  success: boolean;
}

/**
 * Context for audit logging an association action.
 */
export interface AssociationAuditContext {
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  actionDescription: string;
  actionCategory: AuditActionCategory;
  context?: Record<string, unknown>;
}

/**
 * Context for emitting association events.
 */
export interface AssociationEventContext {
  organizationId: string;
  associationId: string;
  [key: string]: unknown;
}
