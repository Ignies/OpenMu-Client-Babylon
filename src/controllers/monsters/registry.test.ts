import { describe, expect, it } from 'vitest';
import { MonsterRegistry } from './registry';

const registry = () =>
  new MonsterRegistry([
    { Numb: 7, Name: 'Seven', npcModel: { file: 'b', scale: 1 } },
    { Numb: 3, Name: 'Three', npcModel: { file: 'a', scale: 2 }, voice: { sound: 'Sound/x', oneIn: 4 } },
    { Numb: 5, Name: 'Five', trap: { object: 1, shadow: false } },
  ]);

describe('MonsterRegistry NPC fields', () => {
  it('lists the types that set a field, in number order', () => {
    expect(registry().having('npcModel')).toEqual([
      [3, { file: 'a', scale: 2 }],
      [7, { file: 'b', scale: 1 }],
    ]);
    expect(registry().having('gear')).toEqual([]);
  });

  it('keeps a false-y value that is set', () => {
    expect(registry().having('trap')).toEqual([[5, { object: 1, shadow: false }]]);
  });

  it('hands out a type whole, NPC fields included', () => {
    expect(registry().def(3)?.voice).toEqual({ sound: 'Sound/x', oneIn: 4 });
    expect(registry().def(4)).toBeNull();
  });

  it('lets a later folder replace a type, its NPC fields too', () => {
    const r = registry();
    r.add([{ Numb: 7, Name: 'Seven again' }]);
    expect(r.def(7)?.npcModel).toBeUndefined();
    expect(r.having('npcModel').map(([n]) => n)).toEqual([3]);
  });
});
