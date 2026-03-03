import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { CustomPropertiesService } from "./custom-properties.service";
import { PrismaService } from "../prisma/prisma.service";
import { CustomPropertyEntityType, PropertyDataType } from "@prisma/client";

describe("CustomPropertiesService", () => {
  let service: CustomPropertiesService;

  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockPropId = "prop-test-123";

  const mockDefinition = {
    id: mockPropId,
    organizationId: mockOrgId,
    entityType: CustomPropertyEntityType.CASE,
    name: "Risk Level",
    key: "risk_level",
    description: "Overall risk assessment",
    dataType: PropertyDataType.SELECT,
    isRequired: false,
    isActive: true,
    isVisible: true,
    defaultValue: null,
    options: [
      { value: "low", label: "Low" },
      { value: "high", label: "High" },
    ],
    validationRules: null,
    displayOrder: 0,
    groupName: null,
    helpText: null,
    placeholder: null,
    width: null,
    createdById: mockUserId,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    updatedAt: new Date("2026-01-15T10:00:00Z"),
  };

  const mockPrisma = {
    customPropertyDefinition: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomPropertiesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CustomPropertiesService>(CustomPropertiesService);
    jest.clearAllMocks();
  });

  describe("create", () => {
    const mockCreateDto = {
      entityType: CustomPropertyEntityType.CASE,
      name: "Risk Level",
      key: "risk_level",
      dataType: PropertyDataType.SELECT,
      options: [
        { value: "low", label: "Low" },
        { value: "high", label: "High" },
      ],
    };

    it("should create a custom property with valid key format", async () => {
      mockPrisma.customPropertyDefinition.findFirst.mockResolvedValue(null);
      mockPrisma.customPropertyDefinition.create.mockResolvedValue(
        mockDefinition,
      );

      const result = await service.create(mockOrgId, mockUserId, mockCreateDto);

      expect(result.key).toBe("risk_level");
      expect(mockPrisma.customPropertyDefinition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: mockOrgId,
            key: "risk_level",
            createdById: mockUserId,
          }),
        }),
      );
    });

    it("should throw BadRequestException for invalid key format (starting with number)", async () => {
      await expect(
        service.create(mockOrgId, mockUserId, {
          ...mockCreateDto,
          key: "1invalid",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for key with spaces", async () => {
      await expect(
        service.create(mockOrgId, mockUserId, {
          ...mockCreateDto,
          key: "has space",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException when key already exists for entity type", async () => {
      mockPrisma.customPropertyDefinition.findFirst.mockResolvedValue(
        mockDefinition,
      );

      await expect(
        service.create(mockOrgId, mockUserId, mockCreateDto),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw BadRequestException for SELECT type without options", async () => {
      mockPrisma.customPropertyDefinition.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockOrgId, mockUserId, {
          ...mockCreateDto,
          dataType: PropertyDataType.SELECT,
          options: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for MULTI_SELECT type without options", async () => {
      mockPrisma.customPropertyDefinition.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockOrgId, mockUserId, {
          ...mockCreateDto,
          dataType: PropertyDataType.MULTI_SELECT,
          options: undefined,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findById", () => {
    it("should return definition when found", async () => {
      mockPrisma.customPropertyDefinition.findFirst.mockResolvedValue(
        mockDefinition,
      );

      const result = await service.findById(mockOrgId, mockPropId);

      expect(result.id).toBe(mockPropId);
      expect(
        mockPrisma.customPropertyDefinition.findFirst,
      ).toHaveBeenCalledWith({
        where: { id: mockPropId, organizationId: mockOrgId },
      });
    });

    it("should throw NotFoundException when not found", async () => {
      mockPrisma.customPropertyDefinition.findFirst.mockResolvedValue(null);

      await expect(service.findById(mockOrgId, "non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findByEntityType", () => {
    it("should return active definitions for entity type", async () => {
      mockPrisma.customPropertyDefinition.findMany.mockResolvedValue([
        mockDefinition,
      ]);

      const result = await service.findByEntityType(
        mockOrgId,
        CustomPropertyEntityType.CASE,
      );

      expect(result).toHaveLength(1);
      expect(mockPrisma.customPropertyDefinition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
            entityType: CustomPropertyEntityType.CASE,
            isActive: true,
          }),
        }),
      );
    });
  });

  describe("findAll", () => {
    it("should return all active definitions grouped by entity type", async () => {
      const caseDefinition = {
        ...mockDefinition,
        entityType: CustomPropertyEntityType.CASE,
      };
      const personDefinition = {
        ...mockDefinition,
        id: "prop-2",
        entityType: CustomPropertyEntityType.PERSON,
      };
      mockPrisma.customPropertyDefinition.findMany.mockResolvedValue([
        caseDefinition,
        personDefinition,
      ]);

      const result = await service.findAll(mockOrgId);

      expect(result.data).toHaveLength(2);
      expect(result.grouped[CustomPropertyEntityType.CASE]).toHaveLength(1);
      expect(result.grouped[CustomPropertyEntityType.PERSON]).toHaveLength(1);
    });

    it("should include inactive definitions when includeInactive is true", async () => {
      mockPrisma.customPropertyDefinition.findMany.mockResolvedValue([]);

      await service.findAll(mockOrgId, true);

      expect(mockPrisma.customPropertyDefinition.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
          }),
        }),
      );
      // When includeInactive=true, isActive should NOT be in the where clause
      const callArgs =
        mockPrisma.customPropertyDefinition.findMany.mock.calls[0][0];
      expect(callArgs.where.isActive).toBeUndefined();
    });
  });

  describe("update", () => {
    it("should update property when it exists", async () => {
      mockPrisma.customPropertyDefinition.findFirst.mockResolvedValue(
        mockDefinition,
      );
      mockPrisma.customPropertyDefinition.update.mockResolvedValue({
        ...mockDefinition,
        name: "Updated Risk Level",
      });

      const result = await service.update(mockOrgId, mockPropId, {
        name: "Updated Risk Level",
      });

      expect(result.name).toBe("Updated Risk Level");
    });

    it("should throw NotFoundException when property not found", async () => {
      mockPrisma.customPropertyDefinition.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockOrgId, "non-existent", { name: "New Name" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("delete", () => {
    it("should soft-delete by setting isActive to false", async () => {
      mockPrisma.customPropertyDefinition.findFirst.mockResolvedValue(
        mockDefinition,
      );
      mockPrisma.customPropertyDefinition.update.mockResolvedValue({
        ...mockDefinition,
        isActive: false,
      });

      await service.delete(mockOrgId, mockPropId);

      expect(mockPrisma.customPropertyDefinition.update).toHaveBeenCalledWith({
        where: { id: mockPropId },
        data: { isActive: false },
      });
    });
  });

  describe("validateValues", () => {
    it("should return valid: true for valid values", async () => {
      mockPrisma.customPropertyDefinition.findMany.mockResolvedValue([
        {
          ...mockDefinition,
          key: "risk_level",
          dataType: PropertyDataType.SELECT,
          isRequired: false,
          options: [{ value: "low", label: "Low" }],
          validationRules: null,
          defaultValue: null,
        },
      ]);

      const result = await service.validateValues(
        mockOrgId,
        CustomPropertyEntityType.CASE,
        { risk_level: "low" },
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return errors for required field with no value", async () => {
      mockPrisma.customPropertyDefinition.findMany.mockResolvedValue([
        {
          ...mockDefinition,
          key: "required_field",
          dataType: PropertyDataType.TEXT,
          isRequired: true,
          options: null,
          validationRules: null,
          defaultValue: null,
        },
      ]);

      const result = await service.validateValues(
        mockOrgId,
        CustomPropertyEntityType.CASE,
        {},
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].key).toBe("required_field");
    });

    it("should return errors for invalid SELECT option", async () => {
      mockPrisma.customPropertyDefinition.findMany.mockResolvedValue([
        {
          ...mockDefinition,
          key: "risk_level",
          dataType: PropertyDataType.SELECT,
          isRequired: false,
          options: [{ value: "low", label: "Low" }],
          validationRules: null,
          defaultValue: null,
        },
      ]);

      const result = await service.validateValues(
        mockOrgId,
        CustomPropertyEntityType.CASE,
        { risk_level: "invalid_option" },
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0].key).toBe("risk_level");
    });
  });
});
