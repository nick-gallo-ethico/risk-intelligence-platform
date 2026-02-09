import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard, RolesGuard } from "../../../common/guards";
import { Roles, CurrentUser, UserRole } from "../../../common/decorators";
import { DomainService } from "./domain.service";
import {
  AddDomainDto,
  DomainResponseDto,
  VerifyDomainResponseDto,
} from "./dto/domain.dto";

@ApiTags("domains")
@ApiBearerAuth("JWT")
@Controller("domains")
@UseGuards(JwtAuthGuard, RolesGuard)
export class DomainController {
  constructor(private readonly domainService: DomainService) {}

  @Get()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Get all domains for organization" })
  @ApiResponse({ status: 200, type: [DomainResponseDto] })
  async getDomains(
    @CurrentUser() user: { organizationId: string },
  ): Promise<DomainResponseDto[]> {
    return this.domainService.getDomainsForOrganization(user.organizationId);
  }

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN)
  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 per hour
  @ApiOperation({ summary: "Add a new domain for verification" })
  @ApiResponse({ status: 201, type: DomainResponseDto })
  async addDomain(
    @Body() dto: AddDomainDto,
    @CurrentUser() user: { sub: string; organizationId: string },
  ): Promise<DomainResponseDto> {
    return this.domainService.addDomain(user.organizationId, dto, user.sub);
  }

  @Post(":id/verify")
  @Roles(UserRole.SYSTEM_ADMIN)
  @Throttle({ default: { limit: 20, ttl: 3600000 } }) // 20 per hour
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify domain ownership via DNS TXT record" })
  @ApiResponse({ status: 200, type: VerifyDomainResponseDto })
  async verifyDomain(
    @Param("id") domainId: string,
    @CurrentUser() user: { sub: string; organizationId: string },
  ): Promise<VerifyDomainResponseDto> {
    return this.domainService.verifyDomain(
      user.organizationId,
      domainId,
      user.sub,
    );
  }

  @Patch(":id/primary")
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Set domain as primary for organization" })
  @ApiResponse({ status: 204 })
  async setPrimaryDomain(
    @Param("id") domainId: string,
    @CurrentUser() user: { sub: string; organizationId: string },
  ): Promise<void> {
    return this.domainService.setPrimaryDomain(
      user.organizationId,
      domainId,
      user.sub,
    );
  }

  @Delete(":id")
  @Roles(UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove a domain from organization" })
  @ApiResponse({ status: 204 })
  async removeDomain(
    @Param("id") domainId: string,
    @CurrentUser() user: { sub: string; organizationId: string },
  ): Promise<void> {
    return this.domainService.removeDomain(
      user.organizationId,
      domainId,
      user.sub,
    );
  }
}
