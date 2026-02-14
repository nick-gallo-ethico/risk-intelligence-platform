import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * MSW server for Node.js environment (used in Vitest tests).
 *
 * Usage in test setup:
 *   beforeAll(() => server.listen())
 *   afterEach(() => server.resetHandlers())
 *   afterAll(() => server.close())
 *
 * To override handlers in a specific test:
 *   server.use(http.get('/api/v1/cases', () => HttpResponse.json([])))
 */
export const server = setupServer(...handlers);
