import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import { APP_GUARD } from "@nestjs/core";
import { EventsModule } from "./modules/events/events.module";
import { JobsModule } from "./modules/jobs/jobs.module";
import { AuditModule } from "./modules/audit/audit.module";
import { HealthModule } from "./modules/health/health.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { CasesModule } from "./modules/cases/cases.module";
import { InvestigationsModule } from "./modules/investigations/investigations.module";
import { InvestigationNotesModule } from "./modules/investigation-notes/investigation-notes.module";
import { AttachmentsModule } from "./modules/attachments/attachments.module";
import { ModuleStorageModule } from "./modules/storage/storage.module";
import { SearchModule } from "./modules/search/search.module";
import { WorkflowModule } from "./modules/workflow/workflow.module";
import { FormsModule } from "./modules/forms/forms.module";
import { ReportingModule } from "./modules/reporting/reporting.module";
import { DemoModule } from "./modules/demo/demo.module";
import { PersonsModule } from "./modules/persons/persons.module";
import { HrisModule } from "./modules/hris/hris.module";
import { CampaignsModule } from "./modules/campaigns/campaigns.module";
import { AssociationsModule } from "./modules/associations/associations.module";
import { RiusModule } from "./modules/rius/rius.module";
import { AiModule } from "./modules/ai/ai.module";
import { CustomPropertiesModule } from "./modules/custom-properties/custom-properties.module";
import { SavedViewsModule } from "./modules/saved-views/saved-views.module";
import { RemediationModule } from "./modules/remediation/remediation.module";
import { MessagingModule } from "./modules/messaging/messaging.module";
import { ActivityTimelineModule } from "./modules/activity/activity.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { BrandingModule } from "./modules/branding/branding.module";
import { PortalsModule } from "./modules/portals/portals.module";
import { TablesModule } from "./modules/tables/tables.module";
import { DisclosuresModule } from "./modules/disclosures/disclosures.module";
import { ActivityModule } from "./common/activity.module";
import { StorageModule } from "./common/storage.module";
import { TenantMiddleware } from "./common/middleware/tenant.middleware";
import configuration from "./config/configuration";

// Rate limiting configuration:
// THROTTLE_TTL: Window duration in milliseconds (default: 60000)
// THROTTLE_LIMIT: Max requests per window (default: 100)
// Uses REDIS_URL for distributed rate limiting across instances
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [".env", ".env.local"],
    }),
    // Global rate limiting with Redis storage for multi-instance deployments
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: "default",
            ttl: configService.get<number>("THROTTLE_TTL", 60000), // 1 minute window
            limit: configService.get<number>("THROTTLE_LIMIT", 100), // 100 requests per minute globally
          },
        ],
        storage: new ThrottlerStorageRedisService(
          configService.get<string>("REDIS_URL", "redis://localhost:6379"),
        ),
      }),
    }),
    EventsModule,
    JobsModule,
    AuditModule, // After EventsModule to subscribe to domain events
    PrismaModule,
    ActivityModule,
    StorageModule, // Low-level file storage (used by AttachmentsModule)
    ModuleStorageModule, // High-level storage with Attachment tracking and document processing
    SearchModule, // Elasticsearch search with per-tenant indices and permission filtering
    WorkflowModule, // Workflow engine for entity lifecycle management
    FormsModule, // Dynamic form engine (intake, disclosures, attestations)
    ReportingModule, // Reporting engine with query builder and Excel/CSV export
    AuthModule,
    UsersModule,
    CasesModule,
    InvestigationsModule,
    InvestigationNotesModule,
    AttachmentsModule,
    DemoModule, // Demo reset system for sales demonstrations
    PersonsModule, // Person entity for people-based pattern detection
    HrisModule, // HRIS integration via Merge.dev unified API
    CampaignsModule, // Outbound compliance campaigns (disclosures, attestations, surveys)
    AssociationsModule, // First-class association entities (Person-Case, Person-RIU, Case-Case, Person-Person)
    RiusModule, // RIU management with immutability enforcement and anonymous access codes
    AiModule, // AI infrastructure - Claude API client with streaming support
    CustomPropertiesModule, // Tenant-configurable custom fields for Cases, Investigations, Persons, RIUs
    SavedViewsModule, // Saved filter views for Cases, RIUs, Investigations, Persons, Campaigns
    RemediationModule, // Post-investigation remediation plans and step tracking
    MessagingModule, // Two-way anonymous messaging with PII detection
    ActivityTimelineModule, // Activity timeline aggregation from audit logs
    NotificationsModule, // Email and in-app notifications with preferences and digest
    BrandingModule, // White-label branding configuration and CSS generation (Phase 8)
    PortalsModule, // Employee and Operator portal services (Phase 8)
    TablesModule, // User-created data tables with scheduling and export (Phase 9 - RS.48)
    DisclosuresModule, // Disclosure forms, thresholds, conflict detection, AI triage (Phase 9)
    HealthModule,
  ],
  controllers: [],
  providers: [
    // Enable global rate limiting for all endpoints
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant middleware to all routes except health check, auth, public endpoints, and admin
    consumer
      .apply(TenantMiddleware)
      .exclude("health", "api/v1/auth/(.*)", "api/v1/public/(.*)", "admin/(.*)")
      .forRoutes("*");
  }
}
