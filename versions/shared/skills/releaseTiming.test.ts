import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { effects } from '@/controllers/fx';
import { ENUM_WORLD } from '@/core/types';
import { playerPlaySpeed } from '@/controllers/anim/playSpeed';
import type { Entity } from '@/ecs/world';
import { PlayerAction } from '../objects/enum';
import { playAreaSkillVisual, playTargetedSkillVisual } from './skillVisuals';
import { skillSound } from '@/controllers/sound/combat';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const played: string[] = [];
vi.mock('@/controllers/sound/listener', async importOriginal => ({
  ...(await importOriginal<object>()),
  playSfx: (key: string) => {
    played.push(key);
    return 0;
  },
}));

/**
 * When a cast lands, against the caster's magic speed: AttackTime runs 14 ticks from the packet, but
 * AttackStage releases as soon as the caster's clip reaches key 5 (ZzzCharacter.cpp:2590-2604, :3052-3060,
 * :4132-4140). Fire Ball (4) from a wizard's PLAYER_SKILL_HAND1, played at 25 fps.
 */
const FIRE_BALL = 4;
const CLIP = PlayerAction.PLAYER_SKILL_HAND1;
/** Force (60) from the Dark Lord's strike clip: AttackStage releases it at key 3 (ZzzCharacter.cpp:2865-2873). */
const FORCE = 60;
const STRIKE = PlayerAction.PLAYER_ATTACK_STRIKE;

let engine: NullEngine;
let scene: Scene;
beforeAll(() => {
  engine = new NullEngine();
  scene = new Scene(engine);
});
afterAll(() => {
  vi.restoreAllMocks();
  scene.dispose();
  engine.dispose();
});

/**
 * Frames after the packet at which the caster's clip reaches `key`, and at which the skill first spawns (an
 * effect named `only`, if given). `keysPerTick` is the clip's PlaySpeed; the game runs at `fps`.
 */
function timeline(
  skill: number,
  clip: PlayerAction,
  keysPerTick: number,
  key: number,
  fps = 25,
  { area = false, only, sound }: { area?: boolean; only?: string; sound?: string } = {}
): { key: number; release: number } {
  let frame = 0;
  const model = { CurrentAction: clip, actionFrame: () => frame };
  const caster = {
    netId: 1,
    transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(0, 0.5, 0), scale: 1 },
    playerAnimation: { action: clip },
    modelObject: model,
  } as unknown as Entity;
  const target = { netId: 2, transform: { pos: new Vector3(103, 0, 104), rot: new Vector3(), scale: 1 } } as unknown as Entity;

  effects.reset();
  const spawn = vi.spyOn(effects, 'spawn');
  spawn.mockClear();
  played.length = 0;
  const spawned = () => (sound ? played.includes(sound) : spawn.mock.calls.filter(c => !only || c[0] === only).length > 0);
  if (area) playAreaSkillVisual(scene, skill, caster, { x: 103, y: 104 }, () => 0, target);
  else playTargetedSkillVisual(scene, skill, caster, target);
  let keyAt = 0;
  let release = 0;
  for (let f = 1; f <= 100 && !(keyAt && release); f++) {
    frame += (keysPerTick * 25) / fps;
    if (!keyAt && frame >= key) keyAt = f;
    effects.update(ENUM_WORLD.WD_0LORENCIA, 1 / fps);
    if (!release && spawned()) release = f;
  }
  spawn.mockRestore();
  return { key: keyAt, release };
}

describe('a spell lands with its clip', () => {
  const at = (magicSpeed: number) => timeline(FIRE_BALL, CLIP, playerPlaySpeed(CLIP, 0, magicSpeed), 5);

  it('waits out AttackTime at a low magic speed: the clip is slower than 14 ticks', () => {
    expect(at(0)).toEqual({ key: 18, release: 14 });
  });

  it('leaves on key 5 at a high magic speed, with the clip', () => {
    expect(at(1400)).toEqual({ key: 2, release: 2 });
  });
});

describe('a Dark Lord strike lands on key 3 of its clip', () => {
  const at = (attackSpeed: number, fps = 25) => timeline(FORCE, STRIKE, playerPlaySpeed(STRIKE, attackSpeed), 3, fps);

  it('on the key at a low and a high attack speed', () => {
    expect(at(0)).toEqual({ key: 12, release: 12 });
    expect(at(600)).toEqual({ key: 3, release: 3 });
  });

  it('on the first frame past the key at 60 fps', () => {
    expect(at(0, 60)).toEqual({ key: 29, release: 29 });
  });

  it('14 ticks after the packet when the clip never gets there, at any frame rate', () => {
    // 0.56 s: frame 14 at 25 fps, 34 at 60 fps (polling a tick at a time drifted to frame 42).
    expect(timeline(FORCE, PlayerAction.PLAYER_STOP_MALE, 0.25, 3).release).toBe(14);
    expect(timeline(FORCE, PlayerAction.PLAYER_STOP_MALE, 0.25, 3, 60).release).toBe(34);
  });
});

describe("the elf buffs land at the cast's release", () => {
  // Heal, Greater Defense, Greater Damage: BITMAP_MAGIC+1 on the target in the release block (ZzzCharacter.cpp:4910-4954).
  const at = (skill: number, magicSpeed: number) => timeline(skill, CLIP, playerPlaySpeed(CLIP, 0, magicSpeed), 5);

  it('14 ticks after the packet at a low magic speed, on key 5 at a high one', () => {
    for (const skill of [26, 27, 28]) {
      expect(at(skill, 0)).toEqual({ key: 18, release: 14 });
      expect(at(skill, 1400)).toEqual({ key: 2, release: 2 });
    }
  });
});

describe('the elf arrows leave at the release', () => {
  // CreateArrows runs in the release block (ZzzCharacter.cpp:4811-4828, :4893-4909); the bow clip's key 5 forces it.
  const BOW = PlayerAction.PLAYER_ATTACK_BOW;
  const shot = (skill: number, attackSpeed: number, area: boolean) =>
    timeline(skill, BOW, playerPlaySpeed(BOW, attackSpeed), 5, 25, { area, only: 'projectile' });

  it('Triple Shot (area) and Starfall (targeted) on key 5 of the bow clip, or 14 ticks after the packet', () => {
    for (const [skill, area] of [[24, true], [46, false]] as const) {
      expect(shot(skill, 0, area)).toEqual({ key: 17, release: 14 });
      expect(shot(skill, 600, area)).toEqual({ key: 4, release: 4 });
    }
  });

  it('Ice Arrow: the ice on the target at the packet (WSclient.cpp:4479-4500), the arrow at the release (:4902-4905)', () => {
    const ice = timeline(51, BOW, playerPlaySpeed(BOW, 0), 5, 25, { only: 'model' });
    expect(ice.release).toBe(1);
    expect(shot(51, 0, false)).toEqual({ key: 17, release: 14 });
    expect(shot(51, 600, false)).toEqual({ key: 4, release: 4 });
  });
});

describe('Penetration', () => {
  // AttackStage sets g_iLimitAttackTime = 5 and forces nothing (ZzzCharacter.cpp:2762-2780): the arrow leaves at AttackTime 5.
  const BOW = PlayerAction.PLAYER_ATTACK_BOW;
  const shot = (attackSpeed: number) => timeline(52, BOW, playerPlaySpeed(BOW, attackSpeed), 5, 25, { area: true, only: 'projectile' });

  it('shoots 4 ticks after the packet at any attack speed', () => {
    expect(shot(0).release).toBe(4);
    expect(shot(1000).release).toBe(4);
  });
});

describe('the release-block common skills', () => {
  it('Improve AG on key 5 of an attack clip, or 14 ticks after the packet (ZzzCharacter.cpp:2859-2864, :4343-4363)', () => {
    expect(timeline(53, CLIP, playerPlaySpeed(CLIP, 0, 0), 5)).toEqual({ key: 18, release: 14 });
    expect(timeline(53, CLIP, playerPlaySpeed(CLIP, 0, 1400), 5)).toEqual({ key: 2, release: 2 });
  });

  it('Stun and Swell Mana 14 ticks after the packet however fast the clip: their AttackStage case forces nothing (:2917-2918)', () => {
    const vitality = PlayerAction.PLAYER_SKILL_VITALITY;
    expect(timeline(67, vitality, 1, 5, 25, { area: true })).toEqual({ key: 5, release: 14 });
    expect(timeline(69, vitality, 1, 5)).toEqual({ key: 5, release: 14 });
  });
});

describe('the release-block sounds play at the release, not at the packet', () => {
  // PlayBuffer in the release block: Deep Impact (ZzzCharacter.cpp:4908), Stun (:4217), Swell Mana (:4257), Improve AG (:4364).
  const BOW = PlayerAction.PLAYER_ATTACK_BOW;
  const vitality = PlayerAction.PLAYER_SKILL_VITALITY;

  it('none of them sounds at the cast', () => {
    for (const skill of [46, 67, 69, 53]) expect(skillSound(skill)).toBeNull();
  });

  it('Starfall on key 5 of the bow clip, or 14 ticks after the packet', () => {
    const at = (attackSpeed: number) => timeline(46, BOW, playerPlaySpeed(BOW, attackSpeed), 5, 25, { sound: 'Sound/battlecastle/sCFireArrow' });
    expect(at(0)).toEqual({ key: 17, release: 14 });
    expect(at(600)).toEqual({ key: 4, release: 4 });
  });

  it('Stun and Swell Mana 14 ticks after the packet, Improve AG on key 5 or at 14', () => {
    expect(timeline(67, vitality, 1, 5, 25, { area: true, sound: 'Sound/battlecastle/sDStun' }).release).toBe(14);
    expect(timeline(69, vitality, 1, 5, 25, { sound: 'Sound/battlecastle/sDSwellMana' }).release).toBe(14);
    expect(timeline(53, CLIP, playerPlaySpeed(CLIP, 0, 0), 5, 25, { sound: 'Sound/eSwellLife' })).toEqual({ key: 18, release: 14 });
    expect(timeline(53, CLIP, playerPlaySpeed(CLIP, 0, 1400), 5, 25, { sound: 'Sound/eSwellLife' })).toEqual({ key: 2, release: 2 });
  });
});

describe('AttackStage sees AttackTime t on tick t after the packet', () => {
  // The packet sets AttackTime 1; each tick AttackStage runs, then AttackTime += 1 and the release comes at 15 (ZzzCharacter.cpp:4132-4140).
  const ONETOONE = PlayerAction.PLAYER_ATTACK_ONETOONE;
  const SPEAR = PlayerAction.PLAYER_ATTACK_SKILL_SPEAR;

  it('Death Stab: SOUND_SKILL_SWORD2 at AttackTime 8 (ZzzCharacter.cpp:2628-2634)', () => {
    expect(timeline(43, ONETOONE, 0.25, 99, 25, { sound: 'Sound/sKnightSkill2' }).release).toBe(8);
  });

  it('Impale: SOUND_RIDINGSPEAR at AttackTime 10 (ZzzCharacter.cpp:2707-2711)', () => {
    expect(timeline(47, SPEAR, 0.25, 99, 25, { sound: 'Sound/eRidingSpear' }).release).toBe(10);
  });
});

describe('a clip-key cast whose clip never gets there', () => {
  // AttackTime reaches 15 by itself on tick 14 (ZzzCharacter.cpp:4132-4140).
  const IDLE = PlayerAction.PLAYER_STOP_MALE;

  it('Gigantic Storm and Mana Rays release 14 ticks after the packet (:3001-3006, :2990-2995)', () => {
    expect(timeline(237, IDLE, 0.25, 99, 25, { area: true }).release).toBe(14);
    expect(timeline(73, IDLE, 0.25, 99, 25, { only: 'ticked' }).release).toBe(14);
  });
});
