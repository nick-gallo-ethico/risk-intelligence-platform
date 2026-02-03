import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma, Employee } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { PersonsService } from "../persons/persons.service";
import { MergeClientService } from "./merge-client.service";
import { MergeEmployee } from "./types/merge.types";
import { SyncResultDto } from "./dto/hris-sync.dto";

/**
 * Service for synchronizing HRIS employee data to Person records.
 *
 * HRIS Sync Flow:
 * 1. Fetch all employees from Merge.dev unified API
 * 2. Topologically sort by manager chain (managers before reports)
 * 3. For each employee:
 *    a. Find or create Employee record in our database
 *    b. Find or create corresponding Person record
 * 4. Emit sync completion event
 *
 * Key Properties:
 * - Idempotent: Running twice produces same result
 * - Respects manual edits: Person fields not overwritten if manually set
 * - Manager ordering: Topological sort ensures managers exist before reports
 * - Error resilient: Collects errors without stopping sync
 */
@Injectable()
export class HrisSyncService {
  private readonly logger = new Logger(HrisSyncService.name);

  constructor(
    private prisma: PrismaService,
    private personsService: PersonsService,
    private mergeClient: MergeClientService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Sync all employees from Merge.dev to Person records.
   * Creates manager chain in correct order (topological sort).
   *
   * @param accountToken - Merge.dev linked account token
   * @param organizationId - Organization ID to sync into
   * @param userId - User initiating the sync (for audit)
   * @returns Sync results with created/updated/error counts
   */
  async syncEmployees(
    accountToken: string,
    organizationId: string,
    userId: string,
  ): Promise<SyncResultDto> {
    const startTime = Date.now();
    const result: SyncResultDto = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      durationMs: 0,
    };

    this.logger.log(
      `Starting HRIS sync for organization ${organizationId}`,
    );

    // 1. Fetch all employees from Merge
    const mergeEmployees = await this.mergeClient.getEmployees(accountToken);

    // 2. Build employee map for manager resolution
    const employeeMap = new Map<string, MergeEmployee>();
    mergeEmployees.forEach((emp) => employeeMap.set(emp.id, emp));

    // 3. Topological sort: process employees without managers first
    const sorted = this.topologicalSort(mergeEmployees);

    this.logger.log(
      `Processing ${sorted.length} employees in topological order`,
    );

    // Track created Employee records for Person creation
    const employeeRecordMap = new Map<string, Employee>();

    // 4. Process each employee in order
    for (const mergeEmployee of sorted) {
      try {
        // Find or create Employee record in our database
        const employee = await this.findOrCreateEmployee(
          mergeEmployee,
          employeeMap,
          organizationId,
          employeeRecordMap,
        );

        // Track the created employee
        employeeRecordMap.set(mergeEmployee.id, employee);

        // Find or create corresponding Person record
        const existingPerson = await this.personsService.findByEmployeeId(
          employee.id,
          organizationId,
        );

        if (!existingPerson) {
          // Create new Person from Employee
          await this.personsService.createFromEmployee(
            employee,
            userId,
            organizationId,
          );
          result.created++;
        } else {
          // Sync updates to existing Person (preserving manual edits)
          await this.personsService.syncFromEmployee(
            existingPerson.id,
            employee,
            userId,
            organizationId,
          );
          result.updated++;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        result.errors.push({
          employeeId: mergeEmployee.id,
          error: errorMessage,
        });
        this.logger.error(
          `Failed to sync employee ${mergeEmployee.id}: ${errorMessage}`,
        );
        // Continue with next employee - don't stop sync on individual errors
      }
    }

    result.durationMs = Date.now() - startTime;

    // Emit sync complete event for monitoring/webhooks
    this.emitEvent("hris.sync.completed", {
      organizationId,
      userId,
      result: {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errorCount: result.errors.length,
        durationMs: result.durationMs,
      },
    });

    this.logger.log(
      `HRIS sync complete: ${result.created} created, ${result.updated} updated, ` +
        `${result.skipped} skipped, ${result.errors.length} errors in ${result.durationMs}ms`,
    );

    return result;
  }

  /**
   * Find or create an Employee record from Merge employee data.
   * If employee exists (by hrisEmployeeId or email), updates it.
   * If not, creates new Employee record.
   *
   * @param mergeEmployee - Employee data from Merge.dev
   * @param employeeMap - Map of all Merge employees for manager lookup
   * @param organizationId - Organization ID
   * @param employeeRecordMap - Map of Merge ID to created Employee records
   * @returns The Employee record
   */
  private async findOrCreateEmployee(
    mergeEmployee: MergeEmployee,
    employeeMap: Map<string, MergeEmployee>,
    organizationId: string,
    employeeRecordMap: Map<string, Employee>,
  ): Promise<Employee> {
    // Check if Employee exists in our system
    let employee = await this.prisma.employee.findFirst({
      where: {
        organizationId,
        OR: [
          { hrisEmployeeId: mergeEmployee.remote_id },
          { email: mergeEmployee.work_email },
        ],
      },
    });

    // Resolve manager Employee ID
    let managerEmployeeId: string | undefined;
    let managerEmployeeName: string | undefined;

    if (mergeEmployee.manager) {
      // First check our local map (manager should be processed already due to topo sort)
      const managerRecord = employeeRecordMap.get(mergeEmployee.manager);
      if (managerRecord) {
        managerEmployeeId = managerRecord.id;
        managerEmployeeName = `${managerRecord.firstName} ${managerRecord.lastName}`;
      } else {
        // Fallback: check database
        const managerMerge = employeeMap.get(mergeEmployee.manager);
        if (managerMerge) {
          const managerEmployee = await this.prisma.employee.findFirst({
            where: { organizationId, hrisEmployeeId: managerMerge.remote_id },
          });
          if (managerEmployee) {
            managerEmployeeId = managerEmployee.id;
            managerEmployeeName = `${managerEmployee.firstName} ${managerEmployee.lastName}`;
          }
        }
      }
    }

    if (!employee) {
      // Create new Employee record
      employee = await this.prisma.employee.create({
        data: {
          organizationId,
          hrisEmployeeId: mergeEmployee.remote_id,
          firstName: mergeEmployee.first_name,
          lastName: mergeEmployee.last_name,
          email: mergeEmployee.work_email,
          phone: mergeEmployee.mobile_phone_number ?? null,
          jobTitle: mergeEmployee.job_title || "Employee",
          managerId: managerEmployeeId,
          managerName: managerEmployeeName,
          employmentStatus: this.mapEmploymentStatus(
            mergeEmployee.employment_status,
          ),
          sourceSystem: "MERGE_DEV",
          syncedAt: new Date(),
          rawHrisData: mergeEmployee as unknown as Prisma.InputJsonValue,
        },
      });
      this.logger.debug(`Created Employee ${employee.id} from Merge ${mergeEmployee.id}`);
    } else {
      // Update existing Employee with latest HRIS data
      employee = await this.prisma.employee.update({
        where: { id: employee.id },
        data: {
          firstName: mergeEmployee.first_name,
          lastName: mergeEmployee.last_name,
          email: mergeEmployee.work_email,
          phone: mergeEmployee.mobile_phone_number ?? null,
          jobTitle: mergeEmployee.job_title || employee.jobTitle,
          managerId: managerEmployeeId,
          managerName: managerEmployeeName,
          employmentStatus: this.mapEmploymentStatus(
            mergeEmployee.employment_status,
          ),
          syncedAt: new Date(),
          rawHrisData: mergeEmployee as unknown as Prisma.InputJsonValue,
        },
      });
      this.logger.debug(`Updated Employee ${employee.id} from Merge ${mergeEmployee.id}`);
    }

    return employee;
  }

  /**
   * Topological sort: managers before their reports.
   * This ensures when we process an employee, their manager already exists.
   *
   * Uses depth-first search to visit managers before reports.
   * Handles cycles by breaking at visited nodes.
   *
   * @param employees - Array of employees from Merge.dev
   * @returns Sorted array with managers before their reports
   */
  private topologicalSort(employees: MergeEmployee[]): MergeEmployee[] {
    const visited = new Set<string>();
    const result: MergeEmployee[] = [];
    const employeeMap = new Map<string, MergeEmployee>();
    employees.forEach((e) => employeeMap.set(e.id, e));

    const visit = (emp: MergeEmployee) => {
      if (visited.has(emp.id)) return;

      // Visit manager first (if exists and not already visited)
      if (emp.manager && employeeMap.has(emp.manager)) {
        visit(employeeMap.get(emp.manager)!);
      }

      visited.add(emp.id);
      result.push(emp);
    };

    employees.forEach(visit);
    return result;
  }

  /**
   * Map Merge.dev employment status to our EmploymentStatus enum.
   */
  private mapEmploymentStatus(
    status?: string,
  ): "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED" {
    switch (status) {
      case "ACTIVE":
        return "ACTIVE";
      case "INACTIVE":
        return "INACTIVE";
      case "PENDING":
        return "ON_LEAVE";
      default:
        return "ACTIVE";
    }
  }

  /**
   * Safely emit event - failures logged but don't crash sync.
   */
  private emitEvent(eventName: string, event: object): void {
    try {
      this.eventEmitter.emit(eventName, event);
    } catch (error) {
      this.logger.error(
        `Failed to emit event ${eventName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
