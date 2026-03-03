import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { MergeClientService } from "./merge-client.service";

// Mock axios at the module level
jest.mock("axios", () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    interceptors: {
      response: {
        use: jest.fn(),
      },
    },
  };
  return {
    default: {
      create: jest.fn(() => mockAxiosInstance),
    },
    create: jest.fn(() => mockAxiosInstance),
  };
});

describe("MergeClientService", () => {
  let service: MergeClientService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue("test-merge-api-key"),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MergeClientService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MergeClientService>(MergeClientService);
    jest.clearAllMocks();
  });

  describe("isConfigured", () => {
    it("should return true when MERGE_API_KEY is set", () => {
      const result = service.isConfigured();
      expect(result).toBe(true);
    });

    it("should return false when MERGE_API_KEY is empty", async () => {
      const emptyKeyConfigService = {
        get: jest.fn().mockReturnValue(""),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MergeClientService,
          { provide: ConfigService, useValue: emptyKeyConfigService },
        ],
      }).compile();

      const emptyService = module.get<MergeClientService>(MergeClientService);
      expect(emptyService.isConfigured()).toBe(false);
    });
  });

  describe("getEmployees", () => {
    it("should handle single page of employees", async () => {
      const mockEmployees = [
        {
          id: "merge-emp-1",
          remote_id: "emp-001",
          first_name: "Alice",
          last_name: "Smith",
          work_email: "alice@example.com",
          employment_status: "ACTIVE",
        },
      ];

      // Access internal axios client
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const axios = require("axios");
      const mockClient = axios.create();
      mockClient.get.mockResolvedValueOnce({
        data: {
          results: mockEmployees,
          next: null,
          previous: null,
          count: 1,
        },
      });

      const result = await service.getEmployees("test-account-token");

      expect(result).toHaveLength(1);
      expect(result[0].first_name).toBe("Alice");
    });

    it("should handle empty employee list", async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const axios = require("axios");
      const mockClient = axios.create();
      mockClient.get.mockResolvedValueOnce({
        data: {
          results: [],
          next: null,
          previous: null,
          count: 0,
        },
      });

      const result = await service.getEmployees("test-account-token");

      expect(result).toHaveLength(0);
    });
  });

  describe("testConnection", () => {
    it("should return true on successful connection", async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const axios = require("axios");
      const mockClient = axios.create();
      mockClient.get.mockResolvedValueOnce({
        data: { results: [], next: null, count: 0 },
      });

      const result = await service.testConnection("test-account-token");

      expect(result).toBe(true);
    });

    it("should return false on connection failure", async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const axios = require("axios");
      const mockClient = axios.create();
      mockClient.get.mockRejectedValueOnce(new Error("Connection refused"));

      const result = await service.testConnection("test-account-token");

      expect(result).toBe(false);
    });
  });
});
