import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CharacterClassNumber } from '@/core/types';
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
// What the 0x19 draws (the row's impact), by caster and skill.
const drawn = vi.hoisted(() => [] as [number, number][]);
vi.mock('@versions/shared/skills/skillVisuals', async importOriginal => ({
  ...(await importOriginal<object>()),
  playTargetedSkillVisual: (_scene: unknown, skill: number, caster: { netId: number }) => void drawn.push([caster.netId, skill]),
}));
const played = vi.hoisted(() => [] as string[]);
vi.mock('@/controllers/sound/listener', async importOriginal => ({
  ...(await importOriginal<object>()),
  playSfx: (key: string) => (played.push(key), 0),
}));
// The casters below are stand-ins for player bodies.
vi.mock('@/controllers/actors/playerObject', async importOriginal => ({
  ...(await importOriginal<object>()),
  isPlayerBody: () => true,
}));

// Skills first: they keep the app import cycle in order (versions/shared/skills/readme.md).
await import('@versions/shared/skills/skillVisuals');
const { installNet } = await import('./net');
const { EventBus } = await import('@/core/eventBus');
const { SkillAnimationPacket } = await import('@versions/shared/packets/ServerToClientPackets');

const OTHER = 9;
const TARGET = 5;

const restarts: number[] = [];
const model = { CurrentAction: PlayerAction.PLAYER_STOP_MALE as PlayerAction, restartAction: () => void restarts.push(1) };
const clip = { action: PlayerAction.PLAYER_STOP_MALE as PlayerAction };
const facing = new Vector3();
const appearance = { charClass: CharacterClassNumber.RageFighter, pet: null };
const other = { netId: OTHER, transform: { pos: new Vector3(110, 0, 100), rot: facing, scale: 1 }, playerAnimation: clip, charAppearance: appearance, modelObject: model } as unknown as Entity;
const target = { netId: TARGET, transform: { pos: new Vector3(104, 0, 100), rot: new Vector3(), scale: 1 } } as unknown as Entity;
const objects = new Map([other, target].map(e => [e.netId, e]));

installNet();
store.world = { scene: {}, playerEntity: null, getByNetId: (id: number) => objects.get(id), mapIndex: 0 };
afterAll(() => {
  store.world = null;
});

/** C3 19 from another caster: a SkillAnimation of `skill` on the target. */
function skillAnimation(skill: number): void {
  const p = SkillAnimationPacket.createPacket();
  p.SkillId = skill;
  p.PlayerId = OTHER;
  p.TargetId = TARGET;
  EventBus.emit('SkillAnimation', p.buffer);
}

beforeEach(() => {
  drawn.length = played.length = restarts.length = 0;
  facing.y = 0;
});

describe("another caster's SkillAnimation (C3 19) of Dragon Roar (ReceiveMagic, WSclient.cpp:5130-5143)", () => {
  it('leaves his DRAGONLORE clip running and plays no Rage_Dragonlower: only the hit is drawn, and he turns to it', () => {
    for (const skill of [264, 560]) {
      clip.action = model.CurrentAction = PlayerAction.PLAYER_SKILL_DRAGONLORE;
      skillAnimation(skill);
      expect([clip.action, restarts.length]).toEqual([PlayerAction.PLAYER_SKILL_DRAGONLORE, 0]);
      expect(played).not.toContain('Sound/Ragefighter/Rage_Dragonlower');
      expect(drawn).toEqual([[OTHER, skill]]);
      expect(facing.y).toBeCloseTo(Math.atan2(0, -6) + Math.PI / 2);
      drawn.length = 0;
    }
  });

  it('starts no clip on a caster standing still', () => {
    clip.action = model.CurrentAction = PlayerAction.PLAYER_STOP_MALE;
    skillAnimation(264);
    expect(clip.action).toBe(PlayerAction.PLAYER_STOP_MALE);
    expect(played).toEqual([]);
  });

  it("another skill's still plays its clip (Falling Slash: SetAction PLAYER_ATTACK_SKILL_SWORD1, WSclient.cpp:4372)", () => {
    appearance.charClass = CharacterClassNumber.DarkKnight;
    clip.action = model.CurrentAction = PlayerAction.PLAYER_STOP_MALE;
    skillAnimation(19);
    expect(clip.action).toBe(PlayerAction.PLAYER_ATTACK_SKILL_SWORD1);
    appearance.charClass = CharacterClassNumber.RageFighter;
  });
});
