import { createApp, ReceivedRequestEvent } from "./app";
import { InMemoryEventBus } from "./lib/shared/infrastructure/in-memory-event-bus";

const eventBus = new InMemoryEventBus();

const handler = {
  handle: (event: ReceivedRequestEvent) => {
    console.log(`A request was received at ${event.timestamp}`)
  }
}

eventBus.subscribe(ReceivedRequestEvent, handler)

const app = createApp(eventBus);

export type App = typeof app;

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
