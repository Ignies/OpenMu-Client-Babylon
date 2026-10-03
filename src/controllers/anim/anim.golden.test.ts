import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { PlayerAction } from '@versions/shared/objects/enum';
import {
  applyPlayerActionSpeed,
  debuffSlowsClip,
  playerFrameSpeedScale,
  playerPlaySpeed,
  wingsPlaySpeed,
} from './playSpeed';
import {
  ServerToClientActionMap,
  isOneShotPlayerAction,
  isPlayerAttackAction,
  isPlayerSkillAction,
  isStandingIdle,
  resolveGenderedAction,
} from './playerActionMapper';
import { isSocialAction } from '../actors/weaponClass';

/**
 * Every player clip lookup as behaviour, over every action (and a few ids past both ends): the
 * PlayerAction ids, the play speed over a grid of attack / magic speeds for both walk tables, the
 * per-frame scale, every flag and map. Pinned before the per-action data left the tables for one
 * file per action; update on purpose.
 */
const ENUM_HASH = 'efca3df993fae228e4d27e410d96f07ea30cfcf4c0bc0f57fc96b5a5a715bcd0';
const SPEED_HASH = 'd41c7458d26c9160db725d50506345f64ac80c7827751bd8d0e4095c2109cd3a';
const FRAME_HASH = 'd910837c3501746ffd2eaa923c96de756dc4c3214a658cb46b6370567693680e';
const FLAGS_HASH = 'aa89d1d4e6d53b5a3d7bbb65791d70add96cc77cc653a3c1ec29d502aa328ce5';

const MAX = PlayerAction.MAX_PLAYER_ACTION;
const ACTIONS: number[] = Array.from({ length: MAX + 6 }, (_, i) => i - 2);
const ATTACK_SPEEDS = [0, 1, 100, 300, 508, 509, 530, 549, 550, 600, 750, 751, 1000, 3000];
const MAGIC_SPEEDS = [
  -5, 0, 1, 150, 299, 300, 349, 350, 399, 400, 449, 450, 499, 500, 549, 550, 599, 600, 649, 650, 699, 700,
  749, 750, 799, 800, 849, 850, 899, 900, 949, 950, 2000,
];
const FRAMES = [0, 0.5, 1, 1.0001, 2, 2.9999, 3, 4, 5.5, 5.5001, 6, 6.0001, 7, 20];
const WING_SPECS = [undefined, null, {}, { playSpeed: 0.7 }, { flyPlaySpeed: 0.5 }, { playSpeed: 0.1, flyPlaySpeed: 0.9 }];

const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');

describe('player clips', () => {
  it('keep their ids', () => {
    expect(hash(Object.entries(PlayerAction))).toBe(ENUM_HASH);
  });

  it('play at the speeds they did', () => {
    const h = createHash('sha256');
    for (const a of ACTIONS)
      for (const as of ATTACK_SPEEDS)
        for (const ms of MAGIC_SPEEDS)
          h.update(`${playerPlaySpeed(a, as, ms, false)},${playerPlaySpeed(a, as, ms, true)};`);
    // The defaults and the attribute path.
    for (const a of ACTIONS) {
      const model = { AnimationSpeed: -1, actionPlaySpeed: () => undefined };
      applyPlayerActionSpeed(model, a, { getValue: (n: string) => (n === 'attackSpeed' ? 600 : 420) });
      const bare = { AnimationSpeed: -1, actionPlaySpeed: () => undefined };
      applyPlayerActionSpeed(bare, a, undefined);
      h.update(`${playerPlaySpeed(a)},${model.AnimationSpeed},${bare.AnimationSpeed};`);
    }
    expect(h.digest('hex')).toBe(SPEED_HASH);
  });

  it('slow per frame as they did', () => {
    expect(hash(ACTIONS.map(a => FRAMES.map(f => [playerFrameSpeedScale(a, f, false), playerFrameSpeedScale(a, f, true)])))).toBe(
      FRAME_HASH
    );
  });

  it('classify and map as they did', () => {
    const flags = ACTIONS.map(a => [
      isPlayerAttackAction(a),
      isPlayerSkillAction(a),
      isStandingIdle(a),
      isOneShotPlayerAction(a),
      debuffSlowsClip(a),
      isSocialAction(a),
      resolveGenderedAction(a, false),
      resolveGenderedAction(a, true),
      WING_SPECS.map(s => wingsPlaySpeed(a, s)),
    ]);
    const map = Object.entries(ServerToClientActionMap).sort(([x], [y]) => Number(x) - Number(y));
    expect(hash([flags, map])).toBe(FLAGS_HASH);
  });
});
