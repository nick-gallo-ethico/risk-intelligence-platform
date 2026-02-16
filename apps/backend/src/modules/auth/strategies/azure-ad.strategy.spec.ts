import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { UserRole, Organization, User } from "@prisma/client";
import { AzureAdStrategy } from "./azure-ad.strategy";
import { SsoService } from "../sso/sso.service";
import { IProfile, VerifyCallback } from "passport-azure-ad";
import { SsoUserData } from "../interfaces";

describe("AzureAdStrategy", () => {
  let strategy: AzureAdStrategy;
  let ssoService: jest.Mocked<SsoService>;

  // -------------------------------------------------------------------------
  // Test Data Fixtures
  // -------------------------------------------------------------------------
  const mockUserId = "user-azure-123";
  const mockOrgId = "org-azure-456";
  const mockEmail = "azureuser@example.com";
  const mockAzureOid = "azure-object-id-789";
  const mockAzureTenantId = "azure-tenant-id-abc";

  const mockUser: User & { organization: Organization } = {
    id: mockUserId,
    email: mockEmail,
    firstName: "Azure",
    lastName: "User",
    role: UserRole.COMPLIANCE_OFFICER,
    organizationId: mockOrgId,
    isActive: true,
    ssoProvider: "azure-ad",
    ssoId: mockAzureOid,
    passwordHash: null,
    mfaSecret: null,
    mfaEnabled: false,
    mfaVerifiedAt: null,
    mfaRecoveryCodes: [],
    emailVerifiedAt: new Date(),
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: {
      id: mockOrgId,
      name: "Azure Test Org",
      slug: "azure-test",
      isActive: true,
      settings: {},
      defaultLanguage: "en",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  // Azure AD profile with full JSON structure
  const createMockProfile = (overrides?: Partial<IProfile>): IProfile =>
    ({
      oid: mockAzureOid,
      sub: mockAzureOid,
      displayName: "Azure User",
      name: {
        familyName: "User",
        givenName: "Azure",
      },
      _raw: "",
      _json: {
        email: mockEmail,
        preferred_username: mockEmail,
        upn: mockEmail,
        given_name: "Azure",
        family_name: "User",
        tid: mockAzureTenantId,
        oid: mockAzureOid,
      },
      ...overrides,
    }) as unknown as IProfile;

  // -------------------------------------------------------------------------
  // Mock Setup
  // -------------------------------------------------------------------------
  const mockSsoService = {
    findOrCreateSsoUser: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const configMap: Record<string, string> = {
        AZURE_AD_CLIENT_ID: "test-azure-client-id",
        AZURE_AD_CLIENT_SECRET: "test-azure-client-secret",
        API_URL: "http://localhost:3000",
        NODE_ENV: "development", // Must be "development" to allow http redirectUrl
      };
      return configMap[key] ?? defaultValue;
    }),
  };

  // -------------------------------------------------------------------------
  // Module Setup
  // -------------------------------------------------------------------------
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureAdStrategy,
        { provide: SsoService, useValue: mockSsoService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<AzureAdStrategy>(AzureAdStrategy);
    ssoService = module.get(SsoService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // describe('validate') - Azure AD OAuth Validation Tests
  // -------------------------------------------------------------------------
  describe("validate()", () => {
    let mockDone: jest.MockedFunction<VerifyCallback>;

    beforeEach(() => {
      mockDone = jest.fn();
    });

    it("should extract email from Azure AD profile _json.email", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile();

      // Act
      await strategy.validate(profile, mockDone);

      // Assert - Verify correct email extraction
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockEmail,
        }),
      );
    });

    it("should extract email from preferred_username when email not present", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile({
        _json: {
          preferred_username: "preferred@example.com",
          given_name: "Azure",
          family_name: "User",
          tid: mockAzureTenantId,
          oid: mockAzureOid,
        },
      } as unknown as Partial<IProfile>);

      // Act
      await strategy.validate(profile, mockDone);

      // Assert
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "preferred@example.com",
        }),
      );
    });

    it("should extract email from upn when email and preferred_username not present", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile({
        _json: {
          upn: "upn@example.com",
          given_name: "Azure",
          family_name: "User",
          tid: mockAzureTenantId,
          oid: mockAzureOid,
        },
      } as unknown as Partial<IProfile>);

      // Act
      await strategy.validate(profile, mockDone);

      // Assert
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "upn@example.com",
        }),
      );
    });

    it("should call ssoService.findOrCreateSsoUser with correct provider params", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile();

      // Act
      await strategy.validate(profile, mockDone);

      // Assert
      const expectedSsoUser: SsoUserData = expect.objectContaining({
        email: mockEmail,
        firstName: "Azure",
        lastName: "User",
        provider: "azure-ad",
        ssoId: mockAzureOid,
        azureTenantId: mockAzureTenantId,
      });
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expectedSsoUser,
      );
    });

    it("should return user via done callback on success", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile();

      // Act
      await strategy.validate(profile, mockDone);

      // Assert
      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it("should return error via done callback when email not provided", async () => {
      // Arrange
      const profile = createMockProfile({
        _json: {
          given_name: "Azure",
          family_name: "User",
          tid: mockAzureTenantId,
          oid: mockAzureOid,
          // No email, preferred_username, or upn
        },
      } as unknown as Partial<IProfile>);

      // Act
      await strategy.validate(profile, mockDone);

      // Assert
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Email not provided by Azure AD",
        }),
        null,
      );
      expect(ssoService.findOrCreateSsoUser).not.toHaveBeenCalled();
    });

    it("should return error via done callback when oid not provided", async () => {
      // Arrange
      const profile = createMockProfile({
        oid: "",
        _json: {
          email: mockEmail,
          given_name: "Azure",
          family_name: "User",
          tid: mockAzureTenantId,
          // oid missing
        },
      } as unknown as Partial<IProfile>);

      // Act
      await strategy.validate(profile, mockDone);

      // Assert
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User ID (oid) not provided by Azure AD",
        }),
        null,
      );
    });

    it("should return error when ssoService.findOrCreateSsoUser throws", async () => {
      // Arrange
      const errorMessage = "Organization not found for domain";
      mockSsoService.findOrCreateSsoUser.mockRejectedValue(
        new Error(errorMessage),
      );
      const profile = createMockProfile();

      // Act
      await strategy.validate(profile, mockDone);

      // Assert
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: errorMessage,
        }),
        null,
      );
    });

    it("should handle missing profile fields gracefully", async () => {
      // Arrange - Minimal profile with only required fields
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile({
        oid: mockAzureOid,
        _json: {
          email: mockEmail,
          oid: mockAzureOid,
          // No name fields
        },
      } as unknown as Partial<IProfile>);

      // Act
      await strategy.validate(profile, mockDone);

      // Assert - Should use empty strings for missing name fields
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockEmail,
          firstName: "",
          lastName: "",
        }),
      );
      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it("should include rawProfile in SSO user data", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile();

      // Act
      await strategy.validate(profile, mockDone);

      // Assert
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          rawProfile: expect.objectContaining({
            email: mockEmail,
            oid: mockAzureOid,
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('isConfigured') - Configuration Tests
  // -------------------------------------------------------------------------
  describe("configuration", () => {
    it("should return error when Azure AD is not configured", async () => {
      // Arrange - Create strategy with unconfigured service
      // When Azure AD credentials are not set, the get() call returns the default value
      // from buildAzureAdOptions, but the constructor checks the raw config values
      // to set isConfigured = false.
      //
      // The tricky part: get() is called twice for each key:
      // 1. In buildAzureAdOptions with default "not-configured"
      // 2. In constructor without default (to check if actually configured)
      //
      // We simulate "not configured" by returning undefined when no default is provided,
      // but returning the default value when one is provided.
      const unconfiguredConfigService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          // For Azure AD credentials: return defaultValue to pass validation,
          // but return undefined when checked without default (for isConfigured check)
          if (key === "AZURE_AD_CLIENT_ID") {
            // When called with default (buildAzureAdOptions), return it
            // When called without default (constructor isConfigured check), return undefined
            return defaultValue ?? undefined;
          }
          if (key === "AZURE_AD_CLIENT_SECRET") {
            return defaultValue ?? undefined;
          }
          if (key === "API_URL") return "http://localhost:3000";
          // Must be "development" to allow http redirectUrl
          if (key === "NODE_ENV") return "development";
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AzureAdStrategy,
          { provide: SsoService, useValue: mockSsoService },
          { provide: ConfigService, useValue: unconfiguredConfigService },
        ],
      }).compile();

      const unconfiguredStrategy =
        module.get<AzureAdStrategy>(AzureAdStrategy);
      const mockDone = jest.fn();
      const profile = createMockProfile();

      // Act
      await unconfiguredStrategy.validate(profile, mockDone);

      // Assert
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Azure AD SSO is not configured",
        }),
        null,
      );
    });
  });
});
