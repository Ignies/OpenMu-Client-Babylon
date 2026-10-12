import { describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Animation } from '@babylonjs/core/Animations/animation';
import { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import { monsterRegistry } from '@/controllers/monsters';
import '@versions/shared/monsters/all';
import { DEFAULT_IDLE_ROLL, nextIdleAction } from './npcIdle';

/** A dice that hands out these values in turn. */
/** A folder's own roll, or the default when it has none. */
const rollOf = (type: number) => monsterRegistry.def(type)?.npcModel?.idle ?? DEFAULT_IDLE_ROLL;

const dice = (...values: number[]) => {
  let i = 0;
  return (n: number) => values[i++] % n;
};

// EtcStopAnimationSetting (ZzzCharacter.cpp:3546-3687) and SetAction's clip check (ZzzAI.cpp:423).
describe('an NPC rolling its next idle clip', () => {
  it('takes clip 0 or 1 by default (rand() % 2)', () => {
    expect(nextIdleAction(DEFAULT_IDLE_ROLL, 0, 2, dice(0))).toBe(0);
    expect(nextIdleAction(DEFAULT_IDLE_ROLL, 0, 2, dice(1, 0))).toBe(1);
  });

  it('keeps the clip it plays when the roll names one the model lacks', () => {
    expect(nextIdleAction(DEFAULT_IDLE_ROLL, 0, 1, dice(1, 0))).toBe(0);
  });

  it('goes back to clip 0 after clip 1 for Silvia and Rhea (rand() % 5 < 4 || CurrentAction == 1)', () => {
    const silvia = rollOf(415);
    expect(silvia).not.toBe(DEFAULT_IDLE_ROLL);
    expect(nextIdleAction(silvia, 1, 2, dice(4))).toBe(0);
    expect(nextIdleAction(silvia, 0, 2, dice(4, 0))).toBe(1);
    expect(nextIdleAction(silvia, 0, 2, dice(3))).toBe(0);
  });

  it('gives the 2008 Santa clip 1 or 2 one time in three, from clip 0 only', () => {
    const santa = rollOf(465);
    expect(santa).not.toBe(DEFAULT_IDLE_ROLL);
    expect(nextIdleAction(santa, 0, 3, dice(2, 1))).toBe(2);
    expect(nextIdleAction(santa, 2, 3, dice(2, 1))).toBe(0);
  });

  it('splits the little Santas: 468-471 rest on clip 0, 472-475 on clip 1', () => {
    for (const type of [468, 469, 470, 471]) expect(nextIdleAction(rollOf(type), 3, 5, dice(1))).toBe(0);
    for (const type of [472, 473, 474, 475]) expect(nextIdleAction(rollOf(type), 3, 5, dice(1))).toBe(1);
  });

  it('names a roll for each of the original cases our NPC folders draw', () => {
    // Natasha (Wedding), Hanzo (Smith01), Pasi (Wizard01), Silvia, Rhea, Devin, the Seed Master and Researcher,
    // the eight little Santas, Santa, the Snowman, Moss, Zyro, the Gens stewards, Raul, Julia, Christine, Leina, Bolo, David.
    const types = [
      379, 251, 254, 415, 416, 406, 452, 453, 468, 469, 470, 471, 472, 473, 474, 475, 465, 467, 492, 568, 543, 544,
      546, 547, 545, 577, 578, 579,
    ];
    expect(types.filter(type => !monsterRegistry.def(type)?.npcModel?.idle)).toEqual([]);
  });
});

describe('a plain NPC model at the end of a clip', () => {
  it('plays the rolled clip, not clip 0 again', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const { npcFactoryFor } = await import('./modelFactoryPerId');
    const scene = new Scene(new NullEngine());
    const npc = new (npcFactoryFor('cor1_test'))(scene);
    const root = new Mesh('npc', scene);
    const clips = [0, 1].map(i => {
      const anim = new Animation(`a${i}`, 'position.x', 25, Animation.ANIMATIONTYPE_FLOAT);
      anim.setKeys([{ frame: 0, value: 0 }, { frame: 10, value: 1 }]);
      const clip = new AnimationGroup(`clip_${i}`, scene);
      clip.addTargetedAnimation(anim, root);
      return clip;
    });
    clips[0].start(true);
    npc.load({ mesh: root, skeleton: new Skeleton('npc', 'npc', scene), animationGroups: clips });
    npc.playAction(0, true);
    expect(npc.CurrentAction).toBe(0);
    npc.ActionIterationWasFinished = true;
    npc.playAction(0, true);
    expect(npc.CurrentAction).toBe(1);
    random.mockRestore();
    scene.getEngine().dispose();
  }, 120_000);
});
