import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { monsters } from './all';

/**
 * The monster folders are the old monsters.json (the original table), monsterHealth.json (the
 * server's health) and the actors' Setting_Monster model table, split one per monster. These hashes
 * are those tables', so any change to a monster's data shows here: update them on purpose, in the
 * same commit.
 */
const ROWS_HASH = '6c1233ed9b9d170eec6dc6a174a8e14978aeac5dc9ff8cdbc8ce1c7e955129e6';
const HEALTH_HASH = '5f2f7fd14493321a0ae38909609cc52af6c05f355a66d609118274cff2d16d55';
const MODELS_HASH = '02093793a8f3fff577e403be65d353d3e5dc7fcc2d793523b8f057a08d2d2239';

const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const sortedKeys = (o: object) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));

describe('monster folders', () => {
  it('hold the original table, unchanged', () => {
    const rows = monsters.all().flatMap(d => (monsters.get(d.Numb) ? [sortedKeys(monsters.get(d.Numb)!)] : []));
    expect(rows).toHaveLength(321);
    expect(hash(rows)).toBe(ROWS_HASH);
  });

  it('hold the server health, unchanged', () => {
    const health = Object.fromEntries(monsters.all().filter(d => d.maxHealth !== undefined).map(d => [d.Numb, d.maxHealth]));
    expect(Object.keys(health)).toHaveLength(424);
    expect(hash(health)).toBe(HEALTH_HASH);
  });

  it('hold the model table (Setting_Monster), unchanged', () => {
    const models = monsters.all().flatMap(d => (d.model ? [[d.Numb, d.model.type, d.model.scale]] : []));
    expect(models).toHaveLength(394);
    expect(hash(models)).toBe(MODELS_HASH);
    const hidden = monsters.all().flatMap(d => (d.model?.hiddenMesh !== undefined ? [[d.Numb, d.model.hiddenMesh]] : []));
    expect(hidden).toEqual([[0, 0], [1, 0], [5, 1]]);
  });

  it('look monsters up by number', () => {
    expect(monsters.get(0)?.Name).toBe('Bull Fighter');
    expect(monsters.maxHealth(0)).toBe(100);
    expect(monsters.get(9999)).toBeNull();
  });
});
