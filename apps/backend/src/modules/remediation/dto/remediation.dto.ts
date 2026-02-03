import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsInt,
  IsArray,
  IsDateString,
  IsEmail,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RemediationStatus, StepStatus } from '@prisma/client';

// Step template for creating from template
export interface StepTemplate {
  order: number;
  title: string;
  description?: string;
  roleSlug?: string; // e.g., 'hr_director', 'it_manager' - resolved at apply time
  requiresCoApproval: boolean;
  dueDaysOffset?: number; // Days from plan start
}

export class CreateRemediationPlanDto {
  @IsUUID()
  caseId: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  findingId?: string;

  @IsString()
  @IsOptional()
  findingDescription?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @IsUUID()
  @IsOptional()
  templateId?: string;
}

export class UpdateRemediationPlanDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  findingDescription?: string;

  @IsEnum(RemediationStatus)
  @IsOptional()
  status?: RemediationStatus;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsUUID()
  @IsOptional()
  ownerId?: string;
}

export class CreateRemediationStepDto {
  @IsUUID()
  planId: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsUUID()
  @IsOptional()
  assigneeUserId?: string;

  @IsEmail()
  @IsOptional()
  assigneeEmail?: string;

  @IsString()
  @IsOptional()
  assigneeName?: string;

  @IsBoolean()
  @IsOptional()
  requiresCoApproval?: boolean;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  dependsOnStepIds?: string[];
}

export class UpdateRemediationStepDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsUUID()
  @IsOptional()
  assigneeUserId?: string;

  @IsEmail()
  @IsOptional()
  assigneeEmail?: string;

  @IsString()
  @IsOptional()
  assigneeName?: string;

  @IsBoolean()
  @IsOptional()
  requiresCoApproval?: boolean;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  dependsOnStepIds?: string[];
}

export class CompleteStepDto {
  @IsString()
  @IsOptional()
  completionNotes?: string;

  @IsOptional()
  completionEvidence?: { attachmentIds?: string[]; links?: string[] };
}

export class ApproveStepDto {
  @IsString()
  @IsOptional()
  approvalNotes?: string;
}

export class RemediationQueryDto {
  @IsUUID()
  @IsOptional()
  caseId?: string;

  @IsEnum(RemediationStatus)
  @IsOptional()
  status?: RemediationStatus;

  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  overdue?: boolean;

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

// Template DTOs
export class CreateRemediationTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsArray()
  steps: StepTemplate[];
}
