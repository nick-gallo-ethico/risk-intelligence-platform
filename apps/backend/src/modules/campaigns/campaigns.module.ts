import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { PrismaModule } from "../prisma/prisma.module";
import { RiusModule } from "../rius/rius.module";
import { CasesModule } from "../cases/cases.module";
import { CampaignsService } from "./campaigns.service";
import { CampaignsController } from "./campaigns.controller";
import { SegmentService } from "./targeting/segment.service";
import { SegmentQueryBuilder } from "./targeting/segment-query.builder";
import { CampaignAssignmentService } from "./assignments/campaign-assignment.service";
import { CampaignTargetingService } from "./campaign-targeting.service";
import {
  CampaignSchedulingService,
  CAMPAIGN_QUEUE_NAME,
} from "./campaign-scheduling.service";
import { CampaignSchedulingProcessor } from "./campaign-scheduling.processor";
import { CampaignReminderService } from "./campaign-reminder.service";
import { CampaignReminderProcessor } from "./campaign-reminder.processor";
import { CampaignTranslationService } from "./campaign-translation.service";
import { CampaignDashboardService } from "./campaign-dashboard.service";
import { AttestationCampaignService } from "./attestation/attestation-campaign.service";
import { AttestationResponseService } from "./attestation/attestation-response.service";
import { AttestationController } from "./attestation/attestation.controller";

/**
 * CampaignsModule provides outbound compliance request functionality.
 *
 * Campaigns (HubSpot Sequence equivalent) enable:
 * - Disclosure requests (COI, gifts, outside employment)
 * - Policy attestations
 * - Compliance surveys
 *
 * Features:
 * - Segment-based audience targeting with query builder
 * - Manual employee selection
 * - Campaign lifecycle management (draft -> scheduled -> launch -> complete)
 * - Assignment tracking with employee snapshots
 * - Reminder scheduling
 * - Auto-case creation from responses
 * - Scheduled launches with BullMQ
 * - Wave-based staggered rollout (RS.53)
 * - Blackout date enforcement (RS.54)
 */
@Module({
  imports: [
    PrismaModule,
    RiusModule,
    CasesModule,
    BullModule.registerQueue({
      name: CAMPAIGN_QUEUE_NAME,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000, // 5s, 10s, 20s
        },
        removeOnComplete: {
          count: 100,
          age: 24 * 60 * 60, // 24 hours
        },
        removeOnFail: {
          count: 500,
          age: 7 * 24 * 60 * 60, // 7 days
        },
      },
    }),
  ],
  controllers: [CampaignsController, AttestationController],
  providers: [
    CampaignsService,
    SegmentService,
    SegmentQueryBuilder,
    CampaignAssignmentService,
    CampaignTargetingService,
    CampaignSchedulingService,
    CampaignSchedulingProcessor,
    CampaignReminderService,
    CampaignReminderProcessor,
    CampaignTranslationService,
    CampaignDashboardService,
    AttestationCampaignService,
    AttestationResponseService,
  ],
  exports: [
    CampaignsService,
    SegmentService,
    SegmentQueryBuilder,
    CampaignAssignmentService,
    CampaignTargetingService,
    CampaignSchedulingService,
    CampaignReminderService,
    CampaignTranslationService,
    CampaignDashboardService,
    AttestationCampaignService,
    AttestationResponseService,
  ],
})
export class CampaignsModule {}
