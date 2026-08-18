import { ValueObject } from "./value-object";

export abstract class ID extends ValueObject<string> {
  protected constructor(value: string) {
    super(value);
  }

  static generate(): string {
    return crypto.randomUUID();
  }
}
