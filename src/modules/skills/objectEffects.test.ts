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
const { MAGIC_EFFECTS } = await import('./magicEffects');
const { buffRecipe } = await import('./recipes');
const { t } = await import('@/i18n');
const { MagicEffectStatusPacket } = await import('@versions/shared/packets/ServerToClientPackets');

installNet();

function effectStatus(playerId: number, effectId: number, active: boolean): void {
  const p = MagicEffectStatusPacket.createPacket();
  p.PlayerId = playerId;
  p.EffectId = effectId;
  p.IsActive = active;
  EventBus.emit('MagicEffectStatus', p.buffer);
}

/** OpenMU's own numbers for seven master buffs and the base effect each copies (SkillsInitializer.cs:84-90). */
const OPENMU_MASTER = [[135, 8], [138, 82], [139, 82], [148, 5], [153, 131], [154, 131], [155, 130]] as const;

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

  // The original knows these buffs by their base effect only (MuHelper.cpp:490-569 BuffTarget).
  it('takes a master buff OpenMU numbers on its own as its base effect', () => {
    runInAction(() => (HeroSkills.buffs = []));
    for (const [openmu, base] of OPENMU_MASTER) {
      effectStatus(1, openmu, true);
      expect(HeroSkills.buffs).toEqual([base]);
      effectStatus(1, openmu, false);
      expect(HeroSkills.buffs).toEqual([]);
    }
  });

  it('names none of those numbers in its catalogue: they never reach it', () => {
    for (const [openmu] of OPENMU_MASTER) {
      expect(MAGIC_EFFECTS[openmu]).toBeUndefined();
      expect(buffRecipe(openmu).name).toBe(t('buff.unnamed', { number: openmu }));
    }
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

  it('puts a master buff OpenMU numbers on its own on a body as its base effect', () => {
    const world = Ecs.world as InstanceType<typeof World>;
    effectStatus(7, 148, true);
    expect([...(world.getByNetId(7)?.buffs ?? [])]).toEqual([1, 5]);
  });
});
