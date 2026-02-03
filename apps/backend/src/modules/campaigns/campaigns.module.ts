import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { CampaignsService } from "./campaigns.service";
import { CampaignsController } from "./campaigns.controller";
import { SegmentService } from "./targeting/segment.service";
import { SegmentQueryBuilder } from "./targeting/segment-query.builder";
import { CampaignAssignmentService } from "./assignments/campaign-assignment.service";

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
 * - Campaign lifecycle management (draft -> launch -> complete)
 * - Assignment tracking with employee snapshots
 * - Reminder scheduling
 * - Auto-case creation from responses
 */
@Module({
  imports: [PrismaModule],
  controllers: [CampaignsController],
  providers: [
    CampaignsService,
    SegmentService,
    SegmentQueryBuilder,
    CampaignAssignmentService,
  ],
  exports: [
    CampaignsService,
    SegmentService,
    SegmentQueryBuilder,
    CampaignAssignmentService,
  ],
})
export class CampaignsModule {}
