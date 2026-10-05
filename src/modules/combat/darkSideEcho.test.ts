import { describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import { ENUM_WORLD } from '@/core/types';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { installNet } = await import('./net');
const { combat } = await import('@/controllers/combat');
const { Hero } = await import('@/modules/hero');
const { EventBus } = await import('@/core/eventBus');
const { RageAttackPacket } = await import('@versions/shared/packets/ServerToClientPackets');

const HERO = 7;

/** C3 4A from `source`: a Dark Side blow on object 5. */
function rageAttack(source: number): void {
  const p = RageAttackPacket.createPacket();
  p.SkillId = 263;
  p.SourceId = source;
  p.TargetId = 5;
  EventBus.emit('RageAttack', p.buffer);
}

const ticks = (n: number): void => {
  for (let i = 0; i < n; i++) combat.update(ENUM_WORLD.WD_0LORENCIA, 1 / 25);
};

describe('RageAttack (C3 4A)', () => {
  it('starts the hero\'s Dark Side follow-ups when it echoes his own cast (WSclient.cpp:13422-13429)', () => {
    installNet();
    runInAction(() => {
      Hero.playerId = HERO;
    });
    combat.beginDarkSide(263, 5);
    combat.observeDarkSideTargets(263, [6]);
    // Another rage fighter's blow is not the echo.
    rageAttack(HERO + 2);
    ticks(20);
    expect(combat.nextDarkSideHit()).toBe(-1);
    rageAttack(HERO);
    ticks(7);
    expect(combat.nextDarkSideHit()).toBe(-1);
    ticks(1);
    expect(combat.nextDarkSideHit()).toBe(6);
    combat.reset();
  });
});
