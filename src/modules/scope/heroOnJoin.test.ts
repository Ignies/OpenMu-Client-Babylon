import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});
import { runInAction } from 'mobx';
import { EventBus } from '@/core/eventBus';
import { Ecs } from '@/ecs/current';
import type { Entity, World } from '@/ecs/world';
import { CharacterClassNumber } from '@/core/types';
// The whole app, for the listeners it installs.
import '@/app/logic';
import { Hero } from '@/modules/hero';
import { CharacterInformationPacket } from '@versions/shared/packets/ServerToClientPackets';

/** The world as far as a spawn reaches into it: the entities it adds and their components. */
function fakeWorld(playerEntity?: Partial<Entity>) {
  const added: Entity[] = [];
  const world = {
    mapIndex: 0,
    playerEntity,
    add: (entity: Entity) => (added.push(entity), entity),
    addComponent: (entity: Record<string, unknown>, key: string, value: unknown) => void (entity[key] = value),
    getTerrainHeight: () => 0,
  };
  runInAction(() => (Ecs.world = world as unknown as World));
  return added;
}

function join(x: number, y: number) {
  const p = CharacterInformationPacket.createPacket();
  p.X = x;
  p.Y = y;
  p.MapId = 2;
  EventBus.emit('CharacterInformation' as never, p.buffer as never);
}

beforeEach(() => {
  runInAction(() => {
    Hero.playerId = 42;
    Hero.name = 'Lord';
    Hero.charClass = CharacterClassNumber.DarkLord;
  });
});

// ReceiveJoinMapServer (WSclient.cpp:1081-1160): CreateCharacterPointer makes the hero on join, before any
// scope packet, so a server that never sends the hero to itself still leaves it a body.
describe('joining a map', () => {
  it('creates the hero at the character information position', () => {
    const added = fakeWorld();
    join(130, 120);
    const heroes = added.filter(entity => entity.localPlayer);
    expect(heroes).toHaveLength(1);
    const [hero] = heroes;
    expect(hero).toMatchObject({ netId: 42, worldIndex: 2, objectNameInWorld: 'Lord' });
    expect([hero?.transform?.pos.x, hero?.transform?.pos.z]).toEqual([130, 120]);
    expect(hero?.charAppearance?.charClass).toBe(CharacterClassNumber.DarkLord);
  });

  it('leaves a hero that is already there (a map server switch)', () => {
    const added = fakeWorld({ netId: 42 });
    join(130, 120);
    expect(added.filter(entity => entity.localPlayer)).toHaveLength(0);
  });
});
