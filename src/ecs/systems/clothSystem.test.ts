import { afterAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});
vi.mock('../../controllers/assets/mu', async importOriginal => ({
  ...(await importOriginal<object>()),
  loadMuSprite: () => new Promise(() => {}),
}));

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh, Skeleton, TransformNode } from '../../controllers/render/babylon/exports';
import { PlayerObject } from '../../controllers/actors/playerObject';
import { MonsterObject } from '../../controllers/actors/monsterObject';
import { registerCloaks, type CloakRule, type CloakWearer } from '../../controllers/actors/cloaks';
import type { ClothSpec } from '../../controllers/cloth';
import { CharacterClassNumber as C } from '../../core/types';
import type { Item, World } from '../world';
import { ClothSystem } from './clothSystem';

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

const CAPE: ClothSpec = { bone: 19, at: [0, 8, 10], grid: [3, 3], size: [10, 10], front: 'a', back: 'a', flags: 0 };
/** What the rule saw last. */
let seen: CloakWearer | null = null;
const capeRule: CloakRule = (w, set) => {
  seen = { ...w };
  if (!w.wing || w.chaosCastle) return [1, 1, 1];
  if (!set.built) {
    set.build(2, CAPE);
    set.count = 3;
  }
  set.draw(2);
  return [1, 0.2, 0];
};
registerCloaks(capeRule);

const CHAOS_CASTLE = 18;

function player(look: Partial<{ wings: Item | null; leftHand: Item | null; pet: Item | null }> = {}) {
  const modelObject = new PlayerObject(scene, new TransformNode('player', scene));
  modelObject.Ready = true;
  const charAppearance = {
    helm: null, armor: null, pants: null, gloves: null, boots: null,
    leftHand: null as Item | null, rightHand: null as Item | null, wings: null as Item | null, pet: null as Item | null,
    charClass: C.DarkLord, changed: false, ...look,
  };
  return { modelObject, charAppearance, visibility: { state: 'visible' as string }, buffs: new Set<number>() };
}

/** One system per player and map, kept across frames as the world keeps it. */
const systems = new WeakMap<object, Map<number, ReturnType<typeof ClothSystem>>>();
function run(p: ReturnType<typeof player>, mapIndex = 0) {
  let byMap = systems.get(p);
  if (!byMap) systems.set(p, (byMap = new Map()));
  let system = byMap.get(mapIndex);
  if (!system) byMap.set(mapIndex, (system = ClothSystem({ with: () => [p], mapIndex } as unknown as World)));
  system.update?.(0.04);
  return p.modelObject.Cloth;
}

describe('ClothSystem', () => {
  it('hangs on each player body what the wearers\' rule names, in its light', () => {
    const p = player({ wings: { group: 13, num: 30 } });
    const set = run(p);
    expect(seen).toEqual({ charClass: C.DarkLord, wing: { group: 13, num: 30 }, wingBefore: { group: 13, num: 30 }, armor: null, skin: null, chaosCastle: false, netId: null, hero: false, guild: null, monster: null, rig: true, pants: null, shadowPass: true, fading: false });
    expect([set.size, set.cloth(2)?.spec, set.drawn(2)]).toEqual([1, CAPE, true]);
    // Undrawn the next frame the rule names nothing; the set stays as built.
    p.charAppearance.wings = null;
    expect([run(p).drawn(2), seen?.wingBefore, run(p).size, seen?.wingBefore]).toEqual([false, { group: 13, num: 30 }, 1, null]);
  });

  it('tells the rule who the body is: its id, the hero or not, its guild', () => {
    const p = { ...player(), netId: 42, localPlayer: true as const, guild: { id: 3, role: 0 } };
    run(p);
    expect([seen?.netId, seen?.hero, seen?.guild]).toEqual([42, true, 3]);
  });

  it('tells the rule the body a ring puts on the rig, by its part file', () => {
    const p = { ...player(), skin: 14 };
    run(p);
    expect(seen?.skin).toBe('Skeleton01.glb');
  });

  it('hands the rule the pants part\'s set and model, and whether the shadow pass draws the parts again (ZzzCharacter.cpp:8590-8612)', () => {
    let part: unknown = null;
    registerCloaks((w, _set, pants) => {
      seen = { ...w };
      part = pants;
      return [1, 1, 1];
    });
    const p = player();
    p.modelObject.Pants.gltf = { mesh: new Mesh('t_PantMale19.glb', scene), skeleton: new Skeleton('s', 's', scene), animationGroups: [] };
    run(p);
    expect([seen?.pants, seen?.shadowPass, part]).toEqual(['t_PantMale19.glb', true, p.modelObject.PantsCloth]);
    // Under half alpha, on a mount out of town, in Icarus or Kalima there is no shadow pass.
    p.modelObject.Alpha = 0.4;
    expect([run(p) && seen?.shadowPass]).toEqual([false]);
    p.modelObject.Alpha = 1;
    p.modelObject.Pants.ClassicShadow = false;
    expect([run(p) && seen?.shadowPass]).toEqual([false]);
    p.modelObject.Pants.ClassicShadow = true;
    expect([run(p, 10) && seen?.shadowPass, run(p, 24) && seen?.shadowPass]).toEqual([false, false]);
    registerCloaks(capeRule);
  });

  it('drops a body\'s set and its pants\' together (`DeleteCloth` takes both)', () => {
    const p = player();
    const { Cloth, PantsCloth } = p.modelObject;
    Cloth.build(0, CAPE);
    PantsCloth.build(0, CAPE);
    PantsCloth.drop();
    expect([Cloth.built, PantsCloth.built]).toEqual([false, false]);
    PantsCloth.build(0, CAPE);
    Cloth.drop();
    expect(PantsCloth.built).toBe(false);
  });

  it('fades a dying body\'s sets once its Rot passes 1, dropped as the fade begins (DeadCharacter, ZzzCharacter.cpp:3233-3251)', () => {
    const p = { ...player({ wings: { group: 13, num: 30 } }), dying: { rot: 0.5 } };
    const set = run(p);
    const drop = vi.spyOn(set, 'drop');
    expect([set.fading, p.modelObject.PantsCloth.fading, seen?.fading]).toEqual([false, false, false]);
    p.dying.rot = 1.02;
    run(p);
    expect([set.fading, p.modelObject.PantsCloth.fading, seen?.fading, drop.mock.calls.length, set.built]).toEqual([true, true, true, 1, true]);
    run(p);
    expect(drop.mock.calls.length).toBe(1);
  });

  it('tells the rule when the body is inside Chaos Castle', () => {
    const p = player({ wings: { group: 13, num: 30 } });
    expect(run(p, CHAOS_CASTLE).size).toBe(0);
    expect(seen?.chaosCastle).toBe(true);
  });

  it('neither steps nor draws a cloaked or unseen body, and holds a stunned or sleeping one', () => {
    const p = player({ wings: { group: 13, num: 30 } });
    expect(run(p).shown).toBe(true);
    p.buffs.add(18);
    expect(run(p).shown).toBe(false);
    p.buffs.clear();
    p.modelObject.OutOfView = true;
    expect(run(p).shown).toBe(false);
    p.modelObject.OutOfView = false;
    p.visibility.state = 'hidden';
    expect(run(p).shown).toBe(false);
    p.visibility.state = 'visible';
    p.buffs.add(61);
    expect([run(p).shown, run(p).held]).toEqual([true, true]);
    p.buffs.clear();
    p.buffs.add(72);
    expect(run(p).held).toBe(true);
  });

  it('casts the cloth shadow while a link object is drawn: the wing slot, a held weapon or the Imp (ZzzCharacter.cpp:8433-8446)', () => {
    registerCloaks((_w, set) => {
      if (!set.built) set.build(2, CAPE);
      set.count = 3;
      set.draw(2);
      return [1, 1, 1];
    });
    const p = player();
    expect(run(p).castsShadow).toBe(false);
    p.charAppearance.wings = { group: 13, num: 30 };
    expect(run(p).castsShadow).toBe(true);
    p.charAppearance.wings = null;
    p.charAppearance.leftHand = { group: 0, num: 0 };
    expect(run(p).castsShadow).toBe(true);
    // A book is never drawn on the body.
    p.charAppearance.leftHand = { group: 5, num: 21 };
    expect(run(p).castsShadow).toBe(false);
    p.charAppearance.leftHand = null;
    p.charAppearance.pet = { group: 13, num: 1 };
    expect(run(p).castsShadow).toBe(true);
  });
});

describe('ClothSystem and the monsters', () => {
  it('tells the rule which monster a body is, the Nightmare on its own skeleton (ZzzCharacter.cpp:9173-9176)', () => {
    registerCloaks((w, set) => {
      seen = { ...w };
      if (w.monster === 361 && !set.built) {
        set.build(0, CAPE);
        set.count = 1;
      }
      if (set.built) set.draw(0);
      return [1, 1, 1];
    });
    const modelObject = new MonsterObject(scene, new TransformNode('nightmare', scene));
    modelObject.Ready = true;
    const nightmare = { npcType: 361, netId: 9, modelObject, visibility: { state: 'visible' }, buffs: new Set<number>() };
    const other = { npcType: 3, modelObject: new MonsterObject(scene, new TransformNode('spider', scene)) };
    ClothSystem({ with: (...keys: string[]) => (keys.includes('npcType') ? [nightmare, other] : []), mapIndex: 0 } as unknown as World).update?.(0.04);
    expect([modelObject.Cloth.built, modelObject.Cloth.drawn(0), other.modelObject.Cloth.built]).toEqual([true, true, false]);
    expect([seen?.monster, seen?.rig, seen?.hero, seen?.guild]).toEqual([3, false, false, null]);
  });

  it('tells it the monster of a player-rig monster and of a player in a monster\'s body', () => {
    const deathKing = { ...player(), npcType: 55 };
    run(deathKing);
    expect([seen?.monster, seen?.rig]).toEqual([55, true]);
    const body = new MonsterObject(scene, new TransformNode('skinned', scene));
    const skinned = { ...player(), modelObject: body, skin: 361 };
    ClothSystem({ with: (...keys: string[]) => (keys.includes('charAppearance') ? [skinned] : []), mapIndex: 0 } as unknown as World).update?.(0.04);
    expect([seen?.monster, seen?.rig, seen?.skin]).toEqual([361, false, null]);
  });
});
