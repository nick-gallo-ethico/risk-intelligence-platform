/**
 * HTTP EXCEPTION FILTER - UNIT TESTS
 *
 * Tests for the HttpExceptionFilter.
 * Key test scenarios:
 * - HttpException handling (message string, array, custom error)
 * - Generic Error handling with stack trace logging
 * - Non-Error exception handling and logging (SEC-06)
 * - Response format (timestamp, path, method, requestId)
 * - All exception types produce structured JSON responses
 */

import { HttpExceptionFilter } from "./http-exception.filter";
import { HttpException, HttpStatus, Logger } from "@nestjs/common";
import { ArgumentsHost } from "@nestjs/common";
import { Request, Response } from "express";

describe("HttpExceptionFilter", () => {
  let filter: HttpExceptionFilter;
  let mockResponse: jest.Mocked<Response>;
  let mockRequest: jest.Mocked<Request>;
  let mockHost: jest.Mocked<ArgumentsHost>;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    // Mock response with chainable status().json()
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as jest.Mocked<Response>;

    // Mock request
    mockRequest = {
      url: "/api/v1/cases",
      method: "POST",
      headers: {},
    } as unknown as jest.Mocked<Request>;

    // Mock ArgumentsHost
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as jest.Mocked<ArgumentsHost>;

    // Spy on Logger.error (suppress console output in tests)
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    loggerErrorSpy.mockRestore();
  });

  // HTTP EXCEPTION TESTS
  describe("HttpException handling", () => {
    it("should handle HttpException with message string", () => {
      // Arrange
      const exception = new HttpException(
        "Resource not found",
        HttpStatus.NOT_FOUND,
      );

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: "Resource not found",
          path: "/api/v1/cases",
          method: "POST",
        }),
      );
    });

    it("should handle HttpException with message array (validation errors)", () => {
      // Arrange
      const exception = new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: ["name must be a string", "email must be valid"],
          error: "Bad Request",
        },
        HttpStatus.BAD_REQUEST,
      );

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: ["name must be a string", "email must be valid"],
          error: "Bad Request",
        }),
      );
    });

    it("should handle HttpException with custom error property", () => {
      // Arrange
      const exception = new HttpException(
        {
          message: "Validation failed",
          error: "CustomValidationError",
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          message: "Validation failed",
          error: "CustomValidationError",
        }),
      );
    });

    it("should handle HttpException with string response (no object)", () => {
      // Arrange - HttpException can take a string as response
      const exception = new HttpException(
        "Simple string error",
        HttpStatus.FORBIDDEN,
      );

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          message: "Simple string error",
        }),
      );
    });
  });

  // GENERIC ERROR TESTS
  describe("Generic Error handling", () => {
    it("should handle generic Error with 500 status", () => {
      // Arrange
      const exception = new Error("Something went wrong");

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Internal server error",
          error: "Internal Server Error",
        }),
      );
    });

    it("should log Error stack trace for generic errors", () => {
      // Arrange
      const exception = new Error("Database connection failed");
      exception.stack =
        "Error: Database connection failed\n    at Test.fn (/path/to/file.ts:10:5)";

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "Unhandled exception: Database connection failed",
        exception.stack,
      );
    });

    it("should not expose internal error details to client", () => {
      // Arrange
      const exception = new Error("SQL injection detected: DROP TABLE users;");

      // Act
      filter.catch(exception, mockHost);

      // Assert - Client should NOT see the actual error message
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Internal server error",
        }),
      );
      expect(mockResponse.json).not.toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("SQL injection"),
        }),
      );
    });
  });

  // NON-ERROR EXCEPTION TESTS (SEC-06)
  describe("Non-Error exception handling (SEC-06)", () => {
    it("should handle string exception and return 500", () => {
      // Arrange
      const exception = "Something unexpected happened";

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Internal server error",
          error: "Internal Server Error",
        }),
      );
    });

    it("should log non-Error string exceptions", () => {
      // Arrange
      const exception = "Unexpected string thrown";

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "Unhandled non-Error exception: string",
        "Unexpected string thrown",
      );
    });

    it("should handle object exception and return 500", () => {
      // Arrange
      const exception = { code: "ERR_UNKNOWN", details: "Something broke" };

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Internal server error",
        }),
      );
    });

    it("should log non-Error object exceptions as JSON", () => {
      // Arrange
      const exception = { code: "ERR_CUSTOM", value: 42 };

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "Unhandled non-Error exception: object",
        JSON.stringify(exception),
      );
    });

    it("should handle null exception and return 500", () => {
      // Arrange
      const exception = null;

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "Unhandled non-Error exception: object",
        "null",
      );
    });

    it("should handle undefined exception and return 500", () => {
      // Arrange
      const exception = undefined;

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "Unhandled non-Error exception: undefined",
        "undefined",
      );
    });

    it("should handle number exception and return 500", () => {
      // Arrange
      const exception = 42;

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "Unhandled non-Error exception: number",
        "42",
      );
    });
  });

  // RESPONSE FORMAT TESTS
  describe("Response format", () => {
    it("should include timestamp in response", () => {
      // Arrange
      const exception = new HttpException("Test", HttpStatus.BAD_REQUEST);
      const beforeTime = new Date().toISOString();

      // Act
      filter.catch(exception, mockHost);

      // Assert
      const afterTime = new Date().toISOString();
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
      );

      // Verify timestamp is valid ISO string
      const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(new Date(response.timestamp).toISOString()).toBe(
        response.timestamp,
      );
    });

    it("should include path in response", () => {
      // Arrange
      mockRequest.url = "/api/v1/users/123";
      const exception = new HttpException("Not found", HttpStatus.NOT_FOUND);

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/api/v1/users/123",
        }),
      );
    });

    it("should include method in response", () => {
      // Arrange
      mockRequest.method = "DELETE";
      const exception = new HttpException("Forbidden", HttpStatus.FORBIDDEN);

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });

    it("should include requestId when x-request-id header present", () => {
      // Arrange
      mockRequest.headers = { "x-request-id": "req-abc-123-xyz" };
      const exception = new HttpException("Error", HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: "req-abc-123-xyz",
        }),
      );
    });

    it("should not include requestId when x-request-id header absent", () => {
      // Arrange
      mockRequest.headers = {};
      const exception = new HttpException("Error", HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(exception, mockHost);

      // Assert
      const response = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(response.requestId).toBeUndefined();
    });
  });

  // EDGE CASES
  describe("Edge cases", () => {
    it("should handle HttpException with null response object", () => {
      // Arrange - Create HttpException with object that has null fields
      const exception = new HttpException(
        { message: null, error: null },
        HttpStatus.BAD_REQUEST,
      );

      // Act
      filter.catch(exception, mockHost);

      // Assert - Should fall back to exception.message
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it("should handle circular reference in object exception", () => {
      // Arrange
      const exception: Record<string, unknown> = { name: "circular" };
      exception.self = exception; // Circular reference

      // Act - JSON.stringify will fail, but filter should not throw
      filter.catch(exception, mockHost);

      // Assert - Should still return 500 response
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      // Should log safely with fallback message
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        "Unhandled non-Error exception: object",
        "[Object with circular reference or non-serializable value]",
      );
    });

    it("should handle empty Error message", () => {
      // Arrange
      const exception = new Error("");

      // Act
      filter.catch(exception, mockHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it("should handle all HTTP status codes correctly", () => {
      // Test a range of status codes
      const statusCodes = [
        HttpStatus.BAD_REQUEST,
        HttpStatus.UNAUTHORIZED,
        HttpStatus.FORBIDDEN,
        HttpStatus.NOT_FOUND,
        HttpStatus.CONFLICT,
        HttpStatus.UNPROCESSABLE_ENTITY,
        HttpStatus.TOO_MANY_REQUESTS,
        HttpStatus.INTERNAL_SERVER_ERROR,
        HttpStatus.BAD_GATEWAY,
        HttpStatus.SERVICE_UNAVAILABLE,
      ];

      for (const status of statusCodes) {
        jest.clearAllMocks();
        const exception = new HttpException("Test", status);

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(status);
      }
    });
  });
});
