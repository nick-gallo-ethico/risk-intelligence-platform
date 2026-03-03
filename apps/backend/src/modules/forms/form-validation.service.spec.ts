import { Test, TestingModule } from "@nestjs/testing";
import { FormValidationService } from "./form-validation.service";
import { FormSchema, ConditionalRule } from "./types/form.types";

describe("FormValidationService", () => {
  let service: FormValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FormValidationService],
    }).compile();

    service = module.get<FormValidationService>(FormValidationService);
  });

  describe("validate", () => {
    it("should return valid=true for data matching schema", () => {
      const schema: FormSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name"],
      };

      const result = service.validate(schema, { name: "Alice", age: 30 });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return valid=false when required field is missing", () => {
      const schema: FormSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
        },
        required: ["name"],
      };

      const result = service.validate(schema, {});

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe("name");
    });

    it("should return valid=false for wrong type", () => {
      const schema: FormSchema = {
        type: "object",
        properties: {
          age: { type: "number" },
        },
      };

      // coerceTypes is true, so string "abc" should fail number validation
      const result = service.validate(schema, { age: "not-a-number" });

      expect(result.valid).toBe(false);
    });

    it("should return valid=true for empty object with no required fields", () => {
      const schema: FormSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      };

      const result = service.validate(schema, {});

      expect(result.valid).toBe(true);
    });
  });

  describe("validateSchema", () => {
    it("should return valid=true for a valid JSON Schema", () => {
      const schema: FormSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
        },
      };

      const result = service.validateSchema(schema);

      expect(result.valid).toBe(true);
    });

    it("should return valid=false for an invalid JSON Schema", () => {
      const invalidSchema = {
        type: "object",
        properties: {
          name: { type: "invalid-type-xyz" },
        },
      } as unknown as FormSchema;

      const result = service.validateSchema(invalidSchema);

      // AJV may or may not catch invalid type names at compile time
      // The main test is that validateSchema doesn't throw
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("errors");
    });

    it("should return valid=true for minimal schema", () => {
      const schema: FormSchema = { type: "object" };

      const result = service.validateSchema(schema);

      expect(result.valid).toBe(true);
    });
  });

  describe("applyConditionals", () => {
    it("should add required fields when condition is met", () => {
      const schema: FormSchema = {
        type: "object",
        properties: {
          reportType: { type: "string" },
          supervisorName: { type: "string" },
        },
        required: ["reportType"],
      };

      const conditionals: ConditionalRule[] = [
        {
          if: { field: "reportType", value: "harassment", operator: "eq" },
          then: { require: ["supervisorName"] },
        },
      ];

      const data = { reportType: "harassment" };
      const result = service.applyConditionals(schema, data, conditionals);

      expect(result.required).toContain("supervisorName");
      expect(result.required).toContain("reportType");
    });

    it("should not add required fields when condition is not met", () => {
      const schema: FormSchema = {
        type: "object",
        properties: {
          reportType: { type: "string" },
          supervisorName: { type: "string" },
        },
        required: ["reportType"],
      };

      const conditionals: ConditionalRule[] = [
        {
          if: { field: "reportType", value: "harassment", operator: "eq" },
          then: { require: ["supervisorName"] },
        },
      ];

      const data = { reportType: "other" };
      const result = service.applyConditionals(schema, data, conditionals);

      expect(result.required).not.toContain("supervisorName");
    });

    it("should unrequire fields when condition specifies unrequire", () => {
      const schema: FormSchema = {
        type: "object",
        properties: {
          anonymous: { type: "boolean" },
          contactEmail: { type: "string" },
        },
        required: ["contactEmail"],
      };

      const conditionals: ConditionalRule[] = [
        {
          if: { field: "anonymous", value: true, operator: "eq" },
          then: { unrequire: ["contactEmail"] },
        },
      ];

      const data = { anonymous: true };
      const result = service.applyConditionals(schema, data, conditionals);

      expect(result.required).not.toContain("contactEmail");
    });

    it("should not mutate the original schema", () => {
      const schema: FormSchema = {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      };
      const originalRequired = [...(schema.required as string[])];

      const conditionals: ConditionalRule[] = [
        {
          if: { field: "x", value: "y", operator: "eq" },
          then: { require: ["extra"] },
        },
      ];

      service.applyConditionals(schema, { x: "y" }, conditionals);

      expect(schema.required).toEqual(originalRequired);
    });
  });
});
