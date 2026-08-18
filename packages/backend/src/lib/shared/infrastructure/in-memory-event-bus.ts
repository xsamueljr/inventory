import type { DomainEvent, EventBus } from "../domain";
import type { EventClass } from "../domain/event-bus";
import type { EventHandler } from "../domain/event-handler";

export class InMemoryEventBus implements EventBus {
  private handlers = new Map<EventClass<DomainEvent>, EventHandler<DomainEvent>[]>();

  publish(event: DomainEvent): void {
    const handlers = this.handlers.get(event.constructor as EventClass<DomainEvent>) ?? [];
    handlers.map(handler => handler.handle(event))
  }

  subscribe<T extends DomainEvent>(eventClass: EventClass<T>, handler: EventHandler<T>): void {
    const currentHandlers = this.handlers.get(eventClass);
    if (currentHandlers) {
      currentHandlers.push(handler as EventHandler<DomainEvent>);
    } else {
      this.handlers.set(eventClass, [handler as EventHandler<DomainEvent>]);
    }
  }
}
