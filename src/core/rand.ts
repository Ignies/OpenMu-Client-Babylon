import { nanoid } from 'nanoid';

const TWO_PI = Math.PI * 2;

export class Rand {
  static readonly EPSILON = 0.00000001;

  static nextRandomBool(chance: number = 0.5) {
    if (chance <= this.EPSILON) {
      return false;
    }

    const lot = Math.random();
    return lot <= chance;
  }

  /// <summary>
  /// Returns a random integer between min and max.
  /// </summary>
  /// <param name="min">The inclusive lower bound of the random number returned.</param>
  /// <param name="max">The exclusive upper bound of the random number returned.</param>
  /// <returns>A random number.</returns>
  static nextInt(
    min: number = 0,
    max: number = Number.MAX_SAFE_INTEGER
  ): number {
    return min + Math.floor(Math.random() * (max - min));
  }

  static nextFloat(min: number = 0, max: number = Number.MAX_VALUE): number {
    return min + Math.random() * (max - min);
  }

  static nextSign(plusChance: number = 0.5) {
    const plus = this.nextRandomBool(plusChance);

    return plus ? 1 : -1;
  }

  static id(): string {
    return nanoid(10);
  }

  static randomElement<T extends any[]>(array: T): T[0] {
    if (array.length === 0) return null;

    return array[Rand.nextInt(0, array.length)];
  }

  static nextRad() {
    return Math.random() * TWO_PI;
  }

  static nextHalfRad() {
    return Math.random() * Math.PI;
  }
}
