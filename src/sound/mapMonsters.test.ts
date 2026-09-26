import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CUE_RETRY_MS,
  GLOBAL_VOICES,
  mapMonsterCues,
  newCueState,
  playSpawnCues,
  stepCues,
  type MonsterCue,
} from './mapMonsters';
import { MONSTER_SOUNDS } from './monsters';
import { SOUND_FILES, type Sounds } from './recipes';
import { MonsterActionType as A } from '../common/objects/enum';
import { ENUM_WORLD } from '../common/types';

const WORLDS = Object.values(ENUM_WORLD).filter(
  (w): w is ENUM_WORLD => typeof w === 'number'
);

const everyCue = () => {
  const out: { world: number; type: number; cue: MonsterCue }[] = [];
  for (const world of WORLDS) {
    for (let type = 0; type < 256; type++) {
      for (const cue of mapMonsterCues(world, type) ?? []) out.push({ world, type, cue });
    }
  }
  return out;
};

const keysOf = (cue: MonsterCue): string[] =>
  Array.isArray(cue.play) ? [...cue.play] : [cue.play as string];

/**
 * A cue naming a key the catalogue does not have is silent at runtime and
 * looks exactly like the gap this table exists to close, so the keys are
 * checked here rather than found in game.
 */
describe('map monster voices', () => {
  it('names a catalogue key in every cue', () => {
    const missing = everyCue()
      .flatMap(c => keysOf(c.cue).map(k => ({ ...c, k })))
      .filter(c => !(c.k in SOUND_FILES))
      .map(c => `world ${c.world} model ${c.type} -> ${c.k}`);

    expect(missing).toEqual([]);
  });

  it('rolls a chance that can actually come up', () => {
    for (const { world, type, cue } of everyCue()) {
      if (cue.chance === undefined) continue;
      expect(cue.chance, `world ${world} model ${type}`).toBeGreaterThan(1);
      expect(cue.chance, `world ${world} model ${type}`).toBeLessThanOrEqual(100);
    }
  });

  it('never doubles up with the generic table', () => {
    // A `PlayMonsterSound` voice replaces Models[].Sounds[]; a hook's sound adds to it.
    const clash = everyCue()
      .filter(({ type, cue }) => !cue.unranged && MONSTER_SOUNDS[type]?.some(s => s !== null))
      .map(({ world, type }) => `world ${world} model ${type}`);

    expect(clash).toEqual([]);
  });

  it('never hides a hook with no world guard behind a map set', () => {
    // Lorencia has no set of its own: what it answers is the global list plus
    // those hooks, and every other map must answer the same for them.
    for (let type = 0; type < 256; type++) {
      const anywhere = mapMonsterCues(ENUM_WORLD.WD_0LORENCIA, type);
      if (!anywhere) continue;
      for (const world of WORLDS) {
        expect(mapMonsterCues(world, type), `world ${world} model ${type}`).toBe(anywhere);
      }
    }
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

  it('keeps each hook to the worlds its guard names', () => {
    // Devil Square runs the Crywolf hook, and Kanturu's unguarded one.
    expect(mapMonsterCues(ENUM_WORLD.WD_9DEVILSQUARE, 92)).toBe(
      mapMonsterCues(ENUM_WORLD.WD_34CRYWOLF_1ST, 92)
    );
    expect(mapMonsterCues(ENUM_WORLD.WD_9DEVILSQUARE, 112)).toBeTruthy();
    expect(mapMonsterCues(ENUM_WORLD.WD_0LORENCIA, 92)).toBeNull();
    // The Nightmare only on Kanturu 3rd, the Aticles Head's spear only on floor 2.
    expect(mapMonsterCues(ENUM_WORLD.WD_39KANTURU_3RD, 121)).toBeTruthy();
    expect(mapMonsterCues(ENUM_WORLD.WD_37KANTURU_1ST, 121)).toBeNull();
    const spear = (w: ENUM_WORLD) =>
      (mapMonsterCues(w, 174) ?? []).some(c => c.play === 'Sound/sDarkSpear');
    expect(spear(ENUM_WORLD.WD_70EMPIREGUARDIAN2)).toBe(true);
    expect(spear(ENUM_WORLD.WD_69EMPIREGUARDIAN1)).toBe(false);
  });
});

describe('stepping the cues', () => {
  afterEach(() => vi.restoreAllMocks());

  const DT = 1 / 25;

  /** Steps one clip frame by frame and records every key that starts. */
  function rig(cues: readonly MonsterCue[], length = 500) {
    const s = newCueState(cues.length, 0);
    const played: string[] = [];
    const tries: number[] = [];
    let now = 0;
    const play = (key: Sounds) => {
      tries.push(now);
      if (length > 0) played.push(key);
      return length;
    };
    const step = (
      action: A,
      frame: number,
      opts: { started?: boolean; inRange?: boolean; drawn?: boolean } = {}
    ) => {
      now += DT * 1000;
      stepCues(
        s,
        cues,
        action,
        opts.started ?? false,
        frame,
        DT,
        now,
        opts.inRange ?? true,
        opts.drawn ?? true,
        null,
        play
      );
    };
    return { s, played, tries, step };
  }

  it('shares one latch between a monster\'s once cues, cleared by idling', () => {
    const { played, step } = rig([
      { on: [A.Attack1], play: 'Sound/w35/balga_at1', once: true },
      { on: [A.Die], play: 'Sound/w35/balga_death', once: true },
    ]);
    step(A.Attack1, 0, { started: true });
    step(A.Attack1, 1);
    step(A.Die, 0, { started: true });
    expect(played).toEqual(['Sound/w35/balga_at1']);

    step(A.Stop1, 0, { started: true });
    step(A.Die, 0, { started: true });
    expect(played).toEqual(['Sound/w35/balga_at1', 'Sound/w35/balga_death']);
  });

  it('never clears a latch the hook forgot to reset', () => {
    const { played, step } = rig([
      { on: [A.Attack1], play: 'Sound/w37/swolf_attack-01', once: 'life' },
      { on: [A.Die], play: 'Sound/w37/swolf_death', once: 'life' },
    ]);
    step(A.Attack1, 0, { started: true });
    step(A.Stop1, 0, { started: true });
    step(A.Attack1, 0, { started: true });
    step(A.Die, 0, { started: true });
    expect(played).toEqual(['Sound/w37/swolf_attack-01']);
  });

  it('lets every once cue of the same clip through the one latch test', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { played, step } = rig([
      { on: [A.Attack2], play: ['Sound/eElec1', 'Sound/eElec2'], once: true },
      { on: [A.Attack2], play: 'Sound/w34/wq_attack1', once: true },
    ]);
    step(A.Attack2, 0, { started: true });
    expect(played).toEqual(['Sound/eElec1', 'Sound/w34/wq_attack1']);
  });

  it('fires a frame window the clip steps over, once per pass', () => {
    const { played, step } = rig([
      { on: [A.Appear], play: 'Sound/w39/maya_hand_attack-02', frame: [5.6, 6.1] },
    ]);
    step(A.Appear, 0, { started: true });
    step(A.Appear, 5.2);
    step(A.Appear, 6.4);
    step(A.Appear, 7);
    expect(played).toHaveLength(1);

    step(A.Appear, 0, { started: true });
    step(A.Appear, 5.8);
    expect(played).toHaveLength(2);
  });

  it('treats a one-shot that ran out as past every window', () => {
    const { played, step } = rig([
      { on: [A.Die], play: 'Sound/mKundunDestory', frame: [8, Infinity] },
      { on: [A.Die], play: 'Sound/mKundunShudder', frame: [14.8, Infinity] },
    ]);
    step(A.Die, 0, { started: true });
    step(A.Die, 9);
    step(A.Die, 13.9);
    step(A.Die, Infinity);
    step(A.Die, Infinity);
    expect(played).toEqual(['Sound/mKundunDestory', 'Sound/mKundunShudder']);
  });

  it('rolls a per-frame cue in any clip, not only while walking', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { played, step } = rig([
      { on: [A.Stop1, A.Attack1], play: 'Sound/w31/mFGidle1', chance: 20, perFrame: true },
    ]);
    step(A.Stop1, 1, { started: true });
    step(A.Stop1, 1.2);
    step(A.Attack1, 2);
    expect(played).toHaveLength(3);
  });

  it('repeats a walk cue without a chance only once the last play has ended', () => {
    const { played, step } = rig([{ on: [A.Walk], play: 'Sound/w38/twin_idle-01' }], 100);
    step(A.Walk, 0, { started: true });
    step(A.Walk, 0.5);
    step(A.Walk, 1);
    expect(played).toHaveLength(1);
    step(A.Walk, 1.5);
    expect(played).toHaveLength(2);
  });

  it('holds the five-tile gate for map voices but not for hooks', () => {
    const { played, step } = rig([
      { on: [A.Attack1], play: 'Sound/w57/Naipin-Attack' },
      { on: [A.Attack1], play: 'Sound/sEvil', unranged: true },
    ]);
    step(A.Attack1, 0, { started: true, inRange: false });
    expect(played).toEqual(['Sound/sEvil']);
  });

  it('plays spawn cues on creation and never from the clip', () => {
    const cues: MonsterCue[] = [
      { on: [], play: 'Sound/w31/mELOidle1', spawn: true },
      { on: [A.Attack2], play: 'Sound/w31/mELOeff1', once: true },
    ];
    const created: string[] = [];
    playSpawnCues(cues, null, key => (created.push(key), 0));
    expect(created).toEqual(['Sound/w31/mELOidle1']);

    const { played, step } = rig(cues);
    step(A.Stop1, 0, { started: true });
    step(A.Attack2, 0, { started: true });
    expect(played).toEqual(['Sound/w31/mELOeff1']);
  });

  it('keeps a move / render hook silent while the monster is not drawn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { played, step } = rig([
      { on: [A.Walk], play: 'Sound/w35/ww_idle1', chance: 15, drawn: true },
      { on: [A.Attack1], play: 'Sound/w35/ww_attack1', once: true, drawn: true },
      { on: [A.Attack1], play: 'Sound/sEvil', unranged: true },
    ]);
    step(A.Walk, 0, { started: true, drawn: false });
    step(A.Walk, 1, { drawn: false });
    step(A.Attack1, 0, { started: true, drawn: false });
    expect(played).toEqual(['Sound/sEvil']);
  });

  it('only clears the latch on a frame the hook runs', () => {
    const { played, step } = rig([
      { on: [A.Attack1], play: 'Sound/w35/balga_at1', once: true, drawn: true },
    ]);
    step(A.Attack1, 0, { started: true });
    step(A.Stop1, 0, { started: true, drawn: false });
    step(A.Attack1, 0, { started: true });
    expect(played).toEqual(['Sound/w35/balga_at1']);

    step(A.Stop1, 0, { started: true });
    step(A.Attack1, 0, { started: true });
    expect(played).toEqual(['Sound/w35/balga_at1', 'Sound/w35/balga_at1']);
  });

  it('runs a period cue as a timer, one of the pair per tick', () => {
    const cues = mapMonsterCues(ENUM_WORLD.WD_38KANTURU_2ND, 115) ?? [];
    const walk = cues.filter(c => c.on.includes(A.Walk));
    expect(walk).toHaveLength(1);
    expect(walk[0].period).toBe(500);

    const { tries, step } = rig(walk, 2880);
    step(A.Walk, 0, { started: true });
    for (let f = 1; f < 50; f++) step(A.Walk, f % 8);
    // Two seconds of walking at 25 fps: a tick at 0, 500, 1000 and 1500 ms.
    expect(tries).toHaveLength(4);
    for (let i = 1; i < tries.length; i++) {
      expect(tries[i] - tries[i - 1]).toBeGreaterThanOrEqual(500);
    }
  });

  it('backs off after a dropped play instead of retrying every frame', () => {
    const { tries, step } = rig([{ on: [A.Walk], play: 'Sound/w69w70w71w72/3Cato_move' }], 0);
    step(A.Walk, 0, { started: true });
    for (let f = 1; f < 25; f++) step(A.Walk, f % 8);
    // One second at 25 fps, a try every CUE_RETRY_MS at most.
    expect(tries.length).toBeLessThanOrEqual(Math.ceil(1000 / CUE_RETRY_MS));
    expect(tries.length).toBeGreaterThan(1);
  });
});

describe('channel caps', () => {
  const ONE_CHANNEL_SETS: [ENUM_WORLD, number[]][] = [
    [ENUM_WORLD.WD_51ELBELAND, [128, 129, 130, 131, 132, 133, 134, 135]],
    [ENUM_WORLD.WD_56MAP_SWAMP_OF_QUIET, [136, 137, 138, 139, 140, 141, 142, 143, 144, 201, 202, 203, 204]],
    [ENUM_WORLD.WD_57ICECITY, [145, 146, 147, 148, 149, 150, 205, 206, 207, 208]],
    [ENUM_WORLD.WD_65DOPPLEGANGER1, [145]],
  ];

  it('loads Elbeland, the Swamp and Raklion with one channel per wave', () => {
    for (const [world, types] of ONE_CHANNEL_SETS) {
      for (const type of types) {
        for (const cue of mapMonsterCues(world, type) ?? []) {
          expect(cue.channels, `world ${world} model ${type}`).toBe(1);
        }
      }
    }
  });

  it('holds the MAX_CHANNEL sets to the tables\' 2', () => {
    for (const cue of mapMonsterCues(ENUM_WORLD.WD_69EMPIREGUARDIAN1, 165) ?? []) {
      expect(cue.channels).toBeUndefined();
    }
    for (const cue of mapMonsterCues(ENUM_WORLD.WD_65DOPPLEGANGER1, 189) ?? []) {
      expect(cue.channels).toBeUndefined();
    }
  });

  it('puts every latch and walk roll of a hook behind the drawn gate', () => {
    for (const { world, type, cue } of everyCue()) {
      if (!cue.once && !cue.perFrame && !(cue.unranged && cue.chance)) continue;
      expect(cue.drawn, `world ${world} model ${type}`).toBe(true);
    }
  });
});
