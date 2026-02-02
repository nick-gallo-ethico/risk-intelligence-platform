# PRD-016: Migration & Import Module

**Document ID:** PRD-016
**Version:** 1.0
**Priority:** P1 - High (Implementation Enabler)
**Development Phase:** Phase 3 (Weeks 13-18)
**Last Updated:** February 2026

**Cross-References:**
- Platform Vision: `00-PLATFORM/01-PLATFORM-VISION.md`
- Professional Services Spec: `00-PLATFORM/PROFESSIONAL-SERVICES-SPEC.md`
- Implementation Portal PRD: `02-MODULES/10-IMPLEMENTATION-PORTAL/PRD.md`
- Core Data Model: `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`
- Working Decisions (Section S): `00-PLATFORM/WORKING-DECISIONS.md`
- Authentication & Multi-tenancy: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md`
- AI Integration Patterns: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AI-INTEGRATION.md`
- Case Management PRD: `02-MODULES/05-CASE-MANAGEMENT/PRD.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [AI-First Considerations](#2-ai-first-considerations)
3. [User Personas](#3-user-personas)
4. [User Stories](#4-user-stories)
5. [Feature Specifications](#5-feature-specifications)
6. [Data Model](#6-data-model)
7. [API Specifications](#7-api-specifications)
8. [UI/UX Specifications](#8-uiux-specifications)
9. [Competitor Field Mappings](#9-competitor-field-mappings)
10. [Integration Points](#10-integration-points)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Checklist Verification](#12-checklist-verification)

---

## 1. Executive Summary

### Purpose

The Migration & Import Module provides comprehensive tools for importing data from legacy systems and competitors into the Ethico Risk Intelligence Platform. It enables fast, accurate data migration that preserves historical context and relationships, dramatically reducing time-to-value for new clients switching from competitors like NAVEX, Case IQ, EQS, and OneTrust.

This module is the technical foundation that enables Ethico's competitive advantage of "Speed to Value" - allowing clients to bring their entire compliance history into the platform during implementation rather than starting from scratch.

### Target Users

| Role | Primary Use Cases |
|------|-------------------|
| **Implementation Specialist** (Ethico) | Execute data migrations during client onboarding, map fields, validate data, manage rollbacks |
| **Solution Architect** (Ethico) | Design complex migration strategies, handle custom transformations, write migration scripts |
| **System Admin** (Client) | Perform ongoing CSV imports for bulk data updates, import policies, add employees |

### Key Differentiators

| Capability | Competitors | Ethico Migration Module |
|------------|-------------|------------------------|
| **Data Import** | Manual entry or expensive PS | Self-service with AI assistance |
| **Field Mapping** | Manual spreadsheet mapping | AI auto-detection with visual editor |
| **Validation** | Post-import discovery of issues | Pre-import validation with fix suggestions |
| **Rollback** | Impossible or manual cleanup | One-click rollback within 7 days |
| **Context Preservation** | Data only, lose history | Full audit trail, attachments, relationships |
| **Migration Speed** | Weeks to months | Days to weeks |
| **Competitor Support** | Generic import only | Pre-built NAVEX, EQS, Case IQ mappings |

---

## 2. AI-First Considerations

### Conversational Interface

How users might interact with this module via natural language chat:

| User Intent | Example Phrases | AI Response |
|-------------|-----------------|-------------|
| Start migration | "Import cases from NAVEX for Acme Corp" | Analyze files, suggest mappings, show validation |
| Check status | "What's the status of the Johnson Industries migration?" | Progress, errors, completion estimate |
| Fix errors | "Help me fix the date format errors" | Identify pattern, suggest transformation rule |
| Field mapping | "How should I map the 'Resolution_Code' field?" | Show target options with confidence scores |
| Data quality | "What issues did you find in the upload?" | Categorized report with fix suggestions |
| Rollback | "Roll back the last import" | Confirm scope, execute rollback |

**Example Conversations:**

```
User: "I uploaded a NAVEX export, can you analyze it?"
AI: "I've analyzed the uploaded file (navex-export-2024.csv):
     - Detected source: NAVEX EthicsPoint (confidence: 96%)
     - Record count: 2,847 cases
     - Date range: Jan 2019 - Dec 2025
     - Columns found: 45

     Auto-mapped 41/45 fields (91%):
     - 38 high confidence (>90%)
     - 3 medium confidence (70-90%)

     4 fields need review:
     - Custom_Field_7: No obvious match (sample: 'Region A', 'Region B')
     - Employee_ID_Legacy: Format mismatch with HRIS
     - Resolution_Notes_2: May duplicate Resolution_Notes
     - Attachments_Path: File path format incompatible

     Would you like to review the mapping or see the data quality report first?"

User: "Show me the data quality issues"
AI: "Data Quality Report for navex-export-2024.csv:

     ERRORS (12 records - blocks import):
     - 8 records: Missing required field 'Report_Date'
     - 4 records: Invalid date format in 'Close_Date' (mm-dd-yyyy instead of yyyy-mm-dd)

     WARNINGS (156 records - import with defaults):
     - 89 records: Empty 'Category' field (will default to 'Other')
     - 67 records: Unresolved user reference in 'Assigned_To'

     SUGGESTIONS:
     - Date format: Apply transformation rule to fix Close_Date format
     - Missing Report_Date: Can populate from 'Created_Date' if available
     - User references: 67 unique users need resolution before import

     Would you like me to apply the date transformation fix?"
```

### AI Assistance Points

| User Action | AI Can Help By | Confidence Level |
|-------------|----------------|------------------|
| Source detection | Auto-identify source system from file structure | High (95%+ for known systems) |
| Field mapping | Suggest target fields based on names, types, samples | High (85%+ for standard fields) |
| Value mapping | Map source values to target enums semantically | High (80%+ for common values) |
| Data quality | Identify issues, patterns, anomalies | High |
| Transformation rules | Suggest fixes for format mismatches | Medium-High |
| Duplicate detection | Flag potential duplicate records | Medium |
| User resolution | Match source users to platform users | Medium (email match) |
| Date inference | Detect and convert date formats | High |

### Data Requirements for AI Context

**Minimum Context:**
- Uploaded file structure (columns, sample rows)
- Target schema definition
- Source system identifier (if known)

**Enhanced Context (Improves Quality):**
- Previous migrations from same source system
- Organization's category taxonomy
- HRIS employee data for user matching
- Custom field definitions

**Cross-Module Context:**
- Case Management schema (for case migration)
- Disclosures schema (for disclosure migration)
- Policy Management schema (for policy migration)
- Core Data Model (User, Employee, Organization)

---

## 3. User Personas

### Ethico Staff (Implementation Team)

**Implementation Specialist**
- Primary user during client onboarding
- Handles 80% of migrations (standard complexity)
- Needs efficient tools with minimal learning curve
- Values automation, clear error messages, quick rollback

**Solution Architect**
- Handles complex migrations requiring custom logic
- May write transformation scripts
- Needs access to raw data and advanced configuration
- Values flexibility and detailed logging

### Client Admin (Post-Go-Live)

**System Admin**
- Performs occasional bulk imports after initial implementation
- Imports employee lists, policy documents, disclosure data
- Needs self-service UI with guardrails
- Values templates and clear validation feedback

---

## 4. User Stories

### Epic 1: File Upload & Analysis

#### US-016-001: Upload Migration Files

As an **Implementation Specialist**, I want to upload export files from source systems
so that I can begin the migration process.

**Acceptance Criteria:**
- [ ] Accepts CSV, Excel (.xlsx, .xls), JSON, and ZIP (containing multiple files)
- [ ] Maximum file size: 500MB per file, 2GB total per upload session
- [ ] Progress indicator for large uploads
- [ ] File validation: encoding detection (UTF-8, Latin-1, Windows-1252)
- [ ] Files stored securely in import workspace (organization-scoped)
- [ ] Activity logged: "User {name} uploaded {count} files for import"

**AI Enhancement:**
- AI previews first 100 rows during upload to detect issues early

**Ralph Task Readiness:**
- [ ] Entry point: `apps/backend/src/modules/imports/imports.controller.ts`
- [ ] Pattern reference: File upload patterns from attachments module
- [ ] Tests: File validation, encoding, size limits

---

#### US-016-002: Analyze File Structure

As an **Implementation Specialist**, I want the system to analyze uploaded files
so that I understand the data before mapping.

**Acceptance Criteria:**
- [ ] Auto-detect source system from file structure/column names
- [ ] Count records and columns
- [ ] Sample first 5 values for each column
- [ ] Detect data types (string, number, date, boolean)
- [ ] Identify null/empty value counts per column
- [ ] Calculate unique value counts for low-cardinality columns
- [ ] Activity logged: "System analyzed file: {record_count} records, {column_count} columns"

**AI Enhancement:**
- AI provides source system detection with confidence score
- AI identifies potential primary key columns
- AI flags columns likely to need transformation

---

#### US-016-003: Select Entity Type for Import

As an **Implementation Specialist**, I want to select what type of data I'm importing
so that the correct target schema is used.

**Acceptance Criteria:**
- [ ] Entity type selection: Cases, Investigations, Policies, Disclosures, Employees, Users, Categories, Locations, Custom Field Values
- [ ] Each entity type shows required and optional fields
- [ ] Validation rules differ by entity type
- [ ] Entity type affects post-import processing (e.g., Cases create RIUs)
- [ ] Activity logged: "User selected entity type: {entity_type}"

**AI Enhancement:**
- AI suggests entity type based on column analysis

---

### Epic 2: Field Mapping

#### US-016-010: Auto-Suggest Field Mappings

As an **Implementation Specialist**, I want the system to auto-suggest field mappings
so that I don't have to manually map every field.

**Acceptance Criteria:**
- [ ] AI analyzes source column names and sample data
- [ ] Suggests target field with confidence score (0-100%)
- [ ] High confidence (>85%): Auto-mapped, review optional
- [ ] Medium confidence (60-85%): Mapped, flagged for review
- [ ] Low confidence (<60%): Requires manual mapping
- [ ] Shows reasoning for each suggestion
- [ ] Activity logged: "AI auto-mapped {count} fields ({high_conf} high confidence)"

**AI Enhancement:**
- AI learns from manual corrections to improve future suggestions
- AI uses previous migrations as training data

---

#### US-016-011: Visual Field Mapping Interface

As an **Implementation Specialist**, I want a visual interface to map source to target fields
so that I can see and adjust mappings easily.

**Acceptance Criteria:**
- [ ] Side-by-side view: source columns (left) and target fields (right)
- [ ] Drag-and-drop to create/change mappings
- [ ] Color coding: green (high confidence), yellow (needs review), red (unmapped required)
- [ ] Click mapping to see sample data preview
- [ ] Search/filter fields on both sides
- [ ] Bulk actions: reset all, accept all AI suggestions
- [ ] Activity logged: "User confirmed field mapping"

**AI Enhancement:**
- AI panel shows suggestions for selected field

---

#### US-016-012: Handle Unmapped Fields

As an **Implementation Specialist**, I want options for fields that don't have a target
so that I don't lose potentially valuable data.

**Acceptance Criteria:**
- [ ] For each unmapped source field, options:
  - Ignore (data not imported)
  - Map to existing custom field
  - Create new custom field
  - Store in metadata/notes field
- [ ] Warning if unmapped field has significant data
- [ ] Preview what data would be lost if ignored
- [ ] Activity logged: "User chose to {action} unmapped field: {field_name}"

**AI Enhancement:**
- AI suggests custom field creation if data looks valuable

---

#### US-016-013: Map Required Fields

As an **Implementation Specialist**, I want clear indication of required fields
so that I don't proceed with incomplete mappings.

**Acceptance Criteria:**
- [ ] Required target fields marked with indicator
- [ ] Cannot proceed to validation if required fields unmapped
- [ ] Shows default value option for required fields if source is empty
- [ ] Required fields differ by entity type
- [ ] Activity logged: "Mapping complete: {mapped}/{total} fields"

---

### Epic 3: Value Mapping

#### US-016-020: Detect Fields Requiring Value Mapping

As an **Implementation Specialist**, I want the system to identify fields needing value transformation
so that enum values, statuses, and categories map correctly.

**Acceptance Criteria:**
- [ ] Automatically detect fields with limited unique values (enums)
- [ ] Identify fields where source values differ from target values
- [ ] Flag date fields with non-standard formats
- [ ] Show unique source values with frequency counts
- [ ] Activity logged: "Detected {count} fields requiring value mapping"

---

#### US-016-021: Value Mapping Interface

As an **Implementation Specialist**, I want to map source values to target values
so that statuses, categories, and other enums translate correctly.

**Acceptance Criteria:**
- [ ] List all unique source values with occurrence counts
- [ ] AI-suggested target value for each source value
- [ ] Dropdown to select target value
- [ ] "Other/Unmapped" option for values that don't fit
- [ ] Preview records affected by each mapping
- [ ] Activity logged: "User completed value mapping for {field_name}"

**AI Enhancement:**
- AI uses semantic similarity to suggest value mappings
- AI learns from previous mappings for same source system

---

#### US-016-022: Create Transformation Rules

As a **Solution Architect**, I want to create transformation rules for data conversion
so that I can handle complex format changes.

**Acceptance Criteria:**
- [ ] Rule types: date format, string manipulation, lookup, conditional, regex
- [ ] Date format conversion (e.g., MM/DD/YYYY to ISO 8601)
- [ ] String operations: trim, uppercase, lowercase, prefix/suffix
- [ ] Lookup tables for complex value mappings
- [ ] Conditional rules based on other field values
- [ ] Preview rule application on sample data
- [ ] Reusable rules saved per source system
- [ ] Activity logged: "User created transformation rule: {rule_name}"

**AI Enhancement:**
- AI suggests transformation rules based on data patterns

---

#### US-016-023: User Reference Resolution

As an **Implementation Specialist**, I want to resolve user references in imported data
so that historical assignments link to correct platform users.

**Acceptance Criteria:**
- [ ] Extract unique user references from source data
- [ ] AI suggests matches to existing platform users (by email, name)
- [ ] Match confidence scores displayed
- [ ] Manual matching interface for unmatched users
- [ ] Options: match to existing, create new user, leave unassigned, map to placeholder
- [ ] Bulk operations for common scenarios
- [ ] Activity logged: "User resolved {count} user references"

**AI Enhancement:**
- AI uses fuzzy matching for names
- AI detects potential duplicates

---

### Epic 4: Validation & Preview

#### US-016-030: Run Validation

As an **Implementation Specialist**, I want to validate all mapped data before import
so that I can identify and fix issues proactively.

**Acceptance Criteria:**
- [ ] Validation rules by category:
  - Required fields (blocks import if missing)
  - Data types (number in numeric field)
  - Format (email format, date format)
  - Referential integrity (category exists, user exists)
  - Business rules (status transitions, date logic)
- [ ] Results categorized: Errors (block), Warnings (import with flag), Info (FYI)
- [ ] Validation runs in background for large datasets
- [ ] Progress indicator with ETA
- [ ] Activity logged: "Validation complete: {error_count} errors, {warning_count} warnings"

**AI Enhancement:**
- AI identifies patterns in errors (batch fix opportunities)
- AI suggests bulk fixes for common issues

---

#### US-016-031: View Validation Results

As an **Implementation Specialist**, I want to see detailed validation results
so that I can fix issues before import.

**Acceptance Criteria:**
- [ ] Summary dashboard: total records, valid, errors, warnings
- [ ] Filterable list of issues by type, field, severity
- [ ] Click issue to see affected records
- [ ] Export validation report (CSV, PDF)
- [ ] Re-validate button after fixes
- [ ] Activity not logged (read operation)

---

#### US-016-032: Preview Import Results

As an **Implementation Specialist**, I want to preview how data will appear after import
so that I can verify accuracy before committing.

**Acceptance Criteria:**
- [ ] Side-by-side comparison: source record vs. target record
- [ ] Preview random sample (configurable size, default 10)
- [ ] Select specific records by row number
- [ ] Show all field values including transformations applied
- [ ] Highlight values that changed via transformation
- [ ] Preview relationships (e.g., cases with investigations)
- [ ] Activity not logged (read operation)

---

#### US-016-033: Dry Run Mode

As an **Implementation Specialist**, I want to run a full import simulation
so that I can verify everything works without committing data.

**Acceptance Criteria:**
- [ ] Full import process runs without database commits
- [ ] All validations execute
- [ ] All transformations apply
- [ ] Relationship linking simulated
- [ ] Results show exactly what would be created/updated
- [ ] No data persisted after dry run
- [ ] Activity logged: "User ran dry run: {record_count} records processed, {error_count} errors"

**AI Enhancement:**
- AI compares dry run results to expectations

---

### Epic 5: Import Execution

#### US-016-040: Execute Import

As an **Implementation Specialist**, I want to execute the data import
so that historical data is available in the client's tenant.

**Acceptance Criteria:**
- [ ] Confirmation dialog with record counts and final warnings
- [ ] Create restore point before execution
- [ ] Import runs in foreground (<1000 records) or background (larger)
- [ ] Real-time progress indicator with ETA
- [ ] Batch processing with transaction boundaries
- [ ] All imported records tagged with source_system, source_record_id, migrated_at, import_job_id
- [ ] Completion notification (in-app and email for background jobs)
- [ ] Activity logged: "User imported {record_count} {entity_type} records"

---

#### US-016-041: Monitor Import Progress

As an **Implementation Specialist**, I want to monitor import progress in real-time
so that I know if issues occur.

**Acceptance Criteria:**
- [ ] Progress dashboard showing:
  - Records processed / total
  - Records succeeded / failed
  - Current batch / total batches
  - Estimated time remaining
  - Current record being processed
- [ ] Live error log (most recent errors)
- [ ] Pause/resume capability for large imports
- [ ] Cancel button with partial rollback option
- [ ] Activity logged on errors: "Import error at row {row}: {message}"

---

#### US-016-042: Handle Import Errors

As an **Implementation Specialist**, I want clear error handling during import
so that I can decide how to proceed with failures.

**Acceptance Criteria:**
- [ ] Error handling modes:
  - Stop on first error (conservative)
  - Skip and continue (log errors)
  - Retry N times (for transient errors)
- [ ] Failed records logged with row number, field, error message
- [ ] Failed records exportable for manual review
- [ ] Option to re-import only failed records
- [ ] Activity logged: "Import completed with {success_count} success, {fail_count} failures"

---

#### US-016-043: Import Cases with RIU Creation

As an **Implementation Specialist**, I want imported cases to follow the RIU architecture
so that migrated data conforms to platform standards.

**Acceptance Criteria:**
- [ ] Each imported case creates:
  - RIU (Risk Intelligence Unit) with type 'migrated_case'
  - Case linked to RIU via riu_case_associations
  - Association type: 'primary'
- [ ] RIU contains original intake information
- [ ] Case contains work tracking information
- [ ] Original source IDs preserved on both entities
- [ ] Activity logged on RIU and Case creation

---

### Epic 6: Rollback & Recovery

#### US-016-050: Rollback Import

As an **Implementation Specialist**, I want to rollback a failed or incorrect import
so that I can fix issues and re-import.

**Acceptance Criteria:**
- [ ] Rollback available for 7 days after import completion
- [ ] Rollback removes all records from specific import job
- [ ] Preserves records created after import (by created_at timestamp)
- [ ] Handles cascading deletes (investigations under cases)
- [ ] Confirmation dialog with summary of what will be removed
- [ ] Rollback progress indicator
- [ ] Activity logged: "User rolled back import job {job_id}: {record_count} records removed"

---

#### US-016-051: Partial Rollback

As an **Implementation Specialist**, I want to rollback specific records from an import
so that I can fix individual issues without losing all imported data.

**Acceptance Criteria:**
- [ ] Select specific records to remove
- [ ] Filter by error status, entity type, date range
- [ ] Preview affected records and relationships
- [ ] Cascade handling (remove child records)
- [ ] Activity logged: "User partially rolled back {count} records from job {job_id}"

---

#### US-016-052: Restore Point Management

As a **Solution Architect**, I want to manage restore points
so that I have recovery options for complex migrations.

**Acceptance Criteria:**
- [ ] Each import creates automatic restore point
- [ ] Restore points expire after 7 days (configurable)
- [ ] Manual restore point creation before complex operations
- [ ] View list of available restore points
- [ ] Storage usage displayed per restore point
- [ ] Activity logged: "User created manual restore point: {name}"

---

### Epic 7: Import History & Reporting

#### US-016-060: View Import History

As an **Implementation Specialist**, I want to see history of all imports
so that I can track what has been migrated.

**Acceptance Criteria:**
- [ ] List of all import jobs for organization
- [ ] Filter by status, date range, entity type, user
- [ ] Details: record count, success rate, duration, user
- [ ] Click to view job details and error log
- [ ] Activity not logged (read operation)

---

#### US-016-061: Generate Migration Report

As an **Implementation Specialist**, I want to generate a comprehensive migration report
so that I can document what was migrated for client handoff.

**Acceptance Criteria:**
- [ ] Report includes:
  - Summary statistics (records by type, date range)
  - Source system and files used
  - Field mappings applied
  - Value mappings applied
  - Transformation rules applied
  - Validation results summary
  - Error summary
  - User resolution summary
  - Data quality notes
- [ ] Export formats: PDF, Excel
- [ ] Report saved and attached to implementation project
- [ ] Activity logged: "User generated migration report"

---

#### US-016-062: View Imported Records

As an **Implementation Specialist**, I want to view all records from a specific import
so that I can verify and audit the migration.

**Acceptance Criteria:**
- [ ] Filter any entity list by import_job_id
- [ ] Visual indicator on records showing "Imported from {source_system}"
- [ ] Link from record to import job details
- [ ] Bulk selection of imported records for operations
- [ ] Activity not logged (read operation)

---

### Epic 8: Incremental Import

#### US-016-070: Import Additional Data

As an **Implementation Specialist**, I want to add more data to an existing migration
so that I can handle phased data transfers.

**Acceptance Criteria:**
- [ ] Option to "Add to existing import" or "Create new import"
- [ ] Reuse mappings from previous import job
- [ ] Detect and skip duplicate records (by source_record_id)
- [ ] Update existing records option (controlled)
- [ ] Activity logged: "User performed incremental import: {new_count} new, {updated_count} updated, {skipped_count} skipped"

---

#### US-016-071: Update Existing Records

As an **Implementation Specialist**, I want to update previously imported records
so that I can correct data issues.

**Acceptance Criteria:**
- [ ] Match records by source_record_id
- [ ] Field-level update control (which fields to update)
- [ ] Preview changes before applying
- [ ] Audit trail shows original and updated values
- [ ] Rollback available for updates
- [ ] Activity logged: "User updated {count} records from import"

---

#### US-016-072: Attachment Import

As an **Implementation Specialist**, I want to import file attachments
so that historical evidence and documents are preserved.

**Acceptance Criteria:**
- [ ] Upload ZIP file containing attachments
- [ ] Naming convention maps files to records (record_id_filename.ext)
- [ ] Manifest file option (JSON/CSV mapping file names to records)
- [ ] Links attachments to imported entities
- [ ] Validates file integrity (size, type, optional checksum)
- [ ] Handles missing files gracefully (logs warning, continues)
- [ ] Storage quota tracked and enforced
- [ ] Activity logged: "User imported {count} attachments, {error_count} errors"

---

### Epic 9: Self-Service Import (Client)

#### US-016-080: Client CSV Import

As a **System Admin** (client), I want to import data via CSV
so that I can bulk update information without Ethico assistance.

**Acceptance Criteria:**
- [ ] Simplified UI for common import types:
  - Employees (from HRIS export)
  - Policies (bulk upload)
  - Disclosure responses (bulk processing)
  - Locations
  - Categories
- [ ] Download template for each type
- [ ] Drag-and-drop file upload
- [ ] Validation with clear error messages
- [ ] Preview before import
- [ ] Import history visible
- [ ] Activity logged: "Client admin {name} imported {count} {type} records"

**AI Enhancement:**
- AI validates data quality and suggests fixes

---

#### US-016-081: Import Templates

As a **System Admin** (client), I want to use import templates
so that I can easily format my data correctly.

**Acceptance Criteria:**
- [ ] Download template per entity type
- [ ] Template includes all fields with descriptions
- [ ] Required fields marked
- [ ] Sample data row included
- [ ] Enum values listed in comments
- [ ] Multiple formats: CSV, Excel
- [ ] Activity not logged (read operation)

---

### Epic 10: Migration Dashboard

#### US-016-090: Migration Dashboard (Implementation Portal)

As an **Implementation Specialist**, I want a migration dashboard
so that I can see all migrations across implementations.

**Acceptance Criteria:**
- [ ] Dashboard shows:
  - Active migrations in progress
  - Recent completed migrations
  - Failed migrations needing attention
  - Scheduled migrations
- [ ] Quick stats: total records migrated, success rate, common errors
- [ ] Filter by client, status, date range
- [ ] Drill-down to specific import job
- [ ] Activity not logged (read operation)

---

#### US-016-091: Real-Time Progress Monitoring

As an **Implementation Specialist**, I want to monitor multiple migrations simultaneously
so that I can manage my workload efficiently.

**Acceptance Criteria:**
- [ ] Multi-job progress view
- [ ] Status indicators: running, completed, failed, paused
- [ ] Alerts for errors or completion
- [ ] Estimated completion times
- [ ] One-click navigation to job details
- [ ] Activity not logged (read operation)

---

## 5. Feature Specifications

### F1: File Upload & Analysis

**Description:**
Initial file processing that accepts various formats, detects encoding, validates structure, and analyzes content to prepare for mapping.

**User Flow:**
1. User navigates to Import section
2. User selects import type (new migration or self-service import)
3. User uploads file(s) via drag-and-drop or file picker
4. System validates file format and encoding
5. System analyzes file structure
6. System presents analysis results with AI suggestions
7. User proceeds to field mapping

**Business Rules:**
- Maximum 500MB per file, 2GB per session
- Supported formats: CSV, Excel (.xlsx, .xls), JSON, ZIP
- Encoding detection: UTF-8, Latin-1, Windows-1252, auto-convert to UTF-8
- Minimum 1 record required to proceed
- Maximum 100,000 records per import job (split large files)

**AI Integration:**
- Source system detection from column names and patterns
- Data type inference from sample values
- Quality issue detection

**Error Handling:**
| Error Condition | User Message | System Action |
|-----------------|--------------|---------------|
| File too large | "File exceeds 500MB limit. Please split into smaller files." | Block upload |
| Unsupported format | "Unsupported file format. Please use CSV, Excel, or JSON." | Block upload |
| Corrupt file | "File appears to be corrupted. Please re-export from source." | Block upload |
| No data rows | "File contains headers only. No data to import." | Block processing |
| Encoding error | "Unable to detect encoding. Assuming UTF-8." | Attempt UTF-8 |

---

### F2: Field Mapping Engine

**Description:**
Intelligent field mapping system that uses AI to suggest mappings and provides a visual interface for review and adjustment.

**User Flow:**
1. System presents source columns and target fields
2. AI auto-maps fields with confidence scores
3. User reviews high-confidence mappings
4. User adjusts medium and low confidence mappings
5. User handles unmapped required fields
6. User decides what to do with unmapped source fields
7. User confirms final mapping

**Business Rules:**
- All required target fields must be mapped before validation
- Mapping saved per source system for reuse
- Multiple source columns can map to one target (concatenation)
- One source column can map to multiple targets (copy)
- Custom fields can be created on-the-fly

**AI Integration:**
- Field name similarity analysis
- Data type matching
- Sample value pattern recognition
- Historical mapping learning

---

### F3: Value Transformation Engine

**Description:**
Handles conversion of source values to target values, including enum mapping, date format conversion, and custom transformation rules.

**User Flow:**
1. System identifies fields requiring value mapping
2. System presents source values with frequency counts
3. AI suggests target value for each source value
4. User confirms or adjusts value mappings
5. User creates transformation rules for complex conversions
6. User tests transformations on sample data

**Business Rules:**
- Enum fields require explicit value mapping
- Unmapped enum values go to "Other" unless specified
- Date transformations are reversible (store original format info)
- Transformation rules are reusable

**AI Integration:**
- Semantic similarity for value matching
- Date format pattern detection
- Anomaly detection in values

---

### F4: Validation Engine

**Description:**
Comprehensive validation system that checks data quality, referential integrity, and business rules before import.

**Validation Categories:**

| Category | Description | Severity |
|----------|-------------|----------|
| **Required Field** | Field must have value | Error |
| **Data Type** | Value matches expected type | Error |
| **Format** | Value matches expected format (email, date) | Error |
| **Reference** | Referenced entity exists | Error or Warning |
| **Business Rule** | Domain-specific rules | Warning |
| **Quality** | Data quality concerns | Info |

**User Flow:**
1. User initiates validation
2. System processes all records in batches
3. System categorizes issues by severity
4. User reviews validation report
5. User fixes errors (required before import)
6. User acknowledges warnings
7. User re-validates after fixes

**Business Rules:**
- Errors block import until fixed
- Warnings allow import with acknowledgment
- Info items are for awareness only
- Validation can be run multiple times
- Results include row numbers for fixing source files

**AI Integration:**
- Pattern detection in errors (batch fix opportunities)
- Root cause analysis for systematic issues
- Fix suggestions based on issue type

---

### F5: Import Executor

**Description:**
Executes the actual import with transaction management, progress tracking, and error handling.

**User Flow:**
1. User confirms import after validation
2. System creates restore point
3. System processes records in batches
4. Progress updates in real-time
5. Errors logged without stopping (in skip mode)
6. Completion notification sent
7. User verifies imported data

**Business Rules:**
- Batch size: 100 records per transaction
- Restore point created before first batch
- All records tagged with import metadata
- Background processing for >1000 records
- 7-day rollback window
- Rate limiting: 2 concurrent imports per queue

**AI Integration:**
- AI monitors for anomalies during import
- AI suggests fixes for recurring errors

---

### F6: Rollback Manager

**Description:**
Manages import reversal with full and partial rollback capabilities.

**User Flow:**
1. User selects import job to rollback
2. System shows impact preview (records, relationships)
3. User confirms rollback
4. System removes records in reverse order (children first)
5. Completion notification sent
6. User verifies rollback

**Business Rules:**
- 7-day rollback window (configurable)
- Cascading deletes for child entities
- Records created after import preserved
- Audit trail preserved (activity log intact)
- Partial rollback available for specific records

---

## 6. Data Model

### 6.1 Import Job

**Purpose:** Tracks a single import operation from upload through completion

```prisma
model ImportJob {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Identity
  name                  String                    // "Cases Migration - Batch 1"
  reference_number      String   @unique         // "IMP-2026-00042-001"

  // Source
  source_system         SourceSystem              // NAVEX, EQS, etc.
  source_system_other   String?                   // If CUSTOM, specify name
  source_file_names     String[]                  // Uploaded file names
  source_file_paths     String[]                  // Storage paths
  source_record_count   Int                       // Records in source file

  // Target
  entity_type           ImportEntityType          // Cases, Policies, etc.

  // Status
  status                ImportStatus
  status_rationale      String?
  progress_percentage   Int      @default(0)
  current_batch         Int?
  total_batches         Int?

  // Mapping Configuration
  field_mapping_id      String?
  field_mapping         ImportFieldMapping? @relation(fields: [field_mapping_id], references: [id])
  value_mappings        Json?                     // { field: { source: target } }
  transformation_rules  Json?                     // Applied transformation rules
  user_resolution       Json?                     // { source_user: target_user_id }

  // Validation Results
  validation_status     ValidationStatus?
  validation_errors     Int      @default(0)
  validation_warnings   Int      @default(0)
  validation_info       Int      @default(0)
  validation_results    Json?                     // Detailed validation output
  validated_at          DateTime?

  // Import Results
  imported_count        Int?                      // Records successfully imported
  updated_count         Int?                      // Records updated (incremental)
  skipped_count         Int?                      // Duplicates skipped
  failed_count          Int?                      // Records that failed
  import_started_at     DateTime?
  import_completed_at   DateTime?

  // Restore Point
  restore_point_id      String?
  restore_point         ImportRestorePoint? @relation(fields: [restore_point_id], references: [id])
  rollback_available    Boolean  @default(false)
  rollback_expires_at   DateTime?

  // Rollback Info
  rolled_back_at        DateTime?
  rolled_back_by_id     String?
  rolled_back_by        User? @relation("ImportJobRollback", fields: [rolled_back_by_id], references: [id])
  rollback_reason       String?

  // AI Assistance
  ai_source_detection   Json?                     // { system, confidence, reasoning }
  ai_field_suggestions  Json?                     // AI-suggested field mappings
  ai_value_suggestions  Json?                     // AI-suggested value mappings
  ai_quality_issues     Json?                     // AI-detected data quality issues
  ai_model_version      String?

  // Execution Settings
  error_handling_mode   ErrorHandlingMode @default(SKIP_AND_CONTINUE)
  batch_size            Int      @default(100)
  is_dry_run            Boolean  @default(false)
  is_incremental        Boolean  @default(false)

  // Context
  implementation_project_id String?               // Link to implementation if during onboarding
  notes                 String?

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String
  created_by            User @relation("ImportJobCreator", fields: [created_by_id], references: [id])
  updated_by_id         String

  // Relations
  errors                ImportError[]
  imported_records      ImportedRecord[]
  activities            ImportActivity[]

  @@index([organization_id])
  @@index([status])
  @@index([source_system])
  @@index([entity_type])
  @@index([created_by_id])
  @@index([created_at])
}

enum SourceSystem {
  NAVEX_ETHICSPOINT
  EQS_INTEGRITY_LINE
  CASE_IQ
  ONETRUST_ETHICS
  CONVERCENT
  SAI_GLOBAL
  LIGHTHOUSE
  SPEAKUP
  EXCEL_CSV
  JSON
  CUSTOM
}

enum ImportEntityType {
  CASES                 // Creates RIU + Case
  INVESTIGATIONS
  POLICIES
  POLICY_VERSIONS
  DISCLOSURES
  DISCLOSURE_RESPONSES
  EMPLOYEES
  USERS
  CATEGORIES
  LOCATIONS
  BUSINESS_UNITS
  CUSTOM_FIELD_VALUES
  ATTACHMENTS
}

enum ImportStatus {
  CREATED               // Job created, no file yet
  FILE_UPLOADED         // File(s) uploaded
  ANALYZING             // Analyzing file structure
  ANALYSIS_COMPLETE     // Ready for mapping
  MAPPING_IN_PROGRESS   // User configuring mappings
  MAPPING_COMPLETE      // Ready for validation
  VALIDATING            // Validation running
  VALIDATION_FAILED     // Errors found, needs fixes
  VALIDATION_PASSED     // Ready to import
  READY_TO_IMPORT       // User confirmed, ready to execute
  IMPORTING             // Import in progress
  IMPORT_PAUSED         // User paused import
  COMPLETED             // Successfully completed
  COMPLETED_WITH_ERRORS // Completed but some records failed
  FAILED                // Import failed
  ROLLED_BACK           // Import was rolled back
  CANCELLED             // User cancelled
}

enum ValidationStatus {
  PENDING
  IN_PROGRESS
  PASSED
  PASSED_WITH_WARNINGS
  FAILED
}

enum ErrorHandlingMode {
  STOP_ON_ERROR         // Stop import on first error
  SKIP_AND_CONTINUE     // Log error, skip record, continue
  RETRY_THEN_SKIP       // Retry N times, then skip
}
```

### 6.2 Import Field Mapping

**Purpose:** Stores reusable field mapping configurations

```prisma
model ImportFieldMapping {
  id                    String   @id @default(uuid())
  organization_id       String?                   // Null = system-wide template
  organization          Organization? @relation(fields: [organization_id], references: [id])

  // Identity
  name                  String                    // "NAVEX EthicsPoint - Cases"
  description           String?

  // Source & Target
  source_system         SourceSystem
  entity_type           ImportEntityType

  // Mapping Definition
  mappings              Json                      // Array of ImportFieldMappingItem
  /*
  {
    "mappings": [
      {
        "source_column": "Case_ID",
        "target_field": "source_record_id",
        "confidence": 0.98,
        "transformation": null,
        "is_required": false
      },
      {
        "source_column": "Incident_Type",
        "target_field": "category_id",
        "confidence": 0.85,
        "transformation": "value_map",
        "is_required": true
      }
    ]
  }
  */

  // Metadata
  is_system_template    Boolean  @default(false)  // Pre-built by Ethico
  is_active             Boolean  @default(true)
  usage_count           Int      @default(0)      // How many times used

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String?
  updated_by_id         String?

  // Relations
  import_jobs           ImportJob[]

  @@unique([organization_id, source_system, entity_type, name])
  @@index([source_system, entity_type])
  @@index([is_system_template])
}
```

### 6.3 Import Error

**Purpose:** Tracks individual errors during import

```prisma
model ImportError {
  id                    String   @id @default(uuid())
  import_job_id         String
  import_job            ImportJob @relation(fields: [import_job_id], references: [id], onDelete: Cascade)

  // Location
  row_number            Int                       // Row in source file
  batch_number          Int?                      // Batch where error occurred
  source_record_id      String?                   // Source system ID if available

  // Error Details
  error_type            ImportErrorType
  error_code            String                    // Machine-readable code
  error_message         String                    // Human-readable message
  field_name            String?                   // Field that caused error
  field_value           String?                   // Value that caused error

  // Context
  source_row_data       Json?                     // Full row data for debugging
  stack_trace           String?                   // Technical details (internal)

  // Resolution
  is_resolved           Boolean  @default(false)
  resolution_type       ErrorResolutionType?
  resolution_notes      String?
  resolved_at           DateTime?
  resolved_by_id        String?

  // Timestamps
  created_at            DateTime @default(now())

  @@index([import_job_id])
  @@index([error_type])
  @@index([is_resolved])
}

enum ImportErrorType {
  VALIDATION_ERROR      // Data validation failed
  TRANSFORMATION_ERROR  // Value transformation failed
  REFERENCE_ERROR       // Referenced entity not found
  DUPLICATE_ERROR       // Record already exists
  CONSTRAINT_ERROR      // Database constraint violation
  PERMISSION_ERROR      // Permission denied
  SYSTEM_ERROR          // Unexpected system error
  TIMEOUT_ERROR         // Operation timed out
}

enum ErrorResolutionType {
  FIXED_AND_REIMPORTED  // Data fixed, record re-imported
  MANUALLY_CREATED      // Record created manually in platform
  SKIPPED               // Decided to skip this record
  NOT_NEEDED            // Record not needed
}
```

### 6.4 Imported Record Tracking

**Purpose:** Links imported entities to their source for audit and rollback

```prisma
model ImportedRecord {
  id                    String   @id @default(uuid())
  import_job_id         String
  import_job            ImportJob @relation(fields: [import_job_id], references: [id])
  organization_id       String

  // Source Reference
  source_system         SourceSystem
  source_record_id      String                    // Original ID in source system
  source_row_number     Int                       // Row number in import file

  // Target Reference
  entity_type           ImportEntityType
  entity_id             String                    // ID of created entity
  entity_reference      String?                   // Human-readable reference (e.g., case number)

  // Metadata
  was_updated           Boolean  @default(false)  // True if incremental update
  original_values       Json?                     // Values before update (for rollback)

  // Timestamps
  imported_at           DateTime @default(now())

  @@unique([import_job_id, entity_type, entity_id])
  @@unique([organization_id, source_system, source_record_id, entity_type])
  @@index([import_job_id])
  @@index([organization_id, entity_type])
  @@index([source_record_id])
}
```

### 6.5 Import Restore Point

**Purpose:** Enables rollback of imports

```prisma
model ImportRestorePoint {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Identity
  name                  String                    // "Pre-import: Cases Migration Batch 1"
  type                  RestorePointType

  // Scope
  entity_types          ImportEntityType[]        // What entity types are covered
  record_count          Int                       // Estimated records affected

  // Status
  status                RestorePointStatus
  expires_at            DateTime
  storage_size_bytes    BigInt?

  // Restore Data
  restore_data_path     String?                   // Path to backup data (if stored)
  restore_metadata      Json?                     // Additional restore information

  // Usage
  used_at               DateTime?                 // When restore was executed
  used_by_id            String?

  // Timestamps
  created_at            DateTime @default(now())
  created_by_id         String

  // Relations
  import_jobs           ImportJob[]

  @@index([organization_id])
  @@index([status])
  @@index([expires_at])
}

enum RestorePointType {
  AUTO_PRE_IMPORT       // Created automatically before import
  MANUAL                // Created manually by user
}

enum RestorePointStatus {
  ACTIVE                // Available for restore
  USED                  // Has been used for restore
  EXPIRED               // Past expiration date
  DELETED               // Manually deleted
}
```

### 6.6 Import Activity Log

**Purpose:** Immutable audit trail for import operations

```prisma
model ImportActivity {
  id                    String   @id @default(uuid())
  import_job_id         String
  import_job            ImportJob @relation(fields: [import_job_id], references: [id])
  organization_id       String

  // Action
  action                ImportAction
  action_description    String                    // Natural language description
  action_category       ImportActionCategory

  // Actor
  actor_user_id         String?
  actor_user            User? @relation(fields: [actor_user_id], references: [id])
  actor_type            ActorType                 // USER, SYSTEM, AI

  // Details
  details               Json?                     // Action-specific details
  changes               Json?                     // { field: { old, new } }

  // Context
  row_numbers           Int[]?                    // Affected rows if applicable
  record_count          Int?                      // Number of records affected

  // Metadata
  ip_address            String?
  user_agent            String?

  // Timestamp (immutable)
  created_at            DateTime @default(now())

  @@index([import_job_id, created_at])
  @@index([organization_id, created_at])
}

enum ImportAction {
  JOB_CREATED
  FILE_UPLOADED
  ANALYSIS_STARTED
  ANALYSIS_COMPLETED
  MAPPING_UPDATED
  VALUE_MAPPING_UPDATED
  TRANSFORMATION_ADDED
  USER_RESOLUTION_UPDATED
  VALIDATION_STARTED
  VALIDATION_COMPLETED
  VALIDATION_FAILED
  IMPORT_STARTED
  IMPORT_PROGRESS
  IMPORT_PAUSED
  IMPORT_RESUMED
  IMPORT_COMPLETED
  IMPORT_FAILED
  ROLLBACK_STARTED
  ROLLBACK_COMPLETED
  ERROR_LOGGED
  ERROR_RESOLVED
}

enum ImportActionCategory {
  SETUP
  MAPPING
  VALIDATION
  EXECUTION
  ROLLBACK
  ERROR
}

enum ActorType {
  USER
  SYSTEM
  AI
}
```

### 6.7 Value Mapping Template

**Purpose:** Reusable value mappings for enum fields

```prisma
model ImportValueMapping {
  id                    String   @id @default(uuid())
  organization_id       String?                   // Null = system-wide
  organization          Organization? @relation(fields: [organization_id], references: [id])

  // Identity
  name                  String                    // "NAVEX Status to Ethico Status"
  description           String?

  // Context
  source_system         SourceSystem
  source_field          String                    // "Case_Status"
  target_field          String                    // "status"

  // Mapping Definition
  mappings              Json                      // Array of { source, target, is_default }
  /*
  {
    "mappings": [
      { "source": "Open", "target": "open", "is_default": false },
      { "source": "In Progress", "target": "under_investigation", "is_default": false },
      { "source": "Closed", "target": "closed", "is_default": false },
      { "source": "*", "target": "other", "is_default": true }
    ]
  }
  */

  // Metadata
  is_system_template    Boolean  @default(false)
  usage_count           Int      @default(0)

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String?

  @@unique([organization_id, source_system, source_field, target_field])
  @@index([source_system])
}
```

### 6.8 Transformation Rule

**Purpose:** Reusable data transformation rules

```prisma
model ImportTransformationRule {
  id                    String   @id @default(uuid())
  organization_id       String?                   // Null = system-wide
  organization          Organization? @relation(fields: [organization_id], references: [id])

  // Identity
  name                  String                    // "NAVEX Date Format Conversion"
  description           String?

  // Rule Definition
  rule_type             TransformationRuleType
  rule_config           Json                      // Type-specific configuration
  /*
  DATE_FORMAT:
  {
    "input_format": "MM/DD/YYYY",
    "output_format": "YYYY-MM-DD",
    "handle_invalid": "null"
  }

  STRING_MANIPULATION:
  {
    "operations": [
      { "op": "trim" },
      { "op": "uppercase" },
      { "op": "prefix", "value": "LEGACY-" }
    ]
  }

  REGEX_REPLACE:
  {
    "pattern": "^EMP-",
    "replacement": "",
    "flags": "i"
  }

  LOOKUP:
  {
    "lookup_table": { "A": "Active", "I": "Inactive" },
    "default": "Unknown"
  }

  CONDITIONAL:
  {
    "conditions": [
      { "field": "status", "operator": "eq", "value": "Closed", "result": "closed" },
      { "field": "status", "operator": "contains", "value": "Open", "result": "open" }
    ],
    "default": "other"
  }
  */

  // Applicable To
  source_systems        SourceSystem[]            // Which source systems this applies to
  applicable_fields     String[]                  // Which fields this can be applied to

  // Metadata
  is_system_rule        Boolean  @default(false)
  usage_count           Int      @default(0)

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String?

  @@index([rule_type])
  @@index([source_systems])
}

enum TransformationRuleType {
  DATE_FORMAT           // Convert date formats
  STRING_MANIPULATION   // Trim, case change, prefix/suffix
  REGEX_REPLACE         // Regex-based replacement
  LOOKUP                // Simple lookup table
  CONDITIONAL           // If-then-else logic
  CONCATENATE           // Join multiple fields
  SPLIT                 // Split one field into multiple
  NUMERIC               // Numeric operations
  CUSTOM_SCRIPT         // Custom JavaScript (admin only)
}
```

---

## 7. API Specifications

### 7.1 Import Job Endpoints

```
# Job Management
POST    /api/v1/imports                           # Create import job
GET     /api/v1/imports                           # List import jobs
GET     /api/v1/imports/{id}                      # Get job details
PATCH   /api/v1/imports/{id}                      # Update job settings
DELETE  /api/v1/imports/{id}                      # Delete/cancel job

# Job Status
GET     /api/v1/imports/{id}/status               # Get current status
GET     /api/v1/imports/{id}/progress             # Get detailed progress
POST    /api/v1/imports/{id}/pause                # Pause import
POST    /api/v1/imports/{id}/resume               # Resume import
POST    /api/v1/imports/{id}/cancel               # Cancel import
```

**Create Import Job:**
```json
POST /api/v1/imports

Request:
{
  "name": "Cases Migration - January 2026",
  "entity_type": "CASES",
  "source_system": "NAVEX_ETHICSPOINT",
  "implementation_project_id": "uuid",  // Optional
  "notes": "Historical cases from legacy system"
}

Response (201):
{
  "id": "uuid",
  "reference_number": "IMP-2026-00001",
  "name": "Cases Migration - January 2026",
  "status": "CREATED",
  "entity_type": "CASES",
  "source_system": "NAVEX_ETHICSPOINT",
  "created_at": "2026-02-01T10:00:00Z",
  "created_by": {
    "id": "uuid",
    "name": "Jane Smith"
  }
}

Errors:
- 400: Invalid entity_type or source_system
- 403: Insufficient permissions
- 429: Too many concurrent imports
```

**Get Job Details:**
```json
GET /api/v1/imports/{id}

Response (200):
{
  "id": "uuid",
  "reference_number": "IMP-2026-00001",
  "name": "Cases Migration - January 2026",
  "status": "MAPPING_COMPLETE",
  "entity_type": "CASES",
  "source_system": "NAVEX_ETHICSPOINT",
  "source_file_names": ["navex-export-2024.csv"],
  "source_record_count": 2847,
  "progress_percentage": 0,
  "validation_status": null,
  "field_mapping": {
    "id": "uuid",
    "name": "NAVEX EthicsPoint - Cases",
    "mappings": [...]
  },
  "value_mappings": {...},
  "ai_suggestions": {
    "source_detection": {
      "system": "NAVEX_ETHICSPOINT",
      "confidence": 0.96
    },
    "field_mapping_confidence": 0.91,
    "quality_issues": 12
  },
  "created_at": "2026-02-01T10:00:00Z",
  "created_by": {
    "id": "uuid",
    "name": "Jane Smith"
  },
  "updated_at": "2026-02-01T14:30:00Z"
}
```

### 7.2 File Upload Endpoints

```
# File Operations
POST    /api/v1/imports/{id}/upload               # Upload file(s)
GET     /api/v1/imports/{id}/files                # List uploaded files
DELETE  /api/v1/imports/{id}/files/{fileId}       # Delete file

# Analysis
POST    /api/v1/imports/{id}/analyze              # Analyze uploaded files
GET     /api/v1/imports/{id}/analysis             # Get analysis results
```

**Upload File:**
```json
POST /api/v1/imports/{id}/upload
Content-Type: multipart/form-data

Request:
- file: <binary data>

Response (200):
{
  "file_id": "uuid",
  "file_name": "navex-export-2024.csv",
  "file_size": 15728640,
  "mime_type": "text/csv",
  "encoding_detected": "UTF-8",
  "upload_status": "completed",
  "analysis_status": "pending"
}

Errors:
- 400: Invalid file format
- 413: File too large
- 415: Unsupported media type
```

**Analyze Files:**
```json
POST /api/v1/imports/{id}/analyze

Response (200):
{
  "source_system_detection": {
    "system": "NAVEX_ETHICSPOINT",
    "confidence": 0.96,
    "reasoning": "Matched column pattern: Case_ID, Incident_Type, Report_Date"
  },
  "record_count": 2847,
  "column_count": 45,
  "date_range": {
    "earliest": "2019-01-15",
    "latest": "2025-12-28"
  },
  "columns": [
    {
      "name": "Case_ID",
      "position": 0,
      "data_type": "string",
      "sample_values": ["2024-00001", "2024-00002", "2024-00003"],
      "null_count": 0,
      "unique_count": 2847,
      "ai_suggestion": {
        "target_field": "source_record_id",
        "confidence": 0.98,
        "reasoning": "Unique identifier pattern"
      }
    },
    {
      "name": "Incident_Type",
      "position": 1,
      "data_type": "string",
      "sample_values": ["Harassment", "Theft", "Safety", "Discrimination"],
      "null_count": 12,
      "unique_count": 15,
      "requires_value_mapping": true,
      "ai_suggestion": {
        "target_field": "category_id",
        "confidence": 0.85,
        "reasoning": "Category classification field"
      }
    }
  ],
  "quality_summary": {
    "potential_issues": 12,
    "empty_required_fields": 8,
    "format_mismatches": 4,
    "recommendations": [
      "8 records missing Report_Date - can populate from Created_Date",
      "4 records have invalid Close_Date format - transformation available"
    ]
  }
}
```

### 7.3 Mapping Endpoints

```
# Field Mapping
GET     /api/v1/imports/{id}/mapping              # Get current mapping
PUT     /api/v1/imports/{id}/mapping              # Update mapping
POST    /api/v1/imports/{id}/mapping/apply-ai     # Apply all AI suggestions

# Value Mapping
GET     /api/v1/imports/{id}/value-mapping        # Get value mappings
PUT     /api/v1/imports/{id}/value-mapping        # Update value mappings
GET     /api/v1/imports/{id}/value-mapping/{field}/suggestions  # Get AI suggestions

# User Resolution
GET     /api/v1/imports/{id}/user-resolution      # Get user references
PUT     /api/v1/imports/{id}/user-resolution      # Update user mappings
POST    /api/v1/imports/{id}/user-resolution/auto # Auto-resolve by email

# Mapping Templates
GET     /api/v1/imports/templates                 # List available templates
POST    /api/v1/imports/templates                 # Create template from mapping
GET     /api/v1/imports/templates/{id}            # Get template details
DELETE  /api/v1/imports/templates/{id}            # Delete template
```

**Update Field Mapping:**
```json
PUT /api/v1/imports/{id}/mapping

Request:
{
  "mappings": [
    {
      "source_column": "Case_ID",
      "target_field": "source_record_id",
      "transformation": null
    },
    {
      "source_column": "Incident_Type",
      "target_field": "category_id",
      "transformation": "value_map"
    },
    {
      "source_column": "Report_Date",
      "target_field": "created_at",
      "transformation": "date_format",
      "transformation_config": {
        "input_format": "MM/DD/YYYY",
        "output_format": "ISO8601"
      }
    },
    {
      "source_column": "Custom_Field_7",
      "action": "create_custom_field",
      "custom_field_name": "Legacy Region",
      "custom_field_type": "DROPDOWN"
    }
  ]
}

Response (200):
{
  "id": "uuid",
  "mappings": [...],
  "unmapped_source_columns": [],
  "unmapped_required_fields": [],
  "is_complete": true,
  "updated_at": "2026-02-01T15:00:00Z"
}
```

**Get User Resolution:**
```json
GET /api/v1/imports/{id}/user-resolution

Response (200):
{
  "total_users": 67,
  "resolved_count": 45,
  "unresolved_count": 22,
  "users": [
    {
      "source_identifier": "jsmith@acme.com",
      "source_name": "John Smith",
      "occurrence_count": 156,
      "resolution_status": "resolved",
      "resolved_to": {
        "user_id": "uuid",
        "name": "John Smith",
        "email": "jsmith@acme.com"
      },
      "match_confidence": 1.0,
      "match_method": "email_exact"
    },
    {
      "source_identifier": "mjohnson",
      "source_name": "M. Johnson",
      "occurrence_count": 23,
      "resolution_status": "unresolved",
      "suggestions": [
        {
          "user_id": "uuid",
          "name": "Mary Johnson",
          "email": "mary.johnson@acme.com",
          "confidence": 0.75,
          "match_method": "name_fuzzy"
        },
        {
          "user_id": "uuid",
          "name": "Mike Johnson",
          "email": "mike.j@acme.com",
          "confidence": 0.65,
          "match_method": "name_fuzzy"
        }
      ]
    }
  ]
}
```

### 7.4 Validation Endpoints

```
# Validation
POST    /api/v1/imports/{id}/validate             # Run validation
GET     /api/v1/imports/{id}/validation           # Get validation status
GET     /api/v1/imports/{id}/validation/results   # Get detailed results
GET     /api/v1/imports/{id}/validation/errors    # Get errors only
```

**Run Validation:**
```json
POST /api/v1/imports/{id}/validate

Response (202):
{
  "validation_id": "uuid",
  "status": "in_progress",
  "estimated_duration_seconds": 45,
  "started_at": "2026-02-01T15:30:00Z"
}

// Poll for completion
GET /api/v1/imports/{id}/validation

Response (200):
{
  "status": "PASSED_WITH_WARNINGS",
  "completed_at": "2026-02-01T15:30:45Z",
  "summary": {
    "total_records": 2847,
    "valid_records": 2835,
    "errors": 0,
    "warnings": 156,
    "info": 23
  },
  "categories": {
    "required_field": { "errors": 0, "warnings": 89 },
    "data_type": { "errors": 0, "warnings": 0 },
    "format": { "errors": 0, "warnings": 4 },
    "reference": { "errors": 0, "warnings": 63 },
    "business_rule": { "errors": 0, "warnings": 0 },
    "quality": { "info": 23 }
  }
}
```

**Get Validation Results:**
```json
GET /api/v1/imports/{id}/validation/results?severity=warning&page=1&limit=50

Response (200):
{
  "data": [
    {
      "row_number": 145,
      "severity": "warning",
      "category": "required_field",
      "field": "category_id",
      "message": "Required field 'category_id' is empty",
      "source_value": null,
      "suggestion": "Will default to 'Other' category",
      "can_auto_fix": true,
      "auto_fix_action": "Use 'Other' category"
    },
    {
      "row_number": 892,
      "severity": "warning",
      "category": "reference",
      "field": "assigned_to",
      "message": "User reference 'mjohnson' not resolved",
      "source_value": "mjohnson",
      "suggestion": "Resolve user reference before import or leave unassigned",
      "can_auto_fix": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 156
  }
}
```

### 7.5 Import Execution Endpoints

```
# Execution
POST    /api/v1/imports/{id}/preview              # Preview sample records
POST    /api/v1/imports/{id}/dry-run              # Full dry run
POST    /api/v1/imports/{id}/execute              # Execute import
GET     /api/v1/imports/{id}/progress             # Get execution progress
POST    /api/v1/imports/{id}/pause                # Pause execution
POST    /api/v1/imports/{id}/resume               # Resume execution
POST    /api/v1/imports/{id}/cancel               # Cancel execution
```

**Preview Records:**
```json
POST /api/v1/imports/{id}/preview

Request:
{
  "sample_size": 10,
  "row_numbers": [1, 145, 892]  // Optional: specific rows
}

Response (200):
{
  "samples": [
    {
      "row_number": 1,
      "source_record": {
        "Case_ID": "2024-00001",
        "Incident_Type": "Harassment",
        "Report_Date": "01/15/2024",
        "Description": "Employee reported verbal harassment..."
      },
      "target_record": {
        "source_record_id": "2024-00001",
        "category": { "id": "uuid", "name": "Harassment" },
        "created_at": "2024-01-15T00:00:00Z",
        "description": "Employee reported verbal harassment..."
      },
      "transformations_applied": [
        { "field": "category", "rule": "value_map", "from": "Harassment", "to": "Harassment" },
        { "field": "created_at", "rule": "date_format", "from": "01/15/2024", "to": "2024-01-15T00:00:00Z" }
      ],
      "validation_issues": []
    }
  ]
}
```

**Execute Import:**
```json
POST /api/v1/imports/{id}/execute

Request:
{
  "error_handling_mode": "SKIP_AND_CONTINUE",
  "create_restore_point": true,
  "send_completion_notification": true
}

Response (202):
{
  "execution_id": "uuid",
  "status": "in_progress",
  "restore_point_id": "uuid",
  "estimated_duration_seconds": 180,
  "started_at": "2026-02-01T16:00:00Z"
}

// Progress updates
GET /api/v1/imports/{id}/progress

Response (200):
{
  "status": "IMPORTING",
  "progress_percentage": 67,
  "records_processed": 1907,
  "records_total": 2847,
  "records_succeeded": 1895,
  "records_failed": 12,
  "current_batch": 19,
  "total_batches": 29,
  "estimated_remaining_seconds": 45,
  "recent_errors": [
    {
      "row_number": 1756,
      "message": "Duplicate source_record_id: 2023-00456",
      "timestamp": "2026-02-01T16:02:34Z"
    }
  ]
}
```

### 7.6 Rollback Endpoints

```
# Rollback
GET     /api/v1/imports/{id}/rollback/preview     # Preview rollback impact
POST    /api/v1/imports/{id}/rollback             # Execute full rollback
POST    /api/v1/imports/{id}/rollback/partial     # Partial rollback

# Restore Points
GET     /api/v1/imports/restore-points            # List restore points
GET     /api/v1/imports/restore-points/{id}       # Get restore point details
DELETE  /api/v1/imports/restore-points/{id}       # Delete restore point
POST    /api/v1/imports/restore-points            # Create manual restore point
```

**Preview Rollback:**
```json
GET /api/v1/imports/{id}/rollback/preview

Response (200):
{
  "import_job": {
    "id": "uuid",
    "reference_number": "IMP-2026-00001",
    "imported_at": "2026-02-01T16:05:00Z"
  },
  "rollback_available": true,
  "rollback_expires_at": "2026-02-08T16:05:00Z",
  "impact": {
    "cases_to_remove": 2835,
    "rius_to_remove": 2835,
    "investigations_to_remove": 0,
    "attachments_to_remove": 4567,
    "custom_field_values_to_remove": 8502
  },
  "warnings": [
    "12 cases have been modified since import - changes will be lost",
    "3 investigations were created on imported cases - will also be removed"
  ]
}
```

**Execute Rollback:**
```json
POST /api/v1/imports/{id}/rollback

Request:
{
  "confirm": true,
  "reason": "Data mapping errors discovered, need to re-import"
}

Response (202):
{
  "rollback_id": "uuid",
  "status": "in_progress",
  "estimated_duration_seconds": 120,
  "started_at": "2026-02-02T09:00:00Z"
}
```

### 7.7 Report Endpoints

```
# Reports
GET     /api/v1/imports/{id}/report               # Generate migration report
GET     /api/v1/imports/{id}/errors/export        # Export errors to CSV
GET     /api/v1/imports/{id}/imported/export      # Export imported record list
```

**Generate Migration Report:**
```json
GET /api/v1/imports/{id}/report?format=pdf

Response (200):
Content-Type: application/pdf
Content-Disposition: attachment; filename="migration-report-IMP-2026-00001.pdf"

<binary PDF data>
```

### 7.8 Template Endpoints

```
# Download/Upload Templates
GET     /api/v1/imports/templates/download/{entityType}   # Download import template
GET     /api/v1/imports/templates/schema/{entityType}     # Get schema for entity
```

**Download Import Template:**
```json
GET /api/v1/imports/templates/download/CASES?format=csv

Response (200):
Content-Type: text/csv
Content-Disposition: attachment; filename="ethico-cases-import-template.csv"

source_record_id,category,severity,status,description,reported_date,reporter_type,assigned_to_email
LEGACY-001,Harassment,HIGH,open,"Description here",2024-01-15,anonymous,investigator@company.com
```

---

## 8. UI/UX Specifications

### Navigation Placement

**Implementation Portal (Ethico Staff):**
```
IMPLEMENTATION
├── Onboard       (Checklists)
├── Migrate       (Data Import Tools) ← This module
├── Configure     (Bulk Setup)
└── Health        (Dashboard)
```

**Client Platform (Client Admin):**
```
SETTINGS
├── Organization
├── Users
├── Import Data   ← Self-service imports
├── Integrations
└── Audit Log
```

### Key Screens

#### 8.1 Import Job List

**Purpose:** View and manage all import jobs

**Layout:**
- Header: "Data Imports" with "New Import" button
- Filters: Status, Entity Type, Date Range, Created By
- Table columns: Reference, Name, Entity Type, Source, Status, Records, Progress, Created, Actions
- Status badges: Color-coded by status
- Action menu: View, Continue, Rollback, Delete

**Components:**
- DataTable with sorting and pagination
- Status badges (shadcn/ui Badge)
- Progress bar for in-progress imports
- Quick action buttons

#### 8.2 New Import Wizard

**Purpose:** Step-by-step import creation

**Steps:**
1. **Setup** - Name, entity type, source system
2. **Upload** - File upload with drag-and-drop
3. **Analysis** - Review file analysis, AI suggestions
4. **Field Mapping** - Map source to target fields
5. **Value Mapping** - Map enum values
6. **User Resolution** - Resolve user references
7. **Validation** - Run and review validation
8. **Preview** - Review sample records
9. **Execute** - Confirm and import

**Layout:**
- Left sidebar: Step navigation with completion indicators
- Main content: Current step content
- Footer: Back/Next navigation, Save Draft

**Components:**
- Stepper (shadcn/ui Steps)
- File upload dropzone
- Split-pane field mapping interface
- Validation results accordion
- Preview comparison cards

#### 8.3 Field Mapping Interface

**Purpose:** Visual field mapping configuration

**Layout:**
```
+----------------------------------+----------------------------------+
|        SOURCE COLUMNS            |        TARGET FIELDS             |
+----------------------------------+----------------------------------+
| [Search...]                      | [Search...]                      |
+----------------------------------+----------------------------------+
| Case_ID              ------>     | source_record_id (string)    [x] |
|   String, 2847 unique            |   AI: 98% confidence             |
|   Sample: 2024-00001             |                                  |
+----------------------------------+----------------------------------+
| Incident_Type        ------>     | category_id (relation)       [!] |
|   String, 15 unique              |   AI: 85% - needs value map      |
|   Sample: Harassment, Theft      |                                  |
+----------------------------------+----------------------------------+
| Custom_Field_7       ------>     | [Select target or action...]     |
|   String, 4 unique               |   Options:                       |
|   Sample: Region A               |   - Map to existing field        |
|                                  |   - Create custom field          |
|                                  |   - Store in notes               |
|                                  |   - Ignore                       |
+----------------------------------+----------------------------------+
```

**Features:**
- Drag lines to connect source to target
- Click to expand and see details
- Color coding: Green (mapped), Yellow (needs review), Red (required unmapped)
- AI confidence badges
- Sample value preview

**Components:**
- Dual-panel layout with connection lines
- Expandable cards for field details
- Dropdown for unmapped field actions
- Search/filter inputs

#### 8.4 Value Mapping Interface

**Purpose:** Map source values to target values

**Layout:**
```
Field: Incident_Type → category_id

+------------------------+------------------------+------------------+
| SOURCE VALUE           | TARGET VALUE           | OCCURRENCES      |
+------------------------+------------------------+------------------+
| Harassment             | [Harassment       v]   | 456 records      |
|                        |   AI suggestion: 95%   |                  |
+------------------------+------------------------+------------------+
| Theft                  | [Theft            v]   | 234 records      |
|                        |   AI suggestion: 98%   |                  |
+------------------------+------------------------+------------------+
| Unknown Issue Type     | [Other            v]   | 12 records       |
|                        |   AI suggestion: 75%   |                  |
+------------------------+------------------------+------------------+
| [Unmapped values: 3]   | [Set default...]       | 8 records        |
+------------------------+------------------------+------------------+

[Accept All AI Suggestions]  [Clear All]  [Save Mapping as Template]
```

**Components:**
- Table with dropdowns
- Confidence indicators
- Bulk action buttons
- Template save option

#### 8.5 Validation Results

**Purpose:** Review and address validation issues

**Layout:**
```
Validation Summary
+----------------+----------------+----------------+
|    PASSED      |   WARNINGS     |     INFO       |
|     2,691      |      156       |       23       |
+----------------+----------------+----------------+

Issues by Category:
[v] Required Fields (89 warnings)
    Row 145: category_id is empty → Will default to "Other"
    Row 267: category_id is empty → Will default to "Other"
    [Show 87 more...]

[v] User References (67 warnings)
    Row 12: User 'mjohnson' not resolved → Needs manual resolution
    [Resolve All...]

[v] Data Quality (23 info)
    Row 456: Description exceeds 5000 characters → Will be truncated
    [Show 22 more...]

[Re-validate]  [Export Report]  [Proceed to Import →]
```

**Components:**
- Summary cards
- Collapsible sections by category
- Inline action buttons
- Export functionality

#### 8.6 Import Progress

**Purpose:** Monitor import execution

**Layout:**
```
Import Progress: Cases Migration - January 2026

+------------------------------------------------------------------+
|  [||||||||||||||||||||||||||||                    ] 67%           |
|  1,907 / 2,847 records                                           |
|  Batch 19 of 29 | Est. remaining: 45 seconds                     |
+------------------------------------------------------------------+

Statistics:
+----------------+----------------+----------------+
|   SUCCEEDED    |     FAILED     |    SKIPPED     |
|     1,895      |       12       |        0       |
+----------------+----------------+----------------+

Recent Errors:
+------+------------+------------------------------------------+
| Row  | Time       | Error                                    |
+------+------------+------------------------------------------+
| 1756 | 16:02:34   | Duplicate source_record_id: 2023-00456   |
| 1823 | 16:02:41   | Invalid date format in close_date        |
+------+------------+------------------------------------------+

[Pause]  [Cancel]
```

**Components:**
- Progress bar with percentage
- Statistics cards
- Live error log table
- Action buttons

#### 8.7 Migration Report View

**Purpose:** View and export migration summary

**Layout:**
```
Migration Report: IMP-2026-00001

Overview
+------------------+------------------+------------------+
| TOTAL IMPORTED   | SUCCESS RATE     | DURATION         |
|     2,835        |      99.6%       |    3m 24s        |
+------------------+------------------+------------------+

Source: NAVEX EthicsPoint
Files: navex-export-2024.csv (2,847 records)
Date Range: Jan 2019 - Dec 2025

Field Mappings: 41 fields mapped
Value Mappings: 4 fields with value transformations
User Resolutions: 67 users resolved

Errors: 12 records failed
- 8 duplicate source_record_id
- 4 invalid date format

[Download PDF]  [Download Excel]  [Share]
```

### AI Panel Design

**Location:** Right sidebar, collapsible
**Width:** 320px (collapsible to icon bar)

**Content Sections:**

1. **Analysis Summary**
   - Source system detected
   - Confidence score
   - Quality issues found

2. **Mapping Suggestions**
   - Unmapped fields with suggestions
   - Low confidence mappings to review
   - Click to apply suggestion

3. **Data Quality Insights**
   - Pattern detection in errors
   - Bulk fix opportunities
   - Recommendations

4. **Chat Interface**
   - Ask questions about the data
   - Get help with specific fields
   - Request transformation suggestions

**User Controls:**
- Collapse/expand panel
- Accept/reject suggestions
- "Apply all AI suggestions" button
- Confidence threshold slider

---

## 9. Competitor Field Mappings

### 9.1 NAVEX EthicsPoint to Ethico

| NAVEX Field | Ethico Field | Transformation | Notes |
|-------------|--------------|----------------|-------|
| `Case_ID` | `source_record_id` | None | Unique identifier |
| `Report_Date` | RIU.`created_at` | Date format | MM/DD/YYYY to ISO |
| `Incident_Type` | `category_id` | Value map | Lookup by name |
| `Incident_Description` | RIU.`description` | None | Direct copy |
| `Reporter_Type` | RIU.`reporter_type` | Value map | anonymous/identified |
| `Case_Status` | Case.`status` | Value map | See status mapping |
| `Assigned_To` | Case.`assigned_to_id` | User resolution | Match by email |
| `Resolution_Date` | Case.`closed_at` | Date format | |
| `Location_Code` | `location_id` | Lookup | By code or name |
| `Severity` | Case.`severity` | Value map | HIGH/MEDIUM/LOW |
| `Resolution_Code` | Case.`outcome` | Value map | Substantiated/etc |
| `Anonymous_Caller` | RIU.`is_anonymous` | Boolean | Y/N to true/false |
| `Callback_Number` | RIU.`callback_number` | None | Encrypted storage |
| `Attachments_Count` | (calculated) | None | Used for validation |
| `Investigation_Notes` | Investigation.`notes` | None | |
| `Remediation_Actions` | RemediationPlan | Parse | May need splitting |

**NAVEX Status Value Mapping:**

| NAVEX Status | Ethico Status |
|--------------|---------------|
| Open | `open` |
| In Progress | `under_investigation` |
| Pending Review | `pending_review` |
| Closed - Substantiated | `closed_substantiated` |
| Closed - Unsubstantiated | `closed_unsubstantiated` |
| Closed - Inconclusive | `closed_insufficient_evidence` |
| Closed - Policy Violation | `closed_substantiated` |
| Closed - No Violation | `closed_unsubstantiated` |
| Closed - Withdrawn | `closed_withdrawn` |

### 9.2 EQS Integrity Line to Ethico

| EQS Field | Ethico Field | Transformation | Notes |
|-----------|--------------|----------------|-------|
| `report_id` | `source_record_id` | None | |
| `received_date` | RIU.`created_at` | Date format | ISO format usually |
| `category` | `category_id` | Value map | |
| `message` | RIU.`description` | None | |
| `reporter_contact` | RIU.`reporter_contact` | Conditional | If not anonymous |
| `status` | Case.`status` | Value map | |
| `handler` | Case.`assigned_to_id` | User resolution | |
| `closed_date` | Case.`closed_at` | Date format | |
| `country` | `location_id` | Lookup | Country mapping |
| `company` | `business_unit_id` | Lookup | Subsidiary mapping |
| `priority` | Case.`severity` | Value map | |
| `decision` | Case.`outcome` | Value map | |

**EQS Status Value Mapping:**

| EQS Status | Ethico Status |
|------------|---------------|
| New | `new` |
| Being processed | `under_investigation` |
| Clarification requested | `pending_info` |
| Decided | `closed` |
| Archived | `closed` |

### 9.3 Case IQ to Ethico

| Case IQ Field | Ethico Field | Transformation | Notes |
|---------------|--------------|----------------|-------|
| `CaseNumber` | `source_record_id` | None | |
| `DateReported` | RIU.`created_at` | Date format | |
| `IssueType` | `category_id` | Value map | |
| `IssueDescription` | RIU.`description` | None | |
| `ReporterName` | RIU.`reporter_name` | Conditional | If identified |
| `Status` | Case.`status` | Value map | |
| `AssignedInvestigator` | Case.`assigned_to_id` | User resolution | |
| `DateClosed` | Case.`closed_at` | Date format | |
| `Location` | `location_id` | Lookup | |
| `Department` | `business_unit_id` | Lookup | |
| `Priority` | Case.`severity` | Value map | |
| `Outcome` | Case.`outcome` | Value map | |
| `RootCause` | Investigation.`root_cause` | None | |
| `CorrectiveAction` | RemediationPlan | Parse | |

### 9.4 OneTrust Ethics to Ethico

| OneTrust Field | Ethico Field | Transformation | Notes |
|----------------|--------------|----------------|-------|
| `incident_id` | `source_record_id` | None | |
| `created_date` | RIU.`created_at` | Date format | |
| `incident_type` | `category_id` | Value map | |
| `description` | RIU.`description` | None | |
| `anonymous` | RIU.`is_anonymous` | Boolean | |
| `workflow_status` | Case.`status` | Value map | |
| `assignee` | Case.`assigned_to_id` | User resolution | |
| `closed_date` | Case.`closed_at` | Date format | |
| `geo_location` | `location_id` | Lookup | |
| `business_unit` | `business_unit_id` | Lookup | |
| `risk_level` | Case.`severity` | Value map | |
| `resolution` | Case.`outcome` | Value map | |

---

## 10. Integration Points

### Internal Module Integrations

| Module | Integration Type | Data Exchanged |
|--------|------------------|----------------|
| **Case Management** | Target | Cases, Investigations created from import |
| **Disclosures** | Target | Disclosure responses imported |
| **Policy Management** | Target | Policies and versions imported |
| **Implementation Portal** | Source | Import jobs linked to implementation projects |
| **Core Data Model** | Reference | Users, Employees, Categories, Locations |
| **Audit Log** | Output | All import activities logged |
| **File Storage** | Dependency | Uploaded files, attachments stored in Azure Blob |
| **Background Jobs** | Dependency | Large imports run via BullMQ |

### External System Integrations

| System | Integration Method | Purpose |
|--------|-------------------|---------|
| **Azure Blob Storage** | Azure SDK | Store uploaded files, attachments, restore points |
| **Redis** | BullMQ | Background job queue for large imports |
| **PostgreSQL** | Prisma + RLS | Data storage with tenant isolation |
| **Anthropic Claude** | API | AI field mapping, value suggestions, quality analysis |

### HRIS Integration for User Resolution

When resolving user references, the import system queries the Employee table (synced from HRIS):

```typescript
// User resolution priority:
// 1. Exact email match (User.email)
// 2. Exact email match (Employee.email)
// 3. Name + email domain match
// 4. Fuzzy name match (AI-assisted)
// 5. Manual resolution required
```

---

## 11. Non-Functional Requirements

### Performance

| Metric | Target | Notes |
|--------|--------|-------|
| File upload | 10 MB/s | Chunked upload for large files |
| File analysis | < 30 seconds for 100K records | Background processing |
| Validation | 1,000 records/second | Parallel processing |
| Import execution | 500 records/second | Batched transactions |
| Preview generation | < 2 seconds | Cached results |
| Rollback | 1,000 records/second | Cascading deletes |

### Scalability

| Dimension | Limit | Notes |
|-----------|-------|-------|
| File size | 500 MB per file | Split larger files |
| Total upload | 2 GB per session | Multiple files combined |
| Records per job | 100,000 | Split into multiple jobs |
| Concurrent imports | 2 per organization | Queue additional |
| Restore points | 10 per organization | Auto-expire after 7 days |
| Mapping templates | 50 per organization | Plus system templates |

### Security

| Requirement | Implementation |
|-------------|----------------|
| Tenant isolation | organization_id on all tables, RLS enforced |
| File encryption | Azure Blob with SSE, client-side encryption optional |
| PII handling | Sensitive fields encrypted at rest |
| Access control | RBAC - only Implementation Specialist and System Admin roles |
| Audit trail | All actions logged to ImportActivity |
| Data retention | Uploaded files deleted after 30 days |
| Rollback window | 7 days (configurable per organization) |

### Reliability

| Requirement | Implementation |
|-------------|----------------|
| Transaction boundaries | 100 records per batch, rollback on failure |
| Idempotency | source_record_id prevents duplicate imports |
| Resume capability | Can resume paused imports |
| Error recovery | Skip and continue mode with detailed error log |
| Data integrity | Validation before import, checksums for files |

---

## 12. Checklist Verification

### AI-First Checklist Compliance

**Schema Design:**
- [x] Semantic field naming used throughout
- [x] Narrative fields (notes, descriptions) included
- [x] Activity log designed (ImportActivity)
- [x] Source tracking fields included (source_system, source_record_id, migrated_at)
- [x] AI enrichment fields included (ai_source_detection, ai_field_suggestions, ai_quality_issues)
- [x] Graceful degradation for sparse data (defaults, warnings vs errors)

**Feature Design:**
- [x] Chat interaction examples documented
- [x] AI assistance opportunities identified (field mapping, value mapping, quality detection)
- [x] Conversation storage planned (via ImportActivity)
- [x] AI action audit designed (ai_model_version tracked)
- [x] Migration impact assessed (this IS the migration module)
- [x] Structured + unstructured data captured

**API Design:**
- [x] AI-friendly responses with context
- [x] Bulk operations supported
- [x] Natural language processing for field analysis

**UI Design:**
- [x] AI panel space allocated (right sidebar)
- [x] Context preservation designed (wizard with state)
- [x] Self-service configuration enabled (client CSV imports)

**Cross-Cutting:**
- [x] organization_id on all tables
- [x] business_unit_id where applicable
- [x] Audit trail complete (ImportActivity)
- [x] PII handling documented (encrypted storage)

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Import Job** | A single import operation from file upload to completion |
| **Field Mapping** | Configuration that maps source columns to target fields |
| **Value Mapping** | Configuration that maps source enum values to target values |
| **Transformation Rule** | Logic that converts data from one format to another |
| **Restore Point** | Snapshot enabling rollback of an import |
| **User Resolution** | Process of matching source user references to platform users |
| **Dry Run** | Full import simulation without committing data |
| **Incremental Import** | Adding new records to an existing dataset |
| **Source System** | The legacy system data is being imported from |
| **RIU** | Risk Intelligence Unit - immutable input created from imported case |

---

## Appendix B: Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | February 2026 | Initial draft | Claude |

---

*End of PRD-016: Migration & Import Module*
