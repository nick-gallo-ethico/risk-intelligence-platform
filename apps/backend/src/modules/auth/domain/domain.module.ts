import { Module, forwardRef } from "@nestjs/common";
import { DomainController } from "./domain.controller";
import { DomainService } from "./domain.service";
import { DomainVerificationService } from "./domain-verification.service";
import { AuditModule } from "../../audit/audit.module";

@Module({
  imports: [forwardRef(() => AuditModule)],
  controllers: [DomainController],
  providers: [DomainService, DomainVerificationService],
  exports: [DomainService, DomainVerificationService],
})
export class DomainModule {}
