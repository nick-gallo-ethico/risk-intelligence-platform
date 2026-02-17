import { Test, TestingModule } from "@nestjs/testing";
import { SegmentConverterService } from "./segment-converter.service";
import { TargetingMode } from "../dto/campaign-targeting.dto";
import { SegmentLogic, SegmentField, SegmentOperator } from "../dto/segment-criteria.dto";

describe("SegmentConverterService", () => {
  let service: SegmentConverterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SegmentConverterService],
    }).compile();

    service = module.get<SegmentConverterService>(SegmentConverterService);
  });

  describe("convertToSegmentCriteria", () => {
    it("should return empty conditions for ALL mode", () => {
      const result = service.convertToSegmentCriteria({
        mode: TargetingMode.ALL,
      });

      expect(result.logic).toBe(SegmentLogic.AND);
      expect(result.conditions).toEqual([]);
    });

    it("should convert simple department criteria", () => {
      const result = service.convertToSegmentCriteria({
        mode: TargetingMode.SIMPLE,
        simple: { departments: ["dept-1", "dept-2"] },
      });

      expect(result.conditions).toContainEqual({
        field: SegmentField.DEPARTMENT_ID,
        operator: SegmentOperator.IN,
        value: ["dept-1", "dept-2"],
      });
    });

    it("should convert simple business unit criteria", () => {
      const result = service.convertToSegmentCriteria({
        mode: TargetingMode.SIMPLE,
        simple: { businessUnits: ["bu-1"] },
      });

      expect(result.conditions).toContainEqual({
        field: SegmentField.BUSINESS_UNIT_ID,
        operator: SegmentOperator.IN,
        value: ["bu-1"],
      });
    });

    it("should convert simple division criteria", () => {
      const result = service.convertToSegmentCriteria({
        mode: TargetingMode.SIMPLE,
        simple: { divisions: ["div-1"] },
      });

      expect(result.conditions).toContainEqual({
        field: SegmentField.DIVISION_ID,
        operator: SegmentOperator.IN,
        value: ["div-1"],
      });
    });

    it("should convert simple location criteria", () => {
      const result = service.convertToSegmentCriteria({
        mode: TargetingMode.SIMPLE,
        simple: { locations: ["loc-1", "loc-2"] },
      });

      expect(result.conditions).toContainEqual({
        field: SegmentField.LOCATION_ID,
        operator: SegmentOperator.IN,
        value: ["loc-1", "loc-2"],
      });
    });

    it("should convert advanced job level criteria", () => {
      const result = service.convertToSegmentCriteria({
        mode: TargetingMode.ADVANCED,
        advanced: { jobLevels: ["MANAGER", "DIRECTOR"] },
      });

      expect(result.conditions).toContainEqual({
        field: SegmentField.JOB_LEVEL,
        operator: SegmentOperator.IN,
        value: ["MANAGER", "DIRECTOR"],
      });
    });

    it("should convert advanced work mode criteria", () => {
      const result = service.convertToSegmentCriteria({
        mode: TargetingMode.ADVANCED,
        advanced: { workModes: ["REMOTE", "HYBRID"] },
      });

      expect(result.conditions).toContainEqual({
        field: SegmentField.WORK_MODE,
        operator: SegmentOperator.IN,
        value: ["REMOTE", "HYBRID"],
      });
    });

    it("should convert advanced primary language criteria", () => {
      const result = service.convertToSegmentCriteria({
        mode: TargetingMode.ADVANCED,
        advanced: { primaryLanguages: ["en", "es"] },
      });

      expect(result.conditions).toContainEqual({
        field: SegmentField.PRIMARY_LANGUAGE,
        operator: SegmentOperator.IN,
        value: ["en", "es"],
      });
    });

    it("should convert tenure min days to hire date filter", () => {
      const result = service.convertToSegmentCriteria({
        mode: TargetingMode.ADVANCED,
        advanced: { tenureMinDays: 90 },
      });

      expect(result.conditions).toBeDefined();
      const hireDateCondition = result.conditions?.find(
        (c) =>
          c.field === SegmentField.HIRE_DATE &&
          c.operator === SegmentOperator.LESS_THAN_OR_EQUALS,
      );
      expect(hireDateCondition).toBeDefined();
      expect(typeof hireDateCondition?.value).toBe("string");
    });

    it("should convert tenure max days to hire date filter", () => {
      const result = service.convertToSegmentCriteria({
        mode: TargetingMode.ADVANCED,
        advanced: { tenureMaxDays: 30 },
      });

      expect(result.conditions).toBeDefined();
      const hireDateCondition = result.conditions?.find(
        (c) =>
          c.field === SegmentField.HIRE_DATE &&
          c.operator === SegmentOperator.GREATER_THAN_OR_EQUALS,
      );
      expect(hireDateCondition).toBeDefined();
    });

    it("should combine multiple simple criteria", () => {
      const result = service.convertToSegmentCriteria({
        mode: TargetingMode.SIMPLE,
        simple: {
          departments: ["dept-1"],
          locations: ["loc-1"],
        },
      });

      expect(result.conditions).toHaveLength(2);
    });

    it("should handle empty simple criteria", () => {
      const result = service.convertToSegmentCriteria({
        mode: TargetingMode.SIMPLE,
        simple: {},
      });

      expect(result.conditions).toEqual([]);
    });

    it("should handle empty advanced criteria", () => {
      const result = service.convertToSegmentCriteria({
        mode: TargetingMode.ADVANCED,
        advanced: {},
      });

      expect(result.conditions).toEqual([]);
    });
  });
});
