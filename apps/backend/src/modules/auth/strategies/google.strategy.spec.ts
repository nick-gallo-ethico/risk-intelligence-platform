import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { UserRole, Organization, User } from "@prisma/client";
import { GoogleStrategy } from "./google.strategy";
import { SsoService } from "../sso/sso.service";
import { Profile, VerifyCallback } from "passport-google-oauth20";
import { SsoUserData } from "../interfaces";

describe("GoogleStrategy", () => {
  let strategy: GoogleStrategy;
  let ssoService: jest.Mocked<SsoService>;

  // -------------------------------------------------------------------------
  // Test Data Fixtures
  // -------------------------------------------------------------------------
  const mockUserId = "user-google-123";
  const mockOrgId = "org-google-456";
  const mockEmail = "googleuser@example.com";
  const mockGoogleId = "google-user-id-789";

  const mockUser: User & { organization: Organization } = {
    id: mockUserId,
    email: mockEmail,
    firstName: "Google",
    lastName: "User",
    role: UserRole.COMPLIANCE_OFFICER,
    organizationId: mockOrgId,
    isActive: true,
    ssoProvider: "google",
    ssoId: mockGoogleId,
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
      name: "Google Test Org",
      slug: "google-test",
      isActive: true,
      settings: {},
      defaultLanguage: "en",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  // Google profile with full structure
  const createMockProfile = (overrides?: Partial<Profile>): Profile =>
    ({
      id: mockGoogleId,
      displayName: "Google User",
      name: {
        familyName: "User",
        givenName: "Google",
      },
      emails: [{ value: mockEmail, verified: true }],
      photos: [{ value: "https://example.com/photo.jpg" }],
      provider: "google",
      _raw: "{}",
      _json: {
        sub: mockGoogleId,
        email: mockEmail,
        email_verified: true,
        name: "Google User",
        given_name: "Google",
        family_name: "User",
        picture: "https://example.com/photo.jpg",
      },
      ...overrides,
    }) as unknown as Profile;

  // -------------------------------------------------------------------------
  // Mock Setup
  // -------------------------------------------------------------------------
  const mockSsoService = {
    findOrCreateSsoUser: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const configMap: Record<string, string> = {
        GOOGLE_CLIENT_ID: "test-google-client-id",
        GOOGLE_CLIENT_SECRET: "test-google-client-secret",
        API_URL: "http://localhost:3000",
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
        GoogleStrategy,
        { provide: SsoService, useValue: mockSsoService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<GoogleStrategy>(GoogleStrategy);
    ssoService = module.get(SsoService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // describe('validate') - Google OAuth Validation Tests
  // -------------------------------------------------------------------------
  describe("validate()", () => {
    let mockDone: jest.MockedFunction<VerifyCallback>;
    const mockAccessToken = "mock-access-token";
    const mockRefreshToken = "mock-refresh-token";

    beforeEach(() => {
      mockDone = jest.fn();
    });

    it("should extract email from Google profile emails array", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile();

      // Act
      await strategy.validate(
        mockAccessToken,
        mockRefreshToken,
        profile,
        mockDone,
      );

      // Assert - Verify correct email extraction
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockEmail.toLowerCase(),
        }),
      );
    });

    it("should call ssoService.findOrCreateSsoUser with correct params", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile();

      // Act
      await strategy.validate(
        mockAccessToken,
        mockRefreshToken,
        profile,
        mockDone,
      );

      // Assert
      const expectedSsoUser: SsoUserData = expect.objectContaining({
        email: mockEmail.toLowerCase(),
        firstName: "Google",
        lastName: "User",
        provider: "google",
        ssoId: mockGoogleId,
        avatarUrl: "https://example.com/photo.jpg",
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
      await strategy.validate(
        mockAccessToken,
        mockRefreshToken,
        profile,
        mockDone,
      );

      // Assert
      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it("should return error via done callback when email not provided", async () => {
      // Arrange
      const profile = createMockProfile({
        emails: undefined,
      });

      // Act
      await strategy.validate(
        mockAccessToken,
        mockRefreshToken,
        profile,
        mockDone,
      );

      // Assert
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Email not provided by Google",
        }),
        false,
      );
      expect(ssoService.findOrCreateSsoUser).not.toHaveBeenCalled();
    });

    it("should return error via done callback when id not provided", async () => {
      // Arrange
      const profile = createMockProfile({
        id: "",
      });

      // Act
      await strategy.validate(
        mockAccessToken,
        mockRefreshToken,
        profile,
        mockDone,
      );

      // Assert
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "User ID not provided by Google",
        }),
        false,
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
      await strategy.validate(
        mockAccessToken,
        mockRefreshToken,
        profile,
        mockDone,
      );

      // Assert
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: errorMessage,
        }),
        false,
      );
    });

    it("should handle missing profile name fields gracefully", async () => {
      // Arrange - Minimal profile with only required fields
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile({
        name: undefined,
      });

      // Act
      await strategy.validate(
        mockAccessToken,
        mockRefreshToken,
        profile,
        mockDone,
      );

      // Assert - Should use empty strings for missing name fields
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "",
          lastName: "",
        }),
      );
      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it("should include avatarUrl from photos array", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile();

      // Act
      await strategy.validate(
        mockAccessToken,
        mockRefreshToken,
        profile,
        mockDone,
      );

      // Assert
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          avatarUrl: "https://example.com/photo.jpg",
        }),
      );
    });

    it("should handle missing photos gracefully", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile({
        photos: undefined,
      });

      // Act
      await strategy.validate(
        mockAccessToken,
        mockRefreshToken,
        profile,
        mockDone,
      );

      // Assert - Should have undefined avatarUrl
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          avatarUrl: undefined,
        }),
      );
      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it("should include rawProfile in SSO user data", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile();

      // Act
      await strategy.validate(
        mockAccessToken,
        mockRefreshToken,
        profile,
        mockDone,
      );

      // Assert
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          rawProfile: expect.objectContaining({
            email: mockEmail,
            sub: mockGoogleId,
          }),
        }),
      );
    });

    it("should convert email to lowercase", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile({
        emails: [{ value: "UPPERCASE@EXAMPLE.COM", verified: true }],
      });

      // Act
      await strategy.validate(
        mockAccessToken,
        mockRefreshToken,
        profile,
        mockDone,
      );

      // Assert
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "uppercase@example.com",
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // describe('isConfigured') - Configuration Tests
  // -------------------------------------------------------------------------
  describe("configuration", () => {
    it("should return error when Google OAuth is not configured", async () => {
      // Arrange - Create strategy with unconfigured service
      const unconfiguredConfigService = {
        get: jest.fn((key: string, defaultValue?: string) => {
          // Return defaultValue to pass strategy initialization
          // but return undefined for config check (no default)
          if (key === "GOOGLE_CLIENT_ID") {
            return defaultValue ?? undefined;
          }
          if (key === "GOOGLE_CLIENT_SECRET") {
            return defaultValue ?? undefined;
          }
          if (key === "API_URL") return "http://localhost:3000";
          return defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GoogleStrategy,
          { provide: SsoService, useValue: mockSsoService },
          { provide: ConfigService, useValue: unconfiguredConfigService },
        ],
      }).compile();

      const unconfiguredStrategy =
        module.get<GoogleStrategy>(GoogleStrategy);
      const mockDone = jest.fn();
      const profile = createMockProfile();

      // Act
      await unconfiguredStrategy.validate(
        "access-token",
        "refresh-token",
        profile,
        mockDone,
      );

      // Assert
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Google OAuth SSO is not configured",
        }),
        false,
      );
    });
  });
});
