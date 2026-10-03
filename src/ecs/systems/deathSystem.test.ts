import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENUM_WORLD } from '../../core/types';
import { TW_ACTION, TW_NOGROUND } from '../../controllers/terrain/consts';
import type { World } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const playSfx = vi.fn((..._args: unknown[]) => 1000);
vi.mock('../../controllers/sound/sfx', () => ({
  playSfx: (...args: unknown[]) => playSfx(...args),
}));
// These three reach the store through the effects layer / combat sounds.
const spawnBomb = vi.fn();
vi.mock('../../controllers/fx/deathVisuals', () => ({
  shatterDeathFor: () => undefined,
  spawnBomb: (...args: unknown[]) => spawnBomb(...args),
}));
const spawn = vi.fn();
vi.mock('../../controllers/fx', () => ({ effects: { spawn: (...args: unknown[]) => spawn(...args) } }));
vi.mock('../../controllers/sound/combatSounds', () => ({ COMBAT_BUS: 'combat' }));

// What a kill does to the body is the killing skill's (`kill` in its file): load the skills first.
await import('@versions/shared/skills/skillVisuals');
const { DeathSystem } = await import('./deathSystem');

const TICK = 1 / 25;

function corpse() {
  return {
    dying: {
      time: 0,
      started: false,
      rot: 0,
      alpha: 1,
      sink: 0,
      killedByHero: false,
      skill: 0,
      killerNetId: 0,
      shattered: false,
      offset: { x: 0, y: 0, z: 0 },
      pitch: 0,
    },
    // Not ready: the Die clip never starts, only the kill-tick motion and the bombs run.
    modelObject: { Ready: false },
    transform: { pos: { x: 30.5, y: 0, z: 90.5 } },
  };
}

/** Just the fields the death system reads before the Die clip. */
function castle(map: ENUM_WORLD, flag: number, bodies: ReturnType<typeof corpse>[]) {
  const world = {
    mapIndex: map,
    scene: {},
    getTerrainFlag: () => flag,
    with: () => bodies,
  };
  return DeathSystem(world as unknown as World);
}

const plays = (key: string) => playSfx.mock.calls.filter(call => call[0] === key);

describe('Chaos Castle death sounds', () => {
  beforeEach(() => {
    playSfx.mockClear();
    spawnBomb.mockClear();
  });

  it('gives every bomb its 2D, one-channel explosion on odd ticks 15..25', () => {
    const system = castle(ENUM_WORLD.WD_18CHAOS_CASTLE, 0, [corpse()]);
    for (let i = 0; i < 40; i++) system.update!(TICK);

    expect(spawnBomb).toHaveBeenCalledTimes(6);
    const booms = plays('Sound/eExplosion');
    expect(booms).toHaveLength(6);
    for (const [, at, opts] of booms) {
      expect(at).toBeNull();
      expect(opts).toMatchObject({ bus: 'combat', channels: 1 });
    }
    expect(plays('Sound/pMaleScream')).toHaveLength(0);
  });

  it('screams once, 2D, when the body drops into a pit', () => {
    const system = castle(ENUM_WORLD.WD_18CHAOS_CASTLE, TW_NOGROUND, [corpse()]);
    for (let i = 0; i < 40; i++) system.update!(TICK);

    const screams = plays('Sound/pMaleScream');
    expect(screams).toHaveLength(1);
    expect(screams[0][1]).toBeNull();
    expect(screams[0][2]).toMatchObject({ bus: 'combat', channels: 1 });
    // A falling body bombs earlier (ticks 5..15), still six of them.
    expect(plays('Sound/eExplosion')).toHaveLength(6);
  });

  it('stays quiet off the bridge edge in Blood Castle', () => {
    const system = castle(ENUM_WORLD.WD_11BLOODCASTLE1, TW_ACTION | TW_NOGROUND, [corpse()]);
    for (let i = 0; i < 40; i++) system.update!(TICK);

    expect(playSfx).not.toHaveBeenCalled();
    expect(spawnBomb).not.toHaveBeenCalled();
  });
});

/** A body killed on an open map by `skill`, its killer standing three tiles east. */
function killedBy(skill: number) {
  const body = corpse();
  body.dying.skill = skill;
  body.dying.killerNetId = 7;
  const killer = { transform: { pos: { x: 33.5, y: 0, z: 90.5 } } };
  const world = {
    mapIndex: ENUM_WORLD.WD_0LORENCIA,
    scene: {},
    mapParent: { position: { x: 0, z: 0 } },
    getTerrainFlag: () => 0,
    getByNetId: (id: number) => (id === 7 ? killer : undefined),
    with: () => [body],
  };
  return { body, system: DeathSystem(world as unknown as World) };
}

describe('skill deaths', () => {
  beforeEach(() => spawn.mockClear());

  it('Nova and Combo slide the body along the line to the killer for 15 ticks', () => {
    for (const skill of [40, 59]) {
      const { body, system } = killedBy(skill);
      for (let i = 0; i < 40; i++) system.update!(TICK);
      expect(body.dying.offset.x).toBeGreaterThan(0.5);
      expect(Math.abs(body.dying.offset.z)).toBeLessThan(1e-9);
    }
  });

  it('every other skill leaves the body where it fell', () => {
    for (const skill of [0, 9, 41, 58, 392]) {
      const { body, system } = killedBy(skill);
      for (let i = 0; i < 40; i++) system.update!(TICK);
      expect(body.dying.offset).toEqual({ x: 0, y: 0, z: 0 });
    }
  });

  it('Nova sheds ten motes a tick while the Dead counter is <= 30, nothing else does', () => {
    const nova = killedBy(40);
    for (let i = 0; i < 40; i++) nova.system.update!(TICK);
    // 30 frames at 25 fps: Dead runs 1..30 under the `<= 30` check (ZzzCharacter.cpp:3297, 4076).
    expect(spawn.mock.calls.length).toBe(300);
    expect(spawn.mock.calls.every(c => c[0] === 'particles')).toBe(true);
    spawn.mockClear();
    const combo = killedBy(59);
    for (let i = 0; i < 40; i++) combo.system.update!(TICK);
    expect(spawn).not.toHaveBeenCalled();
  });
});

describe('the Dead counter', () => {
  it('counts whole ticks at 25 fps, like `c->Dead += FPS_ANIMATION_FACTOR`', async () => {
    const { combat } = await import('../../controllers/combat');
    const seen: number[] = [];
    combat.registerSkill(9001, { kill: { dying: (_body, _ticks, dead) => void seen.push(dead) } });
    const { system } = killedBy(9001);
    for (let i = 0; i < 40; i++) system.update!(TICK);
    expect(seen).toEqual(Array.from({ length: 40 }, (_, i) => i + 1));
  });
});
