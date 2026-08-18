export abstract class ValueObject<T> {
  constructor(public readonly value: T) { }

  equals(other: ValueObject<T>): boolean {
    const thisType = this.constructor.name;
    const otherType = other.constructor.name;
    if (thisType !== otherType) return false;
    return this.value === other.value;
  }
}
