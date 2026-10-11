import { afterAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import type { Entity, World } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { NpcTalkSystem } = await import('./npcTalkSystem');
const { Merchant } = await import('../../modules/npc_shop');
const { registerMonsters } = await import('../../controllers/monsters');
const { default: gatewayMachine } = await import('@versions/shared/monsters/gateway_machine');

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => {
  vi.restoreAllMocks();
  scene.dispose();
  engine.dispose();
});

registerMonsters([gatewayMachine]);

// ZzzInterface.cpp:3215-3233: the Kanturu Gateway Machine (MODEL_KANTURU2ND_ENTER_NPC) is talked to
// straight away from within 550 units, though it fills every tile around it.
describe('talking to the Gateway Machine', () => {
  it('needs no free tile next to it within 5.5 tiles', () => {
    const machine = {
      netId: 9,
      npcType: 367,
      worldIndex: 39,
      transform: { pos: { x: 100.5, z: 100.5 } },
    } as unknown as Entity;
    const world = {
      scene,
      mapIndex: 39,
      isWalkable: () => false,
      has: () => true,
      talkTarget: machine,
      playerEntity: {
        transform: { pos: { x: 104.5, z: 103.5 }, rot: { y: 0 } },
        pathfinding: { path: null },
        playerMoveTo: { point: { x: 0, y: 0 } },
      },
    } as unknown as World;
    const talk = vi.spyOn(Merchant, 'talkToNpc').mockImplementation(() => {});

    NpcTalkSystem(world).update?.(0.04);

    expect(talk).toHaveBeenCalledWith(expect.objectContaining({ netId: 9, npcType: 367 }));
  });
});
