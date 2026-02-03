import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { FormSubmissionStatus, Prisma } from '@prisma/client';
import { FormSchemaService } from './form-schema.service';
import { FormValidationService } from './form-validation.service';
import { FormSchema, UiSchema } from './types/form.types';
import { nanoid } from 'nanoid';

/**
 * Event emitted when a form is submitted.
 * Used for downstream processing (RIU creation, notifications, etc.).
 */
export interface FormSubmittedEvent {
  organizationId: string;
  submissionId: string;
  formDefinitionId: string;
  formType: string;
  entityType?: string;
  entityId?: string;
  submittedById?: string;
  isAnonymous: boolean;
  data: Record<string, unknown>;
}

/**
 * Parameters for submitting a form.
 */
export interface SubmitFormParams {
  organizationId: string;
  formDefinitionId: string;
  data: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  submittedById?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * FormSubmissionService handles form submission and validation.
 * Validates submissions against their form definition's JSON Schema.
 *
 * Features:
 * - Schema validation with conditional rules
 * - Anonymous submission with access codes
 * - Entity linkage (Cases, RIUs, etc.)
 * - Event emission for downstream processing
 */
@Injectable()
export class FormSubmissionService {
  private readonly logger = new Logger(FormSubmissionService.name);

  constructor(
    private prisma: PrismaService,
    private schemaService: FormSchemaService,
    private validationService: FormValidationService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Submit form data with validation.
   * Emits form.submitted event for downstream processing.
   */
  async submit(params: SubmitFormParams) {
    const form = await this.schemaService.findById(
      params.organizationId,
      params.formDefinitionId,
    );

    if (!form.isPublished) {
      throw new BadRequestException('Form is not published');
    }

    const schema = form.schema as unknown as FormSchema;
    const uiSchema = form.uiSchema as unknown as UiSchema;

    // Apply conditionals if any
    const effectiveSchema = uiSchema?.conditionals
      ? this.validationService.applyConditionals(
          schema,
          params.data,
          uiSchema.conditionals,
        )
      : schema;

    // Validate submission
    const validation = this.validationService.validate(effectiveSchema, params.data);

    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: validation.errors,
      });
    }

    // Generate anonymous access code if anonymous submission
    const isAnonymous = !params.submittedById && form.allowAnonymous;
    const anonymousAccessCode = isAnonymous ? nanoid(12) : null;

    // Validate anonymous submission is allowed
    if (!params.submittedById && !form.allowAnonymous) {
      throw new BadRequestException('Anonymous submissions are not allowed for this form');
    }

    // Create submission
    const submission = await this.prisma.formSubmission.create({
      data: {
        organizationId: params.organizationId,
        formDefinitionId: params.formDefinitionId,
        formDefinitionVersion: form.version,
        data: params.data as Prisma.InputJsonValue,
        status: FormSubmissionStatus.SUBMITTED,
        entityType: params.entityType,
        entityId: params.entityId,
        submittedById: params.submittedById,
        submitterIp: params.ipAddress,
        submitterAgent: params.userAgent,
        anonymousAccessCode,
      },
    });

    this.logger.log(
      `Form ${form.name} submitted: ${submission.id}${isAnonymous ? ' (anonymous)' : ''}`,
    );

    // Emit event for downstream processing
    try {
      this.eventEmitter.emit('form.submitted', {
        organizationId: params.organizationId,
        submissionId: submission.id,
        formDefinitionId: params.formDefinitionId,
        formType: form.formType,
        entityType: params.entityType,
        entityId: params.entityId,
        submittedById: params.submittedById,
        isAnonymous,
        data: params.data,
      } as FormSubmittedEvent);
    } catch (error) {
      // Event emission should not fail the submission
      this.logger.error(
        `Failed to emit form.submitted event: ${error.message}`,
        error.stack,
      );
    }

    return {
      id: submission.id,
      status: submission.status,
      accessCode: anonymousAccessCode,
      submittedAt: submission.submittedAt,
    };
  }

  /**
   * Save form data as draft (no validation required).
   */
  async saveDraft(params: SubmitFormParams) {
    const form = await this.schemaService.findById(
      params.organizationId,
      params.formDefinitionId,
    );

    // Create or update draft
    const existingDraft = await this.prisma.formSubmission.findFirst({
      where: {
        organizationId: params.organizationId,
        formDefinitionId: params.formDefinitionId,
        submittedById: params.submittedById,
        status: FormSubmissionStatus.DRAFT,
      },
    });

    if (existingDraft) {
      return this.prisma.formSubmission.update({
        where: { id: existingDraft.id },
        data: {
          data: params.data as Prisma.InputJsonValue,
          entityType: params.entityType,
          entityId: params.entityId,
        },
      });
    }

    return this.prisma.formSubmission.create({
      data: {
        organizationId: params.organizationId,
        formDefinitionId: params.formDefinitionId,
        formDefinitionVersion: form.version,
        data: params.data as Prisma.InputJsonValue,
        status: FormSubmissionStatus.DRAFT,
        entityType: params.entityType,
        entityId: params.entityId,
        submittedById: params.submittedById,
      },
    });
  }

  /**
   * Find submission by ID.
   */
  async findById(organizationId: string, id: string) {
    const submission = await this.prisma.formSubmission.findFirst({
      where: { id, organizationId },
      include: { formDefinition: true },
    });

    if (!submission) {
      throw new NotFoundException(`Submission ${id} not found`);
    }

    return submission;
  }

  /**
   * Find submission by anonymous access code.
   * Returns limited information for privacy.
   */
  async findByAccessCode(accessCode: string) {
    const submission = await this.prisma.formSubmission.findFirst({
      where: { anonymousAccessCode: accessCode },
      include: {
        formDefinition: {
          select: { name: true, formType: true },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    return {
      id: submission.id,
      formName: submission.formDefinition.name,
      formType: submission.formDefinition.formType,
      status: submission.status,
      submittedAt: submission.submittedAt,
    };
  }

  /**
   * List submissions for a form definition.
   */
  async findByFormDefinition(
    organizationId: string,
    formDefinitionId: string,
    options?: {
      status?: FormSubmissionStatus;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Prisma.FormSubmissionWhereInput = {
      organizationId,
      formDefinitionId,
    };

    if (options?.status) {
      where.status = options.status;
    }

    const [submissions, total] = await Promise.all([
      this.prisma.formSubmission.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      this.prisma.formSubmission.count({ where }),
    ]);

    return { submissions, total };
  }

  /**
   * List submissions for an entity (e.g., all forms for a Case).
   */
  async findByEntity(
    organizationId: string,
    entityType: string,
    entityId: string,
  ) {
    return this.prisma.formSubmission.findMany({
      where: {
        organizationId,
        entityType,
        entityId,
      },
      include: {
        formDefinition: {
          select: { name: true, formType: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Update submission status (for approval workflow).
   */
  async updateStatus(
    organizationId: string,
    id: string,
    status: FormSubmissionStatus,
  ) {
    const submission = await this.findById(organizationId, id);

    const updated = await this.prisma.formSubmission.update({
      where: { id },
      data: { status },
    });

    this.logger.log(`Submission ${id} status updated to ${status}`);

    // Emit status change event
    try {
      this.eventEmitter.emit('form.submission.status_changed', {
        organizationId,
        submissionId: id,
        formDefinitionId: submission.formDefinitionId,
        oldStatus: submission.status,
        newStatus: status,
      });
    } catch (error) {
      this.logger.error(
        `Failed to emit status_changed event: ${error.message}`,
        error.stack,
      );
    }

    return updated;
  }
}
