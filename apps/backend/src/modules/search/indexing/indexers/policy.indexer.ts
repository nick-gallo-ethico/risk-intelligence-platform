import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { IndexingService } from "../indexing.service";
import { PolicyDocument, POLICY_INDEX_NAME } from "../index-mappings";

/**
 * PolicyIndexer handles indexing of Policy entities to Elasticsearch.
 *
 * Responsibilities:
 * - Building complete policy documents with all relations
 * - Indexing individual policies (on create/update/publish)
 * - Bulk reindexing for an organization
 * - Removing policies from index
 *
 * Per CONTEXT.md: Index structure follows org_{organizationId}_policies pattern.
 */
@Injectable()
export class PolicyIndexer {
  private readonly logger = new Logger(PolicyIndexer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly indexingService: IndexingService,
  ) {}

  /**
   * Index a single policy with all its related data.
   *
   * Gathers:
   * - Policy metadata
   * - Latest version content and summary
   * - Owner information
   * - Translations
   * - Case association count
   * - Active attestation campaign info
   * - Workflow instance status
   */
  async indexPolicy(policyId: string, organizationId: string): Promise<void> {
    const policy = await this.prisma.policy.findFirst({
      where: {
        id: policyId,
        organizationId,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        versions: {
          where: { isLatest: true },
          take: 1,
          include: {
            translations: {
              select: {
                languageCode: true,
                plainText: true,
              },
            },
          },
        },
        caseAssociations: {
          select: { id: true },
        },
      },
    });

    if (!policy) {
      this.logger.warn(
        `Policy ${policyId} not found for indexing in org ${organizationId}`,
      );
      return;
    }

    const latestVersion = policy.versions[0] || null;
    const translations = latestVersion?.translations || [];

    // Count case associations
    const caseAssociationCount = policy.caseAssociations.length;

    // Check for active attestation campaigns linked to this policy
    // For now, we count campaigns that are ACTIVE and have this policy linked
    // This would need a PolicyAttestationCampaign relation to be precise
    // For the initial implementation, we'll set defaults
    const hasActiveAttestationCampaign = false; // TODO: Add when attestation campaigns are linked
    const attestationCompletionRate = undefined; // TODO: Calculate when attestation tracking exists

    // Get workflow instance if policy is pending approval
    let workflowInstance: { id: string; status: string } | null = null;
    if (policy.status === "PENDING_APPROVAL") {
      const instance = await this.prisma.workflowInstance.findFirst({
        where: {
          organizationId,
          entityType: "POLICY",
          entityId: policyId,
          status: "ACTIVE",
        },
        select: {
          id: true,
          status: true,
        },
        orderBy: { createdAt: "desc" },
      });
      workflowInstance = instance;
    }

    // Build the document
    const doc: PolicyDocument = {
      id: policy.id,
      organizationId: policy.organizationId,
      slug: policy.slug,
      title: policy.title,
      policyType: policy.policyType,
      category: policy.category || undefined,
      status: policy.status,
      content: latestVersion?.content || policy.draftContent || undefined,
      plainText:
        latestVersion?.plainText ||
        this.extractPlainText(policy.draftContent) ||
        undefined,
      summary: latestVersion?.summary || undefined,
      currentVersion: policy.currentVersion,
      versionLabel: latestVersion?.versionLabel || undefined,
      latestVersionId: latestVersion?.id || undefined,
      effectiveDate: policy.effectiveDate?.toISOString() || undefined,
      reviewDate: policy.reviewDate?.toISOString() || undefined,
      publishedAt: latestVersion?.publishedAt?.toISOString() || undefined,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
      ownerId: policy.ownerId,
      ownerName: policy.owner
        ? `${policy.owner.firstName || ""} ${policy.owner.lastName || ""}`.trim() ||
          undefined
        : undefined,
      ownerEmail: policy.owner?.email || undefined,
      translationLanguages: translations.map((t) => t.languageCode),
      translatedContent:
        translations.map((t) => t.plainText).join(" ") || undefined,
      hasActiveAttestationCampaign,
      linkedCaseCount: caseAssociationCount,
      attestationCompletionRate,
      approvalStatus: workflowInstance?.status || undefined,
      workflowInstanceId: workflowInstance?.id || undefined,
    };

    // Index the document
    await this.indexingService.indexDocument(
      organizationId,
      POLICY_INDEX_NAME,
      policyId,
      doc as unknown as Record<string, unknown>,
    );

    this.logger.debug(
      `Indexed policy "${policy.title}" (${policy.id}) with ${translations.length} translations`,
    );
  }

  /**
   * Remove a policy from the Elasticsearch index.
   */
  async removePolicy(policyId: string, organizationId: string): Promise<void> {
    await this.indexingService.deleteDocument(
      organizationId,
      POLICY_INDEX_NAME,
      policyId,
    );
    this.logger.debug(`Removed policy ${policyId} from index`);
  }

  /**
   * Reindex all policies for an organization.
   * Useful for initial indexing or rebuilding after schema changes.
   *
   * @returns Number of policies indexed
   */
  async reindexAllPolicies(organizationId: string): Promise<number> {
    const policies = await this.prisma.policy.findMany({
      where: { organizationId },
      select: { id: true },
    });

    let count = 0;
    for (const policy of policies) {
      try {
        await this.indexPolicy(policy.id, organizationId);
        count++;
      } catch (error) {
        this.logger.error(
          `Failed to index policy ${policy.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    this.logger.log(`Reindexed ${count}/${policies.length} policies for org ${organizationId}`);
    return count;
  }

  /**
   * Extracts plain text from HTML content for search indexing.
   * Strips HTML tags and collapses whitespace.
   */
  private extractPlainText(html: string | null): string | undefined {
    if (!html) return undefined;

    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, " ");

    // Decode common HTML entities
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Collapse whitespace
    text = text.replace(/\s+/g, " ").trim();

    return text || undefined;
  }
}
