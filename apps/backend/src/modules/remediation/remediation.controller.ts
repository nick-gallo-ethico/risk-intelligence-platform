import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JwtAuthGuard, RolesGuard } from "../../common/guards";
import { Roles, CurrentUser, UserRole } from "../../common/decorators";
import { RemediationService } from "./remediation.service";
import { RemediationStepService } from "./remediation-step.service";
import {
  CreateRemediationPlanDto,
  UpdateRemediationPlanDto,
  RemediationQueryDto,
  CreateRemediationStepDto,
  UpdateRemediationStepDto,
  CompleteStepDto,
  ApproveStepDto,
  CreateRemediationTemplateDto,
} from "./dto/remediation.dto";

interface AuthUser {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
}

@Controller("remediation")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RemediationController {
  constructor(
    private readonly remediationService: RemediationService,
    private readonly stepService: RemediationStepService,
  ) {}

  // ===== Plans =====

  @Post("plans")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async createPlan(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRemediationPlanDto,
  ) {
    return this.remediationService.create(user.organizationId, user.id, dto);
  }

  @Get("plans")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async findAllPlans(
    @CurrentUser() user: AuthUser,
    @Query() query: RemediationQueryDto,
  ) {
    return this.remediationService.findAll(user.organizationId, query);
  }

  @Get("plans/:id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async findPlan(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.remediationService.findById(user.organizationId, id);
  }

  @Get("plans/by-case/:caseId")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async findPlansByCase(
    @CurrentUser() user: AuthUser,
    @Param("caseId", ParseUUIDPipe) caseId: string,
  ) {
    return this.remediationService.findByCase(user.organizationId, caseId);
  }

  @Put("plans/:id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async updatePlan(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRemediationPlanDto,
  ) {
    return this.remediationService.update(
      user.organizationId,
      id,
      user.id,
      dto,
    );
  }

  @Post("plans/:id/activate")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async activatePlan(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.remediationService.activate(user.organizationId, id, user.id);
  }

  @Post("plans/:id/complete")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async completePlan(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.remediationService.complete(user.organizationId, id, user.id);
  }

  @Post("plans/:id/cancel")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async cancelPlan(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.remediationService.cancel(user.organizationId, id, user.id);
  }

  // ===== Steps =====

  @Post("steps")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async createStep(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRemediationStepDto,
  ) {
    return this.stepService.create(user.organizationId, user.id, dto);
  }

  @Get("steps/:id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async findStep(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.stepService.findById(user.organizationId, id);
  }

  @Put("steps/:id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async updateStep(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRemediationStepDto,
  ) {
    return this.stepService.update(user.organizationId, id, dto);
  }

  @Post("steps/:id/complete")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.MANAGER,
  )
  async completeStep(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CompleteStepDto,
  ) {
    return this.stepService.complete(user.organizationId, id, user.id, dto);
  }

  @Post("steps/:id/approve")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async approveStep(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ApproveStepDto,
  ) {
    return this.stepService.approve(user.organizationId, id, user.id, dto);
  }

  @Post("steps/:id/skip")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async skipStep(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body("reason") reason: string,
  ) {
    return this.stepService.skip(user.organizationId, id, user.id, reason);
  }

  @Delete("steps/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async deleteStep(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    await this.stepService.delete(user.organizationId, id);
  }

  @Put("plans/:planId/steps/reorder")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async reorderSteps(
    @CurrentUser() user: AuthUser,
    @Param("planId", ParseUUIDPipe) planId: string,
    @Body() stepOrders: { id: string; order: number }[],
  ) {
    await this.stepService.reorder(user.organizationId, planId, stepOrders);
    return { success: true };
  }

  // ===== My Assignments =====

  @Get("my-steps")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
  )
  async findMySteps(@CurrentUser() user: AuthUser) {
    return this.stepService.findByAssignee(
      user.organizationId,
      user.id,
      user.email,
    );
  }

  // ===== Templates =====

  @Post("templates")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async createTemplate(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRemediationTemplateDto,
  ) {
    return this.remediationService.createTemplate(
      user.organizationId,
      user.id,
      dto,
    );
  }

  @Get("templates")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async findAllTemplates(
    @CurrentUser() user: AuthUser,
    @Query("categoryId") categoryId?: string,
  ) {
    return this.remediationService.findAllTemplates(
      user.organizationId,
      categoryId,
    );
  }
}
