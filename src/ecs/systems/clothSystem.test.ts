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
import { TransformNode } from '../../controllers/render/babylon/exports';
import { PlayerObject } from '../../controllers/actors/playerObject';
import { registerCloaks, type CloakWearer } from '../../controllers/actors/cloaks';
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
registerCloaks((w, set) => {
  seen = { ...w };
  if (!w.wing || w.chaosCastle) return [1, 1, 1];
  if (!set.built) {
    set.build(2, CAPE);
    set.count = 3;
  }
  set.draw(2);
  return [1, 0.2, 0];
});

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

function run(p: ReturnType<typeof player>, mapIndex = 0) {
  ClothSystem({ with: () => [p], mapIndex } as unknown as World).update?.(0.04);
  return p.modelObject.Cloth;
}

describe('ClothSystem', () => {
  it('hangs on each player body what the wearers\' rule names, in its light', () => {
    const p = player({ wings: { group: 13, num: 30 } });
    const set = run(p);
    expect(seen).toEqual({ charClass: C.DarkLord, wing: { group: 13, num: 30 }, armor: null, skin: null, chaosCastle: false, netId: null, hero: false, guild: null });
    expect([set.size, set.cloth(2)?.spec, set.drawn(2)]).toEqual([1, CAPE, true]);
    // Undrawn the next frame the rule names nothing; the set stays as built.
    p.charAppearance.wings = null;
    expect([run(p).drawn(2), run(p).size]).toEqual([false, 1]);
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
