// =============================================================================
// SCREENSHOT TO FORM SERVICE - AI-powered form field extraction
// =============================================================================
//
// This service uses Claude's vision API to analyze form screenshots and extract
// field definitions for migration or form building purposes.
//
// Key features:
// - Supports both migration (competitor analysis) and form builder contexts
// - Competitor-specific hints improve extraction accuracy
// - Confidence scoring and warnings for review
// - Audit trail for all analyses
// =============================================================================

import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import {
  StorageProvider,
  STORAGE_PROVIDER,
} from "../../storage/providers/storage-provider.interface";
import { AuditService, CreateAuditLogDto } from "../../audit/audit.service";
import {
  AnalyzeScreenshotDto,
  ScreenshotAnalysisResult,
  ExtractedField,
  ExtractedFieldType,
  ExtractedSection,
  CompetitorHint,
  COMPETITOR_FIELD_PATTERNS,
  ScreenshotContext,
  AiImageAnalysisResponse,
} from "./dto/screenshot.dto";
import { nanoid } from "nanoid";
import {
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";

/** Supported MIME types for screenshot analysis */
const SUPPORTED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

/** Maximum file size for screenshot analysis (20MB) */
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;

/**
 * ScreenshotToFormService - AI-powered form extraction from screenshots.
 *
 * This service enables:
 * - MIG-03: Extract form definitions from competitor screenshots during migration
 * - Form builder: Create form definitions from mockup screenshots
 *
 * Uses Claude's vision API for image analysis with competitor-specific prompting.
 */
@Injectable()
export class ScreenshotToFormService {
  private readonly logger = new Logger(ScreenshotToFormService.name);
  private client: Anthropic | null = null;
  private readonly model: string;

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>("ANTHROPIC_API_KEY");
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
      this.logger.log("ScreenshotToFormService initialized with Claude vision");
    } else {
      this.logger.warn(
        "ANTHROPIC_API_KEY not set - screenshot analysis will be disabled",
      );
    }
    this.model =
      this.configService.get<string>("AI_VISION_MODEL") || "claude-opus-4-6";
  }

  /**
   * Check if the service is configured and ready.
   */
  isConfigured(): boolean {
    return this.client !== null;
  }

  /**
   * Analyze a screenshot to extract form field definitions.
   *
   * @param orgId - Organization ID for tenant isolation
   * @param userId - User performing the analysis
   * @param file - Uploaded image file (Express.Multer.File)
   * @param dto - Analysis parameters
   * @returns Extracted form structure with fields and sections
   */
  async analyzeScreenshot(
    orgId: string,
    userId: string,
    file: Express.Multer.File,
    dto: AnalyzeScreenshotDto,
  ): Promise<ScreenshotAnalysisResult> {
    // Validate configuration
    if (!this.client) {
      throw new BadRequestException(
        "Screenshot analysis is not configured - ANTHROPIC_API_KEY not set",
      );
    }

    // Validate file
    this.validateFile(file);

    // Upload screenshot for audit trail
    const blobKey = await this.uploadScreenshot(orgId, file);

    // Build AI prompt
    const prompt = this.buildAnalysisPrompt(dto);

    // Call Claude vision API
    const aiResponse = await this.callVisionApi(file, prompt);

    // Parse AI response
    const result = this.parseAiResponse(aiResponse, dto);

    // Log audit entry
    await this.logAudit(orgId, userId, dto, result, blobKey);

    this.logger.log(
      `Screenshot analyzed: ${result.fields.length} fields extracted with ${result.confidenceOverall}% confidence`,
    );

    return result;
  }

  /**
   * Validate the uploaded file.
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    if (!SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Supported types: ${SUPPORTED_MIME_TYPES.join(", ")}`,
      );
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException(
        `File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
      );
    }
  }

  /**
   * Upload screenshot to storage for audit trail.
   */
  private async uploadScreenshot(
    orgId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    const blobKey = `screenshots/${nanoid()}-${file.originalname}`;

    await this.storageProvider.uploadFile({
      organizationId: orgId,
      path: blobKey,
      content: file.buffer,
      contentType: file.mimetype,
      metadata: {
        purpose: "screenshot-analysis",
        uploadedAt: new Date().toISOString(),
      },
    });

    return blobKey;
  }

  /**
   * Call Claude vision API with the image and prompt.
   */
  private async callVisionApi(
    file: Express.Multer.File,
    prompt: string,
  ): Promise<string> {
    const base64Image = file.buffer.toString("base64");
    const mediaType = file.mimetype as
      | "image/png"
      | "image/jpeg"
      | "image/webp"
      | "image/gif";

    try {
      const response = await this.client!.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      });

      // Extract text content from response
      const textContent = response.content
        .filter((block) => block.type === "text")
        .map((block) => (block as { type: "text"; text: string }).text)
        .join("");

      return textContent;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Vision API call failed: ${err.message}`, err.stack);
      throw new BadRequestException(
        `Failed to analyze screenshot: ${err.message}`,
      );
    }
  }

  /**
   * Build analysis prompt based on context and competitor hints.
   */
  private buildAnalysisPrompt(dto: AnalyzeScreenshotDto): string {
    const basePrompt = `Analyze this screenshot of a form and extract all visible form fields.

For each field, identify:
1. Field label/name
2. Field type (text, textarea, select, checkbox, radio, date, email, phone, number, file, etc.)
3. Whether it appears to be required (look for asterisks or "required" text)
4. Placeholder text if visible
5. Help text or description if present
6. Options/choices for select, radio, or checkbox fields
7. Any visible validation rules (min/max length, pattern indicators)

Also identify:
- Form sections/groups and their titles
- Overall form title and description
- The approximate order/position of fields

Return your analysis as JSON with this exact structure:
{
  "formTitle": "string or null",
  "formDescription": "string or null",
  "sections": [
    { "name": "string", "description": "string or null", "order": 0 }
  ],
  "fields": [
    {
      "name": "camelCaseFieldName",
      "label": "Display Label",
      "type": "text|textarea|select|radio|checkbox|date|email|phone|number|file|multiselect|currency|percentage|url",
      "isRequired": true,
      "placeholder": "string or null",
      "helpText": "string or null",
      "options": ["for select/radio/checkbox only"],
      "validationRules": [{ "type": "required|min|max|minLength|maxLength|pattern", "value": "..." }],
      "section": "section name or null",
      "order": 0,
      "confidence": 85
    }
  ]
}

IMPORTANT: Return ONLY the JSON object, no markdown code blocks or other text.`;

    // Add competitor-specific hints
    let competitorContext = "";
    if (dto.competitorHint && dto.competitorHint !== CompetitorHint.UNKNOWN) {
      const patterns = COMPETITOR_FIELD_PATTERNS[dto.competitorHint];
      const patternList = Object.entries(patterns)
        .map(([field, type]) => `- "${field}" is typically a ${type}`)
        .join("\n");

      competitorContext = `

This appears to be from ${dto.competitorHint.toUpperCase()}. Common field patterns for this system:
${patternList}

Use these patterns to improve field type detection when labels match.`;
    }

    // Add context-specific instructions
    let contextInstructions = "";
    if (dto.context === ScreenshotContext.MIGRATION) {
      contextInstructions = `

MIGRATION CONTEXT:
This screenshot is from a competitor system being migrated to our platform.
Focus on extracting fields that would map to a case/incident reporting system:
- Incident details (type, date, location)
- Reporter information (name, contact, relationship)
- Subject/person involved
- Categories and classifications
- Description/narrative fields
- Status and workflow fields
- Attachments/evidence uploads`;
    } else {
      contextInstructions = `

FORM BUILDER CONTEXT:
This screenshot is being used to create a new form.
Focus on creating a clean, usable form definition:
- Suggest appropriate field types for data collection
- Identify logical groupings into sections
- Note any conditional logic visible (field shown based on another)
- Ensure field names are unique and descriptive`;
    }

    // Add existing field names to avoid duplicates
    let existingFieldsNote = "";
    if (dto.existingFieldNames && dto.existingFieldNames.length > 0) {
      existingFieldsNote = `

EXISTING FIELDS (avoid these names to prevent conflicts):
${dto.existingFieldNames.join(", ")}

Generate unique names that don't conflict with existing fields.`;
    }

    // Add custom instructions
    const customInstructions = dto.additionalInstructions
      ? `

ADDITIONAL INSTRUCTIONS:
${dto.additionalInstructions}`
      : "";

    return (
      basePrompt +
      competitorContext +
      contextInstructions +
      existingFieldsNote +
      customInstructions
    );
  }

  /**
   * Parse AI response into structured result.
   */
  private parseAiResponse(
    aiResponse: string,
    dto: AnalyzeScreenshotDto,
  ): ScreenshotAnalysisResult {
    const warnings: string[] = [];
    let parsed: AiImageAnalysisResponse;

    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch =
        aiResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
        aiResponse.match(/```\s*([\s\S]*?)\s*```/) ||
        aiResponse.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      parsed = JSON.parse(jsonStr);
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`Failed to parse AI response: ${err.message}`);
      warnings.push("Failed to parse AI response. Using fallback extraction.");

      return {
        fields: [],
        sections: [],
        confidenceOverall: 0,
        warnings: [
          ...warnings,
          "Could not extract form structure from image. Please try a clearer screenshot.",
        ],
        rawAnalysis: aiResponse,
      };
    }

    // Process fields
    const fields: ExtractedField[] = (parsed.fields || []).map(
      (f, index: number) => ({
        name: this.sanitizeFieldName(f.name || `field_${index}`),
        label: f.label || f.name || `Field ${index + 1}`,
        type: this.mapFieldType(f.type),
        isRequired: f.isRequired === true,
        placeholder: f.placeholder ?? undefined,
        helpText: f.helpText ?? undefined,
        options: Array.isArray(f.options) ? f.options : undefined,
        validationRules: f.validationRules || [],
        position: {
          section: f.section ?? undefined,
          order: typeof f.order === "number" ? f.order : index,
        },
        confidence: typeof f.confidence === "number" ? f.confidence : 70,
      }),
    );

    // Process sections
    const sections: ExtractedSection[] = (parsed.sections || []).map(
      (s, index: number) => ({
        name: s.name || `Section ${index + 1}`,
        description: s.description ?? undefined,
        order: typeof s.order === "number" ? s.order : index,
        fieldCount: fields.filter((f) => f.position.section === s.name).length,
      }),
    );

    // Calculate overall confidence
    const avgConfidence =
      fields.length > 0
        ? Math.round(
            fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length,
          )
        : 50;

    // Detect competitor from extracted fields
    const competitorDetected = this.detectCompetitor(fields);
    if (
      competitorDetected !== dto.competitorHint &&
      dto.competitorHint !== CompetitorHint.UNKNOWN
    ) {
      warnings.push(
        `Detected competitor (${competitorDetected}) differs from hint (${dto.competitorHint}). Verify the source system.`,
      );
    }

    // Add warnings for low-confidence fields
    const lowConfidenceFields = fields.filter((f) => f.confidence < 50);
    if (lowConfidenceFields.length > 0) {
      const fieldNames = lowConfidenceFields
        .slice(0, 3)
        .map((f) => f.label)
        .join(", ");
      warnings.push(
        `${lowConfidenceFields.length} field(s) have low confidence (${fieldNames}${lowConfidenceFields.length > 3 ? ", ..." : ""}) and may need manual review.`,
      );
    }

    // Warn about fields without sections
    const fieldsWithoutSection = fields.filter((f) => !f.position.section);
    if (fieldsWithoutSection.length > 0 && sections.length > 0) {
      warnings.push(
        `${fieldsWithoutSection.length} field(s) could not be assigned to a section.`,
      );
    }

    return {
      fields,
      sections,
      formTitle: parsed.formTitle ?? undefined,
      formDescription: parsed.formDescription ?? undefined,
      confidenceOverall: avgConfidence,
      warnings,
      competitorDetected,
      rawAnalysis: aiResponse,
    };
  }

  /**
   * Map AI-detected type to ExtractedFieldType.
   */
  private mapFieldType(type: string): ExtractedFieldType {
    const typeMap: Record<string, ExtractedFieldType> = {
      text: ExtractedFieldType.TEXT,
      string: ExtractedFieldType.TEXT,
      input: ExtractedFieldType.TEXT,
      textarea: ExtractedFieldType.TEXTAREA,
      "long text": ExtractedFieldType.TEXTAREA,
      multiline: ExtractedFieldType.TEXTAREA,
      paragraph: ExtractedFieldType.TEXTAREA,
      number: ExtractedFieldType.NUMBER,
      integer: ExtractedFieldType.NUMBER,
      numeric: ExtractedFieldType.NUMBER,
      email: ExtractedFieldType.EMAIL,
      "e-mail": ExtractedFieldType.EMAIL,
      phone: ExtractedFieldType.PHONE,
      telephone: ExtractedFieldType.PHONE,
      tel: ExtractedFieldType.PHONE,
      date: ExtractedFieldType.DATE,
      datetime: ExtractedFieldType.DATETIME,
      "date-time": ExtractedFieldType.DATETIME,
      timestamp: ExtractedFieldType.DATETIME,
      select: ExtractedFieldType.SELECT,
      dropdown: ExtractedFieldType.SELECT,
      combobox: ExtractedFieldType.SELECT,
      multiselect: ExtractedFieldType.MULTISELECT,
      "multi-select": ExtractedFieldType.MULTISELECT,
      "multiple select": ExtractedFieldType.MULTISELECT,
      radio: ExtractedFieldType.RADIO,
      "radio button": ExtractedFieldType.RADIO,
      checkbox: ExtractedFieldType.CHECKBOX,
      boolean: ExtractedFieldType.CHECKBOX,
      toggle: ExtractedFieldType.CHECKBOX,
      file: ExtractedFieldType.FILE,
      upload: ExtractedFieldType.FILE,
      attachment: ExtractedFieldType.FILE,
      currency: ExtractedFieldType.CURRENCY,
      money: ExtractedFieldType.CURRENCY,
      dollar: ExtractedFieldType.CURRENCY,
      percentage: ExtractedFieldType.PERCENTAGE,
      percent: ExtractedFieldType.PERCENTAGE,
      url: ExtractedFieldType.URL,
      link: ExtractedFieldType.URL,
      website: ExtractedFieldType.URL,
    };

    const normalized = (type || "").toLowerCase().trim();
    return typeMap[normalized] || ExtractedFieldType.TEXT;
  }

  /**
   * Sanitize field name to camelCase.
   */
  private sanitizeFieldName(name: string): string {
    // Handle already camelCase names
    if (/^[a-z][a-zA-Z0-9]*$/.test(name)) {
      return name;
    }

    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .filter((word) => word.length > 0)
      .map((word, index) =>
        index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1),
      )
      .join("");
  }

  /**
   * Detect competitor from extracted fields based on field patterns.
   */
  private detectCompetitor(fields: ExtractedField[]): CompetitorHint {
    if (fields.length === 0) {
      return CompetitorHint.UNKNOWN;
    }

    const labels = fields.map((f) => f.label.toLowerCase());

    // Score each competitor based on matching field patterns
    const scores: Record<CompetitorHint, number> = {
      [CompetitorHint.NAVEX]: 0,
      [CompetitorHint.EQS]: 0,
      [CompetitorHint.ONETRUST]: 0,
      [CompetitorHint.STAR]: 0,
      [CompetitorHint.UNKNOWN]: 0,
    };

    for (const [competitor, patterns] of Object.entries(
      COMPETITOR_FIELD_PATTERNS,
    )) {
      if (competitor === CompetitorHint.UNKNOWN) continue;

      const patternLabels = Object.keys(patterns);
      for (const pattern of patternLabels) {
        if (labels.some((l) => l.includes(pattern))) {
          scores[competitor as CompetitorHint]++;
        }
      }
    }

    // Find best match (require at least 2 matches)
    let bestMatch = CompetitorHint.UNKNOWN;
    let bestScore = 1; // Minimum threshold

    for (const [competitor, score] of Object.entries(scores)) {
      if (score > bestScore && competitor !== CompetitorHint.UNKNOWN) {
        bestScore = score;
        bestMatch = competitor as CompetitorHint;
      }
    }

    return bestMatch;
  }

  /**
   * Log audit entry for the screenshot analysis.
   */
  private async logAudit(
    orgId: string,
    userId: string,
    dto: AnalyzeScreenshotDto,
    result: ScreenshotAnalysisResult,
    blobKey: string,
  ): Promise<void> {
    const analysisId = nanoid();
    const contextLabel =
      dto.context === ScreenshotContext.MIGRATION
        ? "migration"
        : "form builder";

    const auditDto: CreateAuditLogDto = {
      organizationId: orgId,
      entityType: AuditEntityType.FORM,
      entityId: analysisId,
      action: "screenshot_analyzed",
      actionCategory: AuditActionCategory.AI,
      actionDescription: `Analyzed ${contextLabel} screenshot, extracted ${result.fields.length} fields with ${result.confidenceOverall}% confidence`,
      actorUserId: userId,
      actorType: ActorType.USER,
      context: {
        context: dto.context,
        competitorHint: dto.competitorHint,
        competitorDetected: result.competitorDetected,
        fieldsExtracted: result.fields.length,
        sectionsExtracted: result.sections.length,
        confidence: result.confidenceOverall,
        warnings: result.warnings,
        screenshotPath: blobKey,
      },
    };

    await this.auditService.log(auditDto);
  }
}
