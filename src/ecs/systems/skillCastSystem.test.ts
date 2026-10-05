import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { runInAction } from 'mobx';
import { ENUM_WORLD } from '../../core/types';
import { PlayerAction } from '@versions/shared/objects/enum';
import type { Entity, World } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { SkillCastSystem } = await import('./skillCastSystem');
const { combat } = await import('../../controllers/combat');
const { effects } = await import('../../controllers/fx');
const { TEX } = await import('../../controllers/fx/recipes');
const { Session } = await import('../../modules/session');
const { Ecs } = await import('../current');

const TICK = 1 / 25;

let engine: NullEngine;
let scene: Scene;
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
});
afterAll(() => {
  vi.restoreAllMocks();
  runInAction(() => {
    Ecs.world = null;
  });
  scene.dispose();
  engine.dispose();
});

const body = (netId: number, x: number, z: number) =>
  ({ netId, transform: { pos: new Vector3(x, 0, z), rot: new Vector3(), scale: 1 } }) as unknown as Entity;

describe('Dark Side follow-up blows', () => {
  it('draw a blow on each target the 0x4B response named and send nothing (MonkSystem.cpp:610)', () => {
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
    runInAction(() => {
      Ecs.world = world;
    });
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
    combat.observeDarkSideEcho(263);
    for (tick = 1; tick <= 40; tick++) {
      combat.update(ENUM_WORLD.WD_0LORENCIA, TICK);
      system.update?.(TICK);
      effects.update(ENUM_WORLD.WD_0LORENCIA, TICK);
    }
    combat.reset();

    expect(sent).not.toHaveBeenCalled();
    // The blows on ticks 8 and 15 (SkillCast.cpp:1117-1129) burst on their targets 20 and 21 effect steps on.
    expect(bursts).toEqual([
      [27, 103],
      [28, 103],
      [34, 107],
      [35, 107],
    ]);
  });
});
