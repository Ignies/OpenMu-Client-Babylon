import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MonsterActionType } from '../common/objects/enum';
import type { ENUM_WORLD } from '../common/types';
import type { World } from '../ecs/world';
import { attachListener, playSfx } from './listener';
import { GLOBAL_NPC_VOICES, GLOBAL_RANGE_TILES, npcVoicesLayer } from './npcVoices';
import { SOUND_FILES } from './recipes';

vi.mock('./listener', async importOriginal => {
  const actual = await importOriginal<typeof import('./listener')>();
  return { ...actual, playSfx: vi.fn(() => 1000) };
});

const TITUS = 479;
const LUGARD = 540;
const BOX = 541;
const SNOWMAN = 477;

type FakeModel = {
  Ready: boolean;
  CurrentAction: number;
  actionSerial: number;
  frame: number;
  actionFrame(): number;
};

type FakeEntity = {
  npcType?: number;
  skin?: number;
  objOutOfScope?: true;
  transform: { pos: { x: number; y: number; z: number } };
  modelObject: FakeModel;
};

function model(action: number = MonsterActionType.Stop1): FakeModel {
  return {
    Ready: true,
    CurrentAction: action,
    actionSerial: 0,
    frame: 0,
    actionFrame() {
      return this.frame;
    },
  };
}

function at(x: number, z: number) {
  return { pos: { x, y: 0, z } };
}

const hero = { transform: at(100, 100) };
let entities: FakeEntity[] = [];

/** Just enough of `World` for the layer: the hero and `with` over `entities`. */
const world = {
  playerEntity: hero,
  with: (...keys: (keyof FakeEntity)[]) => ({
    [Symbol.iterator]: () =>
      entities.filter(e => keys.every(k => e[k] !== undefined))[Symbol.iterator](),
  }),
} as unknown as World;

/** One 25 Hz tick of the layer, and a little over. */
const tick = () => npcVoicesLayer.update!(0 as ENUM_WORLD, 0.05);

const played = () => vi.mocked(playSfx).mock.calls.map(c => c[0]);

beforeEach(() => {
  entities = [];
  npcVoicesLayer.reset!();
  attachListener(world);
  vi.mocked(playSfx).mockClear().mockImplementation(() => 1000);
});

afterEach(() => vi.restoreAllMocks());

describe('PlayMonsterSoundGlobal voices', () => {
  it('names a catalogue key in every cue', () => {
    const missing = Object.values(GLOBAL_NPC_VOICES)
      .flatMap(v => v.cues.map(c => c.sound))
      .filter(k => !(k in SOUND_FILES));
    expect(missing).toEqual([]);
  });

  it('voices Titus each time his idle clip loops, 2D, one line at a time', () => {
    const titus: FakeEntity = { npcType: TITUS, transform: at(102, 100), modelObject: model() };
    entities.push(titus);

    tick(); // first sighting
    titus.modelObject.frame = 5;
    tick();
    titus.modelObject.frame = 9;
    tick();
    expect(playSfx).not.toHaveBeenCalled();

    titus.modelObject.frame = 0.5; // wrapped
    tick();
    expect(played()).toEqual(['Sound/w64/GatekeeperTitus']);
    const [, pos, opts] = vi.mocked(playSfx).mock.calls[0];
    expect(pos).toBeNull();
    expect(opts?.channels).toBe(1);
  });

  it('stays silent beyond five tiles of the hero', () => {
    const titus: FakeEntity = {
      npcType: TITUS,
      transform: at(100 + GLOBAL_RANGE_TILES + 0.5, 100),
      modelObject: model(),
    };
    entities.push(titus);

    tick();
    titus.modelObject.frame = 9;
    tick();
    titus.modelObject.frame = 0;
    tick();
    expect(playSfx).not.toHaveBeenCalled();
  });

  it('gives Lugard one loop in two', () => {
    const lugard: FakeEntity = { npcType: LUGARD, transform: at(100, 101), modelObject: model() };
    entities.push(lugard);
    const loop = () => {
      lugard.modelObject.frame = 20;
      tick();
      lugard.modelObject.frame = 0;
      tick();
    };

    tick();
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    loop();
    expect(playSfx).not.toHaveBeenCalled();

    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    loop();
    expect(played()).toEqual(['Sound/Doppelganger/Lugard']);
  });

  it('opens a Doppelganger box as its Die clip starts', () => {
    const box: FakeEntity = { npcType: BOX, transform: at(99, 99), modelObject: model() };
    entities.push(box);

    tick();
    box.modelObject.CurrentAction = MonsterActionType.Die;
    box.modelObject.actionSerial++;
    tick();
    tick();
    expect(played()).toEqual(['Sound/Doppelganger/treasurebox_open']);
  });

  it('voices a player in the snowman skin: the walk held, the swing on each start', () => {
    const snowman: FakeEntity = { skin: SNOWMAN, transform: at(100, 100), modelObject: model() };
    entities.push(snowman);

    tick();
    snowman.modelObject.CurrentAction = MonsterActionType.Walk;
    snowman.modelObject.actionSerial++;
    tick();
    tick(); // the first walk line (1 s, mocked) is still sounding
    expect(played()).toEqual(['Sound/xmas/SnowMan_Walk01']);

    snowman.modelObject.CurrentAction = MonsterActionType.Attack1;
    snowman.modelObject.actionSerial++;
    tick();
    tick();
    expect(played()).toEqual(['Sound/xmas/SnowMan_Walk01', 'Sound/xmas/SnowMan_Attack01']);
  });

  it('says nothing for a character the server took out of scope', () => {
    const box: FakeEntity = {
      npcType: BOX,
      objOutOfScope: true,
      transform: at(100, 100),
      modelObject: model(),
    };
    entities.push(box);

    tick();
    box.modelObject.CurrentAction = MonsterActionType.Die;
    box.modelObject.actionSerial++;
    tick();
    expect(playSfx).not.toHaveBeenCalled();
  });
});
