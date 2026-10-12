import { describe, expect, it } from 'vitest';
import { MonsterActionType } from '../../objects/enum';
import { GAION_SWORDS, heldSwords } from './swords';

const named = (action: number) => GAION_SWORDS.filter((_, i) => heldSwords(action)[i]).map(s => s.file.replace('Boss_Karane_sword_', ''));

// CMonsterEmpireGuardian4 (GMEmpireGuardian4.cpp:84-99, :287-445) and the bones ZzzEffect.cpp:9374-9376 links them to.
describe("Gaion's five swords", () => {
  it('are the five Boss_Karane sword models on bones 4, 2, 8, 10 and 6', () => {
    expect(GAION_SWORDS.map(s => [s.file, s.bone])).toEqual([
      ['Boss_Karane_sword_left01', 4],
      ['Boss_Karane_sword_left02', 2],
      ['Boss_Karane_sword_right01', 8],
      ['Boss_Karane_sword_right02', 10],
      ['Boss_Karane_sword_main01', 6],
    ]);
  });

  it('stay in his hands by action, the ones he throws gone', () => {
    expect(named(MonsterActionType.Stop1)).toEqual(['left01', 'left02', 'right01', 'right02', 'main01']);
    expect(named(MonsterActionType.Walk)).toEqual(['left01', 'left02', 'right01', 'right02', 'main01']);
    expect(named(MonsterActionType.Appear)).toEqual(['left01', 'left02', 'right01', 'right02', 'main01']);
    expect(named(MonsterActionType.Attack1)).toEqual(['left01', 'right01', 'main01']);
    expect(named(MonsterActionType.Attack2)).toEqual(['left02', 'right02', 'main01']);
    expect(named(MonsterActionType.Attack3)).toEqual([]);
    expect(named(MonsterActionType.Attack4)).toEqual(['left01', 'left02', 'right01', 'right02']);
  });
});
