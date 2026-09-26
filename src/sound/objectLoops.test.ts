import { describe, expect, it } from 'vitest';
import { ENUM_WORLD } from '../common/types';
import { OBJECT_LOOPS } from './objectLoops';
import { SOUND_FILES } from './recipes';

describe('object loop table', () => {
  it('names a catalogue key in every row', () => {
    const missing = [...OBJECT_LOOPS.values()]
      .flat()
      .filter(row => !(row.sound in SOUND_FILES))
      .map(row => row.sound);
    expect(missing).toEqual([]);
  });

  // `CGM3rdChangeUp::MoveObject` runs `PlayEffectSound` on both maps.
  it('gives Balgass Refuge the Barracks cages, volcano and fire pillar', () => {
    const barracks = OBJECT_LOOPS.get(ENUM_WORLD.WD_41CHANGEUP3RD_1ST);
    const refuge = OBJECT_LOOPS.get(ENUM_WORLD.WD_42CHANGEUP3RD_2ND);

    expect(refuge).toBeDefined();
    expect(refuge).toBe(barracks);
    expect(refuge!.flatMap(row => row.types).sort((a, b) => a - b)).toEqual([
      74, 75, 79, 92,
    ]);
  });
});
