import { describe, expect, it } from 'vitest';
import { GLOBAL_VOICES, mapMonsterCues, hasMapMonsterVoice } from './mapMonsters';
import { MONSTER_SOUNDS } from './monsters';
import { SOUND_FILES } from './recipes';
import { ENUM_WORLD } from '../common/types';

/**
 * A cue naming a key the catalogue does not have is silent at runtime and
 * looks exactly like the gap this table exists to close, so the keys are
 * checked here rather than found in game.
 */
describe('map monster voices', () => {
  const WORLDS = [
    ENUM_WORLD.WD_51ELBELAND,
    ENUM_WORLD.WD_56MAP_SWAMP_OF_QUIET,
    ENUM_WORLD.WD_57ICECITY,
    ENUM_WORLD.WD_58ICECITY_BOSS,
    ENUM_WORLD.WD_63PK_FIELD,
    ENUM_WORLD.WD_65DOPPLEGANGER1,
    ENUM_WORLD.WD_69EMPIREGUARDIAN1,
    ENUM_WORLD.WD_72EMPIREGUARDIAN4,
    ENUM_WORLD.WD_80KARUTAN1,
    ENUM_WORLD.WD_81KARUTAN2,
  ];

  const everyCue = () => {
    const out: { world: number; type: number; keys: string[] }[] = [];
    for (const world of WORLDS) {
      for (let type = 0; type < 256; type++) {
        const cues = mapMonsterCues(world, type);
        if (!cues) continue;
        for (const cue of cues) {
          out.push({
            world,
            type,
            keys: Array.isArray(cue.play) ? [...cue.play] : [cue.play as string],
          });
        }
      }
    }
    return out;
  };

  it('names a catalogue key in every cue', () => {
    const missing = everyCue()
      .flatMap(c => c.keys.map(k => ({ ...c, k })))
      .filter(c => !(c.k in SOUND_FILES))
      .map(c => `world ${c.world} model ${c.type} -> ${c.k}`);

    expect(missing).toEqual([]);
  });

  it('rolls a chance that can actually come up', () => {
    for (const world of WORLDS) {
      for (let type = 0; type < 256; type++) {
        for (const cue of mapMonsterCues(world, type) ?? []) {
          if (cue.chance === undefined) continue;
          expect(cue.chance, `world ${world} model ${type}`).toBeGreaterThan(1);
          expect(cue.chance, `world ${world} model ${type}`).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('never doubles up with the generic table', () => {
    const clash = Object.keys(MONSTER_SOUNDS)
      .map(Number)
      .filter(type => MONSTER_SOUNDS[type].some(slot => slot !== null))
      .filter(type => hasMapMonsterVoice(type));

    expect(clash).toEqual([]);
  });

  it('voices Raklion rather than leaving it to Noria', () => {
    for (const type of [145, 146, 147, 148, 149, 150]) {
      expect(
        mapMonsterCues(ENUM_WORLD.WD_57ICECITY, type),
        `model ${type}`
      ).toBeTruthy();
      expect(MONSTER_SOUNDS[type]?.every(slot => slot === null)).toBe(true);
    }
  });

  it('follows the global voices onto any map', () => {
    for (const type of Object.keys(GLOBAL_VOICES).map(Number)) {
      expect(mapMonsterCues(ENUM_WORLD.WD_0LORENCIA, type)).toBeTruthy();
      expect(mapMonsterCues(ENUM_WORLD.WD_57ICECITY, type)).toBeTruthy();
    }
  });
});
