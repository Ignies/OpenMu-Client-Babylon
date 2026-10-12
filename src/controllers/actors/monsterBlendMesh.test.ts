import { describe, expect, it, vi } from 'vitest';
import { monsterRegistry } from '../monsters';
import { applyMonsterLook, blendMeshOf, dyingBlend, monsterBlendMeshFor } from './monsterBlendMesh';

const row = (model: number) => {
  const r = monsterBlendMeshFor(model);
  return r && [r.mesh, r.light];
};

describe('monster blend meshes', () => {
  // The Maya hands, dying before MAYA3, and the Dark Ghost, dying, draw every mesh additive (GM_Kanturu_3rd.cpp:885-897,
  // GMEmpireGuardian2.cpp:942-944): once, while the type's test holds.
  it('turn a dying type all additive while its test holds', () => {
    let early = true;
    monsterRegistry.add([{ Numb: 9010, Name: 'hand', dyingBlendAll: () => early }, { Numb: 9011, Name: 'plain' }]);
    const model = { blendAll: vi.fn() };
    expect(dyingBlend(model, 9010, false)).toBe(false);
    expect(dyingBlend(model, 9011, true)).toBe(false);
    early = false;
    expect(dyingBlend(model, 9010, true)).toBe(false);
    early = true;
    expect(dyingBlend(model, 9010, true)).toBe(true);
    expect(model.blendAll).toHaveBeenCalledTimes(1);
  });

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

  // MONSTER_VALKYRIE writes BlendMesh 0 and MONSTER_SILVER_VALKYRIE nothing on the same body (ZzzCharacter.cpp:13768,
  // :13798); the NPC cases write theirs too (:14409, :14441).
  it('take a type its own mesh over its body, the light 1 unless given', () => {
    monsterRegistry.add([
      { Numb: 9001, Name: 'own', blendMesh: { mesh: 0 } },
      { Numb: 9002, Name: 'lit', blendMesh: { mesh: 1, light: 0.5 } },
      { Numb: 9003, Name: 'body' },
    ]);
    expect([blendMeshOf(9001, 35)?.mesh, blendMeshOf(9001, 35)?.light]).toEqual([0, 1]);
    expect([blendMeshOf(9002, -1)?.mesh, blendMeshOf(9002, -1)?.light]).toEqual([1, 0.5]);
    expect(blendMeshOf(9003, 52)).toBe(monsterBlendMeshFor(52));
    expect(blendMeshOf(9003, 35)).toBeUndefined();
  });

describe("a monster type's own look", () => {
  // A RenderMonster case's own passes and `Vector(r, g, b, b->BodyLight)` (Balgass, GMCrywolf1st.cpp:1425-1436).
  it('hand the model its passes and hold its light where the case sets it', () => {
    const passes = { passes: [{ mesh: -1, kind: 'add' as const, map: 'chrome2' as const }] };
    monsterRegistry.add([
      { Numb: 9011, Name: 'chromed', passes, bodyLight: [1, 1, 1] },
      { Numb: 9012, Name: 'plain' },
    ]);
    const model = () => ({ MeshPasses: null as unknown, FixedLight: false, Light: { set: vi.fn() } });
    const chromed = model();
    applyMonsterLook(chromed as never, 9011);
    expect([chromed.MeshPasses, chromed.FixedLight]).toEqual([passes, true]);
    expect(chromed.Light.set).toHaveBeenCalledWith(1, 1, 1);
    const plain = model();
    applyMonsterLook(plain as never, 9012);
    expect([plain.MeshPasses, plain.FixedLight]).toEqual([null, false]);
    // A class that set its own passes keeps them.
    const own = { ...model(), MeshPasses: { passes: [] } };
    applyMonsterLook(own as never, 9011);
    expect(own.MeshPasses).toEqual({ passes: [] });
  });
});
});
