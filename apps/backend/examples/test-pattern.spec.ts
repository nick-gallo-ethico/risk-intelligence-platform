// =============================================================================
// UNIT TEST PATTERN - All unit tests MUST follow this structure
// =============================================================================
//
// This is the canonical pattern for all unit tests in the Risk Intelligence Platform.
// Copy this structure when creating new tests.
//
// KEY REQUIREMENTS:
// 1. Mock all dependencies
// 2. Test happy path AND error cases
// 3. Test tenant isolation logic
// 4. Use descriptive test names
// 5. Group related tests with describe blocks
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ExampleService } from './example.service';
import { PrismaService } from '../modules/prisma/prisma.service';
import { ActivityService } from '../common/services/activity.service';
import { ExampleStatus } from '@prisma/client';

describe('ExampleService', () => {
  let service: ExampleService;
  let prisma: jest.Mocked<PrismaService>;
  let activityService: jest.Mocked<ActivityService>;

  // -------------------------------------------------------------------------
  // Test Data Fixtures
  // -------------------------------------------------------------------------
  const mockOrgId = 'org-test-123';
  const mockUserId = 'user-test-123';
  const mockEntityId = 'entity-test-123';

  const mockEntity = {
    id: mockEntityId,
    name: 'Test Entity',
    description: 'Test description',
    status: ExampleStatus.DRAFT,
    organizationId: mockOrgId,
    createdById: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: { id: mockUserId, name: 'Test User', email: 'test@example.com' },
  };

  const mockCreateDto = {
    name: 'New Entity',
    description: 'New description',
  };

  // -------------------------------------------------------------------------
  // Mock Setup
  // -------------------------------------------------------------------------
  const mockPrismaService = {
    example: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockActivityService = {
    log: jest.fn(),
  };

  // -------------------------------------------------------------------------
  // Module Setup
  // -------------------------------------------------------------------------
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExampleService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ActivityService, useValue: mockActivityService },
      ],
    }).compile();

    service = module.get<ExampleService>(ExampleService);
    prisma = module.get(PrismaService);
    activityService = module.get(ActivityService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // describe('create') - Group related tests
  // -------------------------------------------------------------------------
  describe('create', () => {
    it('should create entity with correct organization and user', async () => {
      // Arrange
      mockPrismaService.example.create.mockResolvedValue(mockEntity);

      // Act
      const result = await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(prisma.example.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...mockCreateDto,
          organizationId: mockOrgId,  // CRITICAL: Org from parameter
          createdById: mockUserId,
          status: ExampleStatus.DRAFT,
        }),
        include: expect.any(Object),
      });
      expect(result).toEqual(mockEntity);
    });

    it('should log activity on create', async () => {
      // Arrange
      mockPrismaService.example.create.mockResolvedValue(mockEntity);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(activityService.log).toHaveBeenCalledWith({
        entityType: 'EXAMPLE',
        entityId: mockEntityId,
        action: 'created',
        actionDescription: expect.stringContaining('Created'),
        actorUserId: mockUserId,
        organizationId: mockOrgId,
        metadata: expect.any(Object),
      });
    });

    it('should set default status to DRAFT', async () => {
      // Arrange
      mockPrismaService.example.create.mockResolvedValue(mockEntity);

      // Act
      await service.create(mockCreateDto, mockUserId, mockOrgId);

      // Assert
      expect(prisma.example.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ExampleStatus.DRAFT,
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('findOne') - Including tenant isolation tests
  // -------------------------------------------------------------------------
  describe('findOne', () => {
    it('should return entity when found in organization', async () => {
      // Arrange
      mockPrismaService.example.findFirst.mockResolvedValue(mockEntity);

      // Act
      const result = await service.findOne(mockEntityId, mockOrgId);

      // Assert
      expect(result).toEqual(mockEntity);
      expect(prisma.example.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockEntityId,
          organizationId: mockOrgId, // CRITICAL: Must filter by org
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when entity does not exist', async () => {
      // Arrange
      mockPrismaService.example.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findOne('non-existent-id', mockOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    // CRITICAL: Tenant isolation test
    it('should throw NotFoundException when entity belongs to different org', async () => {
      // Arrange - Entity exists but in different org
      mockPrismaService.example.findFirst.mockResolvedValue(null);

      // Act & Assert - Should get 404, not the entity
      await expect(
        service.findOne(mockEntityId, 'different-org-id'),
      ).rejects.toThrow(NotFoundException);

      // Verify query included org filter
      expect(prisma.example.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'different-org-id',
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('update') - Including activity logging tests
  // -------------------------------------------------------------------------
  describe('update', () => {
    it('should update entity and log changes', async () => {
      // Arrange
      const updateDto = { name: 'Updated Name' };
      const updatedEntity = { ...mockEntity, ...updateDto };

      mockPrismaService.example.findFirst.mockResolvedValue(mockEntity);
      mockPrismaService.example.update.mockResolvedValue(updatedEntity);

      // Act
      const result = await service.update(
        mockEntityId,
        updateDto,
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.name).toBe('Updated Name');
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'updated',
          changes: expect.objectContaining({
            oldValue: expect.objectContaining({ name: mockEntity.name }),
            newValue: expect.objectContaining({ name: 'Updated Name' }),
          }),
        }),
      );
    });

    it('should throw NotFoundException for entity in different org', async () => {
      // Arrange
      mockPrismaService.example.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update(mockEntityId, { name: 'Hack' }, mockUserId, 'other-org'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // describe('changeStatus') - State machine tests
  // -------------------------------------------------------------------------
  describe('changeStatus', () => {
    it('should allow valid transition DRAFT -> ACTIVE', async () => {
      // Arrange
      const activeEntity = { ...mockEntity, status: ExampleStatus.ACTIVE };
      mockPrismaService.example.findFirst.mockResolvedValue(mockEntity);
      mockPrismaService.example.update.mockResolvedValue(activeEntity);

      // Act
      const result = await service.changeStatus(
        mockEntityId,
        ExampleStatus.ACTIVE,
        'Approved by manager',
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(result.status).toBe(ExampleStatus.ACTIVE);
    });

    it('should reject invalid transition DRAFT -> ARCHIVED', async () => {
      // Arrange - Entity in DRAFT status
      mockPrismaService.example.findFirst.mockResolvedValue(mockEntity);

      // Act & Assert - DRAFT -> ARCHIVED is not allowed
      await expect(
        service.changeStatus(
          mockEntityId,
          ExampleStatus.ARCHIVED,
          'Invalid transition',
          mockUserId,
          mockOrgId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should log status change with rationale', async () => {
      // Arrange
      mockPrismaService.example.findFirst.mockResolvedValue(mockEntity);
      mockPrismaService.example.update.mockResolvedValue({
        ...mockEntity,
        status: ExampleStatus.ACTIVE,
      });

      // Act
      await service.changeStatus(
        mockEntityId,
        ExampleStatus.ACTIVE,
        'Approved after review',
        mockUserId,
        mockOrgId,
      );

      // Assert
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'status_changed',
          actionDescription: expect.stringContaining('Approved after review'),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('findAll') - Pagination and filtering tests
  // -------------------------------------------------------------------------
  describe('findAll', () => {
    it('should return paginated results', async () => {
      // Arrange
      mockPrismaService.example.findMany.mockResolvedValue([mockEntity]);
      mockPrismaService.example.count.mockResolvedValue(1);

      // Act
      const result = await service.findAll(mockOrgId, { page: 1, limit: 20 });

      // Assert
      expect(result.items).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      // Arrange
      mockPrismaService.example.findMany.mockResolvedValue([]);
      mockPrismaService.example.count.mockResolvedValue(0);

      // Act
      await service.findAll(mockOrgId, { status: ExampleStatus.ACTIVE });

      // Assert
      expect(prisma.example.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
            status: ExampleStatus.ACTIVE,
          }),
        }),
      );
    });

    it('should always filter by organizationId', async () => {
      // Arrange
      mockPrismaService.example.findMany.mockResolvedValue([]);
      mockPrismaService.example.count.mockResolvedValue(0);

      // Act
      await service.findAll(mockOrgId);

      // Assert - CRITICAL: Must always include org filter
      expect(prisma.example.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: mockOrgId,
          }),
        }),
      );
    });
  });
});
