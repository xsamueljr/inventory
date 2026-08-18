export abstract class DomainEvent {
  public readonly timestamp: Date;

  constructor(timestamp: Date = new Date()) {
    this.timestamp = timestamp;
  }
}
