import { afterAll, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { ENUM_WORLD } from '@/core/types';
import { PlayerAction } from '@versions/shared/objects/enum';
import type { Entity } from '@/ecs/world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const store = vi.hoisted(() => ({ world: null as unknown }));
vi.mock('@/ecs/current', () => ({
  Ecs: {
    get world() {
      return store.world;
    },
  },
}));
// The casters whose Dark Side cast was drawn, in order.
const drawn = vi.hoisted(() => [] as number[]);
vi.mock('@versions/shared/skills/skillVisuals', async importOriginal => ({
  ...(await importOriginal<object>()),
  playTargetedSkillVisual: (_scene: unknown, _skill: number, caster: { netId: number }) => void drawn.push(caster.netId),
}));
// SetRageSkillAni: another caster plays the Dark Side clip (the hero's is his own, clips.ts).
vi.mock('./clips', async importOriginal => ({
  ...(await importOriginal<object>()),
  playCastAnimation: (caster: { localPlayer?: boolean; playerAnimation?: { action: number } }) => {
    if (caster.playerAnimation && !caster.localPlayer) caster.playerAnimation.action = PlayerAction.PLAYER_SKILL_DARKSIDE_READY;
  },
}));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { installNet } = await import('./net');
const { combat } = await import('@/controllers/combat');
// The follow-ups gone (m_nDarksideCnt), as DarksideRendering reads them.
const { darkSideCast } = await import('@versions/shared/skills/rage_fighter/dark_side/rage');
const { Hero } = await import('@/modules/hero');
const { EventBus } = await import('@/core/eventBus');
const { RageAttackPacket, RageAttackRangeResponsePacket } = await import('@versions/shared/packets/ServerToClientPackets');
const { TargetedSkillPacket } = await import('@versions/shared/packets/ClientToServerPackets');
const { Session } = await import('@/modules/session');

const HERO = 7;
const OTHER = 9;

const body = (netId: number, x: number, z: number, more: object = {}) =>
  ({ netId, transform: { pos: new Vector3(x, 0, z), rot: new Vector3(), scale: 1 }, ...more }) as unknown as Entity;
const heroClip = { action: PlayerAction.PLAYER_SKILL_DARKSIDE_READY as PlayerAction };
const hero = body(HERO, 100, 100, { localPlayer: true, playerAnimation: heroClip, modelObject: { CurrentAction: PlayerAction.PLAYER_SKILL_DARKSIDE_READY, AnimationSpeed: 0.3 } });
const otherClip = { action: PlayerAction.PLAYER_STOP_MALE as PlayerAction };
const otherFacing = new Vector3();
const other = { netId: OTHER, transform: { pos: new Vector3(110, 0, 100), rot: otherFacing, scale: 1 }, playerAnimation: otherClip } as unknown as Entity;
const objects = new Map([hero, other, body(5, 104, 100), body(6, 110, 96)].map(e => [e.netId, e]));

installNet();
runInAction(() => {
  Hero.playerId = HERO;
});
store.world = { scene: {}, playerEntity: hero, getByNetId: (id: number) => objects.get(id) };
afterAll(() => {
  store.world = null;
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
    expect(darkSideCast.sent).toBe(0);
    rageAttack(HERO);
    ticks(7);
    expect(darkSideCast.sent).toBe(0);
    ticks(1);
    expect(darkSideCast.sent).toBe(1);
    combat.reset();
  });

  it('the echo of the hero\'s cast puts him back in the Dark Side clip once it is over (SetRageSkillAni, WSclient.cpp:13427)', () => {
    // SetAction starts the clip only when he has left it (ZzzAI.cpp:425-436): a late echo still gets its follow-ups.
    heroClip.action = PlayerAction.PLAYER_STOP_MALE;
    combat.beginDarkSide(263, 5);
    rageAttack(HERO);
    expect(heroClip.action).toBe(PlayerAction.PLAYER_SKILL_DARKSIDE_READY);
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

/** C1 4B for `skill`: its five slots, the ones past `targets` the empty DS_TARGET_NONE (10000) OpenMU fills them with. */
function rangeResponse(skill: number, targets: number[]): void {
  const p = RageAttackRangeResponsePacket.createPacket();
  p.SkillId = skill;
  for (let i = 0; i < 5; i++) p.buffer.setUint16(6 + i * 2, targets[i] ?? 10000, true);
  EventBus.emit('RageAttackRangeResponse', p.buffer);
}

describe('RageAttackRangeResponse (C1 4B)', () => {
  const sent: DataView[] = [];
  const send = (): void => {
    sent.length = 0;
    vi.spyOn(Session, 'sendToGS').mockImplementation(b => void sent.push(b));
  };

  it('naming no target, the hero asks for the skill on himself (SendRequestMagic(skill, HeroKey), MonkSystem.cpp:551-553)', () => {
    send();
    combat.beginDarkSide(559, 5);
    rangeResponse(559, []);
    vi.restoreAllMocks();
    expect(sent).toHaveLength(1);
    const p = new TargetedSkillPacket(sent[0]);
    expect([p.SkillId, p.TargetId]).toEqual([559, HERO]);
    combat.reset();
  });

  it('naming targets, nothing goes out and the empty slots are no targets (DS_TARGET_NONE, MonkSystem.cpp:537-549)', () => {
    send();
    combat.beginDarkSide(263, 5);
    rangeResponse(263, [6]);
    vi.restoreAllMocks();
    expect(sent).toEqual([]);
    rageAttack(HERO);
    ticks(8);
    expect([darkSideCast.targets, darkSideCast.sent]).toEqual([[6], 1]);
    // 6 was the only one: no follow-up comes due for an empty slot.
    for (let i = 0; i < 14; i++) {
      ticks(1);
      expect(darkSideCast.sent).toBe(1);
    }
    combat.reset();
  });
});
