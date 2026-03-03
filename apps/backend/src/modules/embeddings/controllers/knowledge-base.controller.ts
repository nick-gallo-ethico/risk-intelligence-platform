import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBearerAuth,
  ApiBody,
} from "@nestjs/swagger";
import { JwtAuthGuard, RolesGuard } from "../../../common/guards";
import {
  Roles,
  CurrentUser,
  TenantId,
  UserRole,
} from "../../../common/decorators";
import { KnowledgeBaseService } from "../services/knowledge-base.service";
import {
  CreateKnowledgeBaseDocDto,
  UpdateKnowledgeBaseDocDto,
  ListKnowledgeBaseDocsDto,
  KnowledgeBaseDocResponse,
  KnowledgeBaseListResponse,
} from "../dto/knowledge-base.dto";

@ApiTags("Knowledge Base")
@ApiBearerAuth()
@Controller("api/v1/knowledge-base")
@UseGuards(JwtAuthGuard, RolesGuard)
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Post("upload")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    }),
  )
  @ApiOperation({ summary: "Upload a knowledge base document" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        title: { type: "string" },
        description: { type: "string" },
        category: { type: "string" },
      },
      required: ["file", "title"],
    },
  })
  async uploadDocument(
    @TenantId() organizationId: string,
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateKnowledgeBaseDocDto,
  ): Promise<KnowledgeBaseDocResponse> {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    return this.knowledgeBaseService.uploadDocument(
      organizationId,
      user.id,
      file,
      dto,
    );
  }

  @Get()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({ summary: "List knowledge base documents" })
  async listDocuments(
    @TenantId() organizationId: string,
    @Query() query: ListKnowledgeBaseDocsDto,
  ): Promise<KnowledgeBaseListResponse> {
    return this.knowledgeBaseService.listDocuments(organizationId, query);
  }

  @Get(":id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({ summary: "Get a knowledge base document" })
  async getDocument(
    @TenantId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<KnowledgeBaseDocResponse> {
    return this.knowledgeBaseService.getDocument(organizationId, id);
  }

  @Patch(":id")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Update a knowledge base document" })
  async updateDocument(
    @TenantId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateKnowledgeBaseDocDto,
  ): Promise<KnowledgeBaseDocResponse> {
    return this.knowledgeBaseService.updateDocument(organizationId, id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Delete a knowledge base document" })
  async deleteDocument(
    @TenantId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.knowledgeBaseService.deleteDocument(organizationId, id);
  }

  @Post(":id/re-embed")
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: "Re-embed a document (after model upgrade)" })
  async reEmbed(
    @TenantId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.knowledgeBaseService.reEmbed(organizationId, id);
  }
}
