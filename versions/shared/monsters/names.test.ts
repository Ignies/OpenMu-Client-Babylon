import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { monsters } from './all';

/**
 * The original client names a type from `Local/<Lang>/NpcName_<Lang>.txt`: `OpenMonsterScript` reads it and
 * `Setting_Monster` copies the first row for the type into `c->ID` (ZzzInfomation.cpp:2357-2381,
 * ZzzCharacter.cpp:13163-13171). A type with a row in the old table keeps the table's name (readme.md).
 */
const NPC_NAMES = new URL('../../../Data/Local/Eng/NpcName_Eng.txt', import.meta.url);
// Data/ is not checked out everywhere (worktrees, CI without assets).
const NO_DATA = !existsSync(NPC_NAMES);

/** NpcName_Eng.txt's lines 419-421 are one off (readme.md); those folders follow `_enum.h`. */
const SHIFTED = new Set([419, 420, 421]);

function npcNames(): Map<number, string> {
  const out = new Map<number, string>();
  for (const line of new TextDecoder('latin1').decode(readFileSync(NPC_NAMES)).split(/\r?\n/)) {
    const hit = /^\s*(\d+)\s+\d+\s+"([^"]*)"/.exec(line);
    if (hit && !out.has(Number(hit[1]))) out.set(Number(hit[1]), hit[2]);
  }
  return out;
}

describe('monster names', () => {
  // The old table's converter read 434 and 436 one column off: the name kept the level, every stat moved up one.
  it('a table row\'s name holds no level and its stats sit in their columns', () => {
    expect(monsters.get(434)).toMatchObject({ Name: 'Gigantis', Level: 98, HP: 40000, MP: 0, ResWind: 3, ResFire: 25 });
    expect(monsters.get(436)).toMatchObject({ Name: 'Balram (Trainee)', Level: 134, HP: 55000, MP: 0, ResWind: 3, ResFire: 23 });
    expect(monsters.all().filter(d => /["\t]|\s{2,}/.test(d.Name)).map(d => d.Numb)).toEqual([]);
  });

  it('a type with no table row carries the original client\'s name, not the server\'s', () => {
    const names = Object.fromEntries([426, 460, 462, 504, 505, 514, 522, 524, 528].map(n => [n, monsters.def(n)?.Name]));
    expect(names).toEqual({
      426: 'Chaos Castle13',
      460: 'Spider Eggs',
      462: 'Spider Eggs',
      504: 'Gaion Kharein',
      505: 'Jerint',
      514: 'Knight Commander',
      522: 'Jerint the Assistant',
      524: 'Castle Gate 1',
      528: 'Castle Gate 4',
    });
  });

  it.skipIf(NO_DATA)('every type NpcName_Eng.txt names and the table lacks has that name', () => {
    const names = npcNames();
    const wrong = monsters
      .all()
      .filter(d => !d.stats && !SHIFTED.has(d.Numb) && names.has(d.Numb) && names.get(d.Numb) !== d.Name)
      .map(d => `${d.Numb} ${d.Name} (${names.get(d.Numb)})`);
    expect(wrong).toEqual([]);
  });
});
