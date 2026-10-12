import { describe, expect, it } from 'vitest';
import { monsterBlendMeshFor } from './monsterBlendMesh';

const row = (model: number) => {
  const r = monsterBlendMeshFor(model);
  return r && [r.mesh, r.light];
};

describe('monster blend meshes', () => {
  // CreateMonster's `c->Object.BlendMesh` by model (ZzzCharacter.cpp:13576, :13607, :13741, :13981, :14000,
  // :14902; GMHellas.cpp:845, :861; GMBattleCastle.cpp:1409), `BlendMeshLight` 1 unless written (:11936).
  it('give each model the mesh its case draws additive', () => {
    expect(row(50)).toEqual([0, 1]); // Alquamos
    expect(row(52)).toEqual([1, 1]); // the Crusts
    expect(row(42)).toEqual([2, 1]); // Tantallos, Zaikan
    expect(row(21)).toEqual([1, 1]); // Beetle Monster
    expect(row(18)).toEqual([2, 1]); // Ice Queen
    expect(row(66)).toEqual([1, 1]); // Aegis
    expect(row(67)).toEqual([0, 1]); // Death and Rogue Centurion
    expect(row(86)).toEqual([3, 1]); // Life Stone
    // The Death Angel's mesh 1 and the Necron's mesh 3 are meshes their one- and two-mesh bodies lack.
    expect([row(63), row(68)]).toEqual([undefined, undefined]);
  });

  // MODEL_CRUST scrolls U a full sheet every 2.5 s (ZzzCharacter.cpp:5818).
  it('scroll the Crust', () => {
    const crust = monsterBlendMeshFor(52)?.animate?.({ CurrentAction: 0 });
    expect(crust?.u?.(1250)).toBeCloseTo(-0.5);
  });
});
