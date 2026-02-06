/**
 * DataLoaderInterceptor - Request-Scoped DataLoader Injection
 *
 * This interceptor creates a fresh set of DataLoaders for each HTTP request
 * and attaches them to the request object. This ensures:
 *
 * 1. Proper request isolation (no data leakage between requests)
 * 2. Batching within a single request
 * 3. Per-request caching (results cached during request, cleared after)
 *
 * Usage:
 * 1. Apply interceptor globally or per-controller
 * 2. Use @GetDataLoaders() decorator to access loaders in handlers
 *
 * Example:
 * ```typescript
 * @Controller('cases')
 * @UseInterceptors(DataLoaderInterceptor)
 * export class CasesController {
 *   @Get()
 *   async findAll(
 *     @GetDataLoaders() loaders: DataLoaders,
 *     @TenantId() orgId: string,
 *   ) {
 *     const cases = await this.service.findAll(orgId);
 *     // Load assignees using DataLoader (batched)
 *     const withAssignees = await Promise.all(
 *       cases.map(async (c) => ({
 *         ...c,
 *         assignee: await loaders.userLoader.load(c.assigneeId),
 *       }))
 *     );
 *     return withAssignees;
 *   }
 * }
 * ```
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  createParamDecorator,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { PrismaService } from "../../modules/prisma/prisma.service";
import { createDataLoaders, DataLoaders } from "../dataloader/dataloader.factory";

/**
 * Key used to store DataLoaders on the request object.
 */
export const DATALOADER_CONTEXT_KEY = "dataLoaders";

/**
 * Interceptor that creates request-scoped DataLoaders.
 * Apply globally or per-controller to enable DataLoader batching.
 */
@Injectable()
export class DataLoaderInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates DataLoaders and attaches them to the request.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const contextType = context.getType();

    if (contextType === "http") {
      const request = context.switchToHttp().getRequest();

      // Create request-scoped DataLoaders if not already present
      if (!request[DATALOADER_CONTEXT_KEY]) {
        request[DATALOADER_CONTEXT_KEY] = createDataLoaders(this.prisma);
      }
    } else if (contextType === "ws") {
      // For WebSocket, attach to socket data
      const client = context.switchToWs().getClient();

      if (!client.data[DATALOADER_CONTEXT_KEY]) {
        client.data[DATALOADER_CONTEXT_KEY] = createDataLoaders(this.prisma);
      }
    }

    return next.handle();
  }
}

/**
 * Parameter decorator to inject DataLoaders into controller methods.
 *
 * Usage:
 * ```typescript
 * @Get()
 * async findAll(@GetDataLoaders() loaders: DataLoaders) {
 *   const user = await loaders.userLoader.load(userId);
 * }
 * ```
 */
export const GetDataLoaders = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): DataLoaders | undefined => {
    const contextType = ctx.getType();

    if (contextType === "http") {
      const request = ctx.switchToHttp().getRequest();
      return request[DATALOADER_CONTEXT_KEY];
    }

    if (contextType === "ws") {
      const client = ctx.switchToWs().getClient();
      return client.data[DATALOADER_CONTEXT_KEY];
    }

    return undefined;
  },
);

/**
 * Helper to get DataLoaders from a request object.
 * Useful in services that receive the request.
 */
export function getDataLoadersFromRequest(request: any): DataLoaders | undefined {
  return request[DATALOADER_CONTEXT_KEY];
}
