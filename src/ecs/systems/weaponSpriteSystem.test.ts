import { describe, expect, it, vi } from 'vitest';
import type { World } from '../world';

// The sprites class and the option are stubs; the hands, the look table and the rebuild rule are real.
const made = vi.hoisted(() => ({ list: [] as { model: unknown; specs: unknown; shown: boolean[]; wearers: unknown[]; disposed: boolean }[], on: true }));
vi.mock('../../controllers/actors/weaponSprites', () => ({
  WeaponSprites: class {
    shown: boolean[] = [];
    wearers: unknown[] = [];
    disposed = false;
    constructor(
      _scene: unknown,
      public model: unknown,
      public specs: unknown
    ) {
      made.list.push(this);
    }
    update(_ms: number, _body: unknown, shown: boolean, wearer: { action: number; safeZone: boolean }) {
      this.shown.push(shown);
      this.wearers.push({ ...wearer });
    }
    dispose() {
      this.disposed = true;
    }
  },
}));
vi.mock('../../controllers/actors', () => ({ heldWeapons: () => undefined }));
vi.mock('../../controllers/actors/playerObject', () => ({ isPlayerBody: () => true }));
vi.mock('../../controllers/item_fx/itemEffectMode', () => ({ legacyItemEffectsOn: () => made.on }));

const { WeaponSpriteSystem } = await import('./weaponSpriteSystem');
const { defineItemLook, itemHeldSprites, registerItemLooks } = await import('../../controllers/item_fx/itemLooks');

registerItemLooks([defineItemLook({ items: [[0, 22]], held: [{ texture: 'flare01', bone: 0, scale: 1, light: [1, 1, 1] }] })]);

function player() {
  const socket = () => ({ gltf: {} as object | null });
  return {
    modelObject: { Weapon1: socket(), Weapon2: socket(), Light: {}, CurrentAction: 18 },
    attributeSystem: { isAboveZero: (key: string) => key === 'inSafeZone' },
    charAppearance: { leftHand: { group: 0, num: 22 } as { group: number; num: number } | null, rightHand: { group: 0, num: 0 } },
    visibility: { state: 'visible' },
  };
}

function world(p: ReturnType<typeof player>) {
  return {
    with: () => Object.assign([p], { onEntityRemoved: { subscribe: () => {} } }),
    mapIndex: 0,
    scene: {},
    gameTime: { TotalGameTime: { TotalSeconds: 1 } },
  } as unknown as World;
}

describe('a held weapon\'s sprites', () => {
  it('are made for the hand whose item names them, again when its model changes, and follow the option', () => {
    made.list.length = 0;
    const p = player();
    const system = WeaponSpriteSystem(world(p));
    system.update?.(0);
    expect(made.list).toHaveLength(1);
    expect(made.list[0].model).toBe(p.modelObject.Weapon1);
    expect(made.list[0].specs).toBe(itemHeldSprites(0, 22));
    expect(made.list[0].shown).toEqual([true]);

    system.update?.(0);
    expect(made.list).toHaveLength(1);

    p.modelObject.Weapon1.gltf = {};
    made.on = false;
    system.update?.(0);
    expect(made.list[0].disposed).toBe(true);
    expect(made.list).toHaveLength(2);
    expect(made.list[1].shown).toEqual([false]);

    p.charAppearance.leftHand = null;
    system.update?.(0);
    expect(made.list[1].disposed).toBe(true);
    expect(made.list).toHaveLength(2);
    made.on = true;
  });
});

describe('the wearer a held sprite reads', () => {
  it('is the character\'s action and safe-zone flag this frame (o->CurrentAction, c->SafeZone)', () => {
    made.list.length = 0;
    WeaponSpriteSystem(world(player())).update?.(0);
    expect(made.list[0].wearers).toEqual([{ action: 18, safeZone: true }]);
  });
});
