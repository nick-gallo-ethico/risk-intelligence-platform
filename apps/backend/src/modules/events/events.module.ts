import { Module, Global } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";

/**
 * Global events module providing event-driven architecture.
 *
 * Enables loose coupling between modules - services emit events
 * without knowing who subscribes. Handlers (audit logging, search
 * indexing, notifications, workflows) react to events asynchronously.
 *
 * Configuration:
 * - wildcard: true - enables patterns like 'case.*'
 * - delimiter: '.' - event names use dot notation (e.g., 'case.created')
 * - maxListeners: 20 - reasonable limit per event
 * - ignoreErrors: false - log handler errors but don't crash emitter
 */
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: ".",
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  exports: [EventEmitterModule],
})
export class EventsModule {}
