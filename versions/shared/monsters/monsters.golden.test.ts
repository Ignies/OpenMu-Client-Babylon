import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { monsters } from './all';

/**
 * The monster folders are the old monsters.json (the original table), monsterHealth.json (the
 * server's health) and the actors' Setting_Monster model table, split one per monster. These hashes
 * are those tables', so any change to a monster's data shows here: update them on purpose, in the
 * same commit.
 */
const ROWS_HASH = '9f27833ef3e036ecbc74d0b71129ab60bc648a2ec2a8d791817865edb3061f07';
const HEALTH_HASH = '5f2f7fd14493321a0ae38909609cc52af6c05f355a66d609118274cff2d16d55';
const MODELS_HASH = 'd4dbddb3da1eb89d834162b963a9598fc8191ddb79f49e52d2f2e13cd1e6c811';

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
    expect(models).toHaveLength(393);
    expect(hash(models)).toBe(MODELS_HASH);
    const hidden = monsters.all().flatMap(d => (d.model?.hiddenMesh !== undefined ? [[d.Numb, d.model.hiddenMesh]] : []));
    expect(hidden).toEqual([[0, 0], [1, 0], [5, 1]]);
  });

  // HiddenMesh = -2 at creation: the Crywolf altars (ZzzCharacter.cpp:14266-14313) and Maya's own body,
  // which only stands for her two hands (GM_Kanturu_3rd.cpp:773-781).
  it('draw nothing for the types the original hides whole', () => {
    expect(monsters.all().filter(d => d.hidden).map(d => d.Numb)).toEqual([205, 206, 207, 208, 209, 364]);
    const maya = monsters.all().find(d => d.Numb === 364);
    expect(maya?.bodyFx).toBeUndefined();
    expect(maya?.model).toBeUndefined();
  });

  // The eight Little Santas' case writes 0.4 into clips 0, 1 and 4 and 0.5 into 2 and 3 (ZzzCharacter.cpp:14815-14828).
  it('play the Little Santas at their own clip speeds', () => {
    const santas = monsters.all().filter(d => d.Numb >= 468 && d.Numb <= 475);
    expect(santas).toHaveLength(8);
    for (const d of santas) expect(d.npcModel?.clipSpeeds).toEqual({ 0: 0.4, 1: 0.4, 2: 0.5, 3: 0.5, 4: 0.4 });
  });

  it('look monsters up by number', () => {
    expect(monsters.get(0)?.Name).toBe('Bull Fighter');
    expect(monsters.maxHealth(0)).toBe(100);
    expect(monsters.get(9999)).toBeNull();
  });
});
