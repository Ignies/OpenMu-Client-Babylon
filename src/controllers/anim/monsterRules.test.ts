import { describe, expect, it } from 'vitest';
import { monsterCastOf, monsterSwingRule } from './monsterRules';

// The version's rule files are registered by the test setup (versions/shared/animations).
describe('monster swing rules', () => {
  it('match any-map rules by npc number on every map', () => {
    expect(monsterSwingRule(145, -1, 0, false)?.name).toBe('death_centurion');
    expect(monsterSwingRule(145, -1, 0, true)).toBeUndefined();
  });

  it('match map rules by body only on their maps', () => {
    expect(monsterSwingRule(560, 192, 56, true)?.name).toBe('medusa');
    expect(monsterSwingRule(560, 192, 57, true)).toBeUndefined();
  });
});

describe('monster casts', () => {
  it('say what a skill plays on a monster caster', () => {
    expect(monsterCastOf(3)?.clip).toBe('attack');
    expect(monsterCastOf(59)).toMatchObject({ recordsSkill: false, attackTime: false });
    expect(monsterCastOf(9999)).toBeUndefined();
  });
});
