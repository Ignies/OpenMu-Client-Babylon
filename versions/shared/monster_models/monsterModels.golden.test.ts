import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { monsterSound } from '@/controllers/sound/monsters';
import { monsterPlaySpeed } from '@/controllers/anim/playSpeed';
import { MonsterActionType } from '../objects/enum';

/**
 * What every monster body sounds like and how fast its clips play, as behaviour: every model type,
 * every voice with the dice fixed both ways, the SubType 9 types, and every action. Pinned before the
 * per-model data left the sound and anim controllers for one file per body; update on purpose.
 */
const VOICES_HASH = '87936fa490f9e955cb086a358610da46c01e64b6f293cbf0f0806ef68b13b1ac';
const SPEEDS_HASH = '3d913e67d49c4fbd8abbcd5d8ed956cae96a45d3b654af32bca1b11b4ae7ac98';

const MODELS = Array.from({ length: 300 }, (_, i) => i);
const SUBTYPE9 = [145, 161, 175, 181, 183, 189, 191, 197, 261, 267, 269, 336, 338];
const ACTIONS = Object.values(MonsterActionType).filter((v): v is number => typeof v === 'number');
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');

afterEach(() => vi.restoreAllMocks());

function voicesAt(roll: number): unknown[] {
  vi.spyOn(Math, 'random').mockReturnValue(roll);
  return MODELS.flatMap(m =>
    [undefined, ...SUBTYPE9].map(npc => (['idle', 'attack', 'death'] as const).map(v => monsterSound(m, v, npc)))
  );
}

describe('monster bodies', () => {
  it('sound as they did', () => {
    expect(hash([voicesAt(0), voicesAt(0.99)])).toBe(VOICES_HASH);
  });

  it('play their clips at the speeds they did', () => {
    expect(hash(MODELS.map(m => ACTIONS.map(a => monsterPlaySpeed(m, a))))).toBe(SPEEDS_HASH);
  });
});
