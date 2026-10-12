import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MonsterActionType as A } from '@versions/shared/objects/enum';
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

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { installNet } = await import('./net');
const { EventBus } = await import('@/core/eventBus');
const { MonsterSkillAnimationPacket } = await import('@versions/shared/packets/ServerToClientPackets');

const GAION = 7;
const TARGET = 5;

const model = { CurrentAction: A.Stop1 as number, restartAction: () => {}, gltf: { animationGroups: { length: 10 } } };
const clip = { action: A.Stop1 as A };
const facing = new Vector3();
const gaion = { netId: GAION, npcType: 504, transform: { pos: new Vector3(110, 0, 100), rot: facing, scale: 1 }, monsterAnimation: clip, modelObject: model } as unknown as Entity;
const target = { netId: TARGET, transform: { pos: new Vector3(104, 0, 100), rot: new Vector3(), scale: 1 } } as unknown as Entity;
const objects = new Map([gaion, target].map(e => [e.netId, e]));

installNet();
store.world = { scene: {}, playerEntity: null, getByNetId: (id: number) => objects.get(id), mapIndex: 72 };
afterAll(() => {
  store.world = null;
});

/** C1 69 as OpenMU's ImperialGuardianViewPlugIn sends it: the skill big-endian, the ids little-endian. */
function monsterSkill(skill: number, targetId = TARGET): void {
  const p = MonsterSkillAnimationPacket.createPacket();
  p.SkillNumber = skill;
  p.AttackerId = GAION;
  p.TargetId = targetId;
  EventBus.emit('MonsterSkillAnimation', p.buffer);
}

beforeEach(() => {
  clip.action = A.Stop1;
  facing.y = 0;
});

describe('MonsterSkillAnimation (C1 69, ReceiveMonsterSkill, WSclient.cpp:4091-4128)', () => {
  it("turns Gaion to his target and plays the skill's clip (GMEmpireGuardian4.cpp:1399-1440)", () => {
    monsterSkill(65);
    expect(clip.action).toBe(A.Attack3);
    expect(facing.y).not.toBe(0);
    monsterSkill(59);
    expect(clip.action).toBe(A.Appear);
  });

  it('does nothing when the target is not in view', () => {
    monsterSkill(65, 99);
    expect([clip.action, facing.y]).toEqual([A.Stop1, 0]);
  });
});
