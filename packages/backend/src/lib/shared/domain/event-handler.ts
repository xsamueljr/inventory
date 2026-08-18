import type { DomainEvent } from "./domain-event";

export interface EventHandler<T extends DomainEvent> {
  handle(event: T): void;
}
