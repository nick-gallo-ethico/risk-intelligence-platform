import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsInt,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InterviewStatus, IntervieweeType } from '@prisma/client';

export interface InterviewQuestion {
  id: string;
  question: string;
  response?: string;
  isRequired: boolean;
  guidance?: string;
  order: number;
}

export class CreateInterviewDto {
  @IsUUID()
  investigationId: string;

  @IsEnum(IntervieweeType)
  intervieweeType: IntervieweeType;

  @IsUUID()
  @IsOptional()
  intervieweePersonId?: string;

  @IsString()
  @IsOptional()
  intervieweeName?: string;

  @IsString()
  @IsOptional()
  intervieweeTitle?: string;

  @IsString()
  @IsOptional()
  intervieweeEmail?: string;

  @IsString()
  @IsOptional()
  intervieweePhone?: string;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsUUID()
  @IsOptional()
  templateId?: string;

  @IsArray()
  @IsOptional()
  questions?: InterviewQuestion[];

  @IsUUID()
  @IsOptional()
  checklistItemId?: string;
}

export class UpdateInterviewDto {
  @IsEnum(InterviewStatus)
  @IsOptional()
  status?: InterviewStatus;

  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @IsDateString()
  @IsOptional()
  startedAt?: string;

  @IsDateString()
  @IsOptional()
  completedAt?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  keyFindings?: string;

  @IsArray()
  @IsOptional()
  questions?: InterviewQuestion[];

  @IsBoolean()
  @IsOptional()
  hasRecording?: boolean;

  @IsString()
  @IsOptional()
  recordingUrl?: string;

  @IsString()
  @IsOptional()
  transcriptUrl?: string;

  @IsBoolean()
  @IsOptional()
  consentObtained?: boolean;

  @IsString()
  @IsOptional()
  consentNotes?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  secondaryInterviewerIds?: string[];
}

export class InterviewQueryDto {
  @IsUUID()
  @IsOptional()
  investigationId?: string;

  @IsEnum(InterviewStatus)
  @IsOptional()
  status?: InterviewStatus;

  @IsUUID()
  @IsOptional()
  intervieweePersonId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

// Interview Template DTOs
export class CreateInterviewTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsArray()
  questions: Omit<InterviewQuestion, 'response'>[];
}

export class UpdateInterviewTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsArray()
  @IsOptional()
  questions?: Omit<InterviewQuestion, 'response'>[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
