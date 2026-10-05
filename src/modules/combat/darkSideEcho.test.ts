import { afterAll, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { ENUM_WORLD } from '@/core/types';
import { PlayerAction } from '@versions/shared/objects/enum';
import type { Entity, World } from '@/ecs/world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// The casters whose Dark Side cast was drawn, in order.
const drawn = vi.hoisted(() => [] as number[]);
vi.mock('@versions/shared/skills/skillVisuals', async importOriginal => ({
  ...(await importOriginal<object>()),
  playTargetedSkillVisual: (_scene: unknown, _skill: number, caster: { netId: number }) => void drawn.push(caster.netId),
}));
// SetRageSkillAni: the caster plays the Dark Side clip.
vi.mock('./clips', async importOriginal => ({
  ...(await importOriginal<object>()),
  playCastAnimation: (caster: { playerAnimation?: { action: number } }) => {
    if (caster.playerAnimation) caster.playerAnimation.action = PlayerAction.PLAYER_SKILL_DARKSIDE_READY;
  },
}));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { installNet } = await import('./net');
const { combat } = await import('@/controllers/combat');
const { Hero } = await import('@/modules/hero');
const { Ecs } = await import('@/ecs/current');
const { EventBus } = await import('@/core/eventBus');
const { RageAttackPacket } = await import('@versions/shared/packets/ServerToClientPackets');

const HERO = 7;
const OTHER = 9;

const body = (netId: number, x: number, z: number, more: object = {}) =>
  ({ netId, transform: { pos: new Vector3(x, 0, z), rot: new Vector3(), scale: 1 }, ...more }) as unknown as Entity;
const hero = body(HERO, 100, 100, { localPlayer: true, playerAnimation: { action: PlayerAction.PLAYER_SKILL_DARKSIDE_READY } });
const otherClip = { action: PlayerAction.PLAYER_STOP_MALE as PlayerAction };
const otherFacing = new Vector3();
const other = { netId: OTHER, transform: { pos: new Vector3(110, 0, 100), rot: otherFacing, scale: 1 }, playerAnimation: otherClip } as unknown as Entity;
const objects = new Map([hero, other, body(5, 104, 100), body(6, 110, 96)].map(e => [e.netId, e]));

installNet();
runInAction(() => {
  Hero.playerId = HERO;
  Ecs.world = { scene: {}, getByNetId: (id: number) => objects.get(id) } as unknown as World;
});
afterAll(() => {
  runInAction(() => {
    Ecs.world = null;
  });
});

/** C3 4A from `source`: a Dark Side blow on `target`. */
function rageAttack(source: number, target = 5): void {
  const p = RageAttackPacket.createPacket();
  p.SkillId = 263;
  p.SourceId = source;
  p.TargetId = target;
  EventBus.emit('RageAttack', p.buffer);
}

const ticks = (n: number): void => {
  for (let i = 0; i < n; i++) combat.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
};

describe('RageAttack (C3 4A)', () => {
  it('starts the hero\'s Dark Side follow-ups when it echoes his own cast (WSclient.cpp:13422-13429)', () => {
    combat.beginDarkSide(263, 5);
    combat.observeDarkSideTargets(263, [6]);
    // Another rage fighter's blow is not the echo.
    rageAttack(OTHER);
    ticks(20);
    expect(combat.nextDarkSideHit()).toBe(-1);
    rageAttack(HERO);
    ticks(7);
    expect(combat.nextDarkSideHit()).toBe(-1);
    ticks(1);
    expect(combat.nextDarkSideHit()).toBe(6);
    combat.reset();
  });

  it('draws a cast once: a later 0x4A of it only turns its caster (MonkSystem.cpp:1285-1288)', () => {
    drawn.length = 0;
    otherClip.action = PlayerAction.PLAYER_STOP_MALE;
    rageAttack(OTHER);
    // Another client's follow-up, while its caster still plays the Dark Side clip.
    rageAttack(OTHER, 6);
    expect(drawn).toEqual([OTHER]);
    expect(otherFacing.y).toBeCloseTo(Math.atan2(-4, 0) + Math.PI / 2);
    // Out of the clip, his next 0x4A is a new cast.
    otherClip.action = PlayerAction.PLAYER_STOP_MALE;
    rageAttack(OTHER);
    expect(drawn).toEqual([OTHER, OTHER]);

    // The hero's: the echo of his cast, and none after it.
    drawn.length = 0;
    combat.beginDarkSide(263, 5);
    rageAttack(HERO);
    rageAttack(HERO, 6);
    expect(drawn).toEqual([HERO]);
    combat.reset();
  });
});
