import type { DomainEvent } from "./domain-event";
import type { EventHandler } from "./event-handler";

export type EventClass<T extends DomainEvent> = new (...args: any[]) => T;

export interface EventBus {
  publish(event: DomainEvent): void;
  subscribe<T extends DomainEvent = DomainEvent>(eventType: EventClass<T>, handler: EventHandler<T>): void;
}
