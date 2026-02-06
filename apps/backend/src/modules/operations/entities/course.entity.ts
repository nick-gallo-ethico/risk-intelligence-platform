/**
 * Course Entity Description
 *
 * This file documents the Course Prisma model.
 * The actual model is defined in schema.prisma.
 *
 * Course represents a single learning unit within a certification track.
 * Per CONTEXT.md:
 * - Short courses (typically 10-30 minutes)
 * - Content types: VIDEO, TEXT, INTERACTIVE
 * - Each course has an optional quiz
 *
 * @see schema.prisma for the actual model definition
 * @see certification.types.ts for CourseType enum
 */

import { CourseType } from '../types/certification.types';

/**
 * Course represents a single learning unit within a certification track.
 */
export interface Course {
  /** Unique identifier */
  id: string;

  /** FK to parent CertificationTrack */
  trackId: string;

  /** Course title */
  title: string;

  /** Course description */
  description: string | null;

  /** Content type (VIDEO, TEXT, INTERACTIVE) */
  type: CourseType;

  /** Video URL for VIDEO type */
  contentUrl: string | null;

  /** HTML content for TEXT type */
  contentHtml: string | null;

  /** Estimated completion time in minutes */
  estimatedMinutes: number;

  /** Sort order within track */
  sortOrder: number;

  /** Whether the course is active */
  isActive: boolean;

  /** Record creation timestamp */
  createdAt: Date;

  /** Record last update timestamp */
  updatedAt: Date;
}

/**
 * DTO for creating a course.
 */
export interface CreateCourseDto {
  trackId: string;
  title: string;
  description?: string;
  type: CourseType;
  contentUrl?: string;
  contentHtml?: string;
  estimatedMinutes?: number;
  sortOrder?: number;
}

/**
 * DTO for updating a course.
 */
export interface UpdateCourseDto {
  title?: string;
  description?: string;
  type?: CourseType;
  contentUrl?: string;
  contentHtml?: string;
  estimatedMinutes?: number;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * Course with quiz relationship loaded.
 */
export interface CourseWithQuiz extends Course {
  quiz: {
    id: string;
    title: string;
    passingScore: number;
  } | null;
}
