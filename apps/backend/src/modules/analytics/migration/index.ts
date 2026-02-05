export * from "./migration.module";
export * from "./migration.service";
export * from "./migration.controller";
export * from "./screenshot-to-form.service";
export * from "./dto/migration.dto";
export * from "./dto/screenshot.dto";
export * from "./entities/migration.entity";
export {
  MigrationProcessor,
  MIGRATION_QUEUE_NAME,
  MigrationJobData,
  MigrationResult,
} from "./processors/migration.processor";

// Re-export connectors with explicit names to avoid conflicts
export {
  BaseMigrationConnector,
  MigrationConnector,
  FormatDetectionResult,
  FieldTransform,
  MigrationTargetEntity,
  ConnectorFieldMapping,
  ValidationResult,
  TransformedRow,
  CaseCreateInput,
  RiuCreateInput,
  PersonCreateInput,
  InvestigationCreateInput,
} from "./connectors/base.connector";
export { NavexConnector } from "./connectors/navex.connector";
export { EqsConnector } from "./connectors/eqs.connector";
export { CsvConnector } from "./connectors/csv.connector";
