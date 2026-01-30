# Ralph Prompt: Web Form Configuration Module

You are implementing the low-code form builder for configurable intake forms.

## Context
- Reference: `02-MODULES/04-WEB-FORM-CONFIGURATION/PRD.md`
- Drag-and-drop form builder for compliance officers
- Powers: Case intake, disclosures, attestations, surveys
- Version history with rollback capability

## Current State
```bash
cd apps/backend && ls -la src/modules/
cd apps/backend && cat prisma/schema.prisma | grep -i form
```

## Requirements

### 1. Form Schema

```prisma
model FormTemplate {
  id                String   @id @default(uuid())
  organizationId    String

  // Metadata
  name              String
  slug              String
  description       String?
  type              FormType
  category          String?

  // Status
  status            FormStatus @default(DRAFT)
  publishedAt       DateTime?
  publishedById     String?

  // Versioning
  version           Int      @default(1)
  parentVersionId   String?  // Previous version
  parentVersion     FormTemplate? @relation("FormVersions", fields: [parentVersionId], references: [id])
  childVersions     FormTemplate[] @relation("FormVersions")

  // Structure
  sections          FormSection[]

  // Settings
  settings          Json?    // { submitButton, confirmationMessage, etc. }

  // Multi-language
  defaultLanguage   String   @default("en")
  translations      FormTranslation[]

  // Audit
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  createdById       String
  updatedById       String?

  @@unique([organizationId, slug, version])
  @@index([organizationId, type, status])
}

model FormSection {
  id                String   @id @default(uuid())
  formTemplateId    String
  formTemplate      FormTemplate @relation(fields: [formTemplateId], references: [id], onDelete: Cascade)

  // Section metadata
  title             String?
  description       String?
  sortOrder         Int      @default(0)

  // Conditional display
  conditionalLogic  Json?    // { field, operator, value }

  // Fields
  fields            FormField[]

  @@index([formTemplateId])
}

model FormField {
  id                String   @id @default(uuid())
  sectionId         String
  section           FormSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)

  // Field definition
  fieldKey          String   // Unique within form
  type              FieldType
  label             String
  placeholder       String?
  helpText          String?
  sortOrder         Int      @default(0)

  // Validation
  isRequired        Boolean  @default(false)
  validation        Json?    // { minLength, maxLength, pattern, min, max, etc. }

  // Options (for select, radio, checkbox)
  options           Json?    // [{ value, label }]

  // Conditional display
  conditionalLogic  Json?    // { field, operator, value }

  // Field-level encryption
  isEncrypted       Boolean  @default(false)

  // Mapping to entity fields
  mappedEntity      String?  // 'Case', 'Disclosure'
  mappedField       String?  // 'description', 'category'

  @@index([sectionId])
}

model FormTranslation {
  id                String   @id @default(uuid())
  formTemplateId    String
  formTemplate      FormTemplate @relation(fields: [formTemplateId], references: [id], onDelete: Cascade)

  language          String
  translations      Json     // { fieldKey: { label, placeholder, helpText, options } }

  // AI translation metadata
  aiTranslatedAt    DateTime?
  aiModelVersion    String?
  isReviewed        Boolean  @default(false)
  reviewedById      String?
  reviewedAt        DateTime?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([formTemplateId, language])
}

model FormSubmission {
  id                String   @id @default(uuid())
  organizationId    String
  formTemplateId    String
  formVersion       Int

  // Submission data
  data              Json     // Encrypted sensitive fields
  submittedById     String?  // Null for anonymous
  submittedAt       DateTime @default(now())

  // Processing
  status            SubmissionStatus @default(PENDING)
  processedAt       DateTime?
  linkedEntityType  String?  // 'CASE', 'DISCLOSURE'
  linkedEntityId    String?

  @@index([organizationId, formTemplateId])
  @@index([submittedById])
}

enum FormType {
  CASE_INTAKE
  DISCLOSURE
  ATTESTATION
  SURVEY
  CUSTOM
}

enum FormStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum FieldType {
  TEXT
  TEXTAREA
  NUMBER
  EMAIL
  PHONE
  DATE
  DATETIME
  SELECT
  MULTI_SELECT
  RADIO
  CHECKBOX
  FILE_UPLOAD
  SIGNATURE
  RICH_TEXT
  HIDDEN
}

enum SubmissionStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

### 2. Form Builder Service

```typescript
@Injectable()
export class FormBuilderService {
  constructor(
    private prisma: PrismaService,
    @Inject('AI_PROVIDER') private aiProvider: AIProvider,
    private activityService: ActivityService,
  ) {}

  // Template CRUD
  async createTemplate(orgId: string, dto: CreateFormDto, userId: string): Promise<FormTemplate> { }
  async getTemplate(id: string): Promise<FormTemplate> { }
  async updateTemplate(id: string, dto: UpdateFormDto, userId: string): Promise<FormTemplate> { }
  async deleteTemplate(id: string): Promise<void> { }

  // Sections
  async addSection(templateId: string, dto: CreateSectionDto): Promise<FormSection> { }
  async updateSection(sectionId: string, dto: UpdateSectionDto): Promise<FormSection> { }
  async reorderSections(templateId: string, order: string[]): Promise<void> { }

  // Fields
  async addField(sectionId: string, dto: CreateFieldDto): Promise<FormField> { }
  async updateField(fieldId: string, dto: UpdateFieldDto): Promise<FormField> { }
  async reorderFields(sectionId: string, order: string[]): Promise<void> { }

  // Publishing
  async publish(templateId: string, userId: string): Promise<FormTemplate> {
    const template = await this.prisma.formTemplate.update({
      where: { id: templateId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        publishedById: userId,
      },
    });

    await this.activityService.log({
      entityType: 'FORM_TEMPLATE',
      entityId: templateId,
      action: 'published',
      actionDescription: `Form "${template.name}" was published`,
      actorUserId: userId,
      organizationId: template.organizationId,
    });

    return template;
  }

  // Versioning
  async createNewVersion(templateId: string, userId: string): Promise<FormTemplate> {
    const current = await this.getTemplate(templateId);

    // Create new version as draft
    return this.prisma.formTemplate.create({
      data: {
        ...current,
        id: undefined,
        version: current.version + 1,
        parentVersionId: current.id,
        status: 'DRAFT',
        publishedAt: null,
        createdById: userId,
      },
      include: { sections: { include: { fields: true } } },
    });
  }

  async rollbackToVersion(templateId: string, targetVersion: number): Promise<FormTemplate> { }

  // AI Translation
  async translateForm(templateId: string, targetLanguage: string): Promise<FormTranslation> {
    const template = await this.getTemplate(templateId);

    // Collect all translatable strings
    const strings = this.extractTranslatableStrings(template);

    const translated = await this.aiProvider.translate(
      JSON.stringify(strings),
      targetLanguage,
      {
        organizationId: template.organizationId,
        entityType: 'FORM_TEMPLATE',
        entityId: templateId,
        preserveFormatting: true,
      }
    );

    return this.prisma.formTranslation.create({
      data: {
        formTemplateId: templateId,
        language: targetLanguage,
        translations: JSON.parse(translated),
        aiTranslatedAt: new Date(),
        aiModelVersion: 'claude-3-5-sonnet',
      },
    });
  }

  // Validation
  validateSubmission(template: FormTemplate, data: Record<string, any>): ValidationResult { }
}
```

### 3. Form Submission Service

```typescript
@Injectable()
export class FormSubmissionService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
    private casesService: CasesService,
    private disclosureService: DisclosureService,
  ) {}

  async submit(
    formId: string,
    data: Record<string, any>,
    userId?: string,
  ): Promise<FormSubmission> {
    const template = await this.prisma.formTemplate.findUnique({
      where: { id: formId },
      include: { sections: { include: { fields: true } } },
    });

    // Validate
    const validation = this.formBuilderService.validateSubmission(template, data);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors);
    }

    // Encrypt sensitive fields
    const encryptedData = await this.encryptSensitiveFields(template, data);

    // Create submission
    const submission = await this.prisma.formSubmission.create({
      data: {
        organizationId: template.organizationId,
        formTemplateId: formId,
        formVersion: template.version,
        data: encryptedData,
        submittedById: userId,
      },
    });

    // Auto-process based on form type
    await this.processSubmission(submission, template);

    return submission;
  }

  private async processSubmission(submission: FormSubmission, template: FormTemplate) {
    switch (template.type) {
      case 'CASE_INTAKE':
        const caseEntity = await this.casesService.createFromSubmission(submission);
        await this.linkToEntity(submission.id, 'CASE', caseEntity.id);
        break;
      case 'DISCLOSURE':
        const disclosure = await this.disclosureService.createFromSubmission(submission);
        await this.linkToEntity(submission.id, 'DISCLOSURE', disclosure.id);
        break;
      // ... other types
    }
  }
}
```

### 4. Form Builder Controller

```typescript
@Controller('api/v1/forms')
@UseGuards(JwtAuthGuard, TenantGuard)
export class FormBuilderController {
  // Templates
  @Get()
  async listTemplates(@TenantId() orgId: string, @Query() query: FormQueryDto) { }

  @Post()
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  async createTemplate(@Body() dto: CreateFormDto, @CurrentUser() user: User, @TenantId() orgId: string) { }

  @Get(':id')
  async getTemplate(@Param('id') id: string) { }

  @Put(':id')
  async updateTemplate(@Param('id') id: string, @Body() dto: UpdateFormDto, @CurrentUser() user: User) { }

  // Sections & Fields
  @Post(':id/sections')
  async addSection(@Param('id') id: string, @Body() dto: CreateSectionDto) { }

  @Post('sections/:sectionId/fields')
  async addField(@Param('sectionId') sectionId: string, @Body() dto: CreateFieldDto) { }

  // Publishing & Versioning
  @Post(':id/publish')
  async publish(@Param('id') id: string, @CurrentUser() user: User) { }

  @Post(':id/new-version')
  async createVersion(@Param('id') id: string, @CurrentUser() user: User) { }

  @Get(':id/versions')
  async getVersionHistory(@Param('id') id: string) { }

  // Translation
  @Post(':id/translate/:language')
  async translateForm(@Param('id') id: string, @Param('language') language: string) { }

  // Submission (can be public for anonymous forms)
  @Post(':id/submit')
  async submitForm(@Param('id') id: string, @Body() data: any, @CurrentUser() user?: User) { }
}
```

### 5. Tests
```bash
cd apps/backend && npm test -- --testPathPattern="form"
cd apps/backend && npm run typecheck
```

Test cases:
- Create form with sections and fields
- Validation rules enforced
- Publish creates immutable version
- New version increments correctly
- Rollback works
- AI translation generates translations
- Submission encrypts sensitive fields
- Submission creates linked entity

## Verification Checklist
- [ ] FormTemplate, Section, Field schemas
- [ ] FormTranslation with AI support
- [ ] FormSubmission with encryption
- [ ] FormBuilderService complete
- [ ] Version history and rollback
- [ ] AI translation working
- [ ] Field-level encryption
- [ ] Submission processing creates entities
- [ ] Tests pass
- [ ] Typecheck passes

## Completion
When form builder is fully functional:
<promise>WEB FORM BUILDER COMPLETE</promise>
