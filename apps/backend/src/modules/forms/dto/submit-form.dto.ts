import { IsObject, IsOptional, IsString } from 'class-validator';

/**
 * DTO for submitting form data.
 */
export class SubmitFormDto {
  /**
   * Form submission data (validated against form schema).
   */
  @IsObject()
  data: Record<string, unknown>;

  /**
   * Optional entity type to link submission to (e.g., 'CASE', 'RIU').
   */
  @IsOptional()
  @IsString()
  entityType?: string;

  /**
   * Optional entity ID to link submission to.
   */
  @IsOptional()
  @IsString()
  entityId?: string;
}
