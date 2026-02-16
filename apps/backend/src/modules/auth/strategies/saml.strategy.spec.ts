import { Test, TestingModule } from "@nestjs/testing";
import { UserRole, Organization, User } from "@prisma/client";
import { SamlStrategy } from "./saml.strategy";
import { SsoService } from "../sso/sso.service";
import { SsoConfigService } from "../sso/sso-config.service";
import { Profile, VerifiedCallback } from "@node-saml/passport-saml";
import { Request } from "express";
import { SsoUserData } from "../interfaces";
import { SAML_CLAIMS } from "@common/types/saml.types";

describe("SamlStrategy", () => {
  let strategy: SamlStrategy;
  let ssoService: jest.Mocked<SsoService>;
  let ssoConfigService: jest.Mocked<SsoConfigService>;

  // -------------------------------------------------------------------------
  // Test Data Fixtures
  // -------------------------------------------------------------------------
  const mockUserId = "user-saml-123";
  const mockOrgId = "org-saml-456";
  const mockEmail = "samluser@example.com";
  const mockNameID = "saml-name-id-789";
  const mockTenant = "test-org";

  const mockUser: User & { organization: Organization } = {
    id: mockUserId,
    email: mockEmail,
    firstName: "SAML",
    lastName: "User",
    role: UserRole.COMPLIANCE_OFFICER,
    organizationId: mockOrgId,
    isActive: true,
    ssoProvider: "saml",
    ssoId: mockNameID,
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
      name: "SAML Test Org",
      slug: mockTenant,
      isActive: true,
      settings: {},
      defaultLanguage: "en",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  const mockSamlConfig = {
    callbackUrl: `http://localhost:3000/api/v1/auth/saml/${mockTenant}/callback`,
    entryPoint: "https://idp.example.com/sso",
    issuer: "ethico-platform",
    cert: "mock-certificate",
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: true,
    signatureAlgorithm: "sha256",
  };

  // SAML profile with various attribute formats
  const createMockProfile = (overrides?: Partial<Profile>): Profile =>
    ({
      nameID: mockNameID,
      nameIDFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
      issuer: "https://idp.example.com",
      sessionIndex: "_session-123",
      email: mockEmail,
      firstName: "SAML",
      lastName: "User",
      ...overrides,
    }) as unknown as Profile;

  // SAML profile using claim URIs
  const createMockProfileWithClaimUris = (
    overrides?: Partial<Profile>,
  ): Profile =>
    ({
      nameID: mockNameID,
      nameIDFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
      issuer: "https://idp.example.com",
      [SAML_CLAIMS.email]: mockEmail,
      [SAML_CLAIMS.givenName]: "SAML",
      [SAML_CLAIMS.surname]: "User",
      ...overrides,
    }) as unknown as Profile;

  const createMockRequest = (tenant: string = mockTenant): Request =>
    ({
      params: { tenant },
    }) as unknown as Request;

  // -------------------------------------------------------------------------
  // Mock Setup
  // -------------------------------------------------------------------------
  const mockSsoService = {
    findOrCreateSsoUser: jest.fn(),
  };

  const mockSsoConfigService = {
    getSamlConfig: jest.fn(),
  };

  // -------------------------------------------------------------------------
  // Module Setup
  // -------------------------------------------------------------------------
  beforeEach(async () => {
    // Setup default mock behaviors
    mockSsoConfigService.getSamlConfig.mockResolvedValue(mockSamlConfig);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SamlStrategy,
        { provide: SsoService, useValue: mockSsoService },
        { provide: SsoConfigService, useValue: mockSsoConfigService },
      ],
    }).compile();

    strategy = module.get<SamlStrategy>(SamlStrategy);
    ssoService = module.get(SsoService);
    ssoConfigService = module.get(SsoConfigService);

    // Reset all mocks before each test
    jest.clearAllMocks();
    mockSsoConfigService.getSamlConfig.mockResolvedValue(mockSamlConfig);
  });

  // -------------------------------------------------------------------------
  // describe('validate') - SAML Assertion Validation Tests
  // -------------------------------------------------------------------------
  describe("validate()", () => {
    let mockDone: jest.MockedFunction<VerifiedCallback>;
    let mockReq: Request;

    beforeEach(() => {
      mockDone = jest.fn();
      mockReq = createMockRequest();
    });

    it("should extract email from SAML profile email attribute", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile();

      // Act
      await strategy.validate(mockReq, profile, mockDone);

      // Assert - Verify correct email extraction
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockEmail.toLowerCase(),
        }),
      );
    });

    it("should extract email from claim URI format", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfileWithClaimUris();

      // Act
      await strategy.validate(mockReq, profile, mockDone);

      // Assert
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockEmail.toLowerCase(),
        }),
      );
    });

    it("should use nameID as email fallback", async () => {
      // Arrange - Profile without email but with nameID
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile({
        email: undefined,
        nameID: "user@example.com",
      });
      // Remove any claim URI email
      delete (profile as Record<string, unknown>)[SAML_CLAIMS.email];

      // Act
      await strategy.validate(mockReq, profile, mockDone);

      // Assert
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "user@example.com",
        }),
      );
    });

    it("should call ssoService.findOrCreateSsoUser with correct params", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile();

      // Act
      await strategy.validate(mockReq, profile, mockDone);

      // Assert
      const expectedSsoUser: SsoUserData = expect.objectContaining({
        email: mockEmail.toLowerCase(),
        firstName: "SAML",
        lastName: "User",
        provider: "saml",
        ssoId: mockNameID,
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
      await strategy.validate(mockReq, profile, mockDone);

      // Assert
      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it("should return error via done callback when email not provided", async () => {
      // Arrange - Profile without any email source
      const profile = createMockProfile({
        email: undefined,
        nameID: undefined,
      });
      // Remove claim URI email as well
      delete (profile as Record<string, unknown>)[SAML_CLAIMS.email];
      delete (profile as Record<string, unknown>)[SAML_CLAIMS.upn];

      // Act
      await strategy.validate(mockReq, profile, mockDone);

      // Assert
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Email not provided in SAML assertion",
        }),
        undefined,
        undefined,
      );
      expect(ssoService.findOrCreateSsoUser).not.toHaveBeenCalled();
    });

    it("should return error when ssoService.findOrCreateSsoUser throws", async () => {
      // Arrange
      const errorMessage = "Organization not found for domain";
      mockSsoService.findOrCreateSsoUser.mockRejectedValue(
        new Error(errorMessage),
      );
      const profile = createMockProfile();

      // Act
      await strategy.validate(mockReq, profile, mockDone);

      // Assert
      expect(mockDone).toHaveBeenCalledWith(
        expect.objectContaining({
          message: errorMessage,
        }),
        undefined,
        undefined,
      );
    });

    it("should handle missing profile name fields gracefully", async () => {
      // Arrange - Profile with only email, no name fields
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile({
        firstName: undefined,
        lastName: undefined,
        givenName: undefined,
        surname: undefined,
      });

      // Act
      await strategy.validate(mockReq, profile, mockDone);

      // Assert - Should use empty strings for missing name fields
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "",
          lastName: "",
        }),
      );
      expect(mockDone).toHaveBeenCalledWith(null, mockUser);
    });

    it("should use nameID as ssoId", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile({
        nameID: "unique-name-id-123",
      });

      // Act
      await strategy.validate(mockReq, profile, mockDone);

      // Assert
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          ssoId: "unique-name-id-123",
        }),
      );
    });

    it("should use email as ssoId fallback when nameID is missing", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile({
        nameID: undefined,
        email: "fallback@example.com",
      });

      // Act
      await strategy.validate(mockReq, profile, mockDone);

      // Assert
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          ssoId: "fallback@example.com",
        }),
      );
    });

    it("should include rawProfile in SSO user data", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile();

      // Act
      await strategy.validate(mockReq, profile, mockDone);

      // Assert
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          rawProfile: expect.any(Object),
        }),
      );
    });

    it("should extract first name from claim URI format", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfileWithClaimUris();

      // Act
      await strategy.validate(mockReq, profile, mockDone);

      // Assert
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "SAML",
        }),
      );
    });

    it("should extract last name from claim URI format", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfileWithClaimUris();

      // Act
      await strategy.validate(mockReq, profile, mockDone);

      // Assert
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          lastName: "User",
        }),
      );
    });

    it("should convert email to lowercase", async () => {
      // Arrange
      mockSsoService.findOrCreateSsoUser.mockResolvedValue(mockUser);
      const profile = createMockProfile({
        email: "UPPERCASE@EXAMPLE.COM",
      });

      // Act
      await strategy.validate(mockReq, profile, mockDone);

      // Assert
      expect(ssoService.findOrCreateSsoUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "uppercase@example.com",
        }),
      );
    });
  });
});
