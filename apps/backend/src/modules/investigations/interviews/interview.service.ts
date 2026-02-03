import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InterviewStatus, IntervieweeType, Prisma } from '@prisma/client';
import {
  CreateInterviewDto,
  UpdateInterviewDto,
  InterviewQueryDto,
  CreateInterviewTemplateDto,
  UpdateInterviewTemplateDto,
  InterviewQuestion,
} from './dto/interview.dto';

@Injectable()
export class InvestigationInterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ===== Interview CRUD =====

  async create(
    organizationId: string,
    userId: string,
    dto: CreateInterviewDto,
  ) {
    // Validate interviewee data
    if (
      dto.intervieweeType === IntervieweeType.PERSON &&
      !dto.intervieweePersonId
    ) {
      throw new BadRequestException(
        'intervieweePersonId required for PERSON type',
      );
    }
    if (
      dto.intervieweeType === IntervieweeType.EXTERNAL &&
      !dto.intervieweeName
    ) {
      throw new BadRequestException('intervieweeName required for EXTERNAL type');
    }

    // If template provided, load questions from template
    let questions: InterviewQuestion[] | undefined = dto.questions;
    if (dto.templateId && !questions) {
      const template = await this.prisma.interviewTemplate.findFirst({
        where: { id: dto.templateId, organizationId },
      });
      if (template && template.questions) {
        questions = template.questions as unknown as InterviewQuestion[];
      }
    }

    const interview = await this.prisma.investigationInterview.create({
      data: {
        organizationId,
        investigationId: dto.investigationId,
        intervieweeType: dto.intervieweeType,
        intervieweePersonId: dto.intervieweePersonId,
        intervieweeName: dto.intervieweeName,
        intervieweeTitle: dto.intervieweeTitle,
        intervieweeEmail: dto.intervieweeEmail,
        intervieweePhone: dto.intervieweePhone,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        location: dto.location,
        purpose: dto.purpose,
        templateId: dto.templateId,
        questions: questions
          ? (questions as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        checklistItemId: dto.checklistItemId,
        conductedById: userId,
        createdById: userId,
      },
    });

    this.eventEmitter.emit('investigation.interview.created', {
      organizationId,
      interviewId: interview.id,
      investigationId: dto.investigationId,
      userId,
    });

    return interview;
  }

  async findById(organizationId: string, id: string) {
    const interview = await this.prisma.investigationInterview.findFirst({
      where: { id, organizationId },
      include: {
        investigation: {
          select: { id: true, caseId: true, investigationNumber: true },
        },
      },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    return interview;
  }

  async findByInvestigation(organizationId: string, investigationId: string) {
    return this.prisma.investigationInterview.findMany({
      where: { organizationId, investigationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(organizationId: string, query: InterviewQueryDto) {
    const where: Prisma.InvestigationInterviewWhereInput = {
      organizationId,
    };
    if (query.investigationId) {
      where.investigationId = query.investigationId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.intervieweePersonId) {
      where.intervieweePersonId = query.intervieweePersonId;
    }

    const [interviews, total] = await Promise.all([
      this.prisma.investigationInterview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: ((query.page || 1) - 1) * (query.limit || 20),
        take: query.limit || 20,
        include: {
          investigation: {
            select: { id: true, caseId: true, investigationNumber: true },
          },
        },
      }),
      this.prisma.investigationInterview.count({ where }),
    ]);

    return {
      data: interviews,
      meta: {
        total,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: Math.ceil(total / (query.limit || 20)),
      },
    };
  }

  async update(
    organizationId: string,
    id: string,
    userId: string,
    dto: UpdateInterviewDto,
  ) {
    await this.findById(organizationId, id);

    const updateData: Prisma.InvestigationInterviewUpdateInput = {};

    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }
    if (dto.scheduledAt !== undefined) {
      updateData.scheduledAt = new Date(dto.scheduledAt);
    }
    if (dto.startedAt !== undefined) {
      updateData.startedAt = new Date(dto.startedAt);
    }
    if (dto.completedAt !== undefined) {
      updateData.completedAt = new Date(dto.completedAt);
    }
    if (dto.duration !== undefined) {
      updateData.duration = dto.duration;
    }
    if (dto.location !== undefined) {
      updateData.location = dto.location;
    }
    if (dto.purpose !== undefined) {
      updateData.purpose = dto.purpose;
    }
    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }
    if (dto.summary !== undefined) {
      updateData.summary = dto.summary;
    }
    if (dto.keyFindings !== undefined) {
      updateData.keyFindings = dto.keyFindings;
    }
    if (dto.questions !== undefined) {
      updateData.questions = dto.questions as unknown as Prisma.InputJsonValue;
    }
    if (dto.hasRecording !== undefined) {
      updateData.hasRecording = dto.hasRecording;
    }
    if (dto.recordingUrl !== undefined) {
      updateData.recordingUrl = dto.recordingUrl;
    }
    if (dto.transcriptUrl !== undefined) {
      updateData.transcriptUrl = dto.transcriptUrl;
    }
    if (dto.consentObtained !== undefined) {
      updateData.consentObtained = dto.consentObtained;
    }
    if (dto.consentNotes !== undefined) {
      updateData.consentNotes = dto.consentNotes;
    }
    if (dto.secondaryInterviewerIds !== undefined) {
      updateData.secondaryInterviewerIds = dto.secondaryInterviewerIds;
    }

    const interview = await this.prisma.investigationInterview.update({
      where: { id },
      data: updateData,
    });

    this.eventEmitter.emit('investigation.interview.updated', {
      organizationId,
      interviewId: id,
      userId,
    });

    return interview;
  }

  async start(organizationId: string, id: string, userId: string) {
    const interview = await this.findById(organizationId, id);

    if (interview.status !== InterviewStatus.SCHEDULED) {
      throw new BadRequestException(
        'Interview must be in SCHEDULED status to start',
      );
    }

    return this.update(organizationId, id, userId, {
      status: InterviewStatus.IN_PROGRESS,
      startedAt: new Date().toISOString(),
    });
  }

  async complete(
    organizationId: string,
    id: string,
    userId: string,
    summary?: string,
  ) {
    const interview = await this.findById(organizationId, id);

    if (interview.status !== InterviewStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Interview must be in IN_PROGRESS status to complete',
      );
    }

    const startedAt = interview.startedAt
      ? new Date(interview.startedAt)
      : new Date();
    const completedAt = new Date();
    const duration = Math.round(
      (completedAt.getTime() - startedAt.getTime()) / 60000,
    );

    return this.update(organizationId, id, userId, {
      status: InterviewStatus.COMPLETED,
      completedAt: completedAt.toISOString(),
      duration,
      summary,
    });
  }

  async cancel(organizationId: string, id: string, userId: string) {
    await this.findById(organizationId, id);

    return this.update(organizationId, id, userId, {
      status: InterviewStatus.CANCELLED,
    });
  }

  async delete(organizationId: string, id: string, userId: string) {
    await this.findById(organizationId, id);

    await this.prisma.investigationInterview.delete({
      where: { id },
    });

    this.eventEmitter.emit('investigation.interview.deleted', {
      organizationId,
      interviewId: id,
      userId,
    });
  }

  // ===== Interview Templates =====

  async createTemplate(
    organizationId: string,
    userId: string,
    dto: CreateInterviewTemplateDto,
  ) {
    return this.prisma.interviewTemplate.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        categoryId: dto.categoryId,
        questions: dto.questions as unknown as Prisma.InputJsonValue,
        createdById: userId,
      },
    });
  }

  async findTemplateById(organizationId: string, id: string) {
    const template = await this.prisma.interviewTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!template) {
      throw new NotFoundException('Interview template not found');
    }

    return template;
  }

  async findAllTemplates(organizationId: string, categoryId?: string) {
    const where: Prisma.InterviewTemplateWhereInput = {
      organizationId,
      isActive: true,
    };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    return this.prisma.interviewTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async updateTemplate(
    organizationId: string,
    id: string,
    dto: UpdateInterviewTemplateDto,
  ) {
    await this.findTemplateById(organizationId, id);

    const updateData: Prisma.InterviewTemplateUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }
    if (dto.categoryId !== undefined) {
      updateData.categoryId = dto.categoryId;
    }
    if (dto.questions !== undefined) {
      updateData.questions = dto.questions as unknown as Prisma.InputJsonValue;
    }
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    return this.prisma.interviewTemplate.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteTemplate(organizationId: string, id: string) {
    await this.findTemplateById(organizationId, id);

    // Soft delete by deactivating
    return this.prisma.interviewTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ===== Queries for Pattern Detection =====

  async findInterviewsByPerson(organizationId: string, personId: string) {
    return this.prisma.investigationInterview.findMany({
      where: {
        organizationId,
        intervieweePersonId: personId,
      },
      include: {
        investigation: {
          select: { id: true, caseId: true, investigationNumber: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
