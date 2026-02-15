import { Injectable, Logger } from "@nestjs/common";
import {
  TargetingCriteriaDto,
  TargetingMode,
} from "../dto/campaign-targeting.dto";
import {
  SegmentCriteria,
  SegmentCondition,
  SegmentOperator,
  SegmentField,
  SegmentLogic,
} from "../dto/segment-criteria.dto";

/**
 * SegmentConverterService handles conversion between TargetingCriteria and SegmentCriteria.
 *
 * This service extracts the segment conversion logic from CampaignTargetingService,
 * providing focused responsibility for:
 * - Converting TargetingCriteriaDto to legacy SegmentCriteria format
 * - Interoperability with existing SegmentQueryBuilder
 * - Simple mode to segment conditions mapping
 * - Advanced mode to segment conditions mapping
 *
 * Used by CampaignTargetingService as a thin coordinator delegate.
 */
@Injectable()
export class SegmentConverterService {
  private readonly logger = new Logger(SegmentConverterService.name);

  /**
   * Convert targeting criteria to legacy SegmentCriteria format.
   * For interoperability with existing SegmentQueryBuilder.
   *
   * @param criteria - The targeting criteria to convert
   * @returns SegmentCriteria compatible with SegmentQueryBuilder
   */
  convertToSegmentCriteria(criteria: TargetingCriteriaDto): SegmentCriteria {
    if (criteria.mode === TargetingMode.ALL) {
      return {
        logic: SegmentLogic.AND,
        conditions: [],
      };
    }

    const conditions: SegmentCondition[] = [];

    if (criteria.mode === TargetingMode.SIMPLE && criteria.simple) {
      this.addSimpleModeConditions(criteria.simple, conditions);
    }

    if (criteria.mode === TargetingMode.ADVANCED && criteria.advanced) {
      this.addAdvancedModeConditions(criteria.advanced, conditions);
    }

    return {
      logic: SegmentLogic.AND,
      conditions,
    };
  }

  /**
   * Add conditions from simple targeting mode.
   */
  private addSimpleModeConditions(
    simple: TargetingCriteriaDto["simple"],
    conditions: SegmentCondition[],
  ): void {
    if (!simple) return;

    if (simple.departments && simple.departments.length > 0) {
      conditions.push({
        field: SegmentField.DEPARTMENT_ID,
        operator: SegmentOperator.IN,
        value: simple.departments,
      });
    }

    if (simple.businessUnits && simple.businessUnits.length > 0) {
      conditions.push({
        field: SegmentField.BUSINESS_UNIT_ID,
        operator: SegmentOperator.IN,
        value: simple.businessUnits,
      });
    }

    if (simple.divisions && simple.divisions.length > 0) {
      conditions.push({
        field: SegmentField.DIVISION_ID,
        operator: SegmentOperator.IN,
        value: simple.divisions,
      });
    }

    if (simple.locations && simple.locations.length > 0) {
      conditions.push({
        field: SegmentField.LOCATION_ID,
        operator: SegmentOperator.IN,
        value: simple.locations,
      });
    }
  }

  /**
   * Add conditions from advanced targeting mode.
   */
  private addAdvancedModeConditions(
    advanced: TargetingCriteriaDto["advanced"],
    conditions: SegmentCondition[],
  ): void {
    if (!advanced) return;

    if (advanced.jobLevels && advanced.jobLevels.length > 0) {
      conditions.push({
        field: SegmentField.JOB_LEVEL,
        operator: SegmentOperator.IN,
        value: advanced.jobLevels,
      });
    }

    if (advanced.workModes && advanced.workModes.length > 0) {
      conditions.push({
        field: SegmentField.WORK_MODE,
        operator: SegmentOperator.IN,
        value: advanced.workModes,
      });
    }

    if (advanced.primaryLanguages && advanced.primaryLanguages.length > 0) {
      conditions.push({
        field: SegmentField.PRIMARY_LANGUAGE,
        operator: SegmentOperator.IN,
        value: advanced.primaryLanguages,
      });
    }

    // Tenure filters: convert days to hire date constraints
    if (advanced.tenureMinDays !== undefined) {
      const maxHireDate = new Date();
      maxHireDate.setDate(maxHireDate.getDate() - advanced.tenureMinDays);
      conditions.push({
        field: SegmentField.HIRE_DATE,
        operator: SegmentOperator.LESS_THAN_OR_EQUALS,
        value: maxHireDate.toISOString(),
      });
    }

    if (advanced.tenureMaxDays !== undefined) {
      const minHireDate = new Date();
      minHireDate.setDate(minHireDate.getDate() - advanced.tenureMaxDays);
      conditions.push({
        field: SegmentField.HIRE_DATE,
        operator: SegmentOperator.GREATER_THAN_OR_EQUALS,
        value: minHireDate.toISOString(),
      });
    }
  }
}
