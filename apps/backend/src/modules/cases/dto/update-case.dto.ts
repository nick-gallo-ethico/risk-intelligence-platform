import { PartialType } from '@nestjs/mapped-types';
import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { CaseStatus } from '@prisma/client';
import { CreateCaseDto } from './create-case.dto';

/**
 * DTO for updating a case.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateCaseDto extends PartialType(CreateCaseDto) {
  @IsEnum(CaseStatus)
  @IsOptional()
  status?: CaseStatus;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  statusRationale?: string;

  // QA fields
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  qaNotes?: string;
}
