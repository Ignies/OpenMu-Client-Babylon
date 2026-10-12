import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Item, World } from '../world';

// The loaders and item tables are stubs; the head, class model and held item rules are real.
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
vi.mock('../../controllers/actors/weaponClass', () => ({
  isBook: () => false,
  isSwordformGloves: (i: Item | null) => !!i && i.group === 0 && i.num >= 32 && i.num <= 35,
  swordformGlovesModel: (i: Item | null, slot: 0 | 1) => (i && i.group === 0 && i.num === 32 ? ['SwordR33.glb', 'SwordL33.glb'][slot] : null),
}));
vi.mock('../../controllers/assets', () => ({ settle: (p: unknown) => p }));
vi.mock('./gmMark', () => ({ syncGmMark: () => {} }));
vi.mock('./creditsAccent', () => ({ syncCreditsAccent: () => {} }));

const CHAOS_CASTLE = 18;
const { defineItemLook, itemBodyPasses, registerItemLooks } = await import('../../controllers/item_fx/itemLooks');
const { AppearanceSystem } = await import('./appearanceSystem');

/** A player body whose class head starts on, as PlayerObject.init leaves it. */
function body() {
  const socket = () => ({
    on: false, model: '', BlendMesh: -1, HiddenMesh: -1, LinkParent: false,
    BlendMeshLightAt: null as ((ms: number) => number) | null,
    MeshPasses: null as unknown,
    Unload() { this.on = false; },
  });
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
    async loadPartAsync(_dir: string, part: { on: boolean; model: string }, model: string) { part.on = true; part.model = model; },
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

function player(charClass = 0) {
  const modelObject = body();
  const charAppearance = {
    helm: null as Item | null, armor: null, pants: null, gloves: null, boots: null,
    leftHand: null as Item | null, rightHand: null as Item | null, wings: null, pet: null, charClass, changed: true,
  };
  return { modelObject, charAppearance, visibility: { state: 'visible' } };
}

let map = 0;
function update(p: ReturnType<typeof player>) {
  p.charAppearance.changed = true;
  AppearanceSystem({ with: () => [p], mapIndex: map } as unknown as World).update?.(0);
}

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

const RAGE_FIGHTER = 24;
const DARK_LORD = 16;

describe('the model a class wears (ZzzCharacter.cpp:9579-9617)', () => {
  it('dresses a Rage Fighter in Leather as the Monk models, a Dark Knight in the item models', () => {
    const fighter = player(RAGE_FIGHTER);
    Object.assign(fighter.charAppearance, { helm: { group: 7, num: 5 }, armor: { group: 8, num: 5 } });
    update(fighter);
    expect(fighter.modelObject.HelmMask.model).toBe('HelmMonk01.glb');
    expect(fighter.modelObject.Armor.model).toBe('ArmorMonk01.glb');

    const knight = player(4);
    Object.assign(knight.charAppearance, { armor: { group: 8, num: 5 } });
    update(knight);
    expect(knight.modelObject.Armor.model).toBe('part.glb');
  });

  it('gives a Dark Lord the mask helm', () => {
    const lord = player(DARK_LORD);
    lord.charAppearance.helm = { group: 7, num: 9 };
    update(lord);
    expect(lord.modelObject.HelmMask.model).toBe('MaskHelmMale10.glb');
  });
});

describe('a held item', () => {
  it('takes its ItemObjectAttribute mesh rules: every mesh additive on the Bluewing Crossbow (ZzzCharacter.cpp:6648)', () => {
    const elf = player(8);
    elf.charAppearance.leftHand = { group: 4, num: 13 };
    elf.charAppearance.rightHand = { group: 0, num: 31 };
    update(elf);
    expect(elf.modelObject.Weapon1.BlendMesh).toBe(-2);
    expect(elf.modelObject.Weapon1.BlendMeshLightAt?.(0)).toBeCloseTo(0.7);
    expect(elf.modelObject.Weapon2.HiddenMesh).toBe(2);

    elf.charAppearance.leftHand = { group: 0, num: 0 };
    update(elf);
    expect(elf.modelObject.Weapon1.BlendMesh).toBe(-1);
    expect(elf.modelObject.Weapon1.BlendMeshLightAt).toBeNull();
  });

  // RenderPartObjectBody's branch for the model runs on a held weapon and a worn piece alike (ZzzObject.cpp:10137).
  it("and a worn piece take their item look's passes", () => {
    registerItemLooks([defineItemLook({ items: [[0, 31], [8, 23]], body: { passes: [{ mesh: 0, kind: 'add' }] } })]);
    const knight = player(1);
    knight.charAppearance.rightHand = { group: 0, num: 31 };
    knight.charAppearance.armor = { group: 8, num: 23 } as never;
    update(knight);
    expect(knight.modelObject.Weapon2.MeshPasses).toBe(itemBodyPasses(0, 31));
    expect(knight.modelObject.Armor.MeshPasses).toBe(itemBodyPasses(8, 23));
    expect(itemBodyPasses(0, 31)).not.toBeNull();

    knight.charAppearance.rightHand = { group: 0, num: 0 };
    update(knight);
    expect(knight.modelObject.Weapon2.MeshPasses).toBeNull();
  });

  it('rides the body skeleton when it is a glove weapon (RenderSwordformGloves, MonkSystem.cpp:248)', () => {
    const fighter = player(RAGE_FIGHTER);
    fighter.charAppearance.leftHand = { group: 0, num: 32 };
    update(fighter);
    expect(fighter.modelObject.Weapon1.model).toBe('SwordR33.glb');
    expect(fighter.modelObject.Weapon1.LinkParent).toBe(true);

    fighter.charAppearance.leftHand = { group: 0, num: 1 };
    update(fighter);
    expect(fighter.modelObject.Weapon1.LinkParent).toBe(false);
  });
});
