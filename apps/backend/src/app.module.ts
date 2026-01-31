import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./modules/health/health.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { CasesModule } from "./modules/cases/cases.module";
import { InvestigationsModule } from "./modules/investigations/investigations.module";
import { InvestigationNotesModule } from "./modules/investigation-notes/investigation-notes.module";
import { AttachmentsModule } from "./modules/attachments/attachments.module";
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
    PrismaModule,
    ActivityModule,
    StorageModule,
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
    // Apply tenant middleware to all routes except health check and auth
    consumer
      .apply(TenantMiddleware)
      .exclude("health", "api/v1/auth/(.*)")
      .forRoutes("*");
  }
}
