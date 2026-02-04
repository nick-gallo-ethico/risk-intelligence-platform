import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import {
  AiTriageService,
  TriageEntityType,
  TriageInterpretation,
  TriagePreview,
  TriageResult,
} from './ai-triage.service';

// ===========================================
// DTOs
// ===========================================

/**
 * Request body for interpreting a natural language triage query.
 */
class InterpretQueryDto {
  /**
   * Natural language query to interpret.
   * @example "approve all disclosures under $100"
   */
  query: string;

  /**
   * Entity type to triage.
   */
  entityType: 'disclosure' | 'conflict';
}

/**
 * Request body for generating a triage preview.
 */
class PreviewRequestDto {
  /**
   * The interpretation from the interpret endpoint.
   */
  interpretation: TriageInterpretation;
}

/**
 * Request body for executing a triage action.
 */
class ExecuteRequestDto {
  /**
   * Preview ID from the preview endpoint.
   */
  previewId: string;

  /**
   * Must be true to execute. Safety check.
   */
  confirm: boolean;
}

// ===========================================
// Controller
// ===========================================

/**
 * TriageController provides REST endpoints for AI-assisted bulk triage.
 *
 * RS.47: Natural language bulk processing with safeguards.
 *
 * Workflow:
 * 1. POST /interpret - Parse NL query into structured filters
 * 2. POST /preview - Generate preview of matching items (no action taken)
 * 3. POST /execute - Execute action with explicit confirmation
 * 4. DELETE /preview/:id - Cancel a preview
 *
 * Access Control:
 * - Requires SYSTEM_ADMIN or COMPLIANCE_OFFICER role
 * - JWT authentication required
 * - Tenant-scoped operations
 *
 * Safety Features:
 * - Preview required before execution
 * - Explicit confirmation required
 * - 5-minute preview expiration
 * - Full audit trail
 */
@ApiTags('Triage')
@ApiBearerAuth()
@Controller('api/v1/triage')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
export class TriageController {
  constructor(private readonly triageService: AiTriageService) {}

  /**
   * Interpret a natural language query into structured filters and action.
   *
   * Takes a natural language query like "approve all under $100" and returns
   * a structured interpretation with filters, action, and confidence score.
   *
   * @param dto - Query and entity type
   * @param organizationId - Tenant context
   * @returns Structured interpretation
   */
  @Post('interpret')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Interpret natural language triage query',
    description:
      'Parse a natural language query into structured filters and action. ' +
      'Examples: "approve all under $100", "dismiss low severity vendor matches".',
  })
  @ApiBody({ type: InterpretQueryDto })
  @ApiResponse({
    status: 200,
    description: 'Query interpreted successfully',
    schema: {
      type: 'object',
      properties: {
        originalQuery: { type: 'string' },
        entityType: { type: 'string', enum: ['disclosure', 'conflict'] },
        filters: { type: 'object' },
        action: { type: 'string' },
        confidence: { type: 'number' },
        explanation: { type: 'string' },
        warnings: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid query or parse failure' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async interpret(
    @Body() dto: InterpretQueryDto,
    @TenantId() organizationId: string,
  ): Promise<TriageInterpretation> {
    return this.triageService.interpretQuery(
      {
        query: dto.query,
        entityType: dto.entityType as TriageEntityType,
      },
      organizationId,
    );
  }

  /**
   * Generate a preview of the triage action.
   *
   * Takes an interpretation and returns matching items without executing
   * any action. The preview includes count, sample items, and impact assessment.
   * Preview is cached for 5 minutes and required for execution.
   *
   * @param dto - Interpretation from interpret endpoint
   * @param organizationId - Tenant context
   * @returns Preview with matching items
   */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate triage preview',
    description:
      'Generate a preview of matching items without executing any action. ' +
      'Preview is cached for 5 minutes and required for execution.',
  })
  @ApiBody({ type: PreviewRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Preview generated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Preview ID for execution' },
        count: { type: 'number', description: 'Total matching items' },
        items: { type: 'array', description: 'Sample items (max 100)' },
        impact: {
          type: 'object',
          properties: {
            estimatedDurationMs: { type: 'number' },
            totalValueAffected: { type: 'number' },
            statusBreakdown: { type: 'object' },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid interpretation' })
  async preview(
    @Body() dto: PreviewRequestDto,
    @TenantId() organizationId: string,
  ): Promise<TriagePreview> {
    return this.triageService.previewAction(dto.interpretation, organizationId);
  }

  /**
   * Execute a triage action with confirmation.
   *
   * Executes the action from a previously generated preview. Requires
   * explicit confirmation (confirm: true) and valid preview ID.
   *
   * @param dto - Preview ID and confirmation flag
   * @param organizationId - Tenant context
   * @param user - Current user for audit
   * @returns Execution result with success/failure counts
   */
  @Post('execute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute triage action',
    description:
      'Execute the action from a preview. Requires explicit confirmation ' +
      '(confirm: true) and valid, non-expired preview ID.',
  })
  @ApiBody({ type: ExecuteRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Action executed successfully',
    schema: {
      type: 'object',
      properties: {
        previewId: { type: 'string' },
        action: { type: 'string' },
        processed: { type: 'number' },
        succeeded: { type: 'number' },
        failed: { type: 'number' },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
        startedAt: { type: 'string', format: 'date-time' },
        completedAt: { type: 'string', format: 'date-time' },
        durationMs: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Confirmation required or preview expired' })
  @ApiResponse({ status: 404, description: 'Preview not found' })
  async execute(
    @Body() dto: ExecuteRequestDto,
    @TenantId() organizationId: string,
    @CurrentUser() user: { id: string },
  ): Promise<TriageResult> {
    return this.triageService.executeAction(
      dto.previewId,
      dto.confirm,
      organizationId,
      user.id,
    );
  }

  /**
   * Cancel a preview and clear from cache.
   *
   * Use this to explicitly cancel a preview before its 5-minute expiration.
   * No action is taken on the matching items.
   *
   * @param previewId - Preview ID to cancel
   */
  @Delete('preview/:previewId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel triage preview',
    description:
      'Cancel a preview and clear it from cache. Use this to abandon a ' +
      'triage operation without executing.',
  })
  @ApiParam({ name: 'previewId', description: 'Preview ID to cancel' })
  @ApiResponse({ status: 204, description: 'Preview cancelled' })
  async cancelPreview(@Param('previewId') previewId: string): Promise<void> {
    await this.triageService.cancelPreview(previewId);
  }
}
