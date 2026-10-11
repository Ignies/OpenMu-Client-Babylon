import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Item, World } from '../world';

// Only the head rule is under test: the loaders and item tables are stubs.
vi.mock('@versions/shared/items/itemsDatabase', () => ({
  ItemsDatabase: { getItem: () => ({ szModelFolder: 'Item/', szModelName: 'part.glb' }) },
}));
vi.mock('../../controllers/item_fx/itemVisualTier', () => ({ itemVisualTier: () => 0 }));
vi.mock('../../controllers/actors', () => ({
  heldWeapons: () => undefined,
  wearsChaosCastleSkin: (_e: unknown, map: number) => map === 18,
}));
vi.mock('../../controllers/actors/playerObject', () => ({ isPlayerBody: () => true }));
vi.mock('../../controllers/actors/weaponAttachment', () => ({ applyWeaponAttachments: () => {} }));
vi.mock('../../controllers/actors/weaponClass', () => ({ isBook: () => false, swordformGlovesModel: () => null }));
vi.mock('../../controllers/assets', () => ({ settle: (p: unknown) => p }));
vi.mock('./gmMark', () => ({ syncGmMark: () => {} }));

const CHAOS_CASTLE = 18;
const { AppearanceSystem } = await import('./appearanceSystem');

/** A player body whose class head starts on, as PlayerObject.init leaves it. */
function body() {
  const socket = () => ({ on: false, Unload() { this.on = false; } });
  const b = {
    Ready: true,
    Helm: socket(),
    HelmMask: socket(),
    Armor: socket(),
    Pants: socket(),
    Gloves: socket(),
    Boots: socket(),
    Weapon1: socket(),
    Weapon2: socket(),
    async loadPartAsync(_dir: string, part: { on: boolean }) { part.on = true; },
    async setDefaultHelm() { b.Helm.on = true; },
    async setDefaultMask() { b.HelmMask.Unload(); },
    async setDefaultArmor() {},
    async setDefaultPants() {},
    async setDefaultGloves() {},
    async setDefaultBoots() {},
    async setWingsAsync() {},
    async setBodyPetAsync() {},
    async setPhoenixWingAsync() {},
  };
  b.Helm.on = true;
  return b;
}

function player() {
  const modelObject = body();
  const charAppearance = {
    helm: null as Item | null, armor: null, pants: null, gloves: null, boots: null,
    leftHand: null, rightHand: null, wings: null, pet: null, charClass: 0, changed: true,
  };
  return { modelObject, charAppearance, visibility: { state: 'visible' } };
}

let map = 0;
function dress(p: ReturnType<typeof player>, helm: number | null): boolean {
  p.charAppearance.helm = helm === null ? null : { group: 7, num: helm, lvl: 0 };
  p.charAppearance.changed = true;
  const world = { with: () => [p], mapIndex: map };
  AppearanceSystem(world as unknown as World).update?.(0);
  return p.modelObject.Helm.on;
}

beforeEach(() => {
  map = 0;
});

// SetCharacterScale (ZzzCharacter.cpp:12114-12128): BODYPART_HEAD is the class head under MODEL_HELM,
// MODEL_PAD_HELM, MODEL_HELM + 63, 68, 65, 70 and MODEL_VINE_HELM..MODEL_SPIRIT_HELM, else -1.
const OPEN = [0, 2, 10, 11, 12, 13, 63, 65, 68, 70];

describe('the class head under a helm', () => {
  it('stays on bare-headed: the head is then the helm part itself', () => {
    expect(dress(player(), null)).toBe(true);
  });

  it('stays on under the open helms: Bronze, Pad, Vine to Spirit and 63, 65, 68, 70', () => {
    for (const num of OPEN) expect(dress(player(), num), `helm ${num}`).toBe(true);
  });

  it('comes off under every other helm', () => {
    for (let num = 0; num < 128; num++) {
      if (!OPEN.includes(num)) expect(dress(player(), num), `helm ${num}`).toBe(false);
    }
  });

  it('comes back when the closed helm is taken off or swapped for an open one', () => {
    const p = player();
    expect(dress(p, 1)).toBe(false);
    expect(dress(p, null)).toBe(true);
    expect(dress(p, 14)).toBe(false);
    expect(dress(p, 12)).toBe(true);
  });

  it('comes back out of Chaos Castle only where the helm leaves it on', () => {
    const p = player();
    map = CHAOS_CASTLE;
    expect(dress(p, 0)).toBe(false);
    map = 0;
    expect(dress(p, 5)).toBe(false);
    expect(dress(p, 0)).toBe(true);
  });
});
