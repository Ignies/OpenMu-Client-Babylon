import { afterEach, describe, expect, it, vi } from 'vitest';
import type { World } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { arriveAtRest } = await import('./restObjectSystem');
const { Hero } = await import('../../modules/hero');
const { sound } = await import('../../controllers/sound');
const { PlayerAction, ServerPlayerActionType } = await import('@versions/shared/objects/enum');

const { HORN_OF_UNIRIA, PET_GROUP } = await import('@versions/shared/items/petItems');
const UNIRIA = { group: PET_GROUP, num: HORN_OF_UNIRIA };

function hero(opts: { safe?: boolean; pet?: unknown } = {}) {
  return {
    transform: { pos: { x: 120.5, y: 0, z: 80.5 }, rot: { x: 0, y: 0, z: 0 } },
    attributeSystem: { isAboveZero: (k: string) => (k === 'inSafeZone' ? !!opts.safe : false) },
    charAppearance: { pet: opts.pet ?? null },
    playerAnimation: { action: PlayerAction.PLAYER_STOP_MALE },
  } as unknown as NonNullable<World['playerEntity']>;
}

function spy() {
  const sent: string[] = [];
  vi.spyOn(Hero, 'sendWalkStop').mockImplementation((x, y) => void sent.push(`stop ${x},${y}`));
  vi.spyOn(Hero, 'sendAnimationRequest').mockImplementation((_r, a) => void sent.push(`anim ${a}`));
  const drop = vi.spyOn(sound, 'play').mockImplementation(() => undefined as never);
  return { sent, drop };
}

afterEach(() => vi.restoreAllMocks());

// ZzzInterface.cpp:3447-3593, the MOVEMENT_OPERATE arrival.
describe('arriving at a rest spot', () => {
  it('parks the server on the pose box tile, facing its angle, before the pose', () => {
    const { sent, drop } = spy();
    const h = hero();
    arriveAtRest(h, { x: 121, y: 80, kind: 'pose', useObjectAngle: true, angle: 1.5 });

    expect(h.transform.rot.y).toBe(1.5);
    expect(Hero.sendWalkStop).toHaveBeenCalledWith(121, 80, 1.5);
    expect(sent).toEqual(['stop 121,80', `anim ${ServerPlayerActionType.Pose}`]);
    expect(h.playerAnimation.action).toBe(PlayerAction.PLAYER_POSE1);
    expect(drop).toHaveBeenCalledWith('Sound/pDropItem');
  });

  it('heals with no walk and no sound', () => {
    const { sent, drop } = spy();
    arriveAtRest(hero(), { x: 120, y: 80, kind: 'healing', useObjectAngle: true, angle: 0 });

    expect(sent).toEqual([`anim ${ServerPlayerActionType.Healing}`]);
    expect(drop).not.toHaveBeenCalled();
  });

  it('refuses a seat on a mount outside town, after the walk', () => {
    const { sent, drop } = spy();
    const h = hero({ pet: UNIRIA });
    arriveAtRest(h, { x: 120, y: 80, kind: 'sit', useObjectAngle: false, angle: 0 });

    expect(sent).toEqual(['stop 120,80']);
    expect(h.playerAnimation.action).toBe(PlayerAction.PLAYER_STOP_MALE);
    expect(drop).not.toHaveBeenCalled();
  });

  it('sits on a mount inside town', () => {
    const { sent } = spy();
    const h = hero({ pet: UNIRIA, safe: true });
    arriveAtRest(h, { x: 120, y: 80, kind: 'sit', useObjectAngle: false, angle: 0 });

    expect(sent).toEqual(['stop 120,80', `anim ${ServerPlayerActionType.Sit}`]);
    expect(h.playerAnimation.action).toBe(PlayerAction.PLAYER_SIT1);
  });

  it('does nothing two tiles away', () => {
    const { sent } = spy();
    arriveAtRest(hero(), { x: 123, y: 80, kind: 'pose', useObjectAngle: true, angle: 1 });

    expect(sent).toEqual([]);
  });
});
