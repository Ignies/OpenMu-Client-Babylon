import { describe, expect, it } from 'vitest';
import { MASTER_REPLACES, SKILL_DEFINITIONS, skillDefinition } from './skillsDatabase';

const raw = (num: number) => SKILL_DEFINITIONS.find(s => s.num === num);
const shape = (num: number) => {
  const def = skillDefinition(num);
  return def && { type: def.type, target: def.target, damageType: def.damageType, range: def.range };
};

describe('master skills cast as the skill they replace', () => {
  it('gives a Strengthener its base skill shape (OpenMU AddMasterSkillDefinition)', () => {
    expect(shape(330)).toEqual(shape(41));
    expect(shape(330)?.type).toBe('AreaSkillAutomaticHits');
    expect(shape(413)).toEqual(shape(26));
    expect(shape(413)?.type).toBe('Regeneration');
  });

  it('follows a Mastery through its Strengthener to the base skill', () => {
    expect(MASTER_REPLACES[332]).toBe(330);
    expect(shape(332)).toEqual(shape(41));
    expect(shape(422)).toEqual(shape(28));
  });

  it('keeps the master skill its own reach, costs, requirements and damage', () => {
    const { distance, mana, ag, level, energy, damage, name } = { ...raw(331) };
    expect(skillDefinition(331)).toMatchObject({ distance, mana, ag, level, energy, damage, name });
  });

  it('leaves the passive tree entries and the replaced skills alone', () => {
    expect(skillDefinition(334)).toBe(raw(334));
    expect(skillDefinition(41)).toBe(raw(41));
  });
});
