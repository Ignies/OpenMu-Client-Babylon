import type { MonsterDef, MonsterRow } from './monster';

/** Every monster type by number. Filled once from the monster files. */
export class MonsterRegistry {
  private readonly defs = new Map<number, MonsterDef>();
  private readonly rows = new Map<number, MonsterRow>();

  constructor(monsters: Iterable<MonsterDef> = []) {
    this.add(monsters);
  }

  /** Adds or replaces monsters; a later file with the same number wins (a version's own file). */
  add(monsters: Iterable<MonsterDef>): void {
    for (const m of monsters) {
      this.defs.set(m.Numb, m);
      if (m.stats) this.rows.set(m.Numb, { Numb: m.Numb, Name: m.Name, ...m.stats });
      else this.rows.delete(m.Numb);
    }
  }

  /** The original table's row for a type, or null when that table does not have it. */
  get(numb: number): MonsterRow | null {
    return this.rows.get(numb) ?? null;
  }

  def(numb: number): MonsterDef | null {
    return this.defs.get(numb) ?? null;
  }

  maxHealth(numb: number): number {
    return this.defs.get(numb)?.maxHealth ?? 0;
  }

  all(): MonsterDef[] {
    return [...this.defs.values()].sort((a, b) => a.Numb - b.Numb);
  }
}
