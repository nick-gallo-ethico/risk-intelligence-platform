import {
  PersonType as PrismaPersonType,
  PersonSource as PrismaPersonSource,
  AnonymityTier as PrismaAnonymityTier,
  PersonStatus as PrismaPersonStatus,
  Person,
} from "@prisma/client";

/**
 * Re-export Prisma enums as TypeScript types for use in DTOs and service layer.
 * Using Prisma types directly ensures consistency with the database schema.
 */
export type PersonType = PrismaPersonType;
export type PersonSource = PrismaPersonSource;
export type AnonymityTier = PrismaAnonymityTier;
export type PersonStatus = PrismaPersonStatus;

/**
 * Person with related entities included.
 * Use this type when including relations in queries.
 */
export interface PersonWithRelations extends Person {
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
  mergedIntoPrimary?: Person | null;
  mergedPersons?: Person[];
}

/**
 * Simplified person response for API responses.
 * Omits sensitive fields and internal implementation details.
 */
export interface PersonResponse {
  id: string;
  organizationId: string;
  type: PersonType;
  source: PersonSource;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  employeeId: string | null;
  company: string | null;
  title: string | null;
  relationship: string | null;
  anonymityTier: AnonymityTier;
  status: PersonStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Query filters for listing persons.
 */
export interface PersonQueryFilters {
  type?: PersonType;
  source?: PersonSource;
  status?: PersonStatus;
  anonymityTier?: AnonymityTier;
  search?: string;
}

/**
 * Pagination options for person queries.
 */
export interface PersonPaginationOptions {
  limit?: number;
  offset?: number;
  sortBy?: keyof Person;
  sortOrder?: "asc" | "desc";
}
