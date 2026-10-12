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
const { installNet: installSkillsNet } = await import('../skills/net');
const { EventBus } = await import('@/core/eventBus');
const { AreaSkillAnimationPacket, MonsterSkillAnimationPacket, ObjectAnimationPacket, SkillAnimationPacket } = await import('@versions/shared/packets/ServerToClientPackets');
const { effects } = await import('@/controllers/fx');
const { lighting } = await import('@/controllers/lighting');
const { TEX } = await import('@/controllers/fx/recipes');
const { NO_MONSTER_SKILL, monsterAttackState } = await import('@/controllers/anim/monsterAttackClip');
const { MODEL } = await import('@/controllers/fx/recipes');
const { stepClock } = await import('@/controllers/fx/core');

const GAION = 7;
const TARGET = 5;

const model = { CurrentAction: A.Stop1 as number, restartAction: () => {}, gltf: { animationGroups: { length: 10 } } };
const clip = { action: A.Stop1 as A };
const facing = new Vector3();
const gaion = { netId: GAION, npcType: 504, transform: { pos: new Vector3(110, 0, 100), rot: facing, scale: 1 }, monsterAnimation: clip, modelObject: model } as unknown as Entity;
const target = { netId: TARGET, transform: { pos: new Vector3(104, 0, 100), rot: new Vector3(), scale: 1 } } as unknown as Entity;
const SELUPAN = 8;
const GHOST = 9;
const monster = (netId: number, npcType: number) =>
  ({ netId, npcType, transform: { pos: new Vector3(110, 0, 100), rot: new Vector3(), scale: 1 }, monsterAnimation: { action: A.Stop1 }, modelObject: { ...model } }) as unknown as Entity;
const selupan = monster(SELUPAN, 459);
const ghost = monster(GHOST, 515);
const objects = new Map([gaion, target, selupan, ghost].map(e => [e.netId, e]));

installNet();
installSkillsNet();
store.world = { scene: {}, playerEntity: null, getByNetId: (id: number) => objects.get(id), mapIndex: 72, getTerrainHeight: () => 0, netObjsQuery: { entities: [...objects.values()] } };
afterAll(() => {
  store.world = null;
});

/** C1 69 as OpenMU's ImperialGuardianViewPlugIn sends it: the skill big-endian, the ids little-endian. */
function monsterSkill(skill: number, targetId = TARGET, attacker = GAION): void {
  const p = MonsterSkillAnimationPacket.createPacket();
  p.SkillNumber = skill;
  p.AttackerId = attacker;
  p.TargetId = targetId;
  EventBus.emit('MonsterSkillAnimation', p.buffer);
}

// The looks a 0x69 draws, recorded instead of spawned.
const spawned: [string, unknown][] = [];
vi.spyOn(effects, 'spawn').mockImplementation(((name: string, _s: unknown, _at: unknown, opts: unknown) => {
  spawned.push([name, opts]);
}) as never);
vi.spyOn(lighting, 'skillSpot').mockImplementation((() => undefined) as never);
vi.spyOn(lighting, 'skillLand').mockImplementation((() => null) as never);
vi.spyOn(lighting, 'flash').mockImplementation((() => undefined) as never);
const named = (name: string) => spawned.filter(([n]) => n === name);
const models = () => named('model').map(([, o]) => (o as { model: string }).model);
const onMap = (mapIndex: number) => ((store.world as { mapIndex: number }).mapIndex = mapIndex);

beforeEach(() => {
  spawned.length = 0;
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

  it('draws the rage once on Berserker: CreateInferno and two MODEL_CIRCLE sub4 (GMEmpireGuardian4.cpp:440-446)', () => {
    monsterSkill(59);
    const flames = spawned.filter(([name, o]) => name === 'sprite' && (o as { texture?: string }).texture === TEX.flame);
    expect([spawned.filter(([name]) => name === 'debris').length, flames.length]).toEqual([16, 144]);
    expect(monsterAttackState(gaion).rage).toBe(false);
    spawned.length = 0;
    monsterSkill(65);
    expect(spawned).toEqual([]);
  });

  it("draws Selupan's cure and storm on Raklion only (GM_Raklion.cpp:2486-2523)", () => {
    onMap(58);
    monsterSkill(39, TARGET, SELUPAN);
    expect([named('joint').length, named('ring').length]).toEqual([1, 2]);
    spawned.length = 0;
    monsterSkill(42, TARGET, SELUPAN);
    expect(models()).toEqual([MODEL.boswind, MODEL.nightmareSummon]);
    spawned.length = 0;
    monsterSkill(38, TARGET, SELUPAN);
    expect(spawned).toEqual([]);
    onMap(72);
    monsterSkill(39, TARGET, SELUPAN);
    expect(spawned).toEqual([]);
  });

  it("draws Dark Ghost's fire on its target, its flame for 51 and a rain for 52 (GMEmpireGuardian2.cpp:1159-1190)", () => {
    onMap(70);
    monsterSkill(47, TARGET, GHOST);
    expect(named('projectile').length).toBe(1);
    spawned.length = 0;
    monsterSkill(51, TARGET, GHOST);
    expect(named('column').length).toBe(1);
    spawned.length = 0;
    monsterSkill(52, TARGET, GHOST);
    stepClock(1);
    expect(named('projectile').length).toBe(14);
    expect(monsterAttackState(ghost).monsterSkill).toBe(52);
    // A plain swing (0x18 AT_ATTACK1) keeps 52's Attack2 and its rain, aimed at the hero.
    spawned.length = 0;
    const swing = ObjectAnimationPacket.createPacket();
    swing.ObjectId = GHOST;
    swing.Animation = A.Attack1 << 5;
    (store.world as { playerEntity: Entity | null }).playerEntity = target;
    EventBus.emit('ObjectAnimation', swing.buffer);
    stepClock(1);
    expect([(ghost.monsterAnimation as { action: A }).action, named('projectile').length]).toEqual([A.Attack2, 14]);
    (store.world as { playerEntity: Entity | null }).playerEntity = null;
    onMap(72);
  });

  // ReceiveMagic starts AttackTime for most skills (WSclient.cpp:4131-5130), so AttackEffect runs the map's hook too.
  it("draws Dark Ghost's attack effect on a 0x19 cast that starts AttackTime", () => {
    onMap(70);
    const cast = (skill: number) => {
      const p = SkillAnimationPacket.createPacket();
      p.SkillId = skill;
      p.PlayerId = GHOST;
      p.TargetId = TARGET;
      EventBus.emit('SkillAnimation', p.buffer);
    };
    (ghost.monsterAnimation as { action: A }).action = A.Stop1;
    monsterAttackState(ghost).monsterSkill = 51;
    cast(9);
    expect(named('column').length).toBe(1);
    // AT_SKILL_DECAY's case starts no AttackTime.
    spawned.length = 0;
    monsterAttackState(ghost).monsterSkill = 51;
    cast(38);
    expect(named('column').length).toBe(0);
    onMap(72);
  });

  // ReceiveMagicContinue starts AttackTime for every cast with TargetCharacter = -1 (WSclient.cpp:5558-5566): the hook runs
  // with no target, so 52 rains round the ghost and 51 draws nothing.
  it("draws Dark Ghost's attack effect on a 0x1E area cast, with no target", () => {
    onMap(70);
    const cast = (skill: number) => {
      const p = AreaSkillAnimationPacket.createPacket();
      p.SkillId = skill;
      p.PlayerId = GHOST;
      p.PointX = 104;
      p.PointY = 100;
      EventBus.emit('AreaSkillAnimation', p.buffer);
    };
    const rain = (skill: number) => {
      spawned.length = 0;
      (ghost.monsterAnimation as { action: A }).action = A.Stop1;
      monsterAttackState(ghost).monsterSkill = skill;
      cast(9);
      stepClock(1);
      return named('projectile').length;
    };
    // The first flushes what the earlier tests left on the clock.
    const counts = [rain(NO_MONSTER_SKILL), rain(52), rain(NO_MONSTER_SKILL)];
    expect(counts.slice(1)).toEqual([14, 0]);
    spawned.length = 0;
    (ghost.monsterAnimation as { action: A }).action = A.Stop1;
    monsterAttackState(ghost).monsterSkill = 51;
    cast(9);
    expect(named('column').length).toBe(0);
    onMap(72);
  });

  it('does nothing when the target is not in view', () => {
    monsterSkill(65, 99);
    expect([clip.action, facing.y]).toEqual([A.Stop1, 0]);
  });
});
