import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { runInAction } from 'mobx';
import type { EffectHandle } from '@/controllers/fx/layer';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
const { Scene } = await import('@babylonjs/core/scene');
const { World } = await import('@/ecs/world');
const { Ecs } = await import('@/ecs/current');
const { EventBus } = await import('@/core/eventBus');
const { effects } = await import('@/controllers/fx');
const { Hero } = await import('@/modules/hero');
const { installNet } = await import('./net');
const { AddCharacterToScopeExtendedPacket, AddNpcsToScopePacket } = await import('@versions/shared/packets/ServerToClientPackets');

installNet();

const APPEARANCE = 27;

/** One player in view (AddCharacterToScopeExtended) wearing `effects`. */
function enterView(id: number, effectIds: number[]): void {
  const p = AddCharacterToScopeExtendedPacket.createPacket(26 + APPEARANCE + 1 + effectIds.length);
  p.Id = id;
  p.CurrentPositionX = p.TargetPositionX = 100;
  p.CurrentPositionY = p.TargetPositionY = 100;
  p.setName('Elf', 3);
  const bytes = new Array(APPEARANCE + 1 + effectIds.length).fill(0xff);
  bytes[0] = 0;
  bytes[APPEARANCE] = effectIds.length;
  effectIds.forEach((e, i) => (bytes[APPEARANCE + 1 + i] = e));
  p.setAppearanceAndEffects(bytes, bytes.length);
  EventBus.emit('AddCharacterToScopeExtended', p.buffer);
}

describe('buff looks on an object in view', () => {
  let engine: InstanceType<typeof NullEngine>;
  const auras: EffectHandle[] = [];

  beforeAll(() => {
    engine = new NullEngine();
    const scene = new Scene(engine);
    runInAction(() => {
      Ecs.world = new World(scene as never);
      Hero.playerId = 1;
    });
    const spawn = effects.spawn.bind(effects);
    vi.spyOn(effects, 'spawn').mockImplementation(((name: never, s: never, at: never, opts: never) => {
      const handle = spawn(name, s, at, opts);
      if (name === 'aura') auras.push(handle);
      return handle;
    }) as never);
  });

  afterAll(() => {
    vi.restoreAllMocks();
    runInAction(() => (Ecs.world = null));
    engine.dispose();
  });

  // ReceiveCreatePlayerViewport registers each listed buff with its look (WSclient.cpp:2688-2697, RegisterBuff :15869).
  it('draws the looks it enters view with', () => {
    enterView(5, [1]);
    expect(Ecs.world?.getByNetId(5)?.buffs?.has(1)).toBe(true);
    expect(auras.length).toBeGreaterThan(0);
    expect(auras.every(a => a.alive)).toBe(true);
  });

  // ReceiveDeleteCharacterViewport unregisters every buff before the body goes (WSclient.cpp:3175-3180).
  it('takes them away with the body it replaces', () => {
    const old = auras.splice(0);
    enterView(5, [1]);
    effects.update(0, 1 / 25);
    expect(old.some(a => a.alive)).toBe(false);
    expect(auras.length).toBeGreaterThan(0);
    expect(auras.every(a => a.alive)).toBe(true);
  });

  // ReceiveCreateMonsterViewport: each NPC is 10 bytes and its buff list, each buff registered (WSclient.cpp:2924-2965, :3059).
  it('reads the NPCs after one that enters view with buffs, and registers them', () => {
    const npcs = [
      { id: 20, type: 2, effects: [1, 2] },
      { id: 21, type: 3, effects: [] },
    ];
    const p = AddNpcsToScopePacket.createPacket(5 + npcs.reduce((n, npc) => n + 10 + npc.effects.length, 0));
    p.NpcCount = npcs.length;
    let at = 5;
    for (const npc of npcs) {
      p.buffer.setUint16(at, npc.id);
      p.buffer.setUint16(at + 2, npc.type);
      for (const k of [4, 5, 6, 7]) p.buffer.setUint8(at + k, 100);
      p.buffer.setUint8(at + 9, npc.effects.length);
      npc.effects.forEach((e, i) => p.buffer.setUint8(at + 10 + i, e));
      at += 10 + npc.effects.length;
    }
    EventBus.emit('AddNpcsToScope', p.buffer);
    expect(Ecs.world?.getByNetId(21)?.npcType).toBe(3);
    expect([...(Ecs.world?.getByNetId(20)?.buffs ?? [])]).toEqual([1, 2]);
  });

  // OpenMU numbers seven master buffs on its own; the original knows each by its base (SkillsInitializer.cs:84-90).
  it('lists a master buff OpenMU numbers on its own as its base effect', () => {
    enterView(6, [148]);
    expect([...(Ecs.world?.getByNetId(6)?.buffs ?? [])]).toEqual([5]);
  });
});
