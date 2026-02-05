export * from "./migration.module";
export * from "./migration.service";
export * from "./dto/migration.dto";
export * from "./entities/migration.entity";

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
