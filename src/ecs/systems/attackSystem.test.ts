import { afterEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Entity, Item, World } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

/** The world's `autoQuiver`, set per test; every other setting is the original's. */
const quiver = vi.hoisted(() => ({ allows: true }));
vi.mock('../../modules/servers/serverManifest', async importOriginal => ({
  ...(await importOriginal<typeof import('../../modules/servers/serverManifest')>()),
  serverSetting: (key: string) => (key === 'autoQuiver' ? quiver.allows : false),
}));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { AttackSystem } = await import('./attackSystem');
const { Session } = await import('../../modules/session');
const { Hero } = await import('../../modules/hero');
const { Bag } = await import('../../modules/inventory');
const { setGameOption } = await import('../../controllers/settings');
const { combat } = await import('../../controllers/combat');
const { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } = await import('../../controllers/fidelity');
const { HitRequestPacket } = await import('@versions/shared/packets/ClientToServerPackets');

const hands = { leftHand: null, rightHand: null, wings: null, pet: null, charClass: 16 };

describe('a melee swing', () => {
  it('stops the walk it cuts on the server too, before the hit (LetHeroStop, ZzzInterface.cpp:1299)', () => {
    const hero = {
      localPlayer: true,
      transform: { pos: new Vector3(100.5, 0, 100.5), rot: new Vector3(), scale: 1 },
      charAppearance: hands,
      pathfinding: { path: [{ x: 101, y: 100 }, { x: 102, y: 100 }] },
      playerAnimation: { action: 0, swordCount: 0 },
      attributeSystem: { isAboveZero: () => false, getValue: () => 0 },
    } as unknown as Entity;
    const monster = {
      netId: 7,
      npcType: 3,
      worldIndex: 0,
      transform: { pos: new Vector3(101.5, 0, 100.5), rot: new Vector3(), scale: 1 },
    } as unknown as Entity;
    const world = {
      mapIndex: 0,
      playerEntity: hero,
      attackTarget: monster,
      castRequest: null,
      getTerrainFlag: () => 0,
    } as unknown as World;

    const sent: string[] = [];
    const stop = vi.spyOn(Hero, 'sendWalkStop').mockImplementation(() => void sent.push('stop'));
    vi.spyOn(Session, 'sendToGS').mockImplementation(buffer => {
      if (buffer.getUint8(2) === HitRequestPacket.Code) sent.push('hit');
    });

    AttackSystem(world).update?.(0.04);

    expect(sent).toEqual(['stop', 'hit']);
    // Mid-step the hero's tile is the step's destination, the path's next node (ZzzAI.cpp:556-562).
    expect(stop).toHaveBeenCalledWith(101, 100, hero.transform?.rot.y);
    vi.restoreAllMocks();
  });
});

describe('the automatic quiver', () => {
  /**
   * An elf with a bow and a quiver in hand and another quiver at `slot` in the bag; the quiver's
   * last arrow goes, then the server takes it out of the hand. The moves asked for.
   */
  function runOut(slot: number, picked = false): number[][] {
    const quiverInHand = { group: 4, num: 15, durability: 1 } as Item;
    const appearance = { ...hands, leftHand: { group: 4, num: 0 } as Item, rightHand: quiverInHand as Item | null };
    const hero = {
      localPlayer: true,
      transform: { pos: new Vector3(100.5, 0, 100.5), rot: new Vector3(), scale: 1 },
      charAppearance: appearance,
      pathfinding: { path: null },
      playerAnimation: { action: 0, swordCount: 0 },
      attributeSystem: { isAboveZero: () => false, getValue: () => 0 },
    } as unknown as Entity;
    const world = { mapIndex: 0, playerEntity: hero, attackTarget: null, castRequest: null } as unknown as World;
    const bag: (Item | null)[] = new Array(76).fill(null);
    bag[slot] = { group: 4, num: 15, durability: 255 } as Item;
    vi.spyOn(Bag, 'itemsOfStorage').mockReturnValue(bag);
    const moved = vi.spyOn(Bag, 'moveItemToSquare').mockReturnValue(true);

    const system = AttackSystem(world);
    system.update?.(0.04);
    quiverInHand.durability = 0;
    system.update?.(0.04);
    expect(moved).not.toHaveBeenCalled();
    appearance.rightHand = null;
    if (picked) Bag.pickedItem = { item: { group: 4, num: 15 } as Item, fromSlot: 1, fromStorage: 0 };
    system.update?.(0.04);

    Bag.pickedItem = null;
    const moves = moved.mock.calls.map(c => [c[1], c[2]]);
    vi.restoreAllMocks();
    return moves;
  }

  afterEach(() => {
    quiver.allows = true;
    setGameOption('autoQuiver', false);
  });

  it('puts the next quiver in the moment the server takes the empty one, where allowed', () => {
    setGameOption('autoQuiver', true);
    expect(runOut(50)).toEqual([[50, 1]]);
  });

  it('waits for the next shot (CheckArrow, the original) unless the server and the player allow it', () => {
    setGameOption('autoQuiver', true);
    quiver.allows = false;
    expect(runOut(51)).toEqual([]);
    quiver.allows = true;
    setGameOption('autoQuiver', false);
    expect(runOut(52)).toEqual([]);
  });

  it('leaves alone a quiver the player took out of the hand', () => {
    setGameOption('autoQuiver', true);
    expect(runOut(53, true)).toEqual([]);
  });
});

describe('a swing quicker than the time between swings (swingFill)', () => {
  /** One bare-handed swing whose clip lasts `clip` seconds; its `swingFill` once the blow lands, and the blow's delay. */
  function swing(clip: number) {
    const hero = {
      localPlayer: true,
      transform: { pos: new Vector3(100.5, 0, 100.5), rot: new Vector3(), scale: 1 },
      charAppearance: hands,
      pathfinding: { path: null },
      playerAnimation: { action: 0, swordCount: 0 },
      attributeSystem: { isAboveZero: () => false, getValue: () => 0 },
      modelObject: { AnimationSpeed: 0, actionSerial: 7, actionPlaySpeed: () => undefined, restartAction: () => {}, getActionDuration: () => clip },
    } as unknown as Entity;
    const monster = {
      netId: 7,
      npcType: 3,
      worldIndex: 0,
      transform: { pos: new Vector3(101.5, 0, 100.5), rot: new Vector3(), scale: 1 },
    } as unknown as Entity;
    const world = { mapIndex: 0, playerEntity: hero, attackTarget: monster, castRequest: null, getTerrainFlag: () => 0 } as unknown as World;
    vi.spyOn(Hero, 'sendWalkStop').mockImplementation(() => {});
    vi.spyOn(Session, 'sendToGS').mockImplementation(() => {});
    const started = vi.spyOn(combat, 'startAttack');

    const system = AttackSystem(world);
    system.update?.(0.04);
    world.attackTarget = null;
    for (let i = 0; i < 25; i++) system.update?.(0.04);

    const hitDelay = started.mock.results[0].value as number;
    vi.restoreAllMocks();
    return { fill: hero.playerAnimation?.swingFill, hitDelay };
  }

  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  it('slows the clip after its blow so it ends as the next swing may start, on Enhanced', () => {
    const { fill, hitDelay } = swing(0.4);
    // No agility: OpenMU's 450 ms with the 10% margin (serverMinAttackInterval).
    const interval = 0.495;
    expect(fill?.serial).toBe(7);
    expect(fill?.scale).toBeCloseTo((0.4 - hitDelay) / (interval - hitDelay));
  });

  it('leaves the clip alone on Classic, and a clip that already fills the time', () => {
    expect(swing(0.6).fill).toBeUndefined();
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(swing(0.4).fill).toBeUndefined();
  });
});
