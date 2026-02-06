/**
 * InternalUser Entity Description
 *
 * This file documents the InternalUser Prisma model for internal Ethico staff.
 *
 * CRITICAL ARCHITECTURE DECISION:
 * InternalUser is COMPLETELY SEPARATE from the tenant User model.
 * - User: Tenant-scoped, represents customer employees accessing their org's data
 * - InternalUser: NOT tenant-scoped, represents Ethico staff with cross-tenant access
 *
 * This separation is required for:
 * 1. SOC 2 compliance - internal access clearly distinguished from customer access
 * 2. Audit clarity - all internal actions traceable to Ethico staff
 * 3. Security isolation - internal auth flow separate from customer SSO
 *
 * The actual Prisma model is defined in schema.prisma.
 * This file provides TypeScript interfaces and documentation.
 *
 * @see schema.prisma for the actual model definition
 * @see internal-roles.types.ts for InternalRole enum
 */

import { InternalRole } from "../types/internal-roles.types";

/**
 * InternalUser represents an authenticated Ethico internal staff member.
 *
 * Prisma model:
 * ```prisma
 * enum InternalRole {
 *   SUPPORT_L1
 *   SUPPORT_L2
 *   SUPPORT_L3
 *   IMPLEMENTATION
 *   HOTLINE_OPS
 *   CLIENT_SUCCESS
 *   ADMIN
 * }
 *
 * model InternalUser {
 *   id            String       @id @default(uuid())
 *   email         String       @unique
 *   name          String
 *   role          InternalRole
 *   azureAdId     String?      @unique @map("azure_ad_id")
 *   isActive      Boolean      @default(true) @map("is_active")
 *   lastLoginAt   DateTime?    @map("last_login_at")
 *   createdAt     DateTime     @default(now()) @map("created_at")
 *   updatedAt     DateTime     @updatedAt @map("updated_at")
 *
 *   // Relations
 *   impersonationSessions ImpersonationSession[]
 *
 *   @@map("internal_users")
 * }
 * ```
 */
export interface InternalUser {
  /** Unique identifier */
  id: string;

  /** Email address (unique across all internal users) */
  email: string;

  /** Full name for display */
  name: string;

  /** Internal role determining permissions */
  role: InternalRole;

  /** Azure AD object ID for SSO (optional - local accounts supported) */
  azureAdId: string | null;

  /** Whether the user is active (inactive users cannot log in) */
  isActive: boolean;

  /** Timestamp of last login */
  lastLoginAt: Date | null;

  /** Record creation timestamp */
  createdAt: Date;

  /** Record last update timestamp */
  updatedAt: Date;
}

/**
 * DTO for creating an internal user.
 */
export interface CreateInternalUserDto {
  email: string;
  name: string;
  role: InternalRole;
  azureAdId?: string;
}

/**
 * DTO for updating an internal user.
 */
export interface UpdateInternalUserDto {
  name?: string;
  role?: InternalRole;
  isActive?: boolean;
}

/**
 * InternalUser with computed fields for API responses.
 */
export interface InternalUserWithPermissions extends InternalUser {
  /** Computed permissions based on role */
  permissions: string[];
}
