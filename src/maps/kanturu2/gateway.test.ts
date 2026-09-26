import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import type { Sound } from '@babylonjs/core/Audio/sound';
import { EventBus } from '../../libs/eventBus';
import { SoundsManager } from '../../libs/soundsManager';
import { kanturu2Layer } from './index';
import {
  GATEWAY_TURN_MS,
  endGatewayTurn,
  gatewayTurns,
  startGatewayTurn,
  type GatewayGear,
} from './gateway';

/** Enough of a mixer instance for the turn: loop flag, play, and whether it sounds. */
function stubSound() {
  const s = {
    loop: false,
    autoplay: false,
    isPlaying: false,
    play: vi.fn(() => {
      s.isPlaying = true;
    }),
    stop: vi.fn(),
  };
  return s;
}

const helper = (num: number) => ({ group: 13, num });
const wing = (num: number) => ({ group: 12, num });

/** Wings of Satan and a Moonstone Pendant: the machine turns. */
const ENTERS: GatewayGear = {
  tower: false,
  helper: null,
  wings: wing(2),
  ring1: helper(38),
  ring2: null,
};

describe('Kanturu 2nd gateway turn sound', () => {
  let sound: ReturnType<typeof stubSound>;
  let loopInstance: MockInstance<typeof SoundsManager.loopInstance>;

  beforeEach(() => {
    vi.useFakeTimers();
    sound = stubSound();
    loopInstance = vi
      .spyOn(SoundsManager, 'loopInstance')
      .mockReturnValue(sound as unknown as Sound);
  });

  afterEach(() => {
    endGatewayTurn();
    loopInstance.mockRestore();
    vi.useRealTimers();
  });

  it('loops kan_relic_hole from the click, unpositioned on its own slot', () => {
    startGatewayTurn(ENTERS);
    expect(loopInstance).toHaveBeenCalledWith('Sound/w38/kan_relic_hole', 0);
    expect(sound.play).toHaveBeenCalledTimes(1);
    expect(sound.loop).toBe(true);
  });

  // NewUIKanturuEvent.cpp:476-516: a refusal is a message box, no ROT.
  it('stays silent when the original refuses the click', () => {
    startGatewayTurn({ ...ENTERS, ring1: null });
    expect(loopInstance).not.toHaveBeenCalled();
    expect(sound.play).not.toHaveBeenCalled();
  });

  // ReceiveKanturu3rdEnter sets the STOP action; nothing stops the buffer.
  it('lets the copy sounding play out when an enter result arrives', () => {
    startGatewayTurn(ENTERS);
    EventBus.emit('KanturuEnterResult', new DataView(new ArrayBuffer(5)));
    expect(sound.loop).toBe(false);
    expect(sound.stop).not.toHaveBeenCalled();
  });

  it('ends the turn at frame 50 of the clip when no result comes', () => {
    expect(GATEWAY_TURN_MS).toBe(8000);
    startGatewayTurn(ENTERS);
    vi.advanceTimersByTime(GATEWAY_TURN_MS - 1);
    expect(sound.loop).toBe(true);
    vi.advanceTimersByTime(1);
    expect(sound.loop).toBe(false);
  });

  it('never stacks a second copy on a click during the turn', () => {
    startGatewayTurn(ENTERS);
    vi.advanceTimersByTime(GATEWAY_TURN_MS / 2);
    startGatewayTurn(ENTERS);
    expect(sound.play).toHaveBeenCalledTimes(1);
    // The cap re-arms from the later click.
    vi.advanceTimersByTime(GATEWAY_TURN_MS - 1);
    expect(sound.loop).toBe(true);
    vi.advanceTimersByTime(1);
    expect(sound.loop).toBe(false);
  });

  it('ends the turn on a map change', () => {
    startGatewayTurn(ENTERS);
    kanturu2Layer.reset?.();
    expect(sound.loop).toBe(false);
  });

  it('plays nothing before the audio unlock', () => {
    loopInstance.mockReturnValue(undefined);
    startGatewayTurn(ENTERS);
    expect(sound.play).not.toHaveBeenCalled();
  });
});

describe('gatewayTurns (NewUIKanturuEvent.cpp:470-516)', () => {
  it('turns in the Tower state whatever is worn', () => {
    expect(
      gatewayTurns({
        tower: true,
        helper: helper(2),
        wings: null,
        ring1: helper(10),
        ring2: null,
      })
    ).toBe(true);
  });

  it('needs a Moonstone Pendant in either ring slot', () => {
    expect(gatewayTurns(ENTERS)).toBe(true);
    expect(gatewayTurns({ ...ENTERS, ring1: null, ring2: helper(38) })).toBe(
      true
    );
    expect(gatewayTurns({ ...ENTERS, ring1: null })).toBe(false);
  });

  it('refuses a Horn of Uniria and a transformation ring', () => {
    expect(gatewayTurns({ ...ENTERS, helper: helper(2) })).toBe(false);
    for (const num of [10, 39, 40, 41, 42, 68, 76, 122]) {
      expect(gatewayTurns({ ...ENTERS, ring2: helper(num) })).toBe(false);
    }
  });

  it('needs a listed wing, cape or flying mount', () => {
    const bare = { ...ENTERS, wings: null };
    expect(gatewayTurns(bare)).toBe(false);
    for (const num of [0, 6, 36, 43, 49, 50, 130, 135]) {
      expect(gatewayTurns({ ...bare, wings: wing(num) })).toBe(true);
    }
    for (const num of [7, 35, 44, 129, 136]) {
      expect(gatewayTurns({ ...bare, wings: wing(num) })).toBe(false);
    }
    expect(gatewayTurns({ ...bare, wings: helper(30) })).toBe(true);
    for (const num of [3, 4, 37]) {
      expect(gatewayTurns({ ...bare, helper: helper(num) })).toBe(true);
    }
    expect(gatewayTurns({ ...bare, helper: helper(0) })).toBe(false);
  });
});
