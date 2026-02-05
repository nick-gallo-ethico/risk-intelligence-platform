import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsArray,
  IsNumber,
  IsDate,
  IsObject,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  ArrayMinSize,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AttestationType, AudienceMode } from "@prisma/client";

/**
 * Quiz question option for attestation quizzes.
 */
export class QuizOptionDto {
  @ApiProperty({ description: "Unique identifier for this option" })
  @IsString()
  id: string;

  @ApiProperty({ description: "Option text displayed to user" })
  @IsString()
  @MaxLength(500)
  text: string;
}

/**
 * Quiz question for attestation quizzes.
 */
export class QuizQuestionDto {
  @ApiProperty({ description: "Unique identifier for this question" })
  @IsString()
  id: string;

  @ApiProperty({ description: "Question text" })
  @IsString()
  @MaxLength(1000)
  text: string;

  @ApiProperty({ type: [QuizOptionDto], description: "Answer options" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  @ArrayMinSize(2)
  options: QuizOptionDto[];

  @ApiProperty({ description: "ID of the correct option" })
  @IsString()
  correctOptionId: string;

  @ApiPropertyOptional({
    description: "Explanation shown after answer (correct or incorrect)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  explanation?: string;
}

/**
 * Quiz configuration for attestation campaigns.
 */
export class QuizConfigDto {
  @ApiProperty({
    type: [QuizQuestionDto],
    description: "Quiz questions",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  @ArrayMinSize(1)
  questions: QuizQuestionDto[];

  @ApiProperty({
    description: "Minimum passing score (percentage 0-100)",
    minimum: 0,
    maximum: 100,
    default: 70,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore: number;

  @ApiPropertyOptional({
    description: "Maximum attempts allowed (0 = unlimited)",
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxAttempts?: number;

  @ApiPropertyOptional({
    description: "Show correct answers after completion",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  showCorrectAnswers?: boolean;

  @ApiPropertyOptional({
    description: "Randomize question order",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  randomizeQuestions?: boolean;

  @ApiPropertyOptional({
    description: "Randomize answer order within questions",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  randomizeOptions?: boolean;
}

/**
 * DTO for creating an attestation campaign from a policy.
 */
export class CreateAttestationCampaignDto {
  @ApiProperty({ description: "Policy version ID to attest to" })
  @IsUUID()
  policyVersionId: string;

  @ApiPropertyOptional({
    description: "Campaign name (defaults to policy title + attestation)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: "Campaign description" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    enum: AttestationType,
    description: "How employees attest",
    default: "CHECKBOX",
  })
  @IsOptional()
  @IsEnum(AttestationType)
  attestationType?: AttestationType;

  @ApiPropertyOptional({
    type: QuizConfigDto,
    description: "Quiz configuration (required if attestationType is QUIZ)",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuizConfigDto)
  @ValidateIf((o) => o.attestationType === AttestationType.QUIZ)
  quizConfig?: QuizConfigDto;

  @ApiPropertyOptional({
    description: "Require user to scroll to bottom of policy before attesting",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  forceScroll?: boolean;

  @ApiPropertyOptional({
    enum: ["ALL", "SEGMENT", "MANUAL"],
    description: "Audience targeting mode",
    default: "ALL",
  })
  @IsOptional()
  @IsEnum(AudienceMode)
  audienceMode?: AudienceMode;

  @ApiPropertyOptional({
    description: "Segment ID for audience targeting (when audienceMode is SEGMENT)",
  })
  @IsOptional()
  @IsUUID()
  @ValidateIf((o) => o.audienceMode === AudienceMode.SEGMENT)
  segmentId?: string;

  @ApiPropertyOptional({
    description: "Employee IDs for manual targeting (when audienceMode is MANUAL)",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  @ValidateIf((o) => o.audienceMode === AudienceMode.MANUAL)
  employeeIds?: string[];

  @ApiProperty({ description: "Due date for attestation completion" })
  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @ApiPropertyOptional({
    description: "Days before due date to send reminders",
    default: [7, 3, 1],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  reminderDays?: number[];

  @ApiPropertyOptional({
    description: "Automatically create case when employee refuses attestation",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoCreateCaseOnRefusal?: boolean;

  @ApiPropertyOptional({
    description: "Scheduled launch date (if null, launch immediately after creation)",
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  launchAt?: Date;
}

/**
 * Quiz answer submitted by employee.
 */
export class QuizAnswerDto {
  @ApiProperty({ description: "Question ID being answered" })
  @IsString()
  questionId: string;

  @ApiProperty({ description: "Selected option ID" })
  @IsString()
  answerId: string;
}

/**
 * DTO for submitting an attestation response.
 */
export class SubmitAttestationDto {
  @ApiProperty({ description: "Assignment ID for this attestation" })
  @IsUUID()
  assignmentId: string;

  @ApiPropertyOptional({
    description: "Acknowledgment checkbox value (for CHECKBOX type)",
  })
  @IsOptional()
  @IsBoolean()
  acknowledged?: boolean;

  @ApiPropertyOptional({
    description: "Base64 encoded signature image (for SIGNATURE type)",
  })
  @IsOptional()
  @IsString()
  signatureData?: string;

  @ApiPropertyOptional({
    description: "Quiz answers (for QUIZ type)",
    type: [QuizAnswerDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  quizAnswers?: QuizAnswerDto[];

  @ApiPropertyOptional({
    description: "Whether employee is refusing to attest",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  refused?: boolean;

  @ApiPropertyOptional({
    description: "Reason for refusal (required if refused is true)",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @ValidateIf((o) => o.refused === true)
  refusalReason?: string;
}

/**
 * Result of quiz scoring.
 */
export interface QuizResult {
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  results: QuizQuestionResult[];
}

export interface QuizQuestionResult {
  questionId: string;
  questionText: string;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  explanation?: string;
}

/**
 * Response from attestation submission.
 */
export interface AttestationSubmissionResult {
  assignment: {
    id: string;
    status: string;
    attestedAt?: Date;
    refusedAt?: Date;
    quizScore?: number;
  };
  riu?: {
    id: string;
    referenceNumber: string;
    type: string;
  };
  case?: {
    id: string;
    referenceNumber: string;
  };
  quizResult?: QuizResult;
}
