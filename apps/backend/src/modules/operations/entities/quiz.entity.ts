/**
 * Quiz Entity Description
 *
 * This file documents the Quiz and QuizAttempt Prisma models.
 * The actual models are defined in schema.prisma.
 *
 * Quiz represents the assessment for a course.
 * Per CONTEXT.md:
 * - 80% pass threshold
 * - Questions stored as JSON for flexibility
 * - Multiple attempts allowed
 *
 * @see schema.prisma for the actual model definition
 * @see certification.types.ts for QuizStatus, QuizQuestion types
 */

import {
  QuizStatus,
  QuizQuestion,
  QuizAnswers,
} from '../types/certification.types';

/**
 * Quiz represents the assessment for a course.
 */
export interface Quiz {
  /** Unique identifier */
  id: string;

  /** FK to parent Course (one quiz per course) */
  courseId: string;

  /** Quiz title */
  title: string;

  /** Passing score threshold (default 0.80 = 80%) */
  passingScore: number;

  /** Questions array stored as JSON */
  questions: QuizQuestion[];

  /** Record creation timestamp */
  createdAt: Date;

  /** Record last update timestamp */
  updatedAt: Date;
}

/**
 * QuizAttempt tracks a user's attempt at completing a quiz.
 */
export interface QuizAttempt {
  /** Unique identifier */
  id: string;

  /** FK to parent Quiz */
  quizId: string;

  /** FK to tenant User (for client staff) */
  userId: string | null;

  /** FK to InternalUser (for Ethico staff) */
  internalUserId: string | null;

  /** When the attempt started */
  startedAt: Date;

  /** When the attempt was completed (null if in progress) */
  completedAt: Date | null;

  /** Attempt status */
  status: QuizStatus;

  /** Score achieved (0.0 to 1.0) */
  score: number | null;

  /** User's answers stored as JSON */
  answers: QuizAnswers | null;

  /** Record creation timestamp */
  createdAt: Date;
}

/**
 * DTO for creating a quiz.
 */
export interface CreateQuizDto {
  courseId: string;
  title: string;
  passingScore?: number;
  questions: QuizQuestion[];
}

/**
 * DTO for updating a quiz.
 */
export interface UpdateQuizDto {
  title?: string;
  passingScore?: number;
  questions?: QuizQuestion[];
}

/**
 * DTO for starting a quiz attempt.
 */
export interface StartQuizAttemptDto {
  quizId: string;
  /** Either userId (client) or internalUserId (Ethico staff) must be provided */
  userId?: string;
  internalUserId?: string;
}

/**
 * DTO for submitting quiz answers.
 */
export interface SubmitQuizAttemptDto {
  attemptId: string;
  answers: QuizAnswers;
}

/**
 * Quiz with attempt history for a specific user.
 */
export interface QuizWithAttempts extends Quiz {
  attempts: QuizAttempt[];
  /** Computed: best score achieved */
  bestScore: number | null;
  /** Computed: number of attempts */
  attemptCount: number;
  /** Computed: latest status */
  currentStatus: QuizStatus;
}
