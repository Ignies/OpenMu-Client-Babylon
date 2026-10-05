import { describe, expect, it } from 'vitest';
import { monsters } from './all';

describe('monster names', () => {
  // The old table's converter read 434 and 436 one column off: the name kept the level, every stat moved up one.
  it('a table row\'s name holds no level and its stats sit in their columns', () => {
    expect(monsters.get(434)).toMatchObject({ Name: 'Gigantis', Level: 98, HP: 40000, MP: 0, ResWind: 3, ResFire: 25 });
    expect(monsters.get(436)).toMatchObject({ Name: 'Balram (Trainee)', Level: 134, HP: 55000, MP: 0, ResWind: 3, ResFire: 23 });
    expect(monsters.all().filter(d => /["\t]|\s{2,}/.test(d.Name)).map(d => d.Numb)).toEqual([]);
  });
});
