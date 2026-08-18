import cors from "@elysiajs/cors"
import swagger from "@elysiajs/swagger"
import Elysia from "elysia"
import { DomainEvent, type EventBus } from "./lib/shared/domain";

export const createApp = (eventBus: EventBus) => new Elysia()
  .use(cors())
  .use(swagger())
  .get("/", () => {
    eventBus.publish(new ReceivedRequestEvent())
    return "up and running"
  });

export class ReceivedRequestEvent extends DomainEvent {}
