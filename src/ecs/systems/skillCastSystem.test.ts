import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { ENUM_WORLD } from '../../core/types';
import { PlayerAction } from '@versions/shared/objects/enum';
import type { Entity, World } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// The live world: Dark Side's follow-ups read the hero's clip from it.
const store = vi.hoisted(() => ({ world: null as unknown }));
vi.mock('@/ecs/current', () => ({
  Ecs: {
    get world() {
      return store.world;
    },
  },
}));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { SkillCastSystem } = await import('./skillCastSystem');
const { combat } = await import('../../controllers/combat');
const { effects } = await import('../../controllers/fx');
const { TEX } = await import('../../controllers/fx/recipes');
const { Session } = await import('../../modules/session');
const { HeroSkills, skills } = await import('../../modules/skills');
const { RageAttackRangeRequestPacket, RageAttackRequestPacket } = await import('@versions/shared/packets/ClientToServerPackets');
const { darkSideCast } = await import('@versions/shared/skills/rage_fighter/dark_side/rage');

const TICK = 1 / 25;

let engine: NullEngine;
let scene: Scene;
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
});
afterAll(() => {
  vi.restoreAllMocks();
  store.world = null;
  scene.dispose();
  engine.dispose();
});

const body = (netId: number, x: number, z: number) =>
  ({ netId, transform: { pos: new Vector3(x, 0, z), rot: new Vector3(), scale: 1 } }) as unknown as Entity;

describe('Dark Side follow-up blows', () => {
  it('send nothing and draw nothing of their own: the hero\'s DarksideRendering draws what shows (MonkSystem.cpp:610, :697-857)', () => {
    const hero = {
      ...body(1, 100, 100),
      localPlayer: true,
      playerAnimation: { action: PlayerAction.PLAYER_SKILL_DARKSIDE_READY },
      modelObject: { CurrentAction: PlayerAction.PLAYER_SKILL_DARKSIDE_READY, AnimationSpeed: 0.3 },
    } as unknown as Entity;
    const targets = new Map([6, 7].map((id, i) => [id, body(id, 103 + i * 4, 104)]));
    const world = {
      scene,
      playerEntity: hero,
      castRequest: null,
      rightPointerPressed: false,
      getByNetId: (id: number) => targets.get(id),
    } as unknown as World;
    store.world = world;
    const sent = vi.spyOn(Session, 'sendToGS').mockImplementation(() => {});
    const bursts: [number, number][] = [];
    const spawn = effects.spawn.bind(effects);
    let tick = 0;
    vi.spyOn(effects, 'spawn').mockImplementation(((name: never, s: Scene, at: Vector3, opts: never) => {
      const texture = (opts as { texture?: string } | undefined)?.texture;
      if (name === 'sprite' && texture === TEX.damage2) bursts.push([tick, Math.round(at.x)]);
      return spawn(name, s, at, opts);
    }) as never);

    const system = SkillCastSystem(world);
    effects.reset();
    combat.beginDarkSide(263, 5);
    combat.observeDarkSideTargets(263, [6, 7]);
    combat.observeDarkSideEcho(263, hero);
    const hits: number[] = [];
    for (tick = 1; tick <= 40; tick++) {
      const before = darkSideCast.sent;
      combat.update(ENUM_WORLD.WD_0LORENCIA, TICK);
      if (darkSideCast.sent > before) hits.push(tick);
      system.update?.(TICK);
      effects.update(ENUM_WORLD.WD_0LORENCIA, TICK);
    }
    combat.reset();

    expect(sent).not.toHaveBeenCalled();
    // The blows on ticks 8 and 15 (SkillCast.cpp:1117-1129) landed; none drew a burst.
    expect(hits).toEqual([8, 15]);
    expect(bursts).toEqual([]);
  });
});

describe('Dark Side with nothing selected', () => {
  it('casts where the hero stands with target key 0 on the 0x4B and the 0x4A: the server picks the targets (SkillCast.cpp:881-895, :1047-1049)', () => {
    // Off the tile's corner, so a turn toward his own tile would show.
    const hero = {
      ...body(1, 100.4, 100.6),
      localPlayer: true,
      pathfinding: { path: null },
      playerAnimation: { action: PlayerAction.PLAYER_STOP_MALE },
      modelObject: {
        CurrentAction: PlayerAction.PLAYER_STOP_MALE,
        AnimationSpeed: 0.3,
        ActionIterationWasFinished: true,
        actionPlaySpeed: () => undefined,
        restartAction: () => {},
        getActionDuration: () => 1,
      },
    } as unknown as Entity;
    const world = {
      scene,
      mapIndex: 0,
      playerEntity: hero,
      castRequest: { target: null, point: { x: 108, y: 104 }, forced: false },
      rightPointerPressed: false,
      getByNetId: () => undefined,
    } as unknown as World;
    store.world = world;
    HeroSkills.currentSkill = 263;
    vi.spyOn(skills, 'canUse').mockReturnValue(true);
    vi.spyOn(skills, 'startCooldown').mockReturnValue(true);
    const sent: [number, number, number][] = [];
    vi.spyOn(Session, 'sendToGS').mockImplementation(((b: DataView) => {
      const p = b.getUint8(2) === RageAttackRangeRequestPacket.Code ? new RageAttackRangeRequestPacket(b) : new RageAttackRequestPacket(b);
      sent.push([b.getUint8(2), p.SkillId, p.TargetId]);
    }) as never);

    SkillCastSystem(world).update?.(TICK);
    combat.reset();
    HeroSkills.currentSkill = -1;

    expect(sent).toEqual([
      [RageAttackRangeRequestPacket.Code, 263, 0],
      [RageAttackRequestPacket.Code, 263, 0],
    ]);
    expect(hero.playerAnimation?.action).toBe(PlayerAction.PLAYER_SKILL_DARKSIDE_READY);
    // No walk to the cursor and no turn: the Dark Side case sets no Angle (SkillCast.cpp:881-895).
    expect(world.castApproach).toBeNull();
    expect(hero.transform?.rot.y).toBe(0);
  });
});
