/**
 * Training DTOs - Request/Response types for certification endpoints
 *
 * @see certification.types.ts for enum definitions
 */

import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import {
  CourseType,
  CertificationLevel,
  TrackType,
} from "../../types/certification.types";

/**
 * DTO for creating a certification track.
 */
export class CreateTrackDto {
  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TrackType)
  type!: TrackType;

  @IsEnum(CertificationLevel)
  level!: CertificationLevel;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;
}

/**
 * DTO for creating a course within a track.
 */
export class CreateCourseDto {
  @IsString()
  trackId!: string;

  @IsString()
  title!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(CourseType)
  type!: CourseType;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  @IsOptional()
  @IsString()
  contentUrl?: string;
}

/**
 * Individual quiz answer within a submission.
 */
export class QuizAnswerDto {
  @IsString()
  questionId!: string;

  @IsArray()
  @IsString({ each: true })
  selectedOptionIds!: string[];
}

/**
 * DTO for submitting quiz answers.
 */
export class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[];
}

/**
 * DTO for starting a quiz attempt.
 */
export class StartQuizDto {
  @IsString()
  quizId!: string;

  @IsString()
  userId!: string;

  @IsOptional()
  @IsBoolean()
  isInternalUser?: boolean;
}

/**
 * Response DTO for quiz start.
 */
export interface QuizStartResponse {
  attemptId: string;
  questions: QuizQuestionResponse[];
}

/**
 * Question format returned to user (without correct answers).
 */
export interface QuizQuestionResponse {
  id: string;
  question: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "MULTI_SELECT";
  options: { id: string; text: string }[];
}

/**
 * Response DTO for quiz submission.
 */
export interface QuizSubmitResponse {
  score: number; // Percentage 0-100
  passed: boolean;
  requiredScore: number; // Percentage 0-100
  correctCount: number;
  totalQuestions: number;
}

/**
 * Track with user progress information.
 */
export interface TrackWithProgressResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: TrackType;
  level: CertificationLevel;
  isRequired: boolean;
  estimatedMinutes: number | null;
  version: string;
  courses: CourseResponse[];
  userProgress?: UserCertificationProgress;
  isCompleted: boolean;
}

/**
 * Course information response.
 */
export interface CourseResponse {
  id: string;
  title: string;
  type: CourseType;
  sortOrder: number;
  estimatedMinutes: number | null;
  hasQuiz: boolean;
}

/**
 * User's certification progress for a track.
 */
export interface UserCertificationProgress {
  id: string;
  startedAt: Date;
  completedAt: Date | null;
  certificateId: string | null;
  completedVersion: string | null;
}

/**
 * Certificate issuance response.
 */
export interface CertificateResponse {
  id: string;
  certificateNumber: string;
  recipientName: string;
  trackName: string;
  trackVersion: string;
  issuedAt: Date;
  expiresAt: Date | null;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
}
