import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance, AxiosError, AxiosResponse } from "axios";
import { MergeEmployee, MergePaginatedResponse } from "./types/merge.types";

/**
 * Client service for Merge.dev HRIS unified API.
 * Provides methods to fetch employee data from any connected HRIS system
 * through Merge.dev's standardized API.
 *
 * @see https://docs.merge.dev/hris/overview/
 */
@Injectable()
export class MergeClientService {
  private readonly logger = new Logger(MergeClientService.name);
  private readonly client: AxiosInstance;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>("MERGE_API_KEY", "");

    this.client = axios.create({
      baseURL: "https://api.merge.dev/api/hris/v1",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 second timeout
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.logger.error(
          `Merge API error: ${error.message}`,
          error.response?.data,
        );
        throw error;
      },
    );
  }

  /**
   * Get all employees from a linked HRIS account.
   * Handles pagination automatically to fetch all employees.
   *
   * @param accountToken - The linked account token for the organization's HRIS connection
   * @returns Array of all employees from the connected HRIS
   */
  async getEmployees(accountToken: string): Promise<MergeEmployee[]> {
    const allEmployees: MergeEmployee[] = [];
    let nextUrl: string | undefined = "/employees";

    this.logger.debug(
      `Fetching employees from Merge.dev with account token: ${accountToken.substring(0, 8)}...`,
    );

    while (nextUrl) {
      const response: AxiosResponse<MergePaginatedResponse<MergeEmployee>> =
        await this.client.get<MergePaginatedResponse<MergeEmployee>>(nextUrl, {
          headers: { "X-Account-Token": accountToken },
        });

      allEmployees.push(...response.data.results);

      // Handle next page URL - Merge returns full URL
      if (response.data.next) {
        // Extract path from full URL
        const nextPageUrl = new URL(response.data.next);
        nextUrl = nextPageUrl.pathname + nextPageUrl.search;
      } else {
        nextUrl = undefined;
      }

      this.logger.debug(
        `Fetched ${response.data.results.length} employees, total: ${allEmployees.length}`,
      );
    }

    this.logger.log(`Fetched ${allEmployees.length} employees from Merge.dev`);
    return allEmployees;
  }

  /**
   * Get a single employee by their Merge ID.
   *
   * @param accountToken - The linked account token
   * @param employeeId - The Merge employee ID
   * @returns The employee record
   */
  async getEmployee(
    accountToken: string,
    employeeId: string,
  ): Promise<MergeEmployee> {
    const response = await this.client.get<MergeEmployee>(
      `/employees/${employeeId}`,
      {
        headers: { "X-Account-Token": accountToken },
      },
    );
    return response.data;
  }

  /**
   * Test connection to a linked HRIS.
   * Makes a minimal API call to verify the connection is working.
   *
   * @param accountToken - The linked account token to test
   * @returns true if connection is successful, false otherwise
   */
  async testConnection(accountToken: string): Promise<boolean> {
    try {
      await this.client.get("/employees", {
        headers: { "X-Account-Token": accountToken },
        params: { page_size: 1 },
      });
      this.logger.debug("Merge.dev connection test successful");
      return true;
    } catch (error) {
      this.logger.error(
        "Merge.dev connection test failed",
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  }

  /**
   * Check if the Merge API is configured.
   * Useful for graceful degradation when HRIS integration is optional.
   *
   * @returns true if MERGE_API_KEY is configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }
}
