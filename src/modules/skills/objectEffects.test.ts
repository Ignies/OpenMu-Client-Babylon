import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import type { EffectHandle } from '@/controllers/fx/layer';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
const { Scene } = await import('@babylonjs/core/scene');
const { Vector3 } = await import('@babylonjs/core/Maths/math.vector');
const { World } = await import('@/ecs/world');
const { Ecs } = await import('@/ecs/current');
const { EventBus } = await import('@/core/eventBus');
const { effects } = await import('@/controllers/fx');
const { Hero } = await import('@/modules/hero');
const { HeroSkills } = await import('./state');
const { installNet } = await import('./net');
const { applyObjectEffect, redrawBuffLooks } = await import('./objectEffects');
const { MagicEffectStatusPacket } = await import('@versions/shared/packets/ServerToClientPackets');

installNet();

// The hero object outlives a map load in the original, so its buffs register meanwhile (WSclient.cpp:3805-3837).
describe('the buff bar', () => {
  it('takes the hero effect while no world is up (a warp)', () => {
    runInAction(() => {
      Ecs.world = null;
      Hero.playerId = 1;
    });
    const p = MagicEffectStatusPacket.createPacket();
    p.PlayerId = 1;
    p.EffectId = 8;
    p.IsActive = true;
    EventBus.emit('MagicEffectStatus', p.buffer);
    expect(HeroSkills.buffs).toContain(8);
  });
});

describe('buff looks over a map change', () => {
  let engine: InstanceType<typeof NullEngine>;
  const auras: EffectHandle[] = [];

  beforeAll(() => {
    engine = new NullEngine();
    runInAction(() => (Ecs.world = new World(new Scene(engine) as never)));
    const spawn = effects.spawn.bind(effects);
    vi.spyOn(effects, 'spawn').mockImplementation(((name: never, s: never, at: never, opts: never) => {
      const handle = spawn(name, s, at, opts);
      if (name === 'aura') auras.push(handle);
      return handle;
    }) as never);
  });

  afterAll(() => {
    vi.restoreAllMocks();
    runInAction(() => (Ecs.world = null));
    engine.dispose();
  });

  it('draws again the looks a body still holds once the reset ended them', () => {
    const world = Ecs.world as InstanceType<typeof World>;
    const body = world.add({ netId: 7, transform: { pos: new Vector3(100, 0, 100), rot: Vector3.Zero(), scale: 1 } });
    applyObjectEffect(body, 1, true);
    const before = auras.splice(0);
    effects.reset();
    expect(before.some(a => a.alive)).toBe(false);

    redrawBuffLooks();
    expect(auras.length).toBe(before.length);
    expect(auras.every(a => a.alive)).toBe(true);
  });
});
