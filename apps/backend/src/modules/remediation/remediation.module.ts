import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RemediationService } from './remediation.service';
import { RemediationStepService } from './remediation-step.service';
import { RemediationController } from './remediation.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RemediationController],
  providers: [RemediationService, RemediationStepService],
  exports: [RemediationService, RemediationStepService],
})
export class RemediationModule {}
