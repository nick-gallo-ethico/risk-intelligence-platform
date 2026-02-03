import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
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
import { ActivityModule } from "./common/activity.module";
import { StorageModule } from "./common/storage.module";
import { TenantMiddleware } from "./common/middleware/tenant.middleware";
import configuration from "./config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [".env", ".env.local"],
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
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant middleware to all routes except health check, auth, and admin
    consumer
      .apply(TenantMiddleware)
      .exclude("health", "api/v1/auth/(.*)", "admin/(.*)")
      .forRoutes("*");
  }
}
