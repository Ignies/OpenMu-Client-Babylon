import { afterEach, describe, expect, it, vi } from 'vitest';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { World } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { arriveAtRest, wallRestTarget } = await import('./restObjectSystem');
const { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } = await import('../../controllers/fidelity');
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

describe('resting against any wall', () => {

  const FENCE = { min: { x: -0.5, y: 0, z: -0.03 }, max: { x: 0.5, y: 2.2, z: 0.03 } };
  const POST = { min: { x: -0.3, y: 0, z: -0.3 }, max: { x: 0.3, y: 2.5, z: 0.3 } };
  const record = (modelId: number, x: number, z: number) => ({
    modelId,
    worldIndex: 0,
    transform: { pos: { x, y: 0, z }, rot: { x: 0, y: 0, z: 0 }, scale: 1 },
  });
  const world = {
    mapIndex: 0,
    playerEntity: hero(),
    // Tile row 80 is the fences' wall.
    isWalkable: (_x: number, y: number) => y !== 80 && y !== 79,
  } as unknown as World;
  const boxOf = (e: { modelId: number }) => (e.modelId === 1 ? FENCE : POST);
  const down = (x: number, z: number) => new Ray(new Vector3(x, 10, z), new Vector3(0, -1, 0));

  afterEach(() => setFidelityChoice(FIDELITY_DEFAULT, {}));

  it('leans beside the clicked fence, facing away from it', () => {
    const fences = [record(1, 120, 80), record(1, 125, 80)];
    const target = wallRestTarget(world, fences, down(125.2, 80), boxOf);

    expect(target).toMatchObject({ x: 125, y: 81, kind: 'pose', useObjectAngle: true });
    const angle = target?.angle ?? Number.NaN;
    expect(Math.cos(angle - Math.PI / 2)).toBeCloseTo(0);
    expect(Math.sin(angle - Math.PI / 2)).toBeCloseTo(1);
  });

  it('ignores posts and walls out of reach', () => {
    expect(wallRestTarget(world, [record(2, 120, 80)], down(120, 80), boxOf)).toBeNull();
    expect(wallRestTarget(world, [record(1, 160, 80)], down(160, 80), boxOf)).toBeNull();
  });

  it('is today\'s behaviour on Classic: a click on a fence leans nowhere', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    expect(wallRestTarget(world, [record(1, 120, 80)], down(120, 80), boxOf)).toBeNull();
  });

  it('is off when the player turns it off', () => {
    setFidelityChoice(FIDELITY_DEFAULT, { restAnyWall: false });
    expect(wallRestTarget(world, [record(1, 120, 80)], down(120, 80), boxOf)).toBeNull();
  });
});
