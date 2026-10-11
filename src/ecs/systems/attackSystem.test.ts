import { describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Entity, World } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { AttackSystem } = await import('./attackSystem');
const { Session } = await import('../../modules/session');
const { Hero } = await import('../../modules/hero');
const { HitRequestPacket } = await import('@versions/shared/packets/ClientToServerPackets');

const hands = { leftHand: null, rightHand: null, wings: null, pet: null, charClass: 16 };

describe('a melee swing', () => {
  it('stops the walk it cuts on the server too, before the hit (LetHeroStop, ZzzInterface.cpp:1299)', () => {
    const hero = {
      localPlayer: true,
      transform: { pos: new Vector3(100.5, 0, 100.5), rot: new Vector3(), scale: 1 },
      charAppearance: hands,
      pathfinding: { path: [{ x: 101, y: 100 }, { x: 102, y: 100 }] },
      playerAnimation: { action: 0, swordCount: 0 },
      attributeSystem: { isAboveZero: () => false, getValue: () => 0 },
    } as unknown as Entity;
    const monster = {
      netId: 7,
      npcType: 3,
      worldIndex: 0,
      transform: { pos: new Vector3(101.5, 0, 100.5), rot: new Vector3(), scale: 1 },
    } as unknown as Entity;
    const world = {
      mapIndex: 0,
      playerEntity: hero,
      attackTarget: monster,
      castRequest: null,
      getTerrainFlag: () => 0,
    } as unknown as World;

    const sent: string[] = [];
    const stop = vi.spyOn(Hero, 'sendWalkStop').mockImplementation(() => void sent.push('stop'));
    vi.spyOn(Session, 'sendToGS').mockImplementation(buffer => {
      if (buffer.getUint8(2) === HitRequestPacket.Code) sent.push('hit');
    });

    AttackSystem(world).update?.(0.04);

    expect(sent).toEqual(['stop', 'hit']);
    // Mid-step the hero's tile is the step's destination, the path's next node (ZzzAI.cpp:556-562).
    expect(stop).toHaveBeenCalledWith(101, 100, hero.transform?.rot.y);
    vi.restoreAllMocks();
  });
});
